import { db } from './db';
import { supabase } from './supabase';

// Convert snake_case keys from Supabase to camelCase for local Dexie DB
const snakeToCamel = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        if (key === 'user_id') continue; // skip, not stored locally
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
};

const mapRows = (rows: any[] | null) => rows ? rows.map(snakeToCamel) : [];

export const syncFromSupabase = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
        // Clear local data first to avoid mixing accounts
        await Promise.all([
            db.expenses.clear(),
            db.incomes.clear(),
            db.categories.clear(),
            db.incomeCategories.clear(),
            db.recurringExpenses.clear(),
            db.debts.clear(),
        ]);

        const { data: categories } = await supabase.from('categories').select('*');
        if (categories?.length) await db.categories.bulkPut(mapRows(categories) as any);

        const { data: incomeCategories } = await supabase.from('income_categories').select('*');
        if (incomeCategories?.length) await db.incomeCategories.bulkPut(mapRows(incomeCategories) as any);

        const { data: expenses } = await supabase.from('expenses').select('*');
        if (expenses?.length) await db.expenses.bulkPut(mapRows(expenses) as any);

        const { data: incomes } = await supabase.from('incomes').select('*');
        if (incomes?.length) await db.incomes.bulkPut(mapRows(incomes) as any);

        const { data: recurring } = await supabase.from('recurring_expenses').select('*');
        if (recurring?.length) await db.recurringExpenses.bulkPut(mapRows(recurring) as any);

        const { data: debts } = await supabase.from('debts').select('*');
        if (debts?.length) await db.debts.bulkPut(mapRows(debts) as any);

        console.log('Sync from Supabase complete');
    } catch (error) {
        console.error('Error syncing from Supabase:', error);
    }
};

// Example function to push a single record.
// For a production app, you might want a queue system for offline mutations.
export const pushExpenseToSupabase = async (expense: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('expenses').upsert({
        id: expense.id,
        user_id: session.user.id,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        category_id: expense.categoryId,
        note: expense.note,
        debt_id: expense.debtId,
        source_category_id: expense.sourceCategoryId,
        created_at: expense.createdAt,
        updated_at: expense.updatedAt
    });

    if (error) console.error('Failed to push expense:', error);
};
