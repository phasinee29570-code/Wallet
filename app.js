// =========================================================
// AntiGravity Tracker - Core Application Logic
// =========================================================

// 1. อ้างอิง DOM Elements จาก HTML
const balanceEl = document.getElementById('balance');
const totalIncomeEl = document.getElementById('totalincome');
const totalExpenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const formEl = document.getElementById('transaction-form');
const descriptionEl = document.getElementById('description');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('category');
const exportBtn = document.getElementById('export-btn');
const monthFilterEl = document.getElementById('month-filter');
const walletFilterEl = document.getElementById('wallet-filter');
const copayBreakdownBox = document.getElementById('copay-breakdown-box');
const copayPaotangAmountEl = document.getElementById('copay-paotang-amount');
const copayUserAmountEl = document.getElementById('copay-user-amount');
const copayNoteEl = document.getElementById('copay-note');
const walletsGridEl = document.getElementById('wallets-grid');
const walletSelectorListEl = document.getElementById('wallet-selector-list');

// DOM Elements สำหรับระบบจัดการกระเป๋าเงิน
const btnManageWallets = document.getElementById('btn-manage-wallets');
const walletModal = document.getElementById('wallet-modal');
const btnCloseWalletModal = document.getElementById('btn-close-wallet-modal');
const walletForm = document.getElementById('wallet-form');
const walletFormTitle = document.getElementById('wallet-form-title');
const walletEditId = document.getElementById('wallet-edit-id');
const newWalletNameEl = document.getElementById('new-wallet-name');
const newWalletIconEl = document.getElementById('new-wallet-icon');
const newWalletColorEl = document.getElementById('new-wallet-color');
const newWalletDescEl = document.getElementById('new-wallet-desc');
const newWalletLockedEl = document.getElementById('new-wallet-locked');
const btnCancelEditWallet = document.getElementById('btn-cancel-edit-wallet');
const modalWalletList = document.getElementById('modal-wallet-list');

// DOM Elements สำหรับระบบจัดการหมวดหมู่
const btnManageCategories = document.getElementById('btn-manage-categories');
const categoryModal = document.getElementById('category-modal');
const btnCloseCatModal = document.getElementById('btn-close-cat-modal');
const newCategoryForm = document.getElementById('new-category-form');
const newCatIconEl = document.getElementById('new-cat-icon');
const newCatNameEl = document.getElementById('new-cat-name');
const modalCategoryList = document.getElementById('modal-category-list');

// Calendar View DOM Elements
const btnViewList = document.getElementById('btn-view-list');
const btnViewCalendar = document.getElementById('btn-view-calendar');
const calendarViewEl = document.getElementById('calendar-view');
const calendarGridEl = document.getElementById('calendar-grid');
const calendarDayDetailsEl = document.getElementById('calendar-day-details');
const calendarDayListEl = document.getElementById('calendar-day-list');
const selectedDayTitleEl = document.getElementById('selected-day-title');
const btnCloseDayDetails = document.getElementById('btn-close-day-details');

// Global Constants & State
const DAILY_GRANT_LIMIT = 200; // วงเงินสิทธิ์รัฐสูงสุดต่อวัน
let selectedWallet = 'all';
let currentViewMode = 'list'; // 'list' หรือ 'calendar'
let selectedCalendarDay = null;

// =========================================================
// 2. Date & Formatting Helpers
// =========================================================
const now = new Date();
const thaiYear = now.getFullYear() + 543;
const todayDateStr = `${now.getDate()}/${now.getMonth() + 1}/${thaiYear} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
let selectedMonthKey = currentMonthKey;

function formatMoney(amount) {
    const num = Number(amount) || 0;
    return '฿' + num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const formatMoey = formatMoney; // Alias for backward compatibility

function getMonthKey(t) {
    if (t.monthKey) return t.monthKey;
    if (!t.date) return currentMonthKey;
    const parts = t.date.split(' ')[0].split('/');
    if (parts.length === 3) {
        const y = parseInt(parts[2]) > 2500 ? parseInt(parts[2]) - 543 : parseInt(parts[2]);
        const m = String(parts[1]).padStart(2, '0');
        return `${y}-${m}`;
    }
    return currentMonthKey;
}

function formatMonthKeyThai(monthKey) {
    if (!monthKey) return '';
    const [yearStr, monthStr] = monthKey.split('-');
    const thaiMonthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const mIdx = parseInt(monthStr, 10) - 1;
    const yThai = parseInt(yearStr, 10) + 543;
    return `${thaiMonthNames[mIdx] || monthStr} ${yThai}`;
}

// =========================================================
// 3. Wallet State & Default Configuration
// =========================================================
const DEFAULT_WALLETS = [
    {
        id: 'spending',
        name: 'บัญชีใช้จ่าย',
        icon: 'fa-solid fa-wallet',
        type: 'spending',
        isLocked: false,
        isSystem: true,
        color: 'indigo',
        desc: 'งบที่เราจัดสรรไว้สำหรับใช้ชีวิตประจำวัน'
    },
    {
        id: 'savings',
        name: 'บัญชีเงินเก็บ',
        icon: 'fa-solid fa-piggy-bank',
        type: 'savings',
        isLocked: false,
        isSystem: true,
        color: 'amber',
        desc: 'เงินออม / สำรองฉุกเฉิน'
    },
    {
        id: 'reserve',
        name: 'เงินสำรอง',
        icon: 'fa-solid fa-coins',
        type: 'reserve',
        isLocked: false,
        isSystem: true,
        color: 'emerald',
        desc: 'คงเหลือจากรายรับหลังแบ่งกระเป๋า'
    },
    {
        id: 'gwallet',
        name: 'G-Wallet',
        icon: 'fa-solid fa-money-bill-transfer',
        type: 'gwallet',
        isLocked: false,
        isSystem: true,
        color: 'cyan',
        desc: 'เงินเติมในแอปเป๋าตัง (จ่าย 40%)'
    },
    {
        id: 'grant',
        name: 'สิทธิ์ไทยช่วยไทย',
        icon: 'fa-solid fa-gift',
        type: 'grant',
        isLocked: false,
        isSystem: true,
        color: 'blue',
        desc: 'สิทธิ์โครงการรัฐช่วย 60% (สูงสุด 200฿/วัน)'
    }
];

let wallets = JSON.parse(localStorage.getItem('custom_wallets')) || DEFAULT_WALLETS;

// ตรวจสอบและ Merge ค่าเริ่มต้นถ้ามีฟิลด์ใหม่เพิ่มเข้ามา
wallets = DEFAULT_WALLETS.map(def => {
    const existing = wallets.find(w => w.id === def.id);
    return existing ? { ...def, ...existing } : def;
}).concat(wallets.filter(w => !DEFAULT_WALLETS.some(def => def.id === w.id)));

function saveWallets() {
    localStorage.setItem('custom_wallets', JSON.stringify(wallets));
}

function getWallet(id) {
    return wallets.find(w => w.id === id);
}

function normalizeWallet(t) {
    if (!t.wallet || t.wallet === 'income') return 'spending';
    return t.wallet;
}

// =========================================================
// 4. Category State & Configuration
// =========================================================
const DEFAULT_CATEGORIES = [
    { id: 'food', name: 'อาหารและเครื่องดื่ม', icon: '🍔', isSystem: false },
    { id: 'shopping', name: 'ช้อปปิ้ง / ของใช้', icon: '🛍️', isSystem: false },
    { id: 'transport', name: 'การเดินทาง / ยานพาหนะ', icon: '🚗', isSystem: false },
    { id: 'entertainment', name: 'บันเทิง / พักผ่อน', icon: '🎮', isSystem: false },
    { id: 'utilities', name: 'บิลค่าหอ / ค่าเน็ต', icon: '🏠', isSystem: false },
    { id: 'salary', name: 'เงินเดือน / รายได้', icon: '💰', isSystem: false },
    { id: 'allocate_spending', name: 'ระบุ/จัดสรรงบเข้าบัญชีใช้จ่าย', icon: '💵', isSystem: true },
    { id: 'topup_gwallet', name: 'เติมเงินเข้า G-Wallet', icon: '🔄', isSystem: true },
    { id: 'transfer_savings', name: 'โอนเข้าบัญชีเงินเก็บ', icon: '🏦', isSystem: true },
    { id: 'paotang_grant', name: 'เงินสิทธิ์โครงการรัฐ', icon: '🎁', isSystem: true },
    { id: 'wallet_deposit', name: 'เติม/โอนเข้ากระเป๋าพิเศษ', icon: '📥', isSystem: true },
    { id: 'other', name: 'อื่นๆ', icon: '🏷️', isSystem: false }
];

let categories = JSON.parse(localStorage.getItem('custom_categories')) || DEFAULT_CATEGORIES;

function saveCategories() {
    localStorage.setItem('custom_categories', JSON.stringify(categories));
}

function getCategoryName(categoryKey) {
    const found = categories.find(c => c.id === categoryKey);
    if (found) {
        return `${found.icon} ${found.name}`;
    }
    return `🏷️ ${categoryKey}`;
}

// =========================================================
// 5. Transactions Storage & Balance Calculations
// =========================================================
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function getTodayGrantExpense() {
    const todayPrefix1 = `${now.getDate()}/${now.getMonth() + 1}/${thaiYear}`;
    const todayPrefix2 = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${thaiYear}`;

    return transactions
        .filter(t => t.wallet === 'grant' && t.type === 'expense' && (t.date.startsWith(todayPrefix1) || t.date.startsWith(todayPrefix2)))
        .reduce((sum, t) => sum + t.amount, 0);
}

