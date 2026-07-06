// ==========================================
// EMOFINANCE — AI FINANCE COPILOT
// Core Application Logic
// ==========================================

// --- Application State Management ---
// --- state ---
let state = {
    transactions: JSON.parse(localStorage.getItem('emofinance_txns')) || [],
    budgets: JSON.parse(localStorage.getItem('emofinance_budgets')) || [],
    goals: JSON.parse(localStorage.getItem('emofinance_goals')) || [],
    currency: localStorage.getItem('emofinance_currency') || 'INR'
};

const CATEGORIES = [
    { id: 'Food', icon: '🍔' },
    { id: 'Rent', icon: '🏠' },
    { id: 'Transport', icon: '🚗' },
    { id: 'Entertainment', icon: '🎬' },
    { id: 'Shopping', icon: '🛍️' },
    { id: 'Salary', icon: '💰' },
    { id: 'Investment', icon: '📈' },
    { id: 'Utilities', icon: '⚡' },
    { id: 'Other', icon: '📦' }
];

// --- DOM Elements and Caching ---
// --- dom elements ---
const el = (id) => document.getElementById(id);
const bootScreen = el('bootScreen');
const appShell = el('appShell');

// --- Initialization & Boot Sequence ---
// --- init ---
window.addEventListener('load', () => {
    setTimeout(() => {
        bootScreen.style.opacity = '0';
        setTimeout(() => {
            bootScreen.style.display = 'none';
            appShell.style.display = 'flex';
            initApp();
        }, 300);
    }, 800);
});

function initApp() {
    setupNavigation();
    setupModals();
    populateSelects();
    updateDashboard();
    renderTransactions();
    renderBudgets();
    renderGoals();
}

// --- View Routing & Navigation ---
// --- navigation ---
const views = ['overview', 'transactions', 'budgets', 'goals', 'ai', 'settings'];
let currentView = 'overview'; // Default view on load

