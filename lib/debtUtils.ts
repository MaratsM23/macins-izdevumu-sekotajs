import { db } from '../db';

/**
 * Finds the best expense category ID for a debt payment by matching the debt title.
 * Priority: exact name match → partial match (non-investment) → generic loan keywords
 * → "Citi" → any non-investment, non-archived → fallback to cats[0].
 */
export async function findDebtCategoryId(debtTitle: string): Promise<string | null> {
  const cats = await db.categories.toArray();
  const title = debtTitle.toLowerCase();
  const found =
    cats.find(c => c.name.toLowerCase() === title) ||
    cats.find(c => !c.isInvestment && (c.name.toLowerCase().includes(title) || title.includes(c.name.toLowerCase()))) ||
    cats.find(c => !c.isInvestment && (c.name.toLowerCase().includes('kred') || c.name.toLowerCase().includes('līz'))) ||
    cats.find(c => c.name === 'Citi') ||
    cats.find(c => !c.isInvestment && !c.isArchived) ||
    cats[0];
  return found?.id ?? null;
}