function getWalletBalance(walletId) {
    if (walletId === 'spending') {
        const incomeAllocated = transactions
            .filter(t => t.type === 'income' && t.category === 'allocate_spending')
            .reduce((acc, t) => acc + t.amount, 0);

        const spendingExpenses = transactions
            .filter(t => t.type === 'expense' && (t.wallet === 'spending' || (!t.wallet && !t.isCopay)))
            .reduce((acc, t) => acc + t.amount, 0);

        return incomeAllocated - spendingExpenses;
    }

    if (walletId === 'savings') {
        const incomeSavings = transactions
            .filter(t => t.type === 'income' && (t.wallet === 'savings' || t.category === 'transfer_savings'))
            .reduce((acc, t) => acc + t.amount, 0);

        const expenseSavings = transactions
            .filter(t => t.type === 'expense' && t.wallet === 'savings')
            .reduce((acc, t) => acc + t.amount, 0);

        return incomeSavings - expenseSavings;
    }

    if (walletId === 'reserve') {
        const nonInternalIncome = transactions
            .filter(t => t.type === 'income' && !['allocate_spending', 'transfer_savings', 'topup_gwallet', 'paotang_grant', 'wallet_deposit'].includes(t.category))
            .reduce((acc, t) => acc + t.amount, 0);

        const allocatedSpending = transactions
            .filter(t => t.type === 'income' && t.category === 'allocate_spending')
            .reduce((acc, t) => acc + t.amount, 0);

        const allocatedSavings = transactions
            .filter(t => t.type === 'income' && t.category === 'transfer_savings')
            .reduce((acc, t) => acc + t.amount, 0);

        const reserveExpense = transactions
            .filter(t => t.type === 'expense' && t.wallet === 'reserve')
            .reduce((acc, t) => acc + t.amount, 0);

        return nonInternalIncome - allocatedSpending - allocatedSavings - reserveExpense;
    }

    if (walletId === 'gwallet') {
        const incomeGWallet = transactions
            .filter(t => t.type === 'income' && (t.wallet === 'gwallet' || t.category === 'topup_gwallet'))
            .reduce((acc, t) => acc + t.amount, 0);

        const expenseGWallet = transactions
            .filter(t => t.type === 'expense' && t.wallet === 'gwallet')
            .reduce((acc, t) => acc + t.amount, 0);

        return incomeGWallet - expenseGWallet;
    }

    if (walletId === 'grant') {
        const incomeGrant = transactions
            .filter(t => t.type === 'income' && (t.wallet === 'grant' || t.category === 'paotang_grant'))
            .reduce((acc, t) => acc + t.amount, 0);

        const expenseGrant = transactions
            .filter(t => t.type === 'expense' && t.wallet === 'grant')
            .reduce((acc, t) => acc + t.amount, 0);

        return incomeGrant - expenseGrant;
    }

    // กระเป๋าเงินกำหนดเอง (Custom Wallet)
    const customIncome = transactions
        .filter(t => t.type === 'income' && t.wallet === walletId)
        .reduce((acc, t) => acc + t.amount, 0);

    const customExpense = transactions
        .filter(t => t.type === 'expense' && t.wallet === walletId)
        .reduce((acc, t) => acc + t.amount, 0);

    return customIncome - customExpense;
}

