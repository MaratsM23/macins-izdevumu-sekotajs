import { db } from '../db';
import { supabase, isSupabaseConfigured } from '../supabase';
import { TABLE_MAP, camelToSnake, mapRowsToLocal } from './columnMapping';

// ─── State ───────────────────────────────────────────────────────────
let currentUserId: string | null = null;
let isSyncing = false;
const hookUnsubscribers: (() => void)[] = [];

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
export async function syncFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  isSyncing = true;
  try {
    // Clear local DB first
    await Promise.all([
      db.expenses.clear(),
      db.incomes.clear(),
      db.categories.clear(),
      db.incomeCategories.clear(),
      db.recurringExpenses.clear(),
      db.debts.clear(),
    ]);

    // Pull from Supabase and convert to local format
    const { data: categories } = await supabase.from('categories').select('*');
    if (categories?.length) await db.categories.bulkPut(mapRowsToLocal(categories) as any);

    const { data: incomeCategories } = await supabase.from('income_categories').select('*');
    if (incomeCategories?.length) await db.incomeCategories.bulkPut(mapRowsToLocal(incomeCategories) as any);

    const { data: expenses } = await supabase.from('expenses').select('*');
    if (expenses?.length) await db.expenses.bulkPut(mapRowsToLocal(expenses) as any);

    const { data: incomes } = await supabase.from('incomes').select('*');
    if (incomes?.length) await db.incomes.bulkPut(mapRowsToLocal(incomes) as any);

    const { data: recurring } = await supabase.from('recurring_expenses').select('*');
    if (recurring?.length) await db.recurringExpenses.bulkPut(mapRowsToLocal(recurring) as any);

    const { data: debts } = await supabase.from('debts').select('*');
    if (debts?.length) await db.debts.bulkPut(mapRowsToLocal(debts) as any);

    console.log('Sync from Supabase complete');
  } catch (error) {
    console.error('Error syncing from Supabase:', error);
  } finally {
    isSyncing = false;
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
        // Increment retry count, remove if too many retries
        if (item.retryCount >= 5) {
          console.error(`Dropping sync item after 5 retries:`, item);
          await db.table('_syncQueue').delete(item.id);
        } else {
          await db.table('_syncQueue').update(item.id, {
            retryCount: item.retryCount + 1,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error retrying sync queue:', err);
  }
}
