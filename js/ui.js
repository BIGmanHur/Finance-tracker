import Chart from 'chart.js/auto';
import { db, addTransaction, getFinancialSummary, getTransactionsByContext } from './db.js';

// 1. Render Insights Overview
export async function renderInsightsView() {
  const container = document.getElementById('insights-container'); // Adjust to your actual HTML container ID
  if (!container) return;

  try {
    const transactions = await db.transactions.toArray();

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    transactions.forEach(tx => {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }

      // Track by category
      if (!categoryBreakdown[tx.category]) {
        categoryBreakdown[tx.category] = 0;
      }
      categoryBreakdown[tx.category] += amount;
    });

    const netBalance = totalIncome - totalExpense;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-gray-500 text-sm font-medium">Total Income</h3>
          <p class="text-2xl font-bold text-green-600">+${totalIncome.toFixed(2)}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-gray-500 text-sm font-medium">Total Expenses</h3>
          <p class="text-2xl font-bold text-red-600">-${totalExpense.toFixed(2)}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="text-gray-500 text-sm font-medium">Net Balance</h3>
          <p class="text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}">${netBalance.toFixed(2)}</p>
        </div>
      </div>
      
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Spending by Category</h3>
        <ul class="divide-y divide-gray-200">
          ${Object.keys(categoryBreakdown).length === 0 ? '<p class="text-gray-500">No data available.</p>' : ''}
          ${Object.entries(categoryBreakdown).map(([category, amount]) => `
            <li class="py-2 flex justify-between items-center">
              <span class="font-medium text-gray-700">${category}</span>
              <span class="font-semibold text-gray-900">${amount.toFixed(2)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  } catch (error) {
    console.error('Error rendering insights:', error);
  }
}

// 2. Render Report Overview
export async function renderReportsView() {
  const container = document.getElementById('reports-container'); // Adjust to your actual HTML container ID
  if (!container) return;

  try {
    const transactions = await db.transactions.orderBy('date').reverse().toArray();

    container.innerHTML = `
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">Transaction Report Summary</h3>
        <p class="text-sm text-gray-500 mb-4">Showing total records: ${transactions.length}</p>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${transactions.length === 0 ? `<tr><td colspan="5" class="px-4 py-4 text-center text-gray-500">No transactions found.</td></tr>` : ''}
              ${transactions.map(tx => `
                <tr>
                  <td class="px-4 py-2 text-sm text-gray-600">${new Date(tx.date).toLocaleDateString()}</td>
                  <td class="px-4 py-2 text-sm font-medium text-gray-900">${tx.title}</td>
                  <td class="px-4 py-2 text-sm text-gray-600">${tx.category}</td>
                  <td class="px-4 py-2 text-sm">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      ${tx.type}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-sm text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}">
                    ${tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error rendering reports:', error);
  }
}
const CURRENCY = 'KSh';
let currentContext = 'business';
let activeView = 'dashboard';

let donutChartInstance = null;
let lineChartInstance = null;

// --- 1. PAGE NAVIGATION ROUTER ---
export function navigateToView(viewName) {
  if (viewName === 'insights') {
    renderInsightsView();
  } else if (viewName === 'reports') {
    renderReportsView();
  }
  activeView = viewName;

  // Sync window hash seamlessly
  if (window.location.hash !== `#${viewName}`) {
    history.pushState(null, '', `#${viewName}`);
  }

  // Hide all sections, show active section
  document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.remove('hidden');
  }

  // Update header text
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    pageTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1) + ' Overview';
  }

  // Highlight active link in sidebar & bottom nav
  document.querySelectorAll('.nav-link').forEach(link => {
    const isTarget = link.getAttribute('data-nav') === viewName;
    if (isTarget) {
      link.classList.add('bg-emerald-500/10', 'text-emerald-400', 'font-semibold');
      link.classList.remove('text-slate-400');
    } else {
      link.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'font-semibold');
      link.classList.add('text-slate-400');
    }
  });

  // Render content for active view
  renderCurrentView();
}

