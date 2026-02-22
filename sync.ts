import { db } from './db';
import { supabase } from './supabase';

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

        // 1. Categories
        const { data: categories } = await supabase.from('categories').select('*');
        if (categories) await db.categories.bulkPut(categories);

        // 2. Income Categories
        const { data: incomeCategories } = await supabase.from('income_categories').select('*');
        if (incomeCategories) await db.incomeCategories.bulkPut(incomeCategories);

        // 3. Expenses
        const { data: expenses } = await supabase.from('expenses').select('*');
        if (expenses) await db.expenses.bulkPut(expenses);

        // 4. Incomes
        const { data: incomes } = await supabase.from('incomes').select('*');
        if (incomes) await db.incomes.bulkPut(incomes);

        // 5. Recurring Expenses
        const { data: recurring } = await supabase.from('recurring_expenses').select('*');
        if (recurring) await db.recurringExpenses.bulkPut(recurring);

        // 6. Debts
        const { data: debts } = await supabase.from('debts').select('*');
        if (debts) await db.debts.bulkPut(debts);

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