// =========================================================
// 6. Dynamic Wallet Cards & Dashboard UI Rendering
// =========================================================
function renderWalletCards() {
    if (!walletsGridEl) return;
    walletsGridEl.innerHTML = '';

    const spentToday = getTodayGrantExpense();
    const remainingQuotaToday = Math.max(0, DAILY_GRANT_LIMIT - spentToday);
    const quotaPercent = Math.min(100, (spentToday / DAILY_GRANT_LIMIT) * 100);

    wallets.forEach(w => {
        const balance = getWalletBalance(w.id);
        const card = document.createElement('div');
        const themeClass = `wallet-theme-${w.color || 'indigo'}`;
        const lockedClass = w.isLocked ? 'is-locked' : '';
        card.className = `card card-wallet ${themeClass} ${lockedClass}`;

        let quickBtnHtml = '';
        if (w.id === 'spending') {
            quickBtnHtml = `<button class="btn-wallet-action" onclick="allocateSpending()" title="ระบุงบใช้จ่าย"><i class="fa-solid fa-sliders"></i> ระบุงบ</button>`;
        } else if (w.id === 'savings') {
            quickBtnHtml = `<button class="btn-wallet-action" onclick="allocateSavings()" title="ระบุเงินเก็บ"><i class="fa-solid fa-plus-circle"></i> ระบุเงินเก็บ</button>`;
        } else if (w.id === 'gwallet') {
            quickBtnHtml = `<button class="btn-wallet-action" onclick="quickTopupGWallet()" title="เติมเงินเข้า G-Wallet"><i class="fa-solid fa-plus-circle"></i> เติมเงิน</button>`;
        } else if (w.id === 'grant') {
            quickBtnHtml = `<button class="btn-wallet-action" onclick="claimGrant()" title="กดเพื่อรับสิทธิ์ 1,000 บาท"><i class="fa-solid fa-gift"></i> รับ 1,000฿</button>`;
        } else {
            quickBtnHtml = `<button class="btn-wallet-action" onclick="quickCustomDeposit('${w.id}', '${w.name}')" title="ฝาก/เติมเงินเข้ากระเป๋า"><i class="fa-solid fa-plus-circle"></i> เติมเงิน</button>`;
        }

        let lockStatusBadge = w.isLocked ? `<span class="badge-locked-pill"><i class="fa-solid fa-lock"></i> ล็อกอยู่</span>` : '';
        let lockToggleBtn = `
            <button class="btn-card-lock-toggle ${w.isLocked ? 'is-locked-btn' : ''}" onclick="toggleLockWallet('${w.id}')" title="${w.isLocked ? 'คลิกเพื่อปลดล็อกกระเป๋า' : 'คลิกเพื่อล็อกกระเป๋าห้ามใช้'}">
                <i class="fa-solid ${w.isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
            </button>
        `;

        let extraWidget = '';
        if (w.id === 'grant') {
            extraWidget = `
                <div class="quota-progress-container" style="margin-top: 0.4rem;">
                    <div class="quota-label">
                        <span>โควตาวันนี้ (สูงสุด 200฿):</span>
                        <strong>เหลือ ${formatMoney(remainingQuotaToday)}</strong>
                    </div>
                    <div class="quota-bar">
                        <div class="quota-progress" style="width: ${quotaPercent}%;"></div>
                    </div>
                </div>
            `;
        } else {
            extraWidget = `<small class="card-wallet-desc">${w.desc || 'กระเป๋าเงิน'}</small>`;
        }

        card.innerHTML = `
            <div>
                <div class="card-wallet-header">
                    <h3 title="${w.name}"><i class="${w.icon}"></i> ${w.name}</h3>
                    <div class="card-wallet-actions">
                        ${lockStatusBadge}
                        ${lockToggleBtn}
                        ${quickBtnHtml}
                    </div>
                </div>
                <h2 class="card-wallet-balance">${formatMoney(balance)}</h2>
            </div>
            ${extraWidget}
        `;

        walletsGridEl.appendChild(card);
    });
}

// อัปเดตตัวเลือกในแบบฟอร์มเพิ่มรายการ
function renderWalletFormSelector() {
    if (!walletSelectorListEl) return;
    const currentChecked = document.querySelector('input[name="wallet"]:checked')?.value || 'spending';
    walletSelectorListEl.innerHTML = '';

    // เรนเดอร์ตัวเลือกกระเป๋าแต่ละใบ
    wallets.forEach(w => {
        const item = document.createElement('div');
        item.className = 'wallet-radio-item';

        const input = document.createElement('input');
        input.type = 'radio';
        input.id = `form-wallet-${w.id}`;
        input.name = 'wallet';
        input.value = w.id;
        if (currentChecked === w.id) {
            input.checked = true;
        }

        const label = document.createElement('label');
        label.htmlFor = `form-wallet-${w.id}`;
        label.className = `wallet-radio-label ${w.isLocked ? 'is-locked-radio' : ''}`;
        label.title = w.isLocked ? '🔒 กระเป๋านี้ถูกล็อกไว้ห้ามใช้ชั่วคราว' : w.name;
        label.innerHTML = `<i class="${w.icon}"></i> ${w.name} ${w.isLocked ? '<i class="fa-solid fa-lock" style="color: #f43f5e;"></i>' : ''}`;

        // ถ้าล็อกและคลิก ให้เตือนผู้ใช้
        if (w.isLocked) {
            label.addEventListener('click', (e) => {
                e.preventDefault();
                alert(`⚠️ กระเป๋า "${w.name}" ถูกล็อกห้ามใช้ชั่วคราว\nหากต้องการใช้งาน สามารถกดปลดล็อกได้ที่การ์ดกระเป๋า หรือที่เมนู "จัดการกระเป๋าเงิน" ครับ`);
            });
        }

        item.appendChild(input);
        item.appendChild(label);
        walletSelectorListEl.appendChild(item);
    });

    // เพิ่มตัวเลือกสิทธิ์ 60/40 ต่อท้าย
    const copayItem = document.createElement('div');
    copayItem.className = 'wallet-radio-item';
    copayItem.innerHTML = `
        <input type="radio" id="form-wallet-copay" name="wallet" value="copay" ${currentChecked === 'copay' ? 'checked' : ''}>
        <label for="form-wallet-copay" class="wallet-radio-label">
            <i class="fa-solid fa-handshake-angle"></i> สิทธิ์ 60/40
        </label>
    `;
    walletSelectorListEl.appendChild(copayItem);

    // ผูก Event ให้ Radio ทุกอันเพื่ออัปเดต Live Preview ของสิทธิ์ 60/40
    walletSelectorListEl.querySelectorAll('input[name="wallet"]').forEach(radio => {
        radio.addEventListener('change', updateCopayPreview);
    });

    // หากตัวที่เลือกอยู่ปัจจุบันถูกล็อก ให้เลื่อนไปเลือกกระเป๋าที่ยังเปิดอยู่
    const selectedObj = getWallet(currentChecked);
    if (selectedObj && selectedObj.isLocked) {
        const available = wallets.find(w => !w.isLocked);
        if (available) {
            const availableRadio = document.getElementById(`form-wallet-${available.id}`);
            if (availableRadio) availableRadio.checked = true;
        }
    }
}

// อัปเดต Dropdown ตัวกรองกระเป๋าใน History
function renderWalletFilterOptions() {
    if (!walletFilterEl) return;
    const currentVal = walletFilterEl.value || 'all';

    let optionsHtml = `<option value="all">📁 ทุกกระเป๋า</option>`;
    wallets.forEach(w => {
        optionsHtml += `<option value="${w.id}">${w.isLocked ? '🔒 ' : ''}${w.name}</option>`;
    });

    walletFilterEl.innerHTML = optionsHtml;
    if (wallets.some(w => w.id === currentVal) || currentVal === 'all') {
        walletFilterEl.value = currentVal;
    }
}

// อัปเดต Dashboard ยอดเงินรวม
function updateDashboard() {
    // ยอดรวมกระเป๋าที่ไม่ใช่ grant (หรือรวมทุกกระเป๋าที่แท้จริง)
    const totalBalance = wallets
        .filter(w => w.id !== 'grant')
        .reduce((sum, w) => sum + getWalletBalance(w.id), 0);

    if (balanceEl) balanceEl.innerText = formatMoney(totalBalance);

    // กรอง transactions เฉพาะเดือนที่เลือก
    const monthTransactions = transactions.filter(t => getMonthKey(t) === selectedMonthKey);

    const internalTransfers = ['topup_gwallet', 'transfer_savings', 'paotang_grant', 'allocate_spending', 'wallet_deposit'];
    const totalIncome = monthTransactions
        .filter(t => t.type === 'income' && !internalTransfers.includes(t.category))
        .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = monthTransactions
        .filter(t => t.type === 'expense' && t.category !== 'topup_gwallet' && t.category !== 'transfer_savings')
        .reduce((acc, t) => acc + t.amount, 0);

    if (totalIncomeEl) totalIncomeEl.innerText = formatMoney(totalIncome);
    if (totalExpenseEl) totalExpenseEl.innerText = formatMoney(totalExpense);

    renderWalletCards();
}

