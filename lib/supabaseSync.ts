import { db } from '../db';
import { supabase, isSupabaseConfigured } from '../supabase';
import { TABLE_MAP, camelToSnake, mapRowsToLocal } from './columnMapping';

// ─── State ───────────────────────────────────────────────────────────
let currentUserId: string | null = null;
let isSyncing = false;      // suppresses Dexie hook pushes during sync
let isSyncRunning = false;  // prevents concurrent syncFromSupabase() calls
const hookUnsubscribers: (() => void)[] = [];

/** Suppress/restore hook pushes during bulk import operations */
export function setImportMode(active: boolean): void {
  isSyncing = active;
}

// ─── Types ───────────────────────────────────────────────────────────
export interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'upsert' | 'delete';
  payload: any;
  failedAt: number;
  retryCount: number;
}

// ─── Push to Supabase (fire-and-forget) ──────────────────────────────
async function pushToSupabase(
  supabaseTable: string,
  operation: 'upsert' | 'delete',
  data: any
): Promise<void> {
  try {
    if (operation === 'upsert') {
      const { error } = await supabase.from(supabaseTable).upsert(data);
      if (error) throw error;
    } else if (operation === 'delete') {
      const { error } = await supabase
        .from(supabaseTable)
        .delete()
        .eq('id', data.id)
        .eq('user_id', currentUserId!);
      if (error) throw error;
    }
  } catch (err) {
    console.error(`Sync failed [${operation} ${supabaseTable}]:`, err);
    try {
      await db.table('_syncQueue').add({
        id: crypto.randomUUID(),
        table: supabaseTable,
        operation,
        payload: data,
        failedAt: Date.now(),
        retryCount: 0,
      });
    } catch (queueErr) {
      console.error('Failed to queue sync operation:', queueErr);
    }
  }
}

// ─── Setup Dexie Hooks ──────────────────────────────────────────────
export function setupSupabaseHooks(userId: string): void {
  teardownSupabaseHooks();
  currentUserId = userId;

  const dexieTables = Object.keys(TABLE_MAP) as Array<keyof typeof TABLE_MAP>;

  for (const dexieTableName of dexieTables) {
    const supabaseTableName = TABLE_MAP[dexieTableName];
    const table = (db as any)[dexieTableName];
    if (!table) continue;

    // CREATING hook
    const unsubCreate = table.hook('creating', function (_primKey: any, obj: any) {
      if (isSyncing || !currentUserId) return;
      const snakeObj = camelToSnake(obj);
      snakeObj.user_id = currentUserId;
      void pushToSupabase(supabaseTableName, 'upsert', snakeObj);
    });

    // UPDATING hook — merge full obj + partial mods, then upsert
    const unsubUpdate = table.hook('updating', function (mods: any, _primKey: any, obj: any) {
      if (isSyncing || !currentUserId) return;
      const merged = { ...obj, ...mods };
      const snakeObj = camelToSnake(merged);
      snakeObj.user_id = currentUserId;
      void pushToSupabase(supabaseTableName, 'upsert', snakeObj);
    });

    // DELETING hook — obj may be undefined, always use primKey
    const unsubDelete = table.hook('deleting', function (primKey: any) {
      if (isSyncing || !currentUserId) return;
      void pushToSupabase(supabaseTableName, 'delete', { id: primKey });
    });

    hookUnsubscribers.push(
      () => table.hook('creating').unsubscribe(unsubCreate),
      () => table.hook('updating').unsubscribe(unsubUpdate),
      () => table.hook('deleting').unsubscribe(unsubDelete)
    );
  }
}

// ─── Teardown Hooks ─────────────────────────────────────────────────
export function teardownSupabaseHooks(): void {
  for (const unsub of hookUnsubscribers) {
    try { unsub(); } catch (_) { /* already unsubscribed */ }
  }
  hookUnsubscribers.length = 0;
  currentUserId = null;
}