function setupNavigation() {
    const navList = el('navList');
    views.forEach(v => {
        const li = document.createElement('li');
        li.className = `nav-item ${v === currentView ? 'active' : ''}`;
        li.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
            <span style="text-transform: capitalize;">${v}</span>
        `;
        li.onclick = () => switchView(v);
        navList.appendChild(li);
    });

    el('sidebarAddBtn').innerText = '+ New Transaction';
    el('topbarAddBtn').innerText = '+ Add';
    el('topbarDate').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Wire up global nav buttons
    document.querySelectorAll('[data-nav]').forEach(btn => {
        btn.onclick = () => switchView(btn.getAttribute('data-nav'));
    });
}

function switchView(view) {
    currentView = view;
    // Update Sidebar
    document.querySelectorAll('.nav-item').forEach((li, i) => {
        li.classList.toggle('active', views[i] === view);
    });
    // Update Views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    el(`view-${view}`).classList.add('active');
    // Update Topbar
    el('topbarTitle').innerText = view.charAt(0).toUpperCase() + view.slice(1);

    if(view === 'overview') updateDashboard();
    if(view === 'transactions') renderTransactions();
    if(view === 'budgets') renderBudgets();
    if(view === 'goals') renderGoals();
}

// --- Utility & Formatting Functions ---
// --- formatting ---
/**
 * Formats a given amount into the selected currency.
 */
function formatMoney(amount) {
    const sym = state.currency === 'INR' ? '₹' : state.currency === 'USD' ? '$' : state.currency === 'EUR' ? '€' : '£';
    return sym + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Returns the emoji icon for a given category name.
 */
function getCatIcon(catName) {
    const cat = CATEGORIES.find(c => c.id === catName);
    return cat ? cat.icon : '📦';
}

// --- Dashboard Logic ---
let trendChartInstance, catChartInstance;

function updateDashboard() {
    let income = 0, expense = 0;
    state.transactions.forEach(t => {
        if(t.type === 'income') income += t.amount;
        else expense += t.amount;
    });
    
    const balance = income - expense;
    
    el('statGrid').innerHTML = `
        <div class="glass stat-card">
            <div class="stat-icon" style="background:var(--violet-soft); color:var(--violet-2)">💰</div>
            <div>
                <div class="stat-label">Total Balance</div>
                <div class="stat-value">${formatMoney(balance)}</div>
            </div>
        </div>
        <div class="glass stat-card">
            <div class="stat-icon" style="background:var(--teal-soft); color:var(--teal-2)">📈</div>
            <div>
                <div class="stat-label">Total Income</div>
                <div class="stat-value">${formatMoney(income)}</div>
            </div>
        </div>
        <div class="glass stat-card">
            <div class="stat-icon" style="background:var(--coral-soft); color:var(--coral)">📉</div>
            <div>
                <div class="stat-label">Total Expense</div>
                <div class="stat-value">${formatMoney(expense)}</div>
            </div>
        </div>
        <div class="glass stat-card">
            <div class="stat-icon" style="background:rgba(255,255,255,0.1); color:#fff">🎯</div>
            <div>
                <div class="stat-label">Transactions</div>
                <div class="stat-value">${state.transactions.length}</div>
            </div>
        </div>
    `;

    // AI Insights Generator (Rule Based)
    const insights = [];
    if(expense > income && income > 0) insights.push("⚠️ You have spent more than you earned this period.");
    if(state.transactions.length === 0) insights.push("👋 Welcome to EmoFinance! Add some transactions to get started.");
    if(expense > 0 && income > 0 && (expense/income) < 0.5) insights.push("🌟 Great job! Your expenses are less than 50% of your income.");
    
    if(insights.length === 0) insights.push("📊 Tracking your finances is the first step to wealth.");

    el('insightRow').innerHTML = insights.map(i => `
        <div class="glass insight-card">
            <div class="glow">✨</div>
            <div class="insight-text">${i}</div>
        </div>
    `).join('');

    renderCharts();
    
    // Recent Txns
    const recent = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    el('recentTxns').innerHTML = recent.length ? recent.map(t => `
        <div class="recurring-item">
            <div class="txn-desc-cell">
                <div class="txn-icon" style="background:var(--ink-2)">${getCatIcon(t.category)}</div>
                <div>
                    <div class="txn-desc-main">${t.desc}</div>
                    <div class="txn-desc-sub">${t.date} • ${t.category}</div>
                </div>
            </div>
            <div class="txn-amt ${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
        </div>
    `).join('') : '<div class="empty-state">No transactions yet</div>';
}

function renderCharts() {
    const ctxTrend = el('trendChart').getContext('2d');
    const ctxCat = el('categoryChart').getContext('2d');

    // Aggregate by category for expenses
    const catData = {};
    state.transactions.filter(t => t.type === 'expense').forEach(t => {
        catData[t.category] = (catData[t.category] || 0) + t.amount;
    });
    
    const labels = Object.keys(catData);
    const data = Object.values(catData);

    if(catChartInstance) catChartInstance.destroy();
    catChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Empty'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: data.length ? ['#8b5cf6', '#2dd4bf', '#fb7185', '#fbbf24', '#e7e9f3'] : ['#212842'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' }
    });

    el('categoryLegend').innerHTML = labels.map((l, i) => `
        <div class="legend-row">
            <div class="legend-dot" style="background: ${['#8b5cf6', '#2dd4bf', '#fb7185', '#fbbf24', '#e7e9f3'][i % 5]}"></div>
            <div class="legend-name">${l}</div>
            <div class="legend-amt">${formatMoney(catData[l])}</div>
        </div>
    `).join('');

    // Mock trend for now
    if(trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Expenses',
                data: [120, 190, 300, 250],
                borderColor: '#fb7185',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- Transactions Logic ---
function renderTransactions() {
    const tbody = el('txnTableBody');
    const sorted = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if(sorted.length === 0) {
        tbody.innerHTML = '';
        el('txnEmptyState').innerHTML = '<div class="empty-state"><h3>No transactions found</h3><p>Click + Add to create one.</p></div>';
        return;
    }
    el('txnEmptyState').innerHTML = '';

    tbody.innerHTML = sorted.map(t => `
        <tr>
            <td>
                <div class="txn-desc-cell">
                    <div class="txn-icon" style="background:var(--ink-2)">${getCatIcon(t.category)}</div>
                    <div>
                        <div class="txn-desc-main">${t.desc}</div>
                    </div>
                </div>
            </td>
            <td>${t.category}</td>
            <td>${t.date}</td>
            <td class="txn-amt ${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</td>
            <td>
                <div class="row-actions">
                    <button class="btn btn-ghost btn-icon" onclick="deleteTxn('${t.id}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function deleteTxn(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    renderTransactions();
    if(currentView === 'overview') updateDashboard();
}

// --- Modals & Forms ---
let txnType = 'expense';

function setupModals() {
    // Transaction Modal
    const openTxn = () => { el('txnModalOverlay').classList.add('open'); };
    const closeTxn = () => { el('txnModalOverlay').classList.remove('open'); };
    
    el('sidebarAddBtn').addEventListener('click', openTxn);
    el('topbarAddBtn').addEventListener('click', openTxn);
    el('txnCancelBtn').addEventListener('click', closeTxn);
    
    document.querySelectorAll('#txnTypeSeg button').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('#txnTypeSeg button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            txnType = e.target.getAttribute('data-type');
        };
    });

    el('txnSaveBtn').onclick = () => {
        const amount = Number(el('txnAmount').value);
        const desc = el('txnDesc').value;
        const cat = el('txnCategory').value;
        const date = el('txnDate').value;
        
        if(!amount || !desc || !date) return alert("Please fill all fields");
        
        state.transactions.push({
            id: Date.now().toString(),
            amount, desc, category: cat, date, type: txnType
        });
        
        saveState();
        closeTxn();
        el('txnAmount').value = '';
        el('txnDesc').value = '';
        if(currentView === 'overview') updateDashboard();
        if(currentView === 'transactions') renderTransactions();
    };

    // Budget Modal
    el('addBudgetBtn').onclick = () => el('budgetModalOverlay').classList.add('open');
    el('budgetCancelBtn').onclick = () => el('budgetModalOverlay').classList.remove('open');
    el('budgetSaveBtn').onclick = () => {
        const cat = el('budgetCategory').value;
        const limit = Number(el('budgetLimit').value);
        if(!limit) return;
        state.budgets = state.budgets.filter(b => b.category !== cat); // remove old
        state.budgets.push({ category: cat, limit });
        saveState();
        el('budgetModalOverlay').classList.remove('open');
        renderBudgets();
    };

    // Goal Modal
    el('addGoalBtn').onclick = () => el('goalModalOverlay').classList.add('open');
    el('goalCancelBtn').onclick = () => el('goalModalOverlay').classList.remove('open');
    el('goalSaveBtn').onclick = () => {
        const name = el('goalName').value;
        const target = Number(el('goalTarget').value);
        const saved = Number(el('goalSaved').value);
        if(!name || !target) return;
        state.goals.push({ id: Date.now().toString(), name, target, saved });
        saveState();
        el('goalModalOverlay').classList.remove('open');
        renderGoals();
    };
}

