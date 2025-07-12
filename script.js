// نظام محاسبة مزرعة الدواجن
class PoultryAccountingSystem {
    constructor() {
        this.accounts = this.loadData('accounts') || this.getDefaultAccounts();
        this.entries = this.loadData('entries') || [];
        this.inventory = this.loadData('inventory') || [];
        this.invoices = this.loadData('invoices') || [];
        
        this.init();
    }

    // تحميل البيانات من التخزين المحلي
    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // حفظ البيانات في التخزين المحلي
    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // الحسابات الافتراضية
    getDefaultAccounts() {
        return [
            // الأصول
            { id: 1, code: '1001', name: 'النقدية', type: 'أصول', balance: 0, parentId: null },
            { id: 2, code: '1002', name: 'البنك', type: 'أصول', balance: 0, parentId: null },
            { id: 3, code: '1101', name: 'مخزون الأعلاف', type: 'أصول', balance: 0, parentId: null },
            { id: 4, code: '1102', name: 'مخزون الأدوية', type: 'أصول', balance: 0, parentId: null },
            { id: 5, code: '1103', name: 'مخزون البيض', type: 'أصول', balance: 0, parentId: null },
            { id: 6, code: '1201', name: 'الدجاج الحي', type: 'أصول', balance: 0, parentId: null },
            { id: 7, code: '1301', name: 'المعدات', type: 'أصول', balance: 0, parentId: null },
            { id: 8, code: '1302', name: 'المباني', type: 'أصول', balance: 0, parentId: null },

            // الخصوم
            { id: 9, code: '2001', name: 'حسابات الموردين', type: 'خصوم', balance: 0, parentId: null },
            { id: 10, code: '2002', name: 'القروض', type: 'خصوم', balance: 0, parentId: null },
            { id: 11, code: '2003', name: 'مصروفات مستحقة', type: 'خصوم', balance: 0, parentId: null },

            // حقوق الملكية
            { id: 12, code: '3001', name: 'رأس المال', type: 'حقوق ملكية', balance: 0, parentId: null },
            { id: 13, code: '3002', name: 'الأرباح المحتجزة', type: 'حقوق ملكية', balance: 0, parentId: null },

            // الإيرادات
            { id: 14, code: '4001', name: 'مبيعات البيض', type: 'إيرادات', balance: 0, parentId: null },
            { id: 15, code: '4002', name: 'مبيعات الدجاج', type: 'إيرادات', balance: 0, parentId: null },
            { id: 16, code: '4003', name: 'مبيعات السماد', type: 'إيرادات', balance: 0, parentId: null },

            // المصروفات
            { id: 17, code: '5001', name: 'تكلفة الأعلاف', type: 'مصروفات', balance: 0, parentId: null },
            { id: 18, code: '5002', name: 'تكلفة الأدوية', type: 'مصروفات', balance: 0, parentId: null },
            { id: 19, code: '5003', name: 'أجور العمالة', type: 'مصروفات', balance: 0, parentId: null },
            { id: 20, code: '5004', name: 'الكهرباء والمياه', type: 'مصروفات', balance: 0, parentId: null },
            { id: 21, code: '5005', name: 'الصيانة', type: 'مصروفات', balance: 0, parentId: null },
            { id: 22, code: '5006', name: 'الاستهلاك', type: 'مصروفات', balance: 0, parentId: null }
        ];
    }

    // تهيئة النظام
    init() {
        this.updateDashboard();
        this.loadAccountsTable();
        this.loadEntriesTable();
        
        // إظهار لوحة التحكم افتراضياً
        this.showSection('dashboard');
    }

    // إظهار قسم معين
    showSection(sectionId) {
        // إخفاء جميع الأقسام
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // إظهار القسم المطلوب
        document.getElementById(sectionId).classList.remove('hidden');
        
        // تحديث الروابط النشطة
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('bg-gray-700');
        });
        
        event.target.classList.add('bg-gray-700');
    }

    // تحديث لوحة التحكم
    updateDashboard() {
        const totalRevenue = this.calculateTotalRevenue();
        const totalExpenses = this.calculateTotalExpenses();
        const netProfit = totalRevenue - totalExpenses;
        const inventoryValue = this.calculateInventoryValue();

        document.getElementById('totalRevenue').textContent = this.formatCurrency(totalRevenue);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('netProfit').textContent = this.formatCurrency(netProfit);
        document.getElementById('inventoryValue').textContent = this.formatCurrency(inventoryValue);

        this.loadRecentTransactions();
    }

    // حساب إجمالي الإيرادات
    calculateTotalRevenue() {
        return this.accounts
            .filter(account => account.type === 'إيرادات')
            .reduce((total, account) => total + account.balance, 0);
    }

    // حساب إجمالي المصروفات
    calculateTotalExpenses() {
        return this.accounts
            .filter(account => account.type === 'مصروفات')
            .reduce((total, account) => total + account.balance, 0);
    }

    // حساب قيمة المخزون
    calculateInventoryValue() {
        return this.accounts
            .filter(account => account.name.includes('مخزون'))
            .reduce((total, account) => total + account.balance, 0);
    }

    // تنسيق العملة
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // تحميل جدول الحسابات
    loadAccountsTable() {
        const tbody = document.getElementById('accountsTable');
        tbody.innerHTML = '';

        this.accounts.forEach(account => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 border-b">${account.code}</td>
                <td class="p-3 border-b">${account.name}</td>
                <td class="p-3 border-b">${account.type}</td>
                <td class="p-3 border-b">${this.formatCurrency(account.balance)}</td>
                <td class="p-3 border-b">
                    <button onclick="system.editAccount(${account.id})" class="text-blue-600 hover:text-blue-800 ml-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="system.deleteAccount(${account.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // تحميل جدول القيود
    loadEntriesTable() {
        const tbody = document.getElementById('entriesTable');
        tbody.innerHTML = '';

        this.entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 border-b">${entry.id}</td>
                <td class="p-3 border-b">${entry.date}</td>
                <td class="p-3 border-b">${entry.description}</td>
                <td class="p-3 border-b">${this.formatCurrency(entry.amount)}</td>
                <td class="p-3 border-b">
                    <button onclick="system.viewEntry(${entry.id})" class="text-blue-600 hover:text-blue-800 ml-2">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="system.deleteEntry(${entry.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // تحميل آخر العمليات
    loadRecentTransactions() {
        const tbody = document.getElementById('recentTransactions');
        const recentEntries = this.entries.slice(-5).reverse();

        if (recentEntries.length === 0) {
            tbody.innerHTML = '<tr><td class="p-3 border-b text-center" colspan="4">لا توجد عمليات حديثة</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        recentEntries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3 border-b">${entry.date}</td>
                <td class="p-3 border-b">${entry.description}</td>
                <td class="p-3 border-b">${entry.type || 'قيد محاسبي'}</td>
                <td class="p-3 border-b">${this.formatCurrency(entry.amount)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // حفظ البيانات
    saveAllData() {
        this.saveData('accounts', this.accounts);
        this.saveData('entries', this.entries);
        this.saveData('inventory', this.inventory);
        this.saveData('invoices', this.invoices);
    }

    // الحصول على رقم الحساب التالي
    getNextAccountCode() {
        const maxCode = Math.max(...this.accounts.map(acc => parseInt(acc.code) || 0));
        return (maxCode + 1).toString().padStart(4, '0');
    }

    // الحصول على رقم القيد التالي
    getNextEntryNumber() {
        return this.entries.length + 1;
    }

    // تحميل الحسابات في قائمة الاختيار
    loadAccountsToSelect() {
        const selects = document.querySelectorAll('.account-select');
        selects.forEach(select => {
            // حفظ القيمة المحددة حالياً
            const currentValue = select.value;

            // مسح الخيارات الحالية
            select.innerHTML = '<option value="">اختر الحساب</option>';

            // إضافة الحسابات
            this.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.code} - ${account.name}`;
                select.appendChild(option);
            });

            // استعادة القيمة المحددة
            select.value = currentValue;
        });
    }

    // إعداد معالجات أحداث نموذج القيد
    setupEntryFormHandlers() {
        // معالج تغيير المبالغ
        const debitInputs = document.querySelectorAll('.debit-amount');
        const creditInputs = document.querySelectorAll('.credit-amount');

        [...debitInputs, ...creditInputs].forEach(input => {
            input.addEventListener('input', () => {
                this.calculateEntryTotals();
                this.handleAmountInput(input);
            });
        });

        // معالج إرسال النموذج
        document.getElementById('addEntryForm').onsubmit = (e) => {
            e.preventDefault();
            this.saveEntry();
        };

        // معالج إرسال نموذج الحساب
        document.getElementById('addAccountForm').onsubmit = (e) => {
            e.preventDefault();
            this.saveAccount();
        };
    }

    // معالجة إدخال المبلغ (منع إدخال مدين ودائن في نفس السطر)
    handleAmountInput(input) {
        const row = input.closest('tr');
        const debitInput = row.querySelector('.debit-amount');
        const creditInput = row.querySelector('.credit-amount');

        if (input.classList.contains('debit-amount') && input.value) {
            creditInput.value = '';
        } else if (input.classList.contains('credit-amount') && input.value) {
            debitInput.value = '';
        }
    }

    // حساب إجماليات القيد
    calculateEntryTotals() {
        const debitInputs = document.querySelectorAll('.debit-amount');
        const creditInputs = document.querySelectorAll('.credit-amount');

        let totalDebit = 0;
        let totalCredit = 0;

        debitInputs.forEach(input => {
            totalDebit += parseFloat(input.value) || 0;
        });

        creditInputs.forEach(input => {
            totalCredit += parseFloat(input.value) || 0;
        });

        const difference = totalDebit - totalCredit;

        document.getElementById('totalDebit').textContent = totalDebit.toFixed(2);
        document.getElementById('totalCredit').textContent = totalCredit.toFixed(2);
        document.getElementById('difference').textContent = difference.toFixed(2);

        // تغيير لون الفرق حسب التوازن
        const diffElement = document.getElementById('difference');
        if (difference === 0) {
            diffElement.className = 'text-lg font-bold text-green-600';
        } else {
            diffElement.className = 'text-lg font-bold text-red-600';
        }
    }

    // إعادة تعيين نموذج القيد
    resetEntryForm() {
        const tbody = document.getElementById('entryDetailsTable');
        tbody.innerHTML = `
            <tr>
                <td class="p-2 border border-gray-300">
                    <select class="w-full p-1 border border-gray-300 rounded account-select" required>
                        <option value="">اختر الحساب</option>
                    </select>
                </td>
                <td class="p-2 border border-gray-300">
                    <input type="number" class="w-full p-1 border border-gray-300 rounded debit-amount" step="0.01" min="0">
                </td>
                <td class="p-2 border border-gray-300">
                    <input type="number" class="w-full p-1 border border-gray-300 rounded credit-amount" step="0.01" min="0">
                </td>
                <td class="p-2 border border-gray-300 text-center">
                    <button type="button" onclick="removeEntryRow(this)" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;

        this.calculateEntryTotals();
    }

    // حفظ حساب جديد
    saveAccount() {
        const code = document.getElementById('accountCode').value;
        const name = document.getElementById('accountName').value;
        const type = document.getElementById('accountType').value;
        const balance = parseFloat(document.getElementById('accountBalance').value) || 0;

        // التحقق من عدم تكرار رقم الحساب
        if (this.accounts.some(acc => acc.code === code)) {
            alert('رقم الحساب موجود بالفعل');
            return;
        }

        const newAccount = {
            id: Date.now(),
            code: code,
            name: name,
            type: type,
            balance: balance,
            parentId: null
        };

        this.accounts.push(newAccount);
        this.saveAllData();
        this.loadAccountsTable();
        this.updateDashboard();

        closeModal('addAccountModal');
        alert('تم إضافة الحساب بنجاح');
    }

    // حفظ قيد محاسبي جديد
    saveEntry() {
        const date = document.getElementById('entryDate').value;
        const description = document.getElementById('entryDescription').value;
        const entryNumber = document.getElementById('entryNumber').value;

        // جمع تفاصيل القيد
        const rows = document.querySelectorAll('#entryDetailsTable tr');
        const details = [];
        let totalDebit = 0;
        let totalCredit = 0;

        rows.forEach(row => {
            const accountSelect = row.querySelector('.account-select');
            const debitInput = row.querySelector('.debit-amount');
            const creditInput = row.querySelector('.credit-amount');

            const accountId = parseInt(accountSelect.value);
            const debitAmount = parseFloat(debitInput.value) || 0;
            const creditAmount = parseFloat(creditInput.value) || 0;

            if (accountId && (debitAmount > 0 || creditAmount > 0)) {
                const account = this.accounts.find(acc => acc.id === accountId);
                details.push({
                    accountId: accountId,
                    accountName: account.name,
                    debit: debitAmount,
                    credit: creditAmount
                });

                totalDebit += debitAmount;
                totalCredit += creditAmount;
            }
        });

        // التحقق من توازن القيد
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            alert('القيد غير متوازن. يجب أن يكون إجمالي المدين مساوياً لإجمالي الدائن');
            return;
        }

        if (details.length < 2) {
            alert('يجب أن يحتوي القيد على حسابين على الأقل');
            return;
        }

        // إنشاء القيد
        const newEntry = {
            id: parseInt(entryNumber),
            date: date,
            description: description,
            amount: totalDebit,
            details: details,
            type: 'قيد محاسبي'
        };

        // تحديث أرصدة الحسابات
        details.forEach(detail => {
            const account = this.accounts.find(acc => acc.id === detail.accountId);
            if (account) {
                if (account.type === 'أصول' || account.type === 'مصروفات') {
                    account.balance += detail.debit - detail.credit;
                } else {
                    account.balance += detail.credit - detail.debit;
                }
            }
        });

        this.entries.push(newEntry);
        this.saveAllData();
        this.loadEntriesTable();
        this.loadAccountsTable();
        this.updateDashboard();

        closeModal('addEntryModal');
        alert('تم حفظ القيد بنجاح');
    }

    // حذف حساب
    deleteAccount(accountId) {
        if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
            this.accounts = this.accounts.filter(acc => acc.id !== accountId);
            this.saveAllData();
            this.loadAccountsTable();
            this.updateDashboard();
        }
    }

    // تعديل حساب
    editAccount(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (account) {
            document.getElementById('accountCode').value = account.code;
            document.getElementById('accountName').value = account.name;
            document.getElementById('accountType').value = account.type;
            document.getElementById('accountBalance').value = account.balance;

            showAddAccountModal();

            // تغيير وظيفة الحفظ للتعديل
            document.getElementById('addAccountForm').onsubmit = (e) => {
                e.preventDefault();
                this.updateAccount(accountId);
            };
        }
    }

    // تحديث حساب
    updateAccount(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (account) {
            account.code = document.getElementById('accountCode').value;
            account.name = document.getElementById('accountName').value;
            account.type = document.getElementById('accountType').value;
            account.balance = parseFloat(document.getElementById('accountBalance').value) || 0;

            this.saveAllData();
            this.loadAccountsTable();
            this.updateDashboard();

            closeModal('addAccountModal');
            alert('تم تحديث الحساب بنجاح');
        }
    }

    // حذف قيد
    deleteEntry(entryId) {
        if (confirm('هل أنت متأكد من حذف هذا القيد؟')) {
            const entry = this.entries.find(e => e.id === entryId);
            if (entry) {
                // عكس تأثير القيد على الحسابات
                entry.details.forEach(detail => {
                    const account = this.accounts.find(acc => acc.id === detail.accountId);
                    if (account) {
                        if (account.type === 'أصول' || account.type === 'مصروفات') {
                            account.balance -= detail.debit - detail.credit;
                        } else {
                            account.balance -= detail.credit - detail.debit;
                        }
                    }
                });

                this.entries = this.entries.filter(e => e.id !== entryId);
                this.saveAllData();
                this.loadEntriesTable();
                this.loadAccountsTable();
                this.updateDashboard();
            }
        }
    }

    // عرض تفاصيل القيد
    viewEntry(entryId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (entry) {
            let detailsHtml = '<table class="w-full border border-gray-300"><thead class="bg-gray-100"><tr><th class="p-2 border">الحساب</th><th class="p-2 border">مدين</th><th class="p-2 border">دائن</th></tr></thead><tbody>';

            entry.details.forEach(detail => {
                detailsHtml += `<tr><td class="p-2 border">${detail.accountName}</td><td class="p-2 border">${detail.debit.toFixed(2)}</td><td class="p-2 border">${detail.credit.toFixed(2)}</td></tr>`;
            });

            detailsHtml += '</tbody></table>';

            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white p-6 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold">تفاصيل القيد رقم ${entry.id}</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="mb-4">
                            <p><strong>التاريخ:</strong> ${entry.date}</p>
                            <p><strong>الوصف:</strong> ${entry.description}</p>
                            <p><strong>المبلغ:</strong> ${this.formatCurrency(entry.amount)}</p>
                        </div>
                        <div class="mb-4">
                            <h4 class="font-bold mb-2">التفاصيل:</h4>
                            ${detailsHtml}
                        </div>
                        <div class="flex justify-end">
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    }
}

// إنشاء مثيل من النظام
const system = new PoultryAccountingSystem();

// وظائف التنقل
function showSection(sectionId) {
    system.showSection(sectionId);
}

// وظائف النوافذ المنبثقة
function showAddAccountModal() {
    document.getElementById('addAccountModal').classList.remove('hidden');

    // تعيين رقم الحساب التالي
    const nextCode = system.getNextAccountCode();
    document.getElementById('accountCode').value = nextCode;
}

function showAddEntryModal() {
    document.getElementById('addEntryModal').classList.remove('hidden');

    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;

    // تعيين رقم القيد التالي
    const nextEntryNumber = system.getNextEntryNumber();
    document.getElementById('entryNumber').value = nextEntryNumber;

    // تحميل قائمة الحسابات
    system.loadAccountsToSelect();

    // إعداد معالجات الأحداث
    system.setupEntryFormHandlers();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');

    // إعادة تعيين النماذج
    if (modalId === 'addAccountModal') {
        document.getElementById('addAccountForm').reset();
    } else if (modalId === 'addEntryModal') {
        document.getElementById('addEntryForm').reset();
        system.resetEntryForm();
    }
}

function addEntryRow() {
    const tbody = document.getElementById('entryDetailsTable');
    const newRow = document.createElement('tr');

    newRow.innerHTML = `
        <td class="p-2 border border-gray-300">
            <select class="w-full p-1 border border-gray-300 rounded account-select" required>
                <option value="">اختر الحساب</option>
            </select>
        </td>
        <td class="p-2 border border-gray-300">
            <input type="number" class="w-full p-1 border border-gray-300 rounded debit-amount" step="0.01" min="0">
        </td>
        <td class="p-2 border border-gray-300">
            <input type="number" class="w-full p-1 border border-gray-300 rounded credit-amount" step="0.01" min="0">
        </td>
        <td class="p-2 border border-gray-300 text-center">
            <button type="button" onclick="removeEntryRow(this)" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(newRow);

    // تحميل قائمة الحسابات للسطر الجديد
    system.loadAccountsToSelect();
    system.setupEntryFormHandlers();
}

function removeEntryRow(button) {
    const row = button.closest('tr');
    const tbody = document.getElementById('entryDetailsTable');

    if (tbody.children.length > 1) {
        row.remove();
        system.calculateEntryTotals();
    } else {
        alert('يجب أن يحتوي القيد على سطر واحد على الأقل');
    }
}
