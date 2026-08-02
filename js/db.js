import Dexie from 'dexie';

// Initialize Dexie IndexedDB
export const db = new Dexie('FinanceTrackerDB');

db.version(1).stores({
  transactions: '++id, title, amount, type, category, context, date'
});

export async function addTransaction(transaction) {
  return await db.transactions.add({
    ...transaction,
    date: transaction.date || new Date().toISOString()
  });
}

export async function getTransactionsByContext(context) {
  return await db.transactions
    .where('context')
    .equals(context)
    .reverse()
    .sortBy('date');
}

export async function getFinancialSummary(context) {
  const transactions = await getTransactionsByContext(context);
  
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    income,
    expenses,
    net: income - expenses
  };
}