function populateSelects() {
    const catsHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.id}</option>`).join('');
    el('txnCategory').innerHTML = catsHTML;
    el('budgetCategory').innerHTML = catsHTML;
}

// --- Budgets Logic ---
function renderBudgets() {
    const cont = el('budgetFullList');
    if(!cont) return;

    if(state.budgets.length === 0) {
        cont.innerHTML = '<div class="empty-state">No budgets set</div>';
        return;
    }

    cont.innerHTML = state.budgets.map(b => {
        const spent = state.transactions.filter(t => t.type === 'expense' && t.category === b.category).reduce((a,c) => a+c.amount, 0);
        const pct = Math.min(100, (spent/b.limit)*100);
        const statClass = pct >= 100 ? 'over' : pct > 80 ? 'warn' : 'ok';
        
        return `
            <div class="budget-row">
                <div class="budget-row-top">
                    <div class="budget-cat">
                        <div class="budget-cat-dot" style="background:var(--violet)"></div>
                        ${b.category}
                    </div>
                    <div class="budget-amts">${formatMoney(spent)} / ${formatMoney(b.limit)}</div>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width:${pct}%; background:var(--${statClass==='over'?'coral':statClass==='warn'?'amber':'teal'})"></div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Goals Logic ---
function renderGoals() {
    const grid = el('goalGrid');
    if(state.goals.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No goals set</div>';
        return;
    }

    grid.innerHTML = state.goals.map(g => {
        const pct = Math.min(100, (g.saved/g.target)*100);
        return `
            <div class="glass goal-card">
                <div class="goal-top">
                    <div>
                        <div class="goal-name">${g.name}</div>
                        <div class="goal-amts"><span class="cur">${formatMoney(g.saved)}</span> <span class="tgt">/ ${formatMoney(g.target)}</span></div>
                    </div>
                    <div class="goal-ring" style="border-radius:50%; background:conic-gradient(var(--teal) ${pct}%, var(--glass-border) 0);">
                        <div style="width:54px; height:54px; background:var(--glass-fill); border-radius:50%; margin:5px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold">${Math.round(pct)}%</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Persistence ---
function saveState() {
    localStorage.setItem('emofinance_txns', JSON.stringify(state.transactions));
    localStorage.setItem('emofinance_budgets', JSON.stringify(state.budgets));
    localStorage.setItem('emofinance_goals', JSON.stringify(state.goals));
}

// --- AI Chat Dummy ---
el('chatSendBtn').onclick = () => {
    const input = el('chatInput');
    const msg = input.value.trim();
    if(!msg) return;

    const chatCont = el('chatMessages');
    chatCont.innerHTML += `
        <div class="chat-msg user">
            <div class="chat-avatar user">👤</div>
            <div class="chat-bubble">${msg}</div>
        </div>
    `;
    input.value = '';

    setTimeout(() => {
        chatCont.innerHTML += `
            <div class="chat-msg ai">
                <div class="chat-avatar ai">✨</div>
                <div class="chat-bubble">I am running in local fallback mode. Based on your data, your highest expense category is Food. Try setting a budget!</div>
            </div>
        `;
        chatCont.scrollTop = chatCont.scrollHeight;
    }, 1000);
};

// Tooling for Export
el('settingsExportBtn').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href",     dataStr);
    a.setAttribute("download", "emofinance_backup.json");
    a.click();
};

el('resetDataBtn').onclick = () => {
    if(confirm('Are you sure? All transactions, budgets, and goals will be deleted permanently.')) {
        localStorage.clear();
        location.reload();
    }
};