// =========================================================
// 7. Wallet CRUD & Lock/Unlock Handlers
// =========================================================
function renderModalWalletList() {
    if (!modalWalletList) return;
    modalWalletList.innerHTML = '';

    wallets.forEach(w => {
        const balance = getWalletBalance(w.id);
        const li = document.createElement('li');
        li.className = `modal-wallet-item ${w.isLocked ? 'is-locked-item' : ''}`;

        const leftDiv = document.createElement('div');
        leftDiv.className = 'wallet-item-left';
        leftDiv.innerHTML = `
            <div class="wallet-icon-avatar" style="color: var(--${w.color || 'primary'}-color, #818cf8);">
                <i class="${w.icon}"></i>
            </div>
            <div class="wallet-item-details">
                <div class="wallet-item-name-row">
                    <strong>${w.name}</strong>
                    ${w.isSystem ? '<span class="cat-item-badge-system"><i class="fa-solid fa-lock"></i> ระบบ</span>' : ''}
                    <span class="wallet-status-tag ${w.isLocked ? 'locked' : 'active'}">
                        <i class="fa-solid ${w.isLocked ? 'fa-lock' : 'fa-circle-check'}"></i> ${w.isLocked ? 'ล็อกอยู่' : 'ใช้งานปกติ'}
                    </span>
                </div>
                <span class="wallet-item-desc">${w.desc || 'ไม่มีคำอธิบาย'}</span>
            </div>
        `;

        const rightDiv = document.createElement('div');
        rightDiv.className = 'wallet-item-right';

        // Balance text
        const balSpan = document.createElement('span');
        balSpan.className = 'wallet-item-balance';
        balSpan.innerText = formatMoney(balance);
        rightDiv.appendChild(balSpan);

        // Lock / Unlock Button
        const lockBtn = document.createElement('button');
        lockBtn.type = 'button';
        lockBtn.className = `btn-wallet-tool btn-lock ${w.isLocked ? 'is-locked' : ''}`;
        lockBtn.title = w.isLocked ? 'คลิกเพื่อปลดล็อกกระเป๋า' : 'คลิกเพื่อล็อกกระเป๋า';
        lockBtn.innerHTML = `<i class="fa-solid ${w.isLocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${w.isLocked ? 'ปลดล็อก' : 'ล็อก'}`;
        lockBtn.addEventListener('click', () => toggleLockWallet(w.id));
        rightDiv.appendChild(lockBtn);

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-wallet-tool btn-edit';
        editBtn.title = 'แก้ไขข้อมูลกระเป๋า';
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.addEventListener('click', () => editWallet(w.id));
        rightDiv.appendChild(editBtn);

        // Delete Button (only if not system)
        if (!w.isSystem) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn-wallet-tool btn-delete';
            delBtn.title = 'ลบกระเป๋าเงินนี้';
            delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            delBtn.addEventListener('click', () => deleteWallet(w.id, w.name));
            rightDiv.appendChild(delBtn);
        }

        li.appendChild(leftDiv);
        li.appendChild(rightDiv);
        modalWalletList.appendChild(li);
    });
}

function addOrUpdateWallet(e) {
    e.preventDefault();
    const id = walletEditId.value;
    const name = newWalletNameEl.value.trim();
    const icon = newWalletIconEl.value;
    const color = newWalletColorEl.value;
    const desc = newWalletDescEl.value.trim();
    const isLocked = newWalletLockedEl.checked;

    if (!name) return;

    if (id) {
        // โหมดแก้ไข (Edit)
        const target = wallets.find(w => w.id === id);
        if (target) {
            target.name = name;
            target.icon = icon;
            target.color = color;
            target.desc = desc;
            target.isLocked = isLocked;
        }
        alert(`✏️ อัปเดตข้อมูลกระเป๋า "${name}" เรียบร้อยแล้ว!`);
    } else {
        // โหมดเพิ่มใหม่ (Create)
        if (wallets.some(w => w.name.toLowerCase() === name.toLowerCase())) {
            alert('มีกระเป๋าเงินชื่อนี้อยู่แล้วในระบบ');
            return;
        }

        const newId = 'wallet_' + Date.now();
        wallets.push({
            id: newId,
            name,
            icon,
            color,
            desc: desc || 'กระเป๋าเงินพิเศษ',
            isLocked,
            isSystem: false
        });
        alert(`🎉 เพิ่มกระเป๋าเงิน "${name}" เรียบร้อยแล้ว!`);
    }

    saveWallets();
    resetWalletForm();
    renderWalletCards();
    renderWalletFormSelector();
    renderWalletFilterOptions();
    renderModalWalletList();
    updateDashboard();
}

