const STORAGE_KEY = 'clearpath-budget-v1';
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = date => date.slice(0, 7);
const monthLabel = key => new Date(`${key}-02T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const seed = {
  categories: [
    { id: 'housing', name: 'Housing', color: 'coral', savings: 1200, plans: { [monthKey(today())]: 1800 } },
    { id: 'food', name: 'Food & dining', color: 'gold', savings: 680, plans: { [monthKey(today())]: 650 } },
    { id: 'transport', name: 'Transportation', color: 'blue', savings: 425, plans: { [monthKey(today())]: 420 } },
    { id: 'giving', name: 'Giving', color: 'pink', savings: 0, plans: { [monthKey(today())]: 480 } },
    { id: 'lifestyle', name: 'Lifestyle', color: 'purple', savings: 310, plans: { [monthKey(today())]: 570 } },
    { id: 'emergency', name: 'Emergency fund', color: 'green', savings: 2400, plans: { [monthKey(today())]: 900 } }
  ],
  accounts: [{ id: 'checking', name: 'Main checking', type: 'Checking' }, { id: 'savings', name: 'Savings account', type: 'Savings' }],
  tags: ['Recurring', 'Family', 'Work', 'Needs review'],
  transactions: [
    { id: uid(), date: today(), payee: 'Rent payment', accountId: 'checking', categoryId: 'housing', amount: 1800, kind: 'expense', tag: 'Recurring', memo: '', cleared: true },
    { id: uid(), date: today(), payee: 'Grocery market', accountId: 'checking', categoryId: 'food', amount: 124.58, kind: 'expense', tag: 'Family', memo: 'Weekly groceries', cleared: true },
    { id: uid(), date: today(), payee: 'Paycheck', accountId: 'checking', categoryId: '', amount: 4820, kind: 'income', tag: '', memo: '', cleared: true }
  ]
};
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seed;
let currentPage = 'dashboard';
let selectedMonth = monthKey(today());
const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const category = id => state.categories.find(item => item.id === id);
const account = id => state.accounts.find(item => item.id === id);
const total = (items, kind) => items.filter(item => item.kind === kind).reduce((sum, item) => sum + Number(item.amount), 0);
const txForMonth = () => state.transactions.filter(item => monthKey(item.date) === selectedMonth);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

function render() {
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === currentPage));
  if (currentPage === 'dashboard') renderDashboard();
  if (currentPage === 'plan') renderPlan();
  if (currentPage === 'transactions') renderTransactions();
  if (currentPage === 'settings') renderSettings();
}

function heading(title, subtitle, actions = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><div class="subtitle">${subtitle}</div></div>${actions}</div>`;
}
function monthPicker() {
  return `<div class="month-picker"><button data-month="previous" aria-label="Previous month">‹</button><span class="month-label">${monthLabel(selectedMonth)}</span><button data-month="next" aria-label="Next month">›</button></div>`;
}
function renderDashboard() {
  const items = txForMonth(); const income = total(items, 'income'); const spent = total(items, 'expense');
  const planned = state.categories.reduce((sum, item) => sum + Number(item.plans[selectedMonth] || 0), 0); const remaining = planned - spent;
  const recent = [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  app.innerHTML = `${heading('Good morning', `Your plan for ${monthLabel(selectedMonth)}.`, monthPicker())}
    <section class="summary-grid"><div class="summary-card"><div class="label">Income</div><div class="summary-value">${money.format(income)}</div><div class="summary-note">${items.filter(x => x.kind === 'income').length} entries</div></div><div class="summary-card"><div class="label">Spent</div><div class="summary-value">${money.format(spent)}</div><div class="summary-note">${items.filter(x => x.kind === 'expense').length} transactions</div></div><div class="summary-card"><div class="label">Plan remaining</div><div class="summary-value">${money.format(remaining)}</div><div class="summary-note">${planned ? Math.round((spent / planned) * 100) : 0}% used</div></div></section>
    <section class="panel"><div class="panel-heading"><div><h2>Monthly plan</h2><div class="helper">Savings is the running total carried over from previous months.</div></div><button class="ghost-button" data-page-link="plan">Edit plan →</button></div><div class="category-list">${renderCategoryRows(true)}</div></section>
    <section class="panel"><div class="panel-heading"><div><h2>Recent activity</h2><div class="helper">Your latest income and expenses.</div></div><button class="ghost-button" data-page-link="transactions">View all →</button></div>${renderTransactionsList(recent)}</section>`;
}
function renderCategoryRows(showHeader = false) {
  const rows = state.categories.map(item => {
    const plan = Number(item.plans[selectedMonth] || 0); const spent = txForMonth().filter(x => x.categoryId === item.id && x.kind === 'expense').reduce((s, x) => s + Number(x.amount), 0); const left = plan - spent; const percent = plan ? Math.min(100, Math.round((spent / plan) * 100)) : 0;
    return `<div class="category-row"><div class="category-name"><span class="category-dot dot-${item.color}">${item.name[0]}</span><span>${esc(item.name)}</span></div><div class="amount"><span class="column-label">Savings</span>${money.format(item.savings)}</div><div class="amount"><span class="column-label">Plan</span><input class="plan-input" data-category-id="${item.id}" type="number" min="0" step="0.01" value="${plan}" aria-label="Plan for ${esc(item.name)}" /></div><div class="amount"><span class="column-label">Spent</span><strong>${money.format(spent)}</strong><div class="progress"><span class="track"><span class="fill ${percent > 90 ? 'high' : ''}" style="width:${percent}%"></span></span><small>${percent}%</small></div></div><div class="amount remaining"><span class="column-label">Remaining</span><strong>${money.format(left)}</strong></div></div>`;
  }).join('');
  return rows || '<div class="empty">No categories yet. Add your first category to start planning.</div>';
}
function renderPlan() {
  app.innerHTML = `${heading('Monthly plan', 'Assign a job to every dollar for this month.', `${monthPicker()} <button class="primary-button" data-action="add-category">＋ Category</button>`)}<section class="panel"><div class="panel-heading"><div><h2>${monthLabel(selectedMonth)}</h2><div class="helper">Edit Plan amounts directly. Savings shows prior-month carryover.</div></div></div><div class="category-list">${renderCategoryRows(true)}</div></section>`;
}
function renderTransactions() {
  const items = [...txForMonth()].sort((a, b) => b.date.localeCompare(a.date));
  app.innerHTML = `${heading('Activity', 'Review income and spending for this month.', `${monthPicker()} <button class="primary-button" data-action="add-transaction">＋ Transaction</button>`)}<section class="panel"><div class="panel-heading"><div><h2>${items.length} transaction${items.length === 1 ? '' : 's'}</h2><div class="helper">Tap + Transaction to record income or an expense.</div></div></div>${renderTransactionsList(items)}</section>`;
}
function renderTransactionsList(items) {
  if (!items.length) return '<div class="empty">No transactions for this month.</div>';
  return `<div class="transaction-list">${items.map(item => `<div class="transaction-item"><div class="transaction-icon">${item.kind === 'income' ? '↓' : '↑'}</div><div class="transaction-info"><strong>${esc(item.payee || 'Untitled transaction')}</strong><span>${esc(category(item.categoryId)?.name || 'Uncategorized')} · ${esc(account(item.accountId)?.name || 'Unknown account')} · ${esc(item.tag || 'No tag')}${item.cleared ? ' · <span class="cleared">Cleared</span>' : ''}</span></div><div class="transaction-amount ${item.kind}">${item.kind === 'income' ? '+' : '-'}${money.format(item.amount)}</div></div>`).join('')}</div>`;
}
function renderSettings() {
  app.innerHTML = `${heading('Settings', 'Manage the lists used throughout your budget.')}
    <section class="panel"><div class="panel-heading"><div><h2>Bank accounts</h2><div class="helper">Accounts are manual for now. Bank connections can come later.</div></div><button class="secondary-button" data-action="add-account">＋ Add</button></div><div class="setting-list">${state.accounts.map(item => `<div class="setting-row"><div><strong>${esc(item.name)}</strong><span>${esc(item.type)}</span></div><button class="ghost-button" data-delete-account="${item.id}">Remove</button></div>`).join('')}</div></section>
    <section class="panel"><div class="panel-heading"><div><h2>Tags</h2><div class="helper">Use tags for flexible views such as Family or Recurring.</div></div><button class="secondary-button" data-action="add-tag">＋ Add</button></div><div class="tag-list">${state.tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div></section>
    <section class="panel"><h2>Prototype data</h2><div class="helper" style="margin-top:7px">Your demo data is stored in this browser only. Use this to clear it and reload the sample data.</div><button class="secondary-button" style="margin-top:14px" data-action="reset">Reset demo data</button></section>`;
}

function openModal(title, body) { modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button class="close-button" data-close-modal aria-label="Close">×</button></div>${body}</section></div>`; }
function closeModal() { modalRoot.innerHTML = ''; }
function categoryForm() { openModal('Add category', `<form id="category-form" class="form-grid"><label>Category name<input required name="name" placeholder="e.g. Utilities" autofocus /></label><label>Carryover savings<input name="savings" type="number" min="0" step="0.01" value="0" /></label><div class="form-actions"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Save category</button></div></form>`); }
function accountForm() { openModal('Add bank account', `<form id="account-form" class="form-grid"><label>Account name<input required name="name" placeholder="e.g. Joint checking" autofocus /></label><label>Account type<select name="type"><option>Checking</option><option>Savings</option><option>Credit card</option><option>Cash</option></select></label><div class="form-actions"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Save account</button></div></form>`); }
function tagForm() { openModal('Add tag', `<form id="tag-form" class="form-grid"><label>Tag name<input required name="name" placeholder="e.g. Vacation" autofocus /></label><div class="form-actions"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Save tag</button></div></form>`); }
function transactionForm() {
  const categoryOptions = state.categories.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join(''); const accountOptions = state.accounts.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join(''); const tagOptions = state.tags.map(tag => `<option value="${esc(tag)}">`).join('');
  openModal('Add transaction', `<form id="transaction-form" class="form-grid"><div class="choice-row"><button type="button" class="choice selected" data-kind="expense">Expense</button><button type="button" class="choice" data-kind="income">Income</button></div><input type="hidden" name="kind" value="expense" /><div class="form-row"><label>Amount<input required name="amount" type="number" min="0" step="0.01" placeholder="0.00" inputmode="decimal" autofocus /></label><label>Date<input required name="date" type="date" value="${today()}" /></label></div><label>Payee<input required name="payee" placeholder="e.g. Grocery store" /></label><div class="form-row"><label>Bank account<select required name="accountId">${accountOptions}</select></label><label>Category<select name="categoryId"><option value="">Uncategorized</option>${categoryOptions}</select></label></div><label>Tag <input name="tag" list="tag-options" placeholder="Choose or type a tag" /><datalist id="tag-options">${tagOptions}</datalist></label><label>Memo / note<textarea name="memo" placeholder="Optional details"></textarea></label><label class="check-row"><input name="cleared" type="checkbox" checked /> This transaction has cleared the bank</label><div class="form-actions"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Save transaction</button></div></form>`);
}

document.addEventListener('click', event => {
  const page = event.target.closest('[data-page]')?.dataset.page || event.target.closest('[data-page-link]')?.dataset.pageLink;
  if (page) { currentPage = page; render(); return; }
  const month = event.target.closest('[data-month]')?.dataset.month;
  if (month) { const date = new Date(`${selectedMonth}-02T12:00:00`); date.setMonth(date.getMonth() + (month === 'next' ? 1 : -1)); selectedMonth = date.toISOString().slice(0, 7); render(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'add-category') categoryForm(); if (action === 'add-transaction') transactionForm(); if (action === 'add-account') accountForm(); if (action === 'add-tag') tagForm();
  if (action === 'reset' && confirm('Reset all prototype data?')) { localStorage.removeItem(STORAGE_KEY); state = JSON.parse(JSON.stringify(seed)); save(); render(); toast('Demo data reset'); }
  const remove = event.target.closest('[data-delete-account]')?.dataset.deleteAccount;
  if (remove && confirm('Remove this account? Existing transactions will remain.')) { state.accounts = state.accounts.filter(item => item.id !== remove); save(); render(); }
  const closeTarget = event.target.closest('[data-close-modal]');
  if (closeTarget && (closeTarget.classList.contains('modal-backdrop') || closeTarget.tagName === 'BUTTON')) closeModal();
  if (event.target.matches('[data-kind]')) { document.querySelectorAll('[data-kind]').forEach(item => item.classList.toggle('selected', item === event.target)); document.querySelector('[name="kind"]').value = event.target.dataset.kind; }
});
document.getElementById('header-add').addEventListener('click', transactionForm);
document.addEventListener('input', event => { if (event.target.matches('.plan-input')) { const item = category(event.target.dataset.categoryId); item.plans[selectedMonth] = Number(event.target.value || 0); save(); render(); const input = document.querySelector(`[data-category-id="${item.id}"]`); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } } });
document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const data = new FormData(form);
  if (form.id === 'category-form') { state.categories.push({ id: uid(), name: data.get('name').trim(), color: ['blue','gold','pink','purple','green','coral'][state.categories.length % 6], savings: Number(data.get('savings') || 0), plans: {} }); save(); closeModal(); render(); toast('Category added'); }
  if (form.id === 'account-form') { state.accounts.push({ id: uid(), name: data.get('name').trim(), type: data.get('type') }); save(); closeModal(); render(); toast('Account added'); }
  if (form.id === 'tag-form') { const tag = data.get('name').trim(); if (tag && !state.tags.includes(tag)) state.tags.push(tag); save(); closeModal(); render(); toast('Tag added'); }
  if (form.id === 'transaction-form') { const tag = data.get('tag').trim(); if (tag && !state.tags.includes(tag)) state.tags.push(tag); state.transactions.push({ id: uid(), date: data.get('date'), payee: data.get('payee').trim(), accountId: data.get('accountId'), categoryId: data.get('categoryId'), amount: Number(data.get('amount')), kind: data.get('kind'), tag, memo: data.get('memo').trim(), cleared: data.get('cleared') === 'on' }); save(); closeModal(); currentPage = 'transactions'; selectedMonth = monthKey(data.get('date')); render(); toast('Transaction added'); }
});
function toast(message) { const node = document.createElement('div'); node.className = 'toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 2200); }
render();
