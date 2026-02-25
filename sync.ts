import { db } from './db';
import { supabase } from './supabase';

const toNumber = (value: number | string | null | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

export const syncFromSupabase = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
        // 1. Categories
        const { data: categories, error: categoriesError } = await supabase.from('categories').select('*').eq('user_id', session.user.id);
        if (categoriesError) throw categoriesError;
        if (categories) {
            await db.categories.bulkPut(categories.map((cat: any) => ({
                id: cat.id,
                name: cat.name,
                isArchived: !!cat.is_archived,
                isInvestment: !!cat.is_investment,
                targetAmount: cat.target_amount !== null ? toNumber(cat.target_amount) : undefined,
                initialBalance: cat.initial_balance !== null ? toNumber(cat.initial_balance) : undefined,
                description: cat.description || undefined,
                monthlyBudget: cat.monthly_budget !== null ? toNumber(cat.monthly_budget) : undefined,
                createdAt: toNumber(cat.created_at),
                updatedAt: toNumber(cat.updated_at)
            })));
        }

        // 2. Income Categories
        const { data: incomeCategories, error: incomeCategoriesError } = await supabase.from('income_categories').select('*').eq('user_id', session.user.id);
        if (incomeCategoriesError) throw incomeCategoriesError;
        if (incomeCategories) {
            await db.incomeCategories.bulkPut(incomeCategories.map((cat: any) => ({
                id: cat.id,
                name: cat.name,
                isArchived: !!cat.is_archived,
                createdAt: toNumber(cat.created_at),
                updatedAt: toNumber(cat.updated_at)
            })));
        }

        // 3. Expenses
        const { data: expenses, error: expensesError } = await supabase.from('expenses').select('*').eq('user_id', session.user.id);
        if (expensesError) throw expensesError;
        if (expenses) {
            await db.expenses.bulkPut(expenses.map((expense: any) => ({
                id: expense.id,
                amount: toNumber(expense.amount),
                currency: expense.currency || 'EUR',
                date: expense.date,
                categoryId: expense.category_id,
                note: expense.note || undefined,
                debtId: expense.debt_id || undefined,
                sourceCategoryId: expense.source_category_id || undefined,
                createdAt: toNumber(expense.created_at),
                updatedAt: toNumber(expense.updated_at)
            })));
        }

        // 4. Incomes
        const { data: incomes, error: incomesError } = await supabase.from('incomes').select('*').eq('user_id', session.user.id);
        if (incomesError) throw incomesError;
        if (incomes) {
            await db.incomes.bulkPut(incomes.map((income: any) => ({
                id: income.id,
                amount: toNumber(income.amount),
                currency: income.currency || 'EUR',
                date: income.date,
                categoryId: income.category_id,
                note: income.note || undefined,
                sourceCategoryId: income.source_category_id || undefined,
                createdAt: toNumber(income.created_at),
                updatedAt: toNumber(income.updated_at)
            })));
        }

        // 5. Recurring Expenses
        const { data: recurring, error: recurringError } = await supabase.from('recurring_expenses').select('*').eq('user_id', session.user.id);
        if (recurringError) throw recurringError;
        if (recurring) {
            await db.recurringExpenses.bulkPut(recurring.map((item: any) => ({
                id: item.id,
                amount: toNumber(item.amount),
                categoryId: item.category_id,
                frequency: item.frequency,
                startDate: item.start_date,
                lastGeneratedDate: item.last_generated_date || undefined,
                note: item.note || undefined,
                isActive: !!item.is_active,
                createdAt: toNumber(item.created_at)
            })));
        }

        // 6. Debts
        const { data: debts, error: debtsError } = await supabase.from('debts').select('*').eq('user_id', session.user.id);
        if (debtsError) throw debtsError;
        if (debts) {
            await db.debts.bulkPut(debts.map((debt: any) => ({
                id: debt.id,
                title: debt.title,
                totalAmount: toNumber(debt.total_amount),
                remainingAmount: toNumber(debt.remaining_amount),
                monthlyPayment: toNumber(debt.monthly_payment),
                dueDateDay: toNumber(debt.due_date_day),
                categoryId: debt.category_id || '',
                isPaidOff: !!debt.is_paid_off,
                createdAt: toNumber(debt.created_at),
                updatedAt: toNumber(debt.updated_at)
            })));
        }

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