// --- 2. CONTEXT SWITCHER (BUSINESS / PERSONAL) ---
export async function switchContext(context) {
  currentContext = context;
  const btnBusiness = document.getElementById('btn-business');
  const btnPersonal = document.getElementById('btn-personal');

  if (context === 'business') {
    if (btnBusiness) btnBusiness.className = 'px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-medium';
    if (btnPersonal) btnPersonal.className = 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white';
  } else {
    if (btnBusiness) btnBusiness.className = 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white';
    if (btnPersonal) btnPersonal.className = 'px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-medium';
  }

  await renderCurrentView();
}

// --- 3. VIEW DISPATCHER ---
export async function renderCurrentView() {
  if (activeView === 'dashboard') {
    await renderDashboard();
  } else if (activeView === 'transactions') {
    await renderTransactionsPage();
  } else if (activeView === 'insights') {
    await renderInsightsPage();
  } else if (activeView === 'reports') {
    await renderReportsPage();
  }
}

// --- 4. DASHBOARD & CHARTS ---
export async function renderDashboard() {
  const summary = await getFinancialSummary(currentContext);

  const elIncome = document.getElementById('stat-income');
  const elExpenses = document.getElementById('stat-expenses');
  const elNet = document.getElementById('stat-net');

  if (elIncome) elIncome.textContent = `${CURRENCY} ${summary.income.toLocaleString()}`;
  if (elExpenses) elExpenses.textContent = `${CURRENCY} ${summary.expenses.toLocaleString()}`;
  if (elNet) elNet.textContent = `${CURRENCY} ${summary.net.toLocaleString()}`;

  const transactions = await getTransactionsByContext(currentContext);
  renderTransactionsList('transactions-list', transactions);
  renderCharts(transactions);
}

function renderCharts(transactions) {
  const categoryMap = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cat = t.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
    });

  const donutLabels = Object.keys(categoryMap);
  const donutData = Object.values(categoryMap);

  const donutEl = document.getElementById('chart-donut');
  if (donutEl) {
    if (donutChartInstance) donutChartInstance.destroy();
    donutChartInstance = new Chart(donutEl, {
      type: 'doughnut',
      data: {
        labels: donutLabels.length ? donutLabels : ['No Expenses'],
        datasets: [{
          data: donutData.length ? donutData : [1],
          backgroundColor: ['#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } }
        }
      }
    });
  }

  const lineEl = document.getElementById('chart-line');
  if (lineEl) {
    if (lineChartInstance) lineChartInstance.destroy();

    const lineLabels = transactions.map((_, i) => `T${i + 1}`);
    const lineData = transactions.map(t => Number(t.amount));

    lineChartInstance = new Chart(lineEl, {
      type: 'line',
      data: {
        labels: lineLabels.length ? lineLabels : ['No Data'],
        datasets: [{
          label: 'Amount',
          data: lineData.length ? lineData : [0],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { display: false } },
          y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
        }
      }
    });
  }
}

// --- 5. RENDER TRANSACTIONS & SUB-PAGES ---
export function renderTransactionsList(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-sm">No transactions found.</p>';
    return;
  }

  container.innerHTML = transactions.map(item => `
    <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-800">
      <div>
        <p class="font-semibold text-sm text-slate-100">${item.title}</p>
        <p class="text-xs text-slate-400">${item.category || 'General'} • ${item.date || 'Today'}</p>
      </div>
      <span class="font-bold text-sm ${item.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">
        ${item.type === 'income' ? '+' : '-'} ${CURRENCY} ${Number(item.amount).toLocaleString()}
      </span>
    </div>
  `).join('');
}

export async function renderTransactionsPage() {
  const transactions = await getTransactionsByContext(currentContext);
  renderTransactionsList('tx-list', transactions);
}

export async function renderInsightsPage() {
  const summary = await getFinancialSummary(currentContext);
  const el = document.getElementById('insight-summary');
  if (el) {
    el.textContent = `For the active (${currentContext}) context, your total savings rate is ${summary.income ? Math.round((summary.net / summary.income) * 100) : 0}%.`;
  }
}

