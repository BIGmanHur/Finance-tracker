import '../src/styles.css';
import { db, addTransaction } from './db.js';
import { renderCurrentView, setupEventListeners, navigateToView, setupModalListeners, setupImportExportListeners } from './ui.js';

async function initApp() {
  console.log('🌱 Finance Tracker initializing...');

  // Setup UI Listeners & Modal
  setupEventListeners();
  setupModalListeners(() => {
    renderCurrentView(); // Re-renders the active view whenever a transaction is saved
  });

  setupImportExportListeners();

  try {
    // Seed initial demo data if database is empty
    const count = await db.transactions.count();
    if (count === 0) {
      console.log('Seeding initial data...');

      await addTransaction({
        title: 'Client Project Payment',
        amount: 13420,
        type: 'income',
        category: 'Services',
        context: 'business'
      });

      await addTransaction({
        title: 'Office Rent & Supplies',
        amount: 8230,
        type: 'expense',
        category: 'Rent',
        context: 'business'
      });

      await addTransaction({
        title: 'Monthly Salary',
        amount: 15000,
        type: 'income',
        category: 'Salary',
        context: 'personal'
      });

      await addTransaction({
        title: 'Supermarket Grocery Shopping',
        amount: 1250,
        type: 'expense',
        category: 'Food',
        context: 'personal'
      });
    }

    // Render active view
    await renderCurrentView();

  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Safely boot app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => console.log('✅ Service Worker registered:', reg.scope))
      .catch((err) => console.error('❌ Service Worker failed:', err));
  });
}