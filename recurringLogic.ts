import { db } from './db';
import { RecurringExpense, Frequency, Expense } from './types';
import { getTodayStr } from './utils';

// Helper to parse YYYY-MM-DD into a local Date object
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper to format Date object into YYYY-MM-DD
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function advanceDate(date: Date, frequency: Frequency): Date {
  const newDate = new Date(date);
  switch (frequency) {
    case 'daily':
      newDate.setDate(newDate.getDate() + 1);
      break;
    case 'weekly':
      newDate.setDate(newDate.getDate() + 7);
      break;
    case 'monthly':
      {
        const originalDay = newDate.getDate();
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + 1);
        const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
        newDate.setDate(Math.min(originalDay, lastDay));
      }
      break;
    case 'yearly':
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
  }
  return newDate;
}

export async function processRecurringExpenses() {
  const todayStr = getTodayStr();
  const todayDate = parseLocalDate(todayStr);
  
  // Fixed: Use toArray() and filter in JS instead of .where('isActive').equals(1).
  // This prevents "DataError: The parameter is not a valid key" which can occur
  // if the environment doesn't support boolean keys in IndexedDB or if there's a type mismatch.
  const allTemplates = await db.recurringExpenses.toArray();
  const templates = allTemplates.filter(t => t.isActive);

  for (const template of templates) {
    const newExpenses: Expense[] = [];
    let lastGeneratedDateStr = template.lastGeneratedDate;
    
    // Case 1: Never generated before
    if (!lastGeneratedDateStr) {
      const start = parseLocalDate(template.startDate);
      // Only generate if start date is today or in the past
      if (start <= todayDate) {
        newExpenses.push(createExpenseObject(template, template.startDate, true));
        lastGeneratedDateStr = template.startDate;
      } else {
        continue; // Future start date, skip
      }
    }

    // Case 2: Fill gaps until today
    // Calculate the next expected date based on the LAST generated date
    let nextOccurrenceDate = advanceDate(parseLocalDate(lastGeneratedDateStr), template.frequency);
    
    while (nextOccurrenceDate <= todayDate) {
      const dateStr = formatLocalDate(nextOccurrenceDate);
      newExpenses.push(createExpenseObject(template, dateStr, true));
      lastGeneratedDateStr = dateStr;
      nextOccurrenceDate = advanceDate(nextOccurrenceDate, template.frequency);
    }

    if (newExpenses.length > 0) {
      await db.expenses.bulkAdd(newExpenses);
      await db.recurringExpenses.update(template.id, { 
        lastGeneratedDate: lastGeneratedDateStr 
      });
    }
  }
}

function createExpenseObject(template: RecurringExpense, date: string, isAuto: boolean): Expense {
  return {
    id: crypto.randomUUID(),
    amount: template.amount,
    currency: 'EUR',
    date: date,
    categoryId: template.categoryId,
    note: `[${isAuto ? 'Auto' : 'Manuāls'}] ${template.note || ''}`.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