function editWallet(id) {
    const w = wallets.find(item => item.id === id);
    if (!w) return;

    walletEditId.value = w.id;
    newWalletNameEl.value = w.name;
    newWalletIconEl.value = w.icon;
    newWalletColorEl.value = w.color || 'indigo';
    newWalletDescEl.value = w.desc || '';
    newWalletLockedEl.checked = !!w.isLocked;

    if (walletFormTitle) walletFormTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> แก้ไขกระเป๋าเงิน: ${w.name}`;
    if (btnCancelEditWallet) btnCancelEditWallet.style.display = 'inline-flex';
    newWalletNameEl.focus();
}

function resetWalletForm() {
    if (walletForm) walletForm.reset();
    if (walletEditId) walletEditId.value = '';
    if (walletFormTitle) walletFormTitle.innerHTML = `<i class="fa-solid fa-plus-circle"></i> เพิ่มกระเป๋าเงินใหม่`;
    if (btnCancelEditWallet) btnCancelEditWallet.style.display = 'none';
}

function toggleLockWallet(id) {
    const w = wallets.find(item => item.id === id);
    if (!w) return;

    w.isLocked = !w.isLocked;
    saveWallets();

    renderWalletCards();
    renderWalletFormSelector();
    renderWalletFilterOptions();
    renderModalWalletList();

    const statusText = w.isLocked ? '🔒 ล็อก (ห้ามใช้)' : '🔓 ปลดล็อก (พร้อมใช้งาน)';
    alert(`กระเป๋า "${w.name}" เปลี่ยนสถานะเป็น: ${statusText}`);
}

function deleteWallet(id, name) {
    const isUsed = transactions.some(t => t.wallet === id);
    let confirmMsg = `คุณต้องการลบกระเป๋าเงิน "${name}" ใช่หรือไม่?`;
    if (isUsed) {
        confirmMsg = `กระเป๋า "${name}" มีประวัติรายการที่เคยบันทึกไว้ หากลบ รายการเหล่านั้นจะถูกปรับไปอยู่บัญชีใช้จ่าย ต้องการลบต่อหรือไม่?`;
    }

    if (!confirm(confirmMsg)) return;

    // ถ้ามีรายการเดิม ให้ปรับ wallet เป็น spending
    if (isUsed) {
        transactions.forEach(t => {
            if (t.wallet === id) t.wallet = 'spending';
        });
        updateLocalStorage();
    }

    wallets = wallets.filter(w => w.id !== id);
    saveWallets();

    renderWalletCards();
    renderWalletFormSelector();
    renderWalletFilterOptions();
    renderModalWalletList();
    renderTransactions();
    updateDashboard();
}

function quickCustomDeposit(walletId, walletName) {
    const w = getWallet(walletId);
    if (w && w.isLocked) {
        alert(`⚠️ กระเป๋า "${walletName}" ถูกล็อกไว้ ไม่สามารถทำรายการได้`);
        return;
    }

    const amountStr = prompt(`กรุณาระบุจำนวนเงินที่ต้องการเติมเข้า "${walletName}" (บาท):`, '500');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        return;
    }

    transactions.push({
        id: Math.random().toString(36).substring(2, 9),
        description: `เติมเงินเข้า ${walletName}`,
        amount: amount,
        type: 'income',
        wallet: walletId,
        category: 'wallet_deposit',
        date: todayDateStr,
        monthKey: currentMonthKey
    });

    updateLocalStorage();
    init();
    alert(`🎉 เติมเงินเข้า "${walletName}" จำนวน ${formatMoney(amount)} เรียบร้อยแล้ว!`);
}

// =========================================================
// 8. Categories CRUD Handlers
// =========================================================
function renderCategorySelect() {
    if (!categoryEl) return;
    const currentVal = categoryEl.value;
    categoryEl.innerHTML = categories.map(c => {
        return `<option value="${c.id}">${c.icon} ${c.name}</option>`;
    }).join('');

    if (currentVal && categories.some(c => c.id === currentVal)) {
        categoryEl.value = currentVal;
    }
}

function renderModalCategoryList() {
    if (!modalCategoryList) return;
    modalCategoryList.innerHTML = '';

    categories.forEach(c => {
        const li = document.createElement('li');
        li.className = 'modal-cat-item';

        const leftDiv = document.createElement('div');
        leftDiv.className = 'cat-item-left';
        leftDiv.innerHTML = `<span>${c.icon}</span> <strong>${c.name}</strong>`;

        const rightDiv = document.createElement('div');
        if (c.isSystem) {
            rightDiv.innerHTML = `<span class="cat-item-badge-system" title="หมวดหมู่จำเป็นของระบบ"><i class="fa-solid fa-lock"></i> ระบบ</span>`;
        } else {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn-delete-cat';
            delBtn.title = 'ลบหมวดหมู่นี้';
            delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            delBtn.addEventListener('click', () => deleteCategory(c.id, c.name));
            rightDiv.appendChild(delBtn);
        }

        li.appendChild(leftDiv);
        li.appendChild(rightDiv);
        modalCategoryList.appendChild(li);
    });
}

function addCategory(e) {
    e.preventDefault();
    const name = newCatNameEl.value.trim();
    const icon = newCatIconEl.value;

    if (!name) return;

    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert('มีหมวดหมู่นี้อยู่แล้วในระบบ');
        return;
    }

    const newId = 'cat_' + Date.now();
    categories.push({
        id: newId,
        name,
        icon,
        isSystem: false
    });

    saveCategories();
    renderCategorySelect();
    renderModalCategoryList();
    renderTransactions();
    newCatNameEl.value = '';
    categoryEl.value = newId;
}

function deleteCategory(id, name) {
    const isUsed = transactions.some(t => t.category === id);
    let confirmMsg = `คุณต้องการลบหมวดหมู่ "${name}" ใช่หรือไม่?`;
    if (isUsed) {
        confirmMsg = `หมวดหมู่ "${name}" มีรายการประวัติที่เคยบันทึกไว้ หากลบ รายการเหล่านั้นจะยังคงอยู่แต่จะแสดงเป็นหมวดหมู่อื่นๆ ต้องการลบต่อหรือไม่?`;
    }

    if (!confirm(confirmMsg)) return;

    categories = categories.filter(c => c.id !== id);
    saveCategories();
    renderCategorySelect();
    renderModalCategoryList();
    renderTransactions();
}

// =========================================================
// 9. Transactions Rendering & Live Preview
// =========================================================
function renderTransactions() {
    if (!listEl) return;
    listEl.innerHTML = '';

    const filtered = transactions.filter(t => {
        const matchMonth = getMonthKey(t) === selectedMonthKey;
        const currentW = normalizeWallet(t);
        const matchWallet = selectedWallet === 'all' || currentW === selectedWallet;
        return matchMonth && matchWallet;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<li style="text-align: center; color: var(--text-secondary); padding: 2rem 1rem; font-size: 0.9rem;">
            <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.4;"></i>
            ไม่มีรายการบันทึกในเดือนนี้
        </li>`;
        return;
    }

    filtered.forEach(t => {
        const item = document.createElement('li');
        item.classList.add('transaction-item', t.type);

        const sign = t.type === 'income' ? '+' : '-';
        const walletType = normalizeWallet(t);
        const isCopay = t.isCopay;
        const targetWallet = getWallet(walletType);

        let walletBadge = `<span class="item-wallet-badge spending"><i class="fa-solid fa-wallet"></i> บัญชีใช้จ่าย</span>`;
        if (t.type === 'income' && !['allocate_spending', 'transfer_savings', 'topup_gwallet', 'paotang_grant', 'wallet_deposit'].includes(t.category)) {
            walletBadge = `<span class="item-wallet-badge income"><i class="fa-solid fa-arrow-trend-up"></i> รายรับรวม</span>`;
        } else if (isCopay) {
            walletBadge = `<span class="item-wallet-badge copay"><i class="fa-solid fa-handshake-angle"></i> สิทธิ์ 60/40</span>`;
        } else if (targetWallet) {
            walletBadge = `<span class="item-wallet-badge ${targetWallet.id}"><i class="${targetWallet.icon}"></i> ${targetWallet.name}</span>`;
        }

        item.innerHTML = `
        <div class="item-info">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="item-desc">${t.description}</span>
                ${walletBadge}
            </div>
            <span class="item-cat">${getCategoryName(t.category)} · <small style="color: var(--text-secondary);">${t.date || ''}</small></span>
        </div>
        <div class="item-right">
            <span class="item-amount">${sign}${formatMoney(t.amount).replace('฿', '')}</span>
            <button class="btn-delete" onclick="deleteTransaction('${t.id}')" title="ลบรายการนี้">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
        `;

        listEl.insertBefore(item, listEl.firstChild);
    });
}