export async function renderReportsPage() {
  const summary = await getFinancialSummary(currentContext);
  const el = document.getElementById('report-summary');
  if (el) {
    el.textContent = `Total Income: ${CURRENCY} ${summary.income} | Total Expenses: ${CURRENCY} ${summary.expenses}`;
  }
}
// --- CSV EXPORT & IMPORT ---
export async function exportToCSV() {
  const transactions = await db.transactions.toArray();
  
  if (transactions.length === 0) {
    alert('No transactions to export!');
    return;
  }

  const headers = ['Title', 'Amount', 'Type', 'Category', 'Context', 'Date'];
  const csvRows = [headers.join(',')];

  transactions.forEach(tx => {
    const row = [
      `"${tx.title.replace(/"/g, '""')}"`,
      tx.amount,
      tx.type,
      tx.category,
      tx.context,
      tx.date
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance_tracker_backup_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromCSV(file) {
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    const text = e.target.result;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length <= 1) {
      alert('CSV file appears to be empty.');
      return;
    }

    let importedCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(col => col.replace(/^"|"$/g, '').trim());
      
      if (cols.length >= 6) {
        await addTransaction({
          title: cols[0],
          amount: parseFloat(cols[1]) || 0,
          type: cols[2],
          category: cols[3],
          context: cols[4],
          date: cols[5]
        });
        importedCount++;
      }
    }

    alert(`Successfully imported ${importedCount} transactions!`);
    await renderCurrentView();
  };

  reader.readAsText(file);
}

// --- 6. EVENT LISTENERS SETUP ---
export function setupEventListeners() {
  const btnBusiness = document.getElementById('btn-business');
  const btnPersonal = document.getElementById('btn-personal');

  const modal = document.getElementById('add-modal');
  const openBtns = document.querySelectorAll('a[href="#add"]');
  const closeBtn = document.getElementById('close-modal-btn');
  const form = document.getElementById('transaction-form');
  const clearDbBtn = document.getElementById('btn-clear-db');

  // CSV Export & Import Listeners
  const exportBtn = document.getElementById('export-csv-btn');
  const importInput = document.getElementById('import-csv-input');

  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importFromCSV(e.target.files[0]);
      }
    });
  }

  if (btnBusiness && btnPersonal) {
    btnBusiness.addEventListener('click', () => switchContext('business'));
    btnPersonal.addEventListener('click', () => switchContext('personal'));
  }

  // Modal Controls
  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('tx-title')?.value;
      const amount = parseFloat(document.getElementById('tx-amount')?.value);
      const type = document.getElementById('tx-type')?.value;
      const category = document.getElementById('tx-category')?.value;

      if (title && !isNaN(amount)) {
        await addTransaction({
          title,
          amount,
          type,
          category,
          context: currentContext,
          date: new Date().toLocaleDateString()
        });
        form.reset();
        if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
        await renderCurrentView();
      }
    });
  }

  // Clear Database Button
  if (clearDbBtn) {
    clearDbBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all data?')) {
        await db.transactions.clear();
        await renderCurrentView();
        alert('All transactions cleared!');
      }
    });
  }

  // Handle URL navigation / back button
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateToView(hash);
  });
}
export function setupModalListeners(onTransactionAdded) {
  const modal = document.getElementById('transaction-modal');
  const openBtn = document.getElementById('open-modal-btn');
  const closeBtn = document.getElementById('close-modal-btn');
  const form = document.getElementById('add-transaction-form');
  const dateInput = document.getElementById('tx-date');

  // Set default date picker to today
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Open modal
  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  }

  // Close modal with 'X' button
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  // Close modal when clicking background overlay
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newTransaction = {
        title: document.getElementById('tx-title').value,
        amount: parseFloat(document.getElementById('tx-amount').value),
        type: document.getElementById('tx-type').value,
        category: document.getElementById('tx-category').value,
        context: document.getElementById('tx-context').value,
        date: document.getElementById('tx-date').value
      };

      // Save to Dexie IndexedDB
      await addTransaction(newTransaction);

      // Reset form & hide modal
      form.reset();
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      modal.classList.add('hidden');
      modal.classList.remove('flex');

      // Refresh dashboard live
      if (onTransactionAdded) {
        onTransactionAdded();
      }
    });
  }
}
export function setupImportExportListeners() {
  const exportBtn = document.getElementById('export-csv-btn');
  const importBtn = document.getElementById('import-csv-btn');
  const fileInput = document.getElementById('csv-file-input');

  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        importFromCSV(file);
        fileInput.value = ''; // Reset file input so the same file can be chosen again
      }
    });
  }
}