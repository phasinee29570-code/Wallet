// 1.อ้างอิง DOM Elements จาก HTML
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
const savingsBalanceEl = document.getElementById('savings-balance');
const spendingBalanceEl = document.getElementById('spending-balance');
const gwalletBalanceEl = document.getElementById('gwallet-balance');
const grantBalanceEl = document.getElementById('grant-balance');
const walletFilterEl = document.getElementById('wallet-filter');
const btnClaimGrant = document.getElementById('btn-claim-grant');
const btnQuickTopup = document.getElementById('btn-quick-topup');
const btnAllocateSpending = document.getElementById('btn-allocate-spending');
const btnAllocateSavings = document.getElementById('btn-allocate-savings');
const reserveBalanceEl = document.getElementById('reserve-balance');
const todayQuotaText = document.getElementById('today-quota-text');
const todayQuotaProgress = document.getElementById('today-quota-progress');
const copayBreakdownBox = document.getElementById('copay-breakdown-box');
const copayPaotangAmountEl = document.getElementById('copay-paotang-amount');
const copayUserAmountEl = document.getElementById('copay-user-amount');
const copayNoteEl = document.getElementById('copay-note');

let selectedWallet = 'all';
const DAILY_GRANT_LIMIT = 200; // วงเงินสิทธิ์รัฐสูงสุดต่อวัน

// 2. ข้อมูลรายชื่อเดือนภาษาไทย
const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// ดึงเดือนปัจจุบันเป็นค่าตั้งต้น (เช่น "2026-07")
const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const todayDateStr = now.toLocaleDateString('th-TH');
let selectedMonthKey = currentMonthKey;

// 3. ดึงข้อมูลรายการจาก Local Storage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// ฟังก์ชันแปลง wallet เก่าให้เข้ากับโครงสร้าง 4 บัญชีใหม่
function normalizeWallet(t) {
    if (t.wallet === 'main') return 'spending';
    if (t.wallet === 'paotang') {
        return t.category === 'paotang_grant' ? 'grant' : 'gwallet';
    }
    return t.wallet || 'spending';
}

// 4. ฟังก์ชันดึงค่า Month Key (YYYY-MM)
function getMonthKey(transaction) {
    if (transaction.monthKey) return transaction.monthKey;

    if (transaction.date) {
        const parts = transaction.date.split('/');
        if (parts.length === 3) {
            let year = parseInt(parts[2]);
            let month = parseInt(parts[1]);
            if (year > 2400) {
                year -= 543;
            }
            return `${year}-${String(month).padStart(2, '0')}`;
        }
    }

    return currentMonthKey;
}

// 5. แปลง Month Key เป็นข้อความภาษาไทยสวยๆ (เช่น "กรกฎาคม 2569")
function formatMonthKeyThai(monthKey) {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const thaiYear = year + 543;
    const monthName = THAI_MONTHS[month - 1] || '';
    return `${monthName} ${thaiYear}`;
}

// 6. ฟังก์ชันจัดรูปแบบตัวเลขให้เป็นสกุลเงินบาท เช่น 1,000.00
function formatMoey(value) {
    return '฿' + Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// คำนวณยอดเงินสิทธิ์รัฐที่ใช้ไปแล้วในวันนี้
function getTodayGrantExpense() {
    return transactions
        .filter(t => t.date === todayDateStr && normalizeWallet(t) === 'grant' && t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
}

// คำนวณยอดคงเหลือของแต่ละกระเป๋า
function getWalletBalance(walletType) {
    if (walletType === 'spending') {
        const income = transactions
            .filter(t => normalizeWallet(t) === 'spending' && t.type === 'income' && t.category === 'allocate_spending')
            .reduce((acc, t) => acc + t.amount, 0);
        const expense = transactions
            .filter(t => normalizeWallet(t) === 'spending' && t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);
        return income - expense;
    }
    return transactions
        .filter(t => normalizeWallet(t) === walletType)
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
}

// 7. ฟังก์ชันคำนวณและอัปเดตยอดเงินใน Dashboard
function updateDashboard() {
    const filtered = transactions.filter(t => getMonthKey(t) === selectedMonthKey);

    // 1. บัญชีเงินเก็บ (Savings)
    const savingsBalance = filtered
        .filter(t => normalizeWallet(t) === 'savings')
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

    // 2. บัญชีใช้จ่าย (Spending)
    // รายรับเข้าบัญชีใช้จ่าย = เฉพาะยอดที่ผู้ใช้กด "ระบุงบใช้จ่าย" (allocate_spending)
    // รายจ่าย = ยอดที่จ่ายออกจากบัญชีใช้จ่าย
    const spendingIncome = filtered
        .filter(t => normalizeWallet(t) === 'spending' && t.type === 'income' && t.category === 'allocate_spending')
        .reduce((acc, t) => acc + t.amount, 0);

    const spendingExpense = filtered
        .filter(t => normalizeWallet(t) === 'spending' && t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const spendingBalance = spendingIncome - spendingExpense;

    // 3. G-Wallet (เงินที่เติม)
    const gwalletBalance = filtered
        .filter(t => normalizeWallet(t) === 'gwallet')
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

    // 4. สิทธิ์ไทยช่วยไทย
    const grantBalance = filtered
        .filter(t => normalizeWallet(t) === 'grant')
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

    // รายรับรวมจริง (รายได้ภายนอก เช่น เงินเดือน โดยไม่รวมการโอนย้ายเงินภายใน และไม่รวมเงินสิทธิ์รัฐ 1,000฿)
    const internalTransfers = ['topup_gwallet', 'transfer_savings', 'paotang_grant', 'allocate_spending'];
    const income = filtered
        .filter(t => t.type === 'income' && !internalTransfers.includes(t.category))
        .reduce((acc, t) => acc + t.amount, 0);

    // ยอดเงินที่จัดสรรออกไปจากรายรับ (ไปเงินเก็บ และไปงบใช้จ่าย)
    const allocatedSavings = filtered
        .filter(t => normalizeWallet(t) === 'savings' && t.type === 'income' && t.category === 'transfer_savings')
        .reduce((acc, t) => acc + t.amount, 0);

    const allocatedSpending = spendingIncome;

    // รายจ่ายที่ตัดจากเงินสำรอง หรือรายรับโดยตรง
    const directIncomeExpense = filtered
        .filter(t => t.type === 'expense' && (t.wallet === 'reserve' || t.wallet === 'income' || t.wallet === 'main'))
        .reduce((acc, t) => acc + t.amount, 0);

    // 5. เงินสำรอง / คงเหลือจากรายรับ = รายรับรวม - ยอดที่จัดสรรไปเงินเก็บ - ยอดที่จัดสรรไปใช้จ่าย - รายจ่ายตรง
    const reserveBalance = income - allocatedSavings - allocatedSpending - directIncomeExpense;

    // รายจ่ายรวมจริง (ไม่รวมการโอนย้ายเงินภายใน)
    const expense = filtered
        .filter(t => t.type === 'expense' && t.category !== 'topup_gwallet' && t.category !== 'transfer_savings')
        .reduce((acc, t) => acc + t.amount, 0);

    // ยอดเงินคงเหลือรวมทุกกระเป๋า = เงินเก็บ + เงินใช้จ่าย + เงินสำรอง + G-Wallet + สิทธิ์รัฐ
    const total = savingsBalance + spendingBalance + reserveBalance + gwalletBalance + grantBalance;

    // อัปเดตแสดงผลบนหน้าเว็บ
    balanceEl.innerText = formatMoey(total);
    if (savingsBalanceEl) savingsBalanceEl.innerText = formatMoey(savingsBalance);
    if (spendingBalanceEl) spendingBalanceEl.innerText = formatMoey(spendingBalance);
    if (reserveBalanceEl) reserveBalanceEl.innerText = formatMoey(reserveBalance);
    if (gwalletBalanceEl) gwalletBalanceEl.innerText = formatMoey(gwalletBalance);
    if (grantBalanceEl) grantBalanceEl.innerText = formatMoey(grantBalance);
    totalIncomeEl.innerText = formatMoey(income);
    totalExpenseEl.innerText = formatMoey(expense);

    // อัปเดตโควตาวันนี้ของสิทธิ์รัฐ (สูงสุด 200 บาท)
    const spentToday = getTodayGrantExpense();
    const remainingToday = Math.max(0, DAILY_GRANT_LIMIT - spentToday);
    if (todayQuotaText) {
        todayQuotaText.innerText = `เหลือ ฿${remainingToday.toFixed(2)}`;
    }
    if (todayQuotaProgress) {
        const percent = Math.min(100, (spentToday / DAILY_GRANT_LIMIT) * 100);
        todayQuotaProgress.style.width = `${percent}%`;
    }

    updateCopayPreview();
}

// 8. แปลงคีย์หมวดหมู่เป็นข้อความภาษาไทยสวยๆ
function getCategoryName(category) {
    const categories = {
        allocate_spending: '💵 จัดสรรงบเข้าบัญชีใช้จ่าย',
        topup_gwallet: '🔄 เติมเงินเข้า G-Wallet',
        transfer_savings: '🏦 โอนเข้าบัญชีเงินเก็บ',
        paotang_grant: '🎁 เงินสิทธิ์โครงการรัฐ',
        salary: '💰 เงินเดือน / รายได้',
        food: '🍔 อาหารและเครื่องดื่ม',
        transport: '🚗 การเดินทาง / ยานพาหนะ',
        shopping: '🛍️ ช้อปปิ้ง / ของใช้',
        entertainment: '🎮 บันเทิง / พักผ่อน',
        utilities: '🏠 บิลค่าหอ / ค่าเน็ต',
        other: '🏷️ อื่นๆ'
    };
    return categories[category] || category;
}

// 9. ฟังก์ชันสร้างและแสดงผลรายการธุรกรรมในหน้าเว็บ
function renderTransactions() {
    listEl.innerHTML = '';

    const filtered = transactions.filter(t => {
        const matchMonth = getMonthKey(t) === selectedMonthKey;
        const currentW = normalizeWallet(t);
        const matchWallet = selectedWallet === 'all' || currentW === selectedWallet;
        return matchMonth && matchWallet;
    });

    filtered.forEach(t => {
        const item = document.createElement('li');
        item.classList.add('transaction-item', t.type);

        const sign = t.type === 'income' ? '+' : '-';
        const walletType = normalizeWallet(t);
        const isCopay = t.isCopay;

        let walletBadge = `<span class="item-wallet-badge spending"><i class="fa-solid fa-wallet"></i> บัญชีใช้จ่าย</span>`;
        if (t.type === 'income' && !['allocate_spending', 'transfer_savings', 'topup_gwallet', 'paotang_grant'].includes(t.category)) {
            walletBadge = `<span class="item-wallet-badge income"><i class="fa-solid fa-arrow-trend-up"></i> รายรับรวม</span>`;
        } else if (isCopay) {
            walletBadge = `<span class="item-wallet-badge copay"><i class="fa-solid fa-handshake-angle"></i> สิทธิ์ 60/40</span>`;
        } else if (walletType === 'reserve') {
            walletBadge = `<span class="item-wallet-badge reserve"><i class="fa-solid fa-coins"></i> เงินสำรอง</span>`;
        } else if (walletType === 'savings') {
            walletBadge = `<span class="item-wallet-badge savings"><i class="fa-solid fa-piggy-bank"></i> บัญชีเงินเก็บ</span>`;
        } else if (walletType === 'gwallet') {
            walletBadge = `<span class="item-wallet-badge gwallet"><i class="fa-solid fa-credit-card"></i> G-Wallet</span>`;
        } else if (walletType === 'grant') {
            walletBadge = `<span class="item-wallet-badge grant"><i class="fa-solid fa-gift"></i> สิทธิ์รัฐ</span>`;
        }

        item.innerHTML = `
        <div class="item-info">
            <div style="display: flex; align-items: center;">
                <span class="item-desc">${t.description}</span>
                ${walletBadge}
            </div>
            <span class="item-cat">${getCategoryName(t.category)}</span>
        </div>
        <div class="item-right">
            <span class="item-amount">${sign}${formatMoey(t.amount).replace('฿', '')}</span>
            <button class="btn-delete" onclick="deleteTransaction('${t.id}')">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
        `;

        listEl.insertBefore(item, listEl.firstChild);
    });
}

// 10. ฟังก์ชันคำนวณและแสดงตัวอย่างสิทธิ์ 60/40 (Live Preview)
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

    // สิทธิ์รัฐจ่าย 60% แต่ไม่เกิน 200฿/วัน และไม่เกินเงินสิทธิ์รัฐคงเหลือ
    const theoretical60 = totalAmount * 0.6;
    const grantCanPay = Math.min(theoretical60, remainingQuotaToday, Math.max(0, grantBalance));
    const userMustPay = totalAmount - grantCanPay;

    if (copayPaotangAmountEl) copayPaotangAmountEl.innerText = formatMoey(grantCanPay);
    if (copayUserAmountEl) copayUserAmountEl.innerText = formatMoey(userMustPay);

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

// 11. ฟังก์ชันอัปเดตตัวเลือกใน Dropdown สำหรับตัวกรองเดือน
function updateMonthFilterOptions() {
    const months = new Set();
    months.add(currentMonthKey);
    transactions.forEach(t => {
        months.add(getMonthKey(t));
    });

    const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));

    monthFilterEl.innerHTML = sortedMonths.map(month => {
        return `<option value="${month}" ${month === selectedMonthKey ? 'selected' : ''}>${formatMonthKeyThai(month)}</option>`;
    }).join('');
}

// 12. ฟังก์ชันเพิ่มรายการใหม่เมื่อกดปุ่มบันทึก
function addTransaction(e) {
    e.preventDefault();

    const type = document.querySelector('input[name="type"]:checked').value;
    const wallet = document.querySelector('input[name="wallet"]:checked').value;
    const description = descriptionEl.value.trim();
    const amount = +amountEl.value;
    const category = categoryEl.value;

    if (category === 'topup_gwallet') {
        // กรณีเติมเงินเข้า G-Wallet: ตัดเงินจากบัญชีใช้จ่าย และเพิ่มเงินเข้า G-Wallet
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
        // กรณีโอนเงินเข้าบัญชีเงินเก็บ: ตัดเงินจากบัญชีใช้จ่าย และเพิ่มเงินเข้าบัญชีเงินเก็บ
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
        // กรณีจ่ายสิทธิ์ 60/40: สิทธิ์รัฐ 60% + หักจาก G-Wallet 40%
        const spentToday = getTodayGrantExpense();
        const remainingQuotaToday = Math.max(0, DAILY_GRANT_LIMIT - spentToday);
        const grantBalance = getWalletBalance('grant');

        const theoretical60 = amount * 0.6;
        const grantAmount = Math.min(theoretical60, remainingQuotaToday, Math.max(0, grantBalance));
        const userAmount = amount - grantAmount;
        const batchId = Math.random().toString(36).substring(2, 9);

        // 1. ตัดสิทธิ์รัฐ 60%
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

        // 2. ตัดจาก G-Wallet 40%
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
        // กรณีทั่วไป
        let finalWallet = wallet;
        if (type === 'income' && category !== 'allocate_spending' && category !== 'transfer_savings') {
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

    const spendingRadio = document.getElementById('wallet-spending');
    if (spendingRadio) spendingRadio.checked = true;
    updateCopayPreview();
}

// 13. ฟังก์ชันเติมเงินเข้า G-Wallet แบบด่วน (Quick Top-up)
function quickTopupGWallet() {
    const amountStr = prompt('กรุณาระบุจำนวนเงินที่ต้องการโอนจากบัญชีใช้จ่ายเข้า G-Wallet (บาท):', '200');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        return;
    }

    const batchId = Math.random().toString(36).substring(2, 9);
    // 1. ตัดเงินจากบัญชีใช้จ่าย
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

    // 2. เพิ่มเงินเข้า G-Wallet
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
    alert(`🎉 เติมเงินเข้า G-Wallet จำนวน ฿${amount.toFixed(2)} เรียบร้อยแล้ว!`);
}

// 14. ฟังก์ชันกำหนด/ระบุยอดเงินเก็บ (Allocate Savings)
function allocateSavings() {
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
    alert(`🎉 ระบุยอดเงินเก็บจำนวน ฿${amount.toFixed(2)} เรียบร้อยแล้ว!`);
}

// 15. ฟังก์ชันกำหนด/จัดสรรงบเข้าบัญชีใช้จ่าย (Allocate Spending Budget)
function allocateSpending() {
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
    alert(`🎉 จัดสรรงบเข้าบัญชีใช้จ่ายจำนวน ฿${amount.toFixed(2)} เรียบร้อยแล้ว!`);
}

// 16. ฟังก์ชันรับสิทธิ์โครงการ 1,000 บาท
function claimGrant() {
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

// 17. ฟังก์ชันลบรายการ
window.deleteTransaction = function (id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    init();
};

// 18. ฟังก์ชันบันทึกข้อมูลเก็บไว้ในเครื่องเบราว์เซอร์
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// 19. ฟังก์ชันดาวน์โหลดข้อมูลออกเป็นไฟล์ CSV
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
        let walletText = 'บัญชีใช้จ่าย';
        if (w === 'savings') walletText = 'บัญชีเงินเก็บ';
        if (w === 'gwallet') walletText = 'G-Wallet';
        if (w === 'grant') walletText = 'สิทธิ์ไทยช่วยไทย';

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

// 20. ฟังก์ชันเริ่มต้นรันโปรแกรม
function init() {
    updateMonthFilterOptions();
    renderTransactions();
    updateDashboard();
}

// ผูก Event Listeners
formEl.addEventListener('submit', addTransaction);
exportBtn.addEventListener('click', exportToCSV);
if (btnClaimGrant) btnClaimGrant.addEventListener('click', claimGrant);
if (btnQuickTopup) btnQuickTopup.addEventListener('click', quickTopupGWallet);
if (btnAllocateSpending) btnAllocateSpending.addEventListener('click', allocateSpending);
if (btnAllocateSavings) btnAllocateSavings.addEventListener('click', allocateSavings);

monthFilterEl.addEventListener('change', (e) => {
    selectedMonthKey = e.target.value;
    renderTransactions();
    updateDashboard();
});

if (walletFilterEl) {
    walletFilterEl.addEventListener('change', (e) => {
        selectedWallet = e.target.value;
        renderTransactions();
    });
}

// ฟังก์ชันจัดการการแสดงผลตัวเลือกกระเป๋าเงินในฟอร์ม
const walletFormGroup = document.querySelector('.wallet-selector')?.parentElement;
function updateFormTypeVisibility() {
    const isIncome = document.getElementById('type-income')?.checked;
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

// รันโปรแกรมครั้งแรก
init();
updateFormTypeVisibility();