function updateCopayPreview() {
    const walletChecked = document.querySelector('input[name="wallet"]:checked');
    if (!walletChecked || !copayBreakdownBox) return;

    if (walletChecked.value !== 'copay') {
        copayBreakdownBox.style.display = 'none';
        return;
    }

    copayBreakdownBox.style.display = 'block';
    const totalAmount = parseFloat(amountEl.value) || 0;
    const spentToday = getTodayGrantExpense();
    const remainingQuotaToday = Math.max(0, DAILY_GRANT_LIMIT - spentToday);
    const grantBalance = getWalletBalance('grant');
    const gwalletBalance = getWalletBalance('gwallet');

    const theoretical60 = totalAmount * 0.6;
    const grantCanPay = Math.min(theoretical60, remainingQuotaToday, Math.max(0, grantBalance));
    const userMustPay = totalAmount - grantCanPay;

    if (copayPaotangAmountEl) copayPaotangAmountEl.innerText = formatMoney(grantCanPay);
    if (copayUserAmountEl) copayUserAmountEl.innerText = formatMoney(userMustPay);

    if (copayNoteEl) {
        if (gwalletBalance < userMustPay) {
            copayNoteEl.innerText = `⚠️ ยอดใน G-Wallet มี ฿${gwalletBalance.toFixed(2)} (ไม่พอจ่ายส่วน 40%) แนะนำกดเติมเงินเข้า G-Wallet ก่อนครับ`;
            copayNoteEl.style.color = '#f43f5e';
        } else if (grantBalance <= 0) {
            copayNoteEl.innerText = `⚠️ สิทธิ์รัฐหมดแล้ว ยอดทั้งหมดจะตัดจาก G-Wallet`;
            copayNoteEl.style.color = '#f43f5e';
        } else if (remainingQuotaToday <= 0) {
            copayNoteEl.innerText = `⚠️ โควตาสิทธิ์วันนี้ (200฿) เต็มแล้ว ยอดทั้งหมดจะตัดจาก G-Wallet`;
            copayNoteEl.style.color = '#f43f5e';
        } else if (theoretical60 > remainingQuotaToday) {
            copayNoteEl.innerText = `*สิทธิ์ 60% เกินโควตาวันนี้ที่เหลือ (${remainingQuotaToday.toFixed(0)}฿) ส่วนเกินจะหักจาก G-Wallet`;
            copayNoteEl.style.color = '#38bdf8';
        } else {
            copayNoteEl.innerText = `*สิทธิ์รัฐช่วย 60% (สูงสุด 200฿/วัน) และหัก 40% จาก G-Wallet`;
            copayNoteEl.style.color = 'var(--text-secondary)';
        }
    }
}

function updateMonthFilterOptions() {
    const months = new Set();
    months.add(currentMonthKey);
    transactions.forEach(t => {
        months.add(getMonthKey(t));
    });

    const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));

    if (monthFilterEl) {
        monthFilterEl.innerHTML = sortedMonths.map(month => {
            return `<option value="${month}" ${month === selectedMonthKey ? 'selected' : ''}>${formatMonthKeyThai(month)}</option>`;
        }).join('');
    }
}

// =========================================================
// 10. Add Transaction & Quick Operations
// =========================================================
function addTransaction(e) {
    e.preventDefault();

    const type = document.querySelector('input[name="type"]:checked').value;
    const walletChecked = document.querySelector('input[name="wallet"]:checked');
    const wallet = walletChecked ? walletChecked.value : 'spending';
    const description = descriptionEl.value.trim();
    const amount = +amountEl.value;
    const category = categoryEl.value;

    // ตรวจสอบสถานะล็อกของกระเป๋าที่เลือก
    if (wallet !== 'copay') {
        const chosenWallet = getWallet(wallet);
        if (chosenWallet && chosenWallet.isLocked) {
            alert(`⛔ กระเป๋า "${chosenWallet.name}" ถูกล็อกห้ามใช้ไว้ชั่วคราว\nกรุณาปลดล็อกกระเป๋าก่อน หรือเลือกกระเป๋าใบอื่นครับ`);
            return;
        }
    } else {
        // ตรวจสอบ gwallet หรือ grant ว่าล็อกหรือไม่เมื่อใช้สิทธิ์ copay
        const gwalletObj = getWallet('gwallet');
        if (gwalletObj && gwalletObj.isLocked) {
            alert(`⛔ กระเป๋า G-Wallet ถูกล็อกอยู่ ไม่สามารถใช้สิทธิ์ 60/40 ได้`);
            return;
        }
    }

    if (category === 'topup_gwallet') {
        const batchId = Math.random().toString(36).substring(2, 9);
        transactions.push({
            id: Math.random().toString(36).substring(2, 9),
            batchId,
            description: `โอนเติมเงินไป G-Wallet`,
            amount: amount,
            type: 'expense',
            wallet: 'spending',
            category: 'topup_gwallet',
            date: todayDateStr,
            monthKey: currentMonthKey
        });
        transactions.push({
            id: Math.random().toString(36).substring(2, 9),
            batchId,
            description: `รับเงินเติมเข้า G-Wallet`,
            amount: amount,
            type: 'income',
            wallet: 'gwallet',
            category: 'topup_gwallet',
            date: todayDateStr,
            monthKey: currentMonthKey
        });
    } else if (category === 'transfer_savings') {
        const batchId = Math.random().toString(36).substring(2, 9);
        transactions.push({
            id: Math.random().toString(36).substring(2, 9),
            batchId,
            description: `โอนเก็บเงินออม`,
            amount: amount,
            type: 'expense',
            wallet: 'spending',
            category: 'transfer_savings',
            date: todayDateStr,
            monthKey: currentMonthKey
        });
        transactions.push({
            id: Math.random().toString(36).substring(2, 9),
            batchId,
            description: `เงินเข้าบัญชีออม`,
            amount: amount,
            type: 'income',
            wallet: 'savings',
            category: 'transfer_savings',
            date: todayDateStr,
            monthKey: currentMonthKey
        });
    } else if (wallet === 'copay' && type === 'expense') {
        const spentToday = getTodayGrantExpense();
        const remainingQuotaToday = Math.max(0, DAILY_GRANT_LIMIT - spentToday);
        const grantBalance = getWalletBalance('grant');

        const theoretical60 = amount * 0.6;
        const grantAmount = Math.min(theoretical60, remainingQuotaToday, Math.max(0, grantBalance));
        const userAmount = amount - grantAmount;
        const batchId = Math.random().toString(36).substring(2, 9);

        if (grantAmount > 0) {
            transactions.push({
                id: Math.random().toString(36).substring(2, 9),
                batchId,
                description: `${description} (สิทธิ์รัฐ 60%)`,
                amount: parseFloat(grantAmount.toFixed(2)),
                type: 'expense',
                wallet: 'grant',
                category,
                isCopay: true,
                date: todayDateStr,
                monthKey: currentMonthKey
            });
        }

        if (userAmount > 0) {
            transactions.push({
                id: Math.random().toString(36).substring(2, 9),
                batchId,
                description: `${description} (จ่ายผ่าน G-Wallet 40%)`,
                amount: parseFloat(userAmount.toFixed(2)),
                type: 'expense',
                wallet: 'gwallet',
                category,
                isCopay: true,
                date: todayDateStr,
                monthKey: currentMonthKey
            });
        }
    } else {
        let finalWallet = wallet;
        if (type === 'income' && !['allocate_spending', 'transfer_savings', 'wallet_deposit'].includes(category)) {
            finalWallet = 'income';
        } else if (wallet === 'copay') {
            finalWallet = 'gwallet';
        }

        const transaction = {
            id: Math.random().toString(36).substring(2, 9),
            description,
            amount,
            type,
            wallet: finalWallet,
            category,
            date: todayDateStr,
            monthKey: currentMonthKey
        };
        transactions.push(transaction);
    }

    selectedMonthKey = currentMonthKey;
    updateLocalStorage();
    init();
    formEl.reset();

    renderWalletFormSelector();
    updateCopayPreview();
}