// ─── Sync FROM Supabase (login pull) ────────────────────────────────
export async function syncFromSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  if (isSyncRunning) {
    console.warn('syncFromSupabase: already running, skipping concurrent call');
    return true;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return true;

  isSyncRunning = true;
  isSyncing = true;
  try {
    // 0. Attempt to push offline data first before pulling from Supabase
    await retrySyncQueue();

    // 1. Fetch ALL data from Supabase FIRST — do NOT touch local DB yet
    // Timeout after 10s to prevent infinite loading screen if Supabase hangs
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Sync timeout — using cached local data')), 10_000)
    );

    const [
      categoriesRes,
      incomeCategoriesRes,
      expensesRes,
      incomesRes,
      recurringRes,
      debtsRes,
    ] = await Promise.race([
      Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('income_categories').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('incomes').select('*'),
        supabase.from('recurring_expenses').select('*'),
        supabase.from('debts').select('*'),
      ]),
      timeoutPromise,
    ]);

    // 2. Check for errors — if ANY fetch failed, abort and keep local data
    const results = [
      { name: 'categories', ...categoriesRes },
      { name: 'income_categories', ...incomeCategoriesRes },
      { name: 'expenses', ...expensesRes },
      { name: 'incomes', ...incomesRes },
      { name: 'recurring_expenses', ...recurringRes },
      { name: 'debts', ...debtsRes },
    ];
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      for (const e of errors) {
        console.error(`Fetch failed [${e.name}]:`, e.error);
      }
      throw new Error('Sync failed — local data preserved');
    }

    // 3. All fetches succeeded — now safe to clear and refill local DB
    await Promise.all([
      db.expenses.clear(),
      db.incomes.clear(),
      db.categories.clear(),
      db.incomeCategories.clear(),
      db.recurringExpenses.clear(),
      db.debts.clear(),
    ]);

    if (categoriesRes.data?.length) await db.categories.bulkPut(mapRowsToLocal(categoriesRes.data) as any);
    if (incomeCategoriesRes.data?.length) await db.incomeCategories.bulkPut(mapRowsToLocal(incomeCategoriesRes.data) as any);
    if (expensesRes.data?.length) await db.expenses.bulkPut(mapRowsToLocal(expensesRes.data) as any);
    if (incomesRes.data?.length) await db.incomes.bulkPut(mapRowsToLocal(incomesRes.data) as any);
    if (recurringRes.data?.length) await db.recurringExpenses.bulkPut(mapRowsToLocal(recurringRes.data) as any);
    if (debtsRes.data?.length) await db.debts.bulkPut(mapRowsToLocal(debtsRes.data) as any);

    // Full sync succeeded — local DB now mirrors Supabase exactly.
    // Note: We deliberately DO NOT await db.table('_syncQueue').clear(); here.
    // Any items that failed to push in step 0 will remain in the queue to be retried later.

    console.log('Sync from Supabase complete');
    return true;
  } catch (error) {
    console.error('Error syncing from Supabase:', error);
    return false;
  } finally {
    isSyncing = false;
    isSyncRunning = false;
  }
}

// ─── Push ALL local data to Supabase (one-time migration) ──────────
export async function pushAllToSupabase(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const tables = [
    { local: db.categories, remote: 'categories' },
    { local: db.incomeCategories, remote: 'income_categories' },
    { local: db.expenses, remote: 'expenses' },
    { local: db.incomes, remote: 'incomes' },
    { local: db.recurringExpenses, remote: 'recurring_expenses' },
    { local: db.debts, remote: 'debts' },
  ];

  for (const { local, remote } of tables) {
    const rows = await local.toArray();
    if (!rows.length) continue;

    const snakeRows = rows.map((row: any) => {
      const snake = camelToSnake(row);
      snake.user_id = userId;
      return snake;
    });

    // Upsert in batches of 100
    for (let i = 0; i < snakeRows.length; i += 100) {
      const batch = snakeRows.slice(i, i + 100);
      const { error } = await supabase.from(remote).upsert(batch);
      if (error) console.error(`Migration push failed [${remote}]:`, error);
    }
  }

  console.log('Push all to Supabase complete');
}

// ─── Clear Supabase tables (for Settings.tsx clear/reset) ───────────
export async function clearSupabaseTables(supabaseTableNames: string[]): Promise<void> {
  if (!isSupabaseConfigured || !currentUserId) return;

  for (const table of supabaseTableNames) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', currentUserId);
    if (error) console.error(`Failed to clear Supabase table ${table}:`, error);
  }
}

// ─── Retry failed sync queue ────────────────────────────────────────
export async function retrySyncQueue(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const queue: SyncQueueItem[] = await db.table('_syncQueue').toArray();
    if (!queue.length) return;

    for (const item of queue) {
      try {
        if (item.operation === 'upsert') {
          const { error } = await supabase.from(item.table).upsert(item.payload);
          if (error) throw error;
        } else if (item.operation === 'delete') {
          const { error } = await supabase
            .from(item.table)
            .delete()
            .eq('id', item.payload.id)
            .eq('user_id', currentUserId!);
          if (error) throw error;
        }
        // Success — remove from queue
        await db.table('_syncQueue').delete(item.id);
      } catch (err) {
        // Increment retry count. DO NOT delete from queue automatically on failure.
        console.error(`Sync item retry failed. attempt: ${item.retryCount + 1}`, item);
        await db.table('_syncQueue').update(item.id, {
          retryCount: item.retryCount + 1,
        });
      }
    }
  } catch (err) {
    console.error('Error retrying sync queue:', err);
  }
}