function quickTopupGWallet() {
    const gwallet = getWallet('gwallet');
    if (gwallet && gwallet.isLocked) {
        alert('⚠️ กระเป๋า G-Wallet ถูกล็อกไว้ ไม่สามารถเติมเงินได้');
        return;
    }

    const amountStr = prompt('กรุณาระบุจำนวนเงินที่ต้องการโอนจากบัญชีใช้จ่ายเข้า G-Wallet (บาท):', '200');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        return;
    }

    const batchId = Math.random().toString(36).substring(2, 9);
    transactions.push({
        id: Math.random().toString(36).substring(2, 9),
        batchId,
        description: `โอนเติมเงินเข้า G-Wallet`,
        amount: amount,
        type: 'expense',
        wallet: 'spending',
        category: 'topup_gwallet',
        date: todayDateStr,
        monthKey: currentMonthKey
    });

    transactions.push({
        id: Math.random().toString(36).substring(2, 9),
        batchId,
        description: `รับเงินเติมเข้า G-Wallet`,
        amount: amount,
        type: 'income',
        wallet: 'gwallet',
        category: 'topup_gwallet',
        date: todayDateStr,
        monthKey: currentMonthKey
    });

    updateLocalStorage();
    init();
    alert(`🎉 เติมเงินเข้า G-Wallet จำนวน ${formatMoney(amount)} เรียบร้อยแล้ว!`);
}

function allocateSavings() {
    const savings = getWallet('savings');
    if (savings && savings.isLocked) {
        alert('⚠️ กระเป๋าบัญชีเงินเก็บถูกล็อกไว้');
        return;
    }

    const amountStr = prompt('กรุณาระบุจำนวนเงินที่ต้องการเก็บออมเข้าบัญชีเงินเก็บ (บาท):', '2390');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        return;
    }

    transactions.push({
        id: Math.random().toString(36).substring(2, 9),
        description: `เก็บออมเงินเข้าบัญชีเงินเก็บ`,
        amount: amount,
        type: 'income',
        wallet: 'savings',
        category: 'transfer_savings',
        date: todayDateStr,
        monthKey: currentMonthKey
    });

    updateLocalStorage();
    init();
    alert(`🎉 ระบุยอดเงินเก็บจำนวน ${formatMoney(amount)} เรียบร้อยแล้ว!`);
}

function allocateSpending() {
    const spending = getWallet('spending');
    if (spending && spending.isLocked) {
        alert('⚠️ บัญชีใช้จ่ายถูกล็อกไว้');
        return;
    }

    const amountStr = prompt('กรุณาระบุจำนวนเงินที่ต้องการกำหนด/จัดสรรเข้าบัญชีใช้จ่าย (บาท):', '5130');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        return;
    }

    transactions.push({
        id: Math.random().toString(36).substring(2, 9),
        description: `จัดสรรงบเข้าบัญชีใช้จ่าย`,
        amount: amount,
        type: 'income',
        wallet: 'spending',
        category: 'allocate_spending',
        date: todayDateStr,
        monthKey: currentMonthKey
    });

    updateLocalStorage();
    init();
    alert(`🎉 จัดสรรงบเข้าบัญชีใช้จ่ายจำนวน ${formatMoney(amount)} เรียบร้อยแล้ว!`);
}

function claimGrant() {
    const grant = getWallet('grant');
    if (grant && grant.isLocked) {
        alert('⚠️ สิทธิ์ไทยช่วยไทยถูกล็อกไว้');
        return;
    }

    const hasClaimed = transactions.some(t => t.category === 'paotang_grant' && t.type === 'income');
    if (hasClaimed) {
        if (!confirm('คุณเคยบันทึกรับสิทธิ์โครงการนี้ไปแล้ว ต้องการรับเพิ่มอีก 1,000 บาท ใช่หรือไม่?')) {
            return;
        }
    }

    const grantTransaction = {
        id: Math.random().toString(36).substring(2, 9),
        description: 'รับเงินสิทธิ์โครงการไทยช่วยไทย',
        amount: 1000.00,
        type: 'income',
        wallet: 'grant',
        category: 'paotang_grant',
        date: todayDateStr,
        monthKey: currentMonthKey
    };

    transactions.push(grantTransaction);
    selectedMonthKey = currentMonthKey;
    updateLocalStorage();
    init();
    alert('🎉 บันทึกรับสิทธิ์โครงการไทยช่วยไทย 1,000 บาท เข้ากระเป๋าสิทธิ์เรียบร้อยแล้ว!');
}

window.deleteTransaction = function (id) {
    if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    init();
};

function exportToCSV() {
    const filtered = transactions.filter(t => getMonthKey(t) === selectedMonthKey);
    if (filtered.length === 0) {
        alert('ไม่มีข้อมูลในเดือนนี้ให้ดาวน์โหลด');
        return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'วันที่,บัญชี/กระเป๋าเงิน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n';

    filtered.forEach(t => {
        const typeText = t.type === 'income' ? 'รายรับ' : 'รายจ่าย';
        const w = normalizeWallet(t);
        const targetWallet = getWallet(w);
        const walletText = targetWallet ? targetWallet.name : 'บัญชีใช้จ่าย';

        csvContent += `${t.date},${walletText},${typeText},${getCategoryName(t.category)},"${t.description}",${t.amount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${selectedMonthKey}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =========================================================
// 11. Calendar View Logic
// =========================================================
function renderCalendarView() {
    if (!calendarGridEl) return;
    calendarGridEl.innerHTML = '';

    const [yearStr, monthStr] = selectedMonthKey.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const monthTransactions = transactions.filter(t => {
        const matchMonth = getMonthKey(t) === selectedMonthKey;
        const currentW = normalizeWallet(t);
        const matchWallet = selectedWallet === 'all' || currentW === selectedWallet;
        return matchMonth && matchWallet;
    });

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty';
        calendarGridEl.appendChild(emptyCell);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';

        const tYear = year + 543;
        const targetDatePrefix1 = `${day}/${month + 1}/${tYear}`;
        const targetDatePrefix2 = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${tYear}`;

        const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
        if (isToday) cell.classList.add('today');

        const dayTransactions = monthTransactions.filter(t => {
            if (!t.date) return false;
            return t.date.startsWith(targetDatePrefix1) || t.date.startsWith(targetDatePrefix2);
        });

        const internalTransfers = ['topup_gwallet', 'transfer_savings', 'paotang_grant', 'allocate_spending', 'wallet_deposit'];
        const dayIncome = dayTransactions
            .filter(t => t.type === 'income' && !internalTransfers.includes(t.category))
            .reduce((acc, t) => acc + t.amount, 0);

        const dayExpense = dayTransactions
            .filter(t => t.type === 'expense' && t.category !== 'topup_gwallet' && t.category !== 'transfer_savings')
            .reduce((acc, t) => acc + t.amount, 0);

        let amountsHtml = '';
        if (dayIncome > 0 || dayExpense > 0) {
            amountsHtml = `<div class="day-amounts">
                ${dayIncome > 0 ? `<span class="day-amt-income">+${formatMoney(dayIncome).replace('฿', '')}</span>` : ''}
                ${dayExpense > 0 ? `<span class="day-amt-expense">-${formatMoney(dayExpense).replace('฿', '')}</span>` : ''}
            </div>`;
        }

        cell.innerHTML = `
            <span class="day-number">${day}</span>
            ${amountsHtml}
        `;

        if (selectedCalendarDay === day) {
            cell.classList.add('active-day');
        }

        cell.addEventListener('click', () => {
            document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('active-day'));
            cell.classList.add('active-day');
            selectedCalendarDay = day;
            showDayDetails(day, targetDatePrefix1, dayTransactions);
        });

        calendarGridEl.appendChild(cell);
    }
}

function showDayDetails(day, dateStr, dayTransactions) {
    if (!calendarDayDetailsEl || !selectedDayTitleEl || !calendarDayListEl) return;

    calendarDayDetailsEl.style.display = 'block';
    selectedDayTitleEl.innerHTML = `<i class="fa-regular fa-calendar-check"></i> รายการวันที่ ${day} ${formatMonthKeyThai(selectedMonthKey)}`;
    calendarDayListEl.innerHTML = '';

    if (dayTransactions.length === 0) {
        calendarDayListEl.innerHTML = `<li style="text-align: center; color: var(--text-secondary); padding: 10px; font-size: 0.85rem;">ไม่มีรายการในวันนี้</li>`;
        return;
    }

    dayTransactions.forEach(t => {
        const item = document.createElement('li');
        item.classList.add('transaction-item', t.type);

        const sign = t.type === 'income' ? '+' : '-';
        const walletType = normalizeWallet(t);
        const isCopay = t.isCopay;
        const targetWallet = getWallet(walletType);

        let walletBadge = `<span class="item-wallet-badge spending"><i class="fa-solid fa-wallet"></i> บัญชีใช้จ่าย</span>`;
        if (t.type === 'income' && !['allocate_spending', 'transfer_savings', 'topup_gwallet', 'paotang_grant', 'wallet_deposit'].includes(t.category)) {
            walletBadge = `<span class="item-wallet-badge income"><i class="fa-solid fa-arrow-trend-up"></i> รายรับรวม</span>`;
        } else if (isCopay) {
            walletBadge = `<span class="item-wallet-badge copay"><i class="fa-solid fa-handshake-angle"></i> สิทธิ์ 60/40</span>`;
        } else if (targetWallet) {
            walletBadge = `<span class="item-wallet-badge ${targetWallet.id}"><i class="${targetWallet.icon}"></i> ${targetWallet.name}</span>`;
        }

        item.innerHTML = `
        <div class="item-info">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="item-desc">${t.description}</span>
                ${walletBadge}
            </div>
            <span class="item-cat">${getCategoryName(t.category)}</span>
        </div>
        <div class="item-right">
            <span class="item-amount">${sign}${formatMoney(t.amount).replace('฿', '')}</span>
            <button class="btn-delete" onclick="deleteTransaction('${t.id}')">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
        `;
        calendarDayListEl.appendChild(item);
    });
}

function setViewMode(mode) {
    currentViewMode = mode;
    if (mode === 'list') {
        if (btnViewList) btnViewList.classList.add('active');
        if (btnViewCalendar) btnViewCalendar.classList.remove('active');
        if (listEl) listEl.style.display = 'block';
        if (calendarViewEl) calendarViewEl.style.display = 'none';
        renderTransactions();
    } else {
        if (btnViewCalendar) btnViewCalendar.classList.add('active');
        if (btnViewList) btnViewList.classList.remove('active');
        if (listEl) listEl.style.display = 'none';
        if (calendarViewEl) calendarViewEl.style.display = 'flex';
        renderCalendarView();
    }
}

// =========================================================
// 12. App Initialization & Event Listeners
// =========================================================
function init() {
    renderCategorySelect();
    renderWalletCards();
    renderWalletFormSelector();
    renderWalletFilterOptions();
    updateMonthFilterOptions();

    if (currentViewMode === 'list') {
        renderTransactions();
    } else {
        renderCalendarView();
    }
    updateDashboard();
}

// Event Listeners
formEl.addEventListener('submit', addTransaction);
exportBtn.addEventListener('click', exportToCSV);

// Wallet Modal Listeners
if (btnManageWallets) {
    btnManageWallets.addEventListener('click', () => {
        resetWalletForm();
        renderModalWalletList();
        if (walletModal) walletModal.style.display = 'flex';
    });
}
if (btnCloseWalletModal) {
    btnCloseWalletModal.addEventListener('click', () => {
        if (walletModal) walletModal.style.display = 'none';
    });
}
if (walletModal) {
    walletModal.addEventListener('click', (e) => {
        if (e.target === walletModal) {
            walletModal.style.display = 'none';
        }
    });
}
if (walletForm) {
    walletForm.addEventListener('submit', addOrUpdateWallet);
}
if (btnCancelEditWallet) {
    btnCancelEditWallet.addEventListener('click', resetWalletForm);
}

// Category Modal Listeners
if (btnManageCategories) {
    btnManageCategories.addEventListener('click', () => {
        renderModalCategoryList();
        if (categoryModal) categoryModal.style.display = 'flex';
    });
}
if (btnCloseCatModal) {
    btnCloseCatModal.addEventListener('click', () => {
        if (categoryModal) categoryModal.style.display = 'none';
    });
}
if (categoryModal) {
    categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) {
            categoryModal.style.display = 'none';
        }
    });
}
if (newCategoryForm) {
    newCategoryForm.addEventListener('submit', addCategory);
}

// Calendar & View Mode Listeners
if (btnViewList) {
    btnViewList.addEventListener('click', () => setViewMode('list'));
}
if (btnViewCalendar) {
    btnViewCalendar.addEventListener('click', () => setViewMode('calendar'));
}
if (btnCloseDayDetails) {
    btnCloseDayDetails.addEventListener('click', () => {
        if (calendarDayDetailsEl) calendarDayDetailsEl.style.display = 'none';
        document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('active-day'));
        selectedCalendarDay = null;
    });
}

if (monthFilterEl) {
    monthFilterEl.addEventListener('change', (e) => {
        selectedMonthKey = e.target.value;
        if (currentViewMode === 'list') {
            renderTransactions();
        } else {
            renderCalendarView();
            if (calendarDayDetailsEl) calendarDayDetailsEl.style.display = 'none';
        }
        updateDashboard();
    });
}

if (walletFilterEl) {
    walletFilterEl.addEventListener('change', (e) => {
        selectedWallet = e.target.value;
        if (currentViewMode === 'list') {
            renderTransactions();
        } else {
            renderCalendarView();
            if (calendarDayDetailsEl) calendarDayDetailsEl.style.display = 'none';
        }
    });
}

// Form Amount Live Calculation
if (amountEl) {
    amountEl.addEventListener('input', updateCopayPreview);
}

// Type Radio visibility toggle
function updateFormTypeVisibility() {
    const isIncome = document.getElementById('type-income')?.checked;
    const walletFormGroup = document.getElementById('wallet-selector-list')?.parentElement;
    if (walletFormGroup) {
        walletFormGroup.style.display = isIncome ? 'none' : 'block';
    }
    if (isIncome && copayBreakdownBox) {
        copayBreakdownBox.style.display = 'none';
    } else {
        updateCopayPreview();
    }
}

document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener('change', updateFormTypeVisibility);
});

// Start Application
init();
updateFormTypeVisibility();