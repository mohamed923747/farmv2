// نظام إدارة مزارع الدواجن الشامل
class PoultryFarmSystem {
    constructor() {
        // إعدادات تسجيل الدخول
        this.defaultPassword = 'Mohamd123';
        this.isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        this.currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

        // إعدادات Google OAuth
        this.googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

        // إعدادات قاعدة البيانات السحابية المحدثة
        this.supabaseUrl = 'https://xyzcompany.supabase.co'; // رابط Supabase الفعلي
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxOTU2NTcxMjAwfQ.example'; // مفتاح Supabase الفعلي

        // التحقق من بيئة Electron
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
        this.supabase = null;
        this.isOnline = navigator.onLine;
        this.pendingSync = JSON.parse(localStorage.getItem('pendingSync')) || [];
        this.syncStatus = 'offline'; // offline, syncing, synced, error

        this.currentLanguage = localStorage.getItem('language') || 'ar';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.currentFarm = localStorage.getItem('currentFarm') || 'default';

        // بيانات النظام (تحميل محلي أولي)
        this.farms = this.loadDataLocal('farms') || this.getDefaultFarms();
        // تم إزالة this.flocks - لا نحتاج إدارة القطعان
        this.expenses = this.loadDataLocal('expenses') || {};
        this.revenues = this.loadDataLocal('revenues') || {};
        this.invoices = this.loadDataLocal('invoices') || {};
        this.customers = this.loadDataLocal('customers') || {};
        this.partnerships = this.loadDataLocal('partnerships') || {};

        // إعدادات اللغة والمظهر
        this.currentLanguage = localStorage.getItem('language') || 'ar';
        this.currentTheme = localStorage.getItem('theme') || 'light';

        // التأكد من وجود مزرعة صالحة
        if (!this.ensureValidFarm()) {
            return; // لا توجد مزارع - إظهار رسالة التوجيه
        }
        this.settings = this.loadDataLocal('settings') || this.getDefaultSettings();

        // تم إزالة مراجع الرسوم البيانية

        // حذف البيانات الافتراضية
        this.clearDefaultFarmData();

        this.init();
    }

    // التأكد من وجود مزرعة صالحة
    ensureValidFarm() {
        // التحقق من وجود مزارع
        const farmIds = Object.keys(this.farms);

        if (farmIds.length === 0) {
            // لا توجد مزارع - إظهار رسالة توجيهية
            this.showNoFarmsMessage();
            return false;
        }

        // التأكد من أن المزرعة الحالية موجودة
        if (!this.farms[this.currentFarm]) {
            this.currentFarm = farmIds[0]; // اختيار أول مزرعة متاحة
            localStorage.setItem('currentFarm', this.currentFarm);
        }

        // التأكد من وجود مصفوفات البيانات للمزرعة الحالية
        this.ensureFarmDataArrays(this.currentFarm);

        return true;
    }

    // التأكد من وجود مصفوفات البيانات للمزرعة
    ensureFarmDataArrays(farmId) {
        // تم إزالة مراجع القطعان
        if (!this.expenses[farmId]) {
            this.expenses[farmId] = [];
        }
        if (!this.revenues[farmId]) {
            this.revenues[farmId] = [];
        }
        if (!this.invoices[farmId]) {
            this.invoices[farmId] = [];
        }
        if (!this.customers[farmId]) {
            this.customers[farmId] = [];
        }
        if (!this.partnerships[farmId]) {
            this.partnerships[farmId] = [];
        }
    }

    // إظهار رسالة عدم وجود مزارع
    showNoFarmsMessage() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="flex items-center justify-center min-h-screen">
                    <div class="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                        <div class="mb-6">
                            <i class="fas fa-home text-6xl text-gray-400 mb-4"></i>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2" data-ar="مرحباً بك في نظام إدارة مزارع الدواجن" data-en="Welcome to Poultry Farm Management System">مرحباً بك في نظام إدارة مزارع الدواجن</h2>
                            <p class="text-gray-600 mb-6" data-ar="لبدء استخدام النظام، يرجى إنشاء مزرعة جديدة أولاً" data-en="To start using the system, please create a new farm first">لبدء استخدام النظام، يرجى إنشاء مزرعة جديدة أولاً</p>
                        </div>
                        <button onclick="showAddFarmModal()" class="btn-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition">
                            <i class="fas fa-plus ml-2"></i>
                            <span data-ar="إنشاء مزرعة جديدة" data-en="Create New Farm">إنشاء مزرعة جديدة</span>
                        </button>
                    </div>
                </div>
            `;
            this.applyLanguage();
        }
    }

    // تحميل البيانات من التخزين المحلي (مع دعم السحابة)
    async loadData(key) {
        try {
            // محاولة تحميل من السحابة أولاً إذا كان متصل
            if (this.isOnline && this.supabase) {
                const cloudData = await this.loadFromCloud(key);
                if (cloudData) {
                    // حفظ في التخزين المحلي للنسخ الاحتياطي
                    localStorage.setItem(key, JSON.stringify(cloudData));
                    return cloudData;
                }
            }

            // التحميل من التخزين المحلي
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`خطأ في تحميل البيانات للمفتاح ${key}:`, error);
            return null;
        }
    }

    // تحميل البيانات من التخزين المحلي فقط (للاستخدام الداخلي)
    loadDataLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`خطأ في تحميل البيانات المحلية للمفتاح ${key}:`, error);
            return null;
        }
    }

    // حفظ البيانات في التخزين المحلي
    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`خطأ في حفظ البيانات للمفتاح ${key}:`, error);
            this.showNotification('خطأ في حفظ البيانات. تأكد من وجود مساحة كافية في التخزين المحلي.', 'error');
        }
    }

    // المزارع الافتراضية - تم إزالة المزرعة الافتراضية
    getDefaultFarms() {
        return {};
    }

    // حذف جميع البيانات الافتراضية
    clearDefaultFarmData() {
        try {
            // قائمة المفاتيح المرتبطة بالمزرعة الافتراضية
            const defaultFarmKeys = [
                'farms',
                // تم إزالة 'flocks' - لا نحتاج إدارة القطعان
                'expenses',
                'revenues',
                'invoices',
                'customers',
                'partnerships'
            ];

            // حذف البيانات المرتبطة بالمزرعة الافتراضية
            defaultFarmKeys.forEach(key => {
                const data = this.loadData(key) || {};

                // حذف البيانات للمزرعة الافتراضية إذا وجدت
                if (data['default']) {
                    delete data['default'];
                    localStorage.setItem(key, JSON.stringify(data));
                    console.log(`تم حذف بيانات ${key} للمزرعة الافتراضية`);
                }
            });

            // حذف أي مراجع أخرى للمزرعة الافتراضية
            if (localStorage.getItem('currentFarm') === 'default') {
                localStorage.removeItem('currentFarm');
                console.log('تم حذف مرجع المزرعة الحالية الافتراضية');
            }

            this.showNotification('تم تنظيف البيانات الافتراضية بنجاح');
            console.log('تم حذف جميع البيانات الافتراضية بنجاح');

        } catch (error) {
            console.error('خطأ في حذف البيانات الافتراضية:', error);
        }
    }

    // الإعدادات الافتراضية
    getDefaultSettings() {
        return {
            currency: 'EGP',
            currencySymbol: 'ج.م',
            dateFormat: 'DD/MM/YYYY',
            language: 'ar',
            theme: 'light',
            notifications: true,
            autoBackup: false
        };
    }

    // تهيئة النظام
    init() {
        // التحقق من تسجيل الدخول أولاً
        this.checkLoginStatus();

        // إذا لم يكن مسجل دخول، لا نحتاج لتحميل باقي النظام
        if (!this.isLoggedIn) {
            return;
        }

        // تهيئة قاعدة البيانات السحابية
        this.initSupabase();

        this.applyLanguage();
        this.applyTheme();
        this.loadFarmSelector();
        this.updateDashboard();
        this.setupEventListeners();

        // تحديث معلومات المستخدم في الواجهة
        this.updateUserInfo();

        // إظهار لوحة التحكم وتفعيل الرابط
        setTimeout(() => {
            this.showSection('dashboard');
        }, 100);
    }

    // التحقق من حالة تسجيل الدخول
    checkLoginStatus() {
        const loginScreen = document.getElementById('loginScreen');
        const mainContent = document.querySelector('.flex.h-screen');

        if (!this.isLoggedIn) {
            // إظهار شاشة تسجيل الدخول
            if (loginScreen) loginScreen.style.display = 'flex';
            if (mainContent) mainContent.style.display = 'none';

            // إعداد معالج تسجيل الدخول
            this.setupLoginHandler();
        } else {
            // إخفاء شاشة تسجيل الدخول وإظهار المحتوى الرئيسي
            if (loginScreen) loginScreen.style.display = 'none';
            if (mainContent) mainContent.style.display = 'flex';
        }
    }

    // إعداد معالج تسجيل الدخول
    setupLoginHandler() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleLogin();
            };
        }
    }

    // معالجة تسجيل الدخول
    handleLogin() {
        const passwordInput = document.getElementById('passwordInput');
        const loginError = document.getElementById('loginError');
        const password = passwordInput.value;

        if (password === this.defaultPassword) {
            // تسجيل دخول ناجح
            this.isLoggedIn = true;
            sessionStorage.setItem('isLoggedIn', 'true');

            // إخفاء شاشة تسجيل الدخول وتحميل النظام
            this.checkLoginStatus();
            this.init(); // إعادة تهيئة النظام بعد تسجيل الدخول

            this.showNotification('تم تسجيل الدخول بنجاح', 'success');
        } else {
            // كلمة مرور خاطئة
            if (loginError) {
                loginError.classList.remove('hidden');
                setTimeout(() => {
                    loginError.classList.add('hidden');
                }, 3000);
            }
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // تسجيل الخروج
    logout() {
        this.isLoggedIn = false;
        sessionStorage.removeItem('isLoggedIn');

        // إظهار شاشة تسجيل الدخول
        this.checkLoginStatus();

        this.showNotification('تم تسجيل الخروج بنجاح', 'success');
    }

    // معالجة تسجيل الدخول بحساب Google
    handleGoogleSignIn(response) {
        try {
            // فك تشفير JWT token من Google
            const payload = this.parseJwt(response.credential);

            const user = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                loginType: 'google'
            };

            // حفظ معلومات المستخدم
            this.currentUser = user;
            this.isLoggedIn = true;
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('currentUser', JSON.stringify(user));

            // إخفاء شاشة تسجيل الدخول وتحميل النظام
            this.checkLoginStatus();
            this.init();

            this.showNotification(`مرحباً ${user.name}! تم تسجيل الدخول بنجاح`, 'success');
            this.updateUserInfo();

        } catch (error) {
            console.error('خطأ في تسجيل الدخول بحساب Google:', error);
            this.showNotification('حدث خطأ أثناء تسجيل الدخول بحساب Google', 'error');
        }
    }

    // فك تشفير JWT token
    parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    // تحديث معلومات المستخدم في الواجهة
    updateUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement && this.currentUser) {
            if (this.currentUser.loginType === 'google') {
                userInfoElement.innerHTML = `
                    <div class="flex items-center">
                        <img src="${this.currentUser.picture}" alt="صورة المستخدم" class="w-6 h-6 rounded-full ml-2">
                        <span>${this.currentUser.name}</span>
                    </div>
                `;
            } else {
                userInfoElement.textContent = 'مستخدم محلي';
            }
        }
    }

    // تحديث حالة المزامنة في الواجهة
    updateSyncStatus(status, message = '') {
        this.syncStatus = status;
        const indicator = document.getElementById('syncIndicator');
        const text = document.getElementById('syncText');
        const forceSyncBtn = document.getElementById('forceSyncBtn');

        if (!indicator || !text) return;

        switch (status) {
            case 'synced':
                indicator.className = 'w-3 h-3 rounded-full bg-green-500 ml-2';
                text.textContent = message || 'متزامن';
                if (forceSyncBtn) forceSyncBtn.classList.add('hidden');
                break;
            case 'syncing':
                indicator.className = 'w-3 h-3 rounded-full bg-yellow-500 ml-2 animate-pulse';
                text.textContent = message || 'جاري المزامنة...';
                if (forceSyncBtn) forceSyncBtn.classList.add('hidden');
                break;
            case 'error':
                indicator.className = 'w-3 h-3 rounded-full bg-red-500 ml-2';
                text.textContent = message || 'خطأ في المزامنة';
                if (forceSyncBtn) forceSyncBtn.classList.remove('hidden');
                break;
            case 'offline':
            default:
                indicator.className = 'w-3 h-3 rounded-full bg-gray-400 ml-2';
                text.textContent = message || 'غير متصل';
                if (forceSyncBtn) forceSyncBtn.classList.add('hidden');
                break;
        }
    }

    // المزامنة اليدوية
    async forceSync() {
        if (!this.isOnline) {
            this.showNotification('لا يوجد اتصال بالإنترنت', 'warning');
            return;
        }

        if (!this.supabase || !this.currentUser) {
            this.showNotification('يجب تسجيل الدخول أولاً', 'warning');
            return;
        }

        try {
            this.updateSyncStatus('syncing', 'جاري المزامنة اليدوية...');

            // مزامنة البيانات المعلقة
            await this.syncPendingData();

            // تحميل أحدث البيانات من السحابة
            await this.loadAllUserDataFromCloud();

            this.updateSyncStatus('synced', 'تمت المزامنة بنجاح');
            this.showNotification('تمت مزامنة البيانات بنجاح', 'success');

            // إعادة تحميل لوحة التحكم
            this.updateDashboard();

        } catch (error) {
            console.error('خطأ في المزامنة اليدوية:', error);
            this.updateSyncStatus('error', 'فشلت المزامنة');
            this.showNotification('فشلت المزامنة اليدوية', 'error');
        }
    }

    // تهيئة قاعدة البيانات السحابية
    async initSupabase() {
        try {
            if (typeof window.supabase !== 'undefined') {
                this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
                console.log('تم تهيئة Supabase بنجاح');

                // اختبار الاتصال
                await this.testConnection();

                // إنشاء الجداول إذا لم تكن موجودة
                await this.createTablesIfNotExists();

                // مراقبة حالة الاتصال
                this.setupOnlineOfflineHandlers();

                // محاولة مزامنة البيانات المعلقة
                if (this.isOnline) {
                    await this.syncPendingData();
                }

                this.updateSyncStatus('synced', 'متصل بالسحابة');
            } else {
                console.warn('مكتبة Supabase غير متوفرة - سيتم استخدام localStorage فقط');
                this.updateSyncStatus('offline', 'وضع محلي');
            }
        } catch (error) {
            console.error('خطأ في تهيئة Supabase:', error);
            this.updateSyncStatus('error', 'خطأ في الاتصال');
            this.showNotification('تعذر الاتصال بقاعدة البيانات السحابية - سيتم العمل في وضع عدم الاتصال', 'warning');
        }
    }

    // اختبار الاتصال بقاعدة البيانات
    async testConnection() {
        if (!this.supabase) return false;

        try {
            const { data, error } = await this.supabase
                .from('user_data')
                .select('count')
                .limit(1);

            if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
                throw error;
            }

            return true;
        } catch (error) {
            console.error('فشل اختبار الاتصال:', error);
            throw error;
        }
    }

    // إنشاء الجداول المطلوبة
    async createTablesIfNotExists() {
        if (!this.supabase) return;

        try {
            // جدول بيانات المستخدمين
            const { error: userDataError } = await this.supabase.rpc('create_user_data_table_if_not_exists');

            // جدول المزارع
            const { error: farmsError } = await this.supabase.rpc('create_farms_table_if_not_exists');

            // جدول البيانات العامة
            const { error: farmDataError } = await this.supabase.rpc('create_farm_data_table_if_not_exists');

            console.log('تم التحقق من وجود الجداول');
        } catch (error) {
            console.warn('تعذر إنشاء الجداول - قد تكون موجودة بالفعل:', error);
        }
    }

    // إعداد معالجات الاتصال/عدم الاتصال
    setupOnlineOfflineHandlers() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('تم استعادة الاتصال بالإنترنت', 'success');
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('تم فقدان الاتصال بالإنترنت - سيتم العمل في وضع عدم الاتصال', 'warning');
        });
    }

    // حفظ البيانات (محلياً وسحابياً)
    async saveData(key, data) {
        // حفظ محلي فوري
        localStorage.setItem(key, JSON.stringify(data));

        // محاولة حفظ سحابي
        if (this.isOnline && this.supabase && this.currentUser) {
            try {
                this.updateSyncStatus('syncing', 'جاري الحفظ...');
                await this.saveToCloud(key, data);
                this.updateSyncStatus('synced', 'تم الحفظ');
            } catch (error) {
                console.error('خطأ في الحفظ السحابي:', error);
                this.updateSyncStatus('error', 'فشل الحفظ');
                // إضافة للمزامنة المعلقة
                this.addToPendingSync(key, data);
            }
        } else {
            // إضافة للمزامنة المعلقة
            this.addToPendingSync(key, data);
        }
    }

    // حفظ في السحابة
    async saveToCloud(key, data) {
        if (!this.supabase || !this.currentUser) return;

        const userId = this.currentUser.id || 'local_user';

        const { error } = await this.supabase
            .from('farm_data')
            .upsert({
                id: `${userId}_${this.currentFarm}_${key}`,
                user_id: userId,
                farm_id: this.currentFarm,
                data_type: key,
                data: data,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });

        if (error) throw error;
    }

    // إضافة للمزامنة المعلقة
    addToPendingSync(key, data) {
        const syncItem = {
            key,
            data,
            timestamp: Date.now(),
            farmId: this.currentFarm
        };

        this.pendingSync.push(syncItem);
        localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
    }

    // مزامنة البيانات المعلقة
    async syncPendingData() {
        if (!this.isOnline || !this.supabase || this.pendingSync.length === 0) {
            return;
        }

        try {
            for (const item of this.pendingSync) {
                await this.saveToCloud(item.key, item.data);
            }

            // مسح البيانات المعلقة بعد المزامنة الناجحة
            this.pendingSync = [];
            localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));

            this.showNotification('تم مزامنة البيانات مع السحابة بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في مزامنة البيانات:', error);
            this.showNotification('تعذرت مزامنة بعض البيانات', 'warning');
        }
    }

    // تحميل البيانات من السحابة
    async loadFromCloud(key) {
        if (!this.isOnline || !this.supabase || !this.currentUser) {
            return null;
        }

        try {
            const userId = this.currentUser.id || 'local_user';

            const { data, error } = await this.supabase
                .from('farm_data')
                .select('data')
                .eq('user_id', userId)
                .eq('farm_id', this.currentFarm)
                .eq('data_type', key)
                .single();

            if (error && error.code !== 'PGRST116') { // لا توجد بيانات
                throw error;
            }

            return data?.data || null;
        } catch (error) {
            console.error('خطأ في تحميل البيانات من السحابة:', error);
            return null;
        }
    }

    // تحميل جميع بيانات المستخدم من السحابة
    async loadAllUserDataFromCloud() {
        if (!this.isOnline || !this.supabase || !this.currentUser) {
            return {};
        }

        try {
            this.updateSyncStatus('syncing', 'جاري تحميل البيانات...');

            const userId = this.currentUser.id || 'local_user';

            const { data, error } = await this.supabase
                .from('farm_data')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;

            const userData = {};
            data.forEach(item => {
                const key = `${item.farm_id}_${item.data_type}`;
                userData[key] = item.data;
            });

            this.updateSyncStatus('synced', 'تم تحميل البيانات');
            return userData;
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
            this.updateSyncStatus('error', 'فشل التحميل');
            return {};
        }
    }

    // تطبيق اللغة العربية فقط
    applyLanguage() {
        // تثبيت النظام على العربية فقط
        this.currentLanguage = 'ar';

        const elements = document.querySelectorAll('[data-ar]');
        elements.forEach(element => {
            element.textContent = element.getAttribute('data-ar');
        });

        // تطبيق اتجاه RTL
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
        document.body.classList.add('rtl');
        document.body.classList.remove('ltr');
    }

    // تم إزالة دالة updateLanguageButton - النظام يعمل بالعربية فقط

    // تطبيق المظهر
    applyTheme() {
        const body = document.getElementById('body');
        const themeIcon = document.getElementById('themeIcon');

        if (body) {
            if (this.currentTheme === 'dark') {
                body.classList.add('dark-mode');
            } else {
                body.classList.remove('dark-mode');
            }
        }

        if (themeIcon) {
            themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // تحميل قائمة المزارع
    loadFarmSelector() {
        const selector = document.getElementById('farmSelector');
        selector.innerHTML = '';

        Object.values(this.farms).forEach(farm => {
            const option = document.createElement('option');
            option.value = farm.id;
            option.textContent = this.currentLanguage === 'ar' ? farm.name : farm.nameEn;
            if (farm.id === this.currentFarm) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        // تحديث قائمة المزارع في الشريط الجانبي مع أزرار الحذف
        this.updateFarmsList();
    }

    // تحديث قائمة المزارع في الشريط الجانبي (dropdown)
    updateFarmsList() {
        const farmsDropdown = document.getElementById('farmsDropdown');
        if (!farmsDropdown) return;

        // حفظ القيمة المختارة حالياً
        const currentValue = farmsDropdown.value;

        // مسح الخيارات الموجودة
        farmsDropdown.innerHTML = '<option value="">اختر المزرعة...</option>';

        // إضافة خيار "إضافة مزرعة جديدة"
        const addNewOption = document.createElement('option');
        addNewOption.value = 'add_new_farm';
        addNewOption.textContent = '+ إضافة مزرعة جديدة';
        addNewOption.style.fontWeight = 'bold';
        addNewOption.style.color = '#10b981';
        farmsDropdown.appendChild(addNewOption);

        // إضافة فاصل
        const separatorOption = document.createElement('option');
        separatorOption.disabled = true;
        separatorOption.textContent = '──────────────';
        farmsDropdown.appendChild(separatorOption);

        // إضافة المزارع الموجودة
        Object.values(this.farms).forEach(farm => {
            const option = document.createElement('option');
            option.value = farm.id;
            option.textContent = farm.name;

            // تمييز المزرعة الحالية
            if (farm.id === this.currentFarm) {
                option.textContent = `✓ ${farm.name}`;
                option.selected = true;
            }

            farmsDropdown.appendChild(option);
        });

        // استعادة القيمة المختارة إذا كانت موجودة
        if (currentValue && currentValue !== 'add_new_farm') {
            farmsDropdown.value = currentValue;
        } else if (this.currentFarm) {
            farmsDropdown.value = this.currentFarm;
        }
    }

    // تحديث لوحة التحكم
    updateDashboard() {
        const farmData = this.getFarmData(this.currentFarm);
        
        // حساب الإحصائيات
        const totalRevenue = this.calculateTotalRevenue(farmData);
        const totalExpenses = this.calculateTotalExpenses(farmData);
        const netProfit = totalRevenue - totalExpenses;
        // تم إزالة حساب الطيور الحية - لا نحتاج إدارة القطعان

        // تحديث البطاقات
        document.getElementById('totalRevenue').textContent = this.formatCurrency(totalRevenue);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('netProfit').textContent = this.formatCurrency(netProfit);
        // تم إزالة مرجع liveBirds - لا نحتاج عدد الطيور الحية

        // تحديث أرصدة الشركاء
        const partnersBalance = this.calculateTotalPartnersBalance();
        document.getElementById('partnersBalance').textContent = this.formatCurrency(partnersBalance);

        // تحديث الرسوم البيانية
        this.updateExpenseRevenueChart(farmData);
        this.updateProfitTrendChart(farmData);

        this.loadRecentActivities(farmData);

        // تحديث الرسوم البيانية في القسم الحالي إذا لزم الأمر
        this.updateCurrentSectionCharts();
    }

    // تحديث الرسوم البيانية في القسم الحالي
    updateCurrentSectionCharts() {
        // تم إزالة الرسوم البيانية من أقسام المصروفات والإيرادات
        // الرسوم البيانية متوفرة فقط في لوحة التحكم الرئيسية
    }

    // الحصول على بيانات المزرعة
    getFarmData(farmId) {
        return {
            // تم إزالة flocks - لا نحتاج إدارة القطعان
            expenses: this.expenses[farmId] || [],
            revenues: this.revenues[farmId] || [],
            invoices: this.invoices[farmId] || [],
            customers: this.customers[farmId] || []
        };
    }

    // حساب إجمالي الإيرادات
    calculateTotalRevenue(farmData) {
        return farmData.revenues.reduce((total, revenue) => total + (revenue.amount || 0), 0);
    }

    // حساب إجمالي المصروفات
    calculateTotalExpenses(farmData) {
        return farmData.expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
    }

    // تم إزالة دالة calculateLiveBirds - لا نحتاج إدارة القطعان

    // حساب إجمالي أرصدة الشركاء
    calculateTotalPartnersBalance() {
        const farmPartners = this.partnerships[this.currentFarm] || [];
        return farmPartners.reduce((total, partner) => {
            return total + (partner.balance || 0);
        }, 0);
    }

    // تم إزالة دالة calculateFlockMortality - لا نحتاج إدارة القطعان

    // تنسيق العملة
    formatCurrency(amount) {
        const symbol = this.settings.currencySymbol || 'ج.م';
        return new Intl.NumberFormat(this.currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' ' + symbol;
    }

    // تم إزالة دوال الرسوم البيانية

    // تم إزالة دالة updateExpenseChart

    // تم إزالة دالة updateRevenueChart

    // تحميل الأنشطة الحديثة
    loadRecentActivities(farmData) {
        const tbody = document.getElementById('recentActivities');
        const activities = [];

        // جمع الأنشطة من مصادر مختلفة
        farmData.expenses.forEach(expense => {
            activities.push({
                date: expense.date,
                activity: expense.description || expense.type,
                type: 'مصروف',
                amount: -expense.amount
            });
        });

        farmData.revenues.forEach(revenue => {
            activities.push({
                date: revenue.date,
                activity: revenue.description || revenue.type,
                type: 'إيراد',
                amount: revenue.amount
            });
        });

        // ترتيب حسب التاريخ
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // عرض آخر 10 أنشطة
        const recentActivities = activities.slice(0, 10);

        if (recentActivities.length === 0) {
            tbody.innerHTML = '<tr><td class="p-3 border-b text-center" colspan="4">لا توجد أنشطة حديثة</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        recentActivities.forEach(activity => {
            const row = document.createElement('tr');
            const amountClass = activity.amount >= 0 ? 'text-green-600' : 'text-red-600';
            row.innerHTML = `
                <td class="p-3 border-b">${this.formatDate(activity.date)}</td>
                <td class="p-3 border-b">${activity.activity}</td>
                <td class="p-3 border-b">${activity.type}</td>
                <td class="p-3 border-b ${amountClass}">${this.formatCurrency(Math.abs(activity.amount))}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // تنسيق التاريخ
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString(this.currentLanguage === 'ar' ? 'ar-EG' : 'en-US');
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // مستمع تغيير حجم النافذة لإعادة رسم الرسوم البيانية
        window.addEventListener('resize', () => {
            setTimeout(() => this.updateDashboard(), 300);
        });
    }

    // إظهار قسم معين
    showSection(sectionId, targetElement = null) {
        // إخفاء جميع الأقسام
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });

        // إظهار القسم المطلوب
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // تحديث الروابط النشطة
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // إضافة الفئة النشطة للعنصر المحدد
        if (targetElement) {
            targetElement.classList.add('active');
        } else {
            // البحث عن الرابط المناسب بناءً على sectionId
            const navLink = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
        }

        // تحميل محتوى القسم إذا لزم الأمر
        this.loadSectionContent(sectionId);
    }

    // تحميل محتوى القسم
    loadSectionContent(sectionId) {
        switch(sectionId) {
            case 'dashboard':
                this.updateDashboard();
                break;
            // تم إزالة case 'flocks' - لا نحتاج إدارة القطعان
            case 'expenses':
                this.loadExpensesSection();
                break;
            case 'revenues':
                this.loadRevenuesSection();
                break;
            case 'customers':
                this.loadCustomersSection();
                break;
            case 'invoices':
                this.loadInvoicesSection();
                break;
            case 'reports':
                this.loadReportsSection();
                break;
            case 'partnerships':
                this.loadPartnershipsSection();
                break;
            case 'settings':
                this.loadSettingsSection();
                break;
            // سيتم إضافة المزيد من الأقسام
        }
    }

    // تم إزالة دالة loadFlocksSection بالكامل - لا نحتاج إدارة القطعان

    // تحميل قسم المصروفات
    loadExpensesSection() {
        const section = document.getElementById('expenses');
        const farmExpenses = this.expenses[this.currentFarm] || [];

        // تجميع المصروفات حسب النوع
        const expensesByType = this.groupExpensesByType(farmExpenses);

        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-4" data-ar="إدارة المصروفات" data-en="Expense Management">إدارة المصروفات</h2>
                <div class="flex flex-wrap gap-2">
                    <button onclick="showAddExpenseModal('feed')" class="btn-primary text-white px-4 py-2 rounded hover:opacity-90 transition">
                        <i class="fas fa-seedling ml-2"></i>
                        <span data-ar="إضافة أعلاف" data-en="Add Feed">إضافة أعلاف</span>
                    </button>
                    <button onclick="showAddExpenseModal('medicine')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                        <i class="fas fa-pills ml-2"></i>
                        <span data-ar="إضافة أدوية" data-en="Add Medicine">إضافة أدوية</span>
                    </button>
                    <button onclick="showAddExpenseModal('utilities')" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition">
                        <i class="fas fa-bolt ml-2"></i>
                        <span data-ar="إضافة مرافق" data-en="Add Utilities">إضافة مرافق</span>
                    </button>
                    <button onclick="showAddExpenseModal('labor')" class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition">
                        <i class="fas fa-users ml-2"></i>
                        <span data-ar="إضافة عمالة" data-en="Add Labor">إضافة عمالة</span>
                    </button>
                    <button onclick="showAddExpenseModal('other')" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                        <i class="fas fa-plus ml-2"></i>
                        <span data-ar="مصروفات أخرى" data-en="Other Expenses">مصروفات أخرى</span>
                    </button>
                </div>
            </div>

            <!-- إحصائيات المصروفات -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <i class="fas fa-seedling text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="الأعلاف" data-en="Feed">الأعلاف</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(expensesByType.feed || 0)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <i class="fas fa-pills text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="الأدوية" data-en="Medicine">الأدوية</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(expensesByType.medicine || 0)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <i class="fas fa-bolt text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="المرافق" data-en="Utilities">المرافق</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(expensesByType.utilities || 0)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                            <i class="fas fa-users text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="العمالة" data-en="Labor">العمالة</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(expensesByType.labor || 0)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-gray-100 text-gray-600">
                            <i class="fas fa-ellipsis-h text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="أخرى" data-en="Other">أخرى</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(expensesByType.other || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- جدول المصروفات -->
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800" data-ar="سجل المصروفات" data-en="Expense Records">سجل المصروفات</h3>
                    <div class="flex gap-2">
                        <select id="expenseTypeFilter" class="p-2 border border-gray-300 rounded" onchange="farmSystem.filterExpenses()">
                            <option value="" data-ar="جميع الأنواع" data-en="All Types">جميع الأنواع</option>
                            <option value="feed" data-ar="أعلاف" data-en="Feed">أعلاف</option>
                            <option value="medicine" data-ar="أدوية" data-en="Medicine">أدوية</option>
                            <option value="utilities" data-ar="مرافق" data-en="Utilities">مرافق</option>
                            <option value="labor" data-ar="عمالة" data-en="Labor">عمالة</option>
                            <option value="other" data-ar="أخرى" data-en="Other">أخرى</option>
                        </select>
                        <input type="date" id="expenseDateFilter" class="p-2 border border-gray-300 rounded" onchange="farmSystem.filterExpenses()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="table-header text-white">
                            <tr>
                                <th class="p-3 text-right" data-ar="التاريخ" data-en="Date">التاريخ</th>
                                <th class="p-3 text-right" data-ar="النوع" data-en="Type">النوع</th>
                                <th class="p-3 text-right" data-ar="الوصف" data-en="Description">الوصف</th>
                                <th class="p-3 text-right" data-ar="الكمية" data-en="Quantity">الكمية</th>
                                <th class="p-3 text-right" data-ar="السعر" data-en="Price">السعر</th>
                                <th class="p-3 text-right" data-ar="المجموع" data-en="Total">المجموع</th>
                                <th class="p-3 text-right" data-ar="الإجراءات" data-en="Actions">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="expensesTable">
                            ${this.generateExpensesTableRows(farmExpenses)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // تم إزالة الرسم البياني من قسم المصروفات

        this.applyLanguage();
    }

    // تجميع المصروفات حسب النوع
    groupExpensesByType(expenses) {
        const grouped = {};
        expenses.forEach(expense => {
            const type = expense.type || 'other';
            grouped[type] = (grouped[type] || 0) + (expense.amount || 0);
        });
        return grouped;
    }

    // توليد صفوف جدول المصروفات
    generateExpensesTableRows(expenses) {
        if (expenses.length === 0) {
            return '<tr><td class="p-3 border-b text-center" colspan="7">لا توجد مصروفات مسجلة</td></tr>';
        }

        // ترتيب حسب التاريخ (الأحدث أولاً)
        const sortedExpenses = expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        return sortedExpenses.map(expense => {
            const typeNames = {
                feed: 'أعلاف',
                medicine: 'أدوية',
                utilities: 'مرافق',
                labor: 'عمالة',
                other: 'أخرى'
            };

            return `
                <tr>
                    <td class="p-3 border-b">${this.formatDate(expense.date)}</td>
                    <td class="p-3 border-b">${typeNames[expense.type] || expense.type}</td>
                    <td class="p-3 border-b">${expense.description}</td>
                    <td class="p-3 border-b">${expense.quantity ? expense.quantity + ' ' + (expense.unit || '') : '-'}</td>
                    <td class="p-3 border-b">${expense.unitPrice ? this.formatCurrency(expense.unitPrice) : '-'}</td>
                    <td class="p-3 border-b font-bold">${this.formatCurrency(expense.amount)}</td>
                    <td class="p-3 border-b">
                        <button onclick="viewExpenseDetails('${expense.id}')" class="text-blue-600 hover:text-blue-800 ml-2">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editExpense('${expense.id}')" class="text-green-600 hover:text-green-800 ml-2">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteExpense('${expense.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // تم إزالة دالة calculateTotalBirds - لا نحتاج إدارة القطعان

    // تحديث رسم بياني للمصروفات والإيرادات
    updateExpenseRevenueChart(farmData) {
        const ctx = document.getElementById('expenseRevenueChart');
        if (!ctx) return;

        // الحصول على بيانات آخر 6 أشهر
        const monthsData = this.getLastSixMonthsData(farmData);

        // إنشاء أو تحديث الرسم البياني
        if (this.expenseRevenueChart) {
            this.expenseRevenueChart.destroy();
        }

        this.expenseRevenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthsData.labels,
                datasets: [{
                    label: 'الإيرادات',
                    data: monthsData.revenues,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                }, {
                    label: 'المصروفات',
                    data: monthsData.expenses,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ج.م';
                            }
                        }
                    }
                }
            }
        });
    }

    // تحديث رسم بياني لصافي الربح
    updateProfitTrendChart(farmData) {
        const ctx = document.getElementById('profitTrendChart');
        if (!ctx) return;

        // الحصول على بيانات آخر 6 أشهر
        const monthsData = this.getLastSixMonthsData(farmData);
        const profitData = monthsData.revenues.map((revenue, index) =>
            revenue - monthsData.expenses[index]
        );

        // إنشاء أو تحديث الرسم البياني
        if (this.profitTrendChart) {
            this.profitTrendChart.destroy();
        }

        this.profitTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthsData.labels,
                datasets: [{
                    label: 'صافي الربح',
                    data: profitData,
                    borderColor: profitData[profitData.length - 1] >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)',
                    backgroundColor: profitData[profitData.length - 1] >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                },
                elements: {
                    point: {
                        radius: 2
                    }
                }
            }
        });
    }

    // الحصول على بيانات آخر 6 أشهر
    getLastSixMonthsData(farmData) {
        const months = [];
        const revenues = [];
        const expenses = [];

        // إنشاء قائمة بآخر 6 أشهر
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });

            months.push(monthName);

            // حساب الإيرادات للشهر
            const monthRevenues = farmData.revenues.filter(revenue => {
                const revenueDate = new Date(revenue.date);
                const revenueKey = `${revenueDate.getFullYear()}-${(revenueDate.getMonth() + 1).toString().padStart(2, '0')}`;
                return revenueKey === monthKey;
            }).reduce((sum, revenue) => sum + (revenue.amount || 0), 0);

            // حساب المصروفات للشهر
            const monthExpenses = farmData.expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                const expenseKey = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}`;
                return expenseKey === monthKey;
            }).reduce((sum, expense) => sum + (expense.amount || 0), 0);

            revenues.push(monthRevenues);
            expenses.push(monthExpenses);
        }

        return {
            labels: months,
            revenues: revenues,
            expenses: expenses
        };
    }

    // تم إزالة دالة calculateTotalMortality - لا نحتاج إدارة القطعان

    // حساب معدل البقاء
    calculateSurvivalRate(flocks) {
        const totalBirds = this.calculateTotalBirds(flocks);
        const totalMortality = this.calculateTotalMortality(flocks);

        if (totalBirds === 0) return 0;

        const survivalRate = ((totalBirds - totalMortality) / totalBirds) * 100;
        return Math.round(survivalRate * 100) / 100;
    }

    // توليد صفوف جدول القطعان
    generateFlocksTableRows(flocks) {
        if (flocks.length === 0) {
            return '<tr><td class="p-3 border-b text-center" colspan="7">لا توجد قطعان مسجلة</td></tr>';
        }

        return flocks.map(flock => {
            const currentCount = this.calculateCurrentFlockCount(flock);
            const age = this.calculateFlockAge(flock.startDate);
            const mortality = this.calculateFlockMortality(flock);
            const mortalityRate = flock.initialCount > 0 ? ((mortality / flock.initialCount) * 100).toFixed(2) : 0;

            return `
                <tr>
                    <td class="p-3 border-b">${flock.name}</td>
                    <td class="p-3 border-b">${flock.initialCount.toLocaleString()}</td>
                    <td class="p-3 border-b">${currentCount.toLocaleString()}</td>
                    <td class="p-3 border-b">${age}</td>
                    <td class="p-3 border-b text-red-600">${mortality.toLocaleString()}</td>
                    <td class="p-3 border-b">${mortalityRate}%</td>
                    <td class="p-3 border-b">
                        <button onclick="viewFlockDetails('${flock.id}')" class="text-blue-600 hover:text-blue-800 ml-2">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="addMortalityRecord('${flock.id}')" class="text-orange-600 hover:text-orange-800 ml-2">
                            <i class="fas fa-skull"></i>
                        </button>
                        <button onclick="editFlock('${flock.id}')" class="text-green-600 hover:text-green-800 ml-2">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteFlock('${flock.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // حساب العدد الحالي للقطيع
    calculateCurrentFlockCount(flock) {
        const mortality = this.calculateFlockMortality(flock);
        return Math.max(0, (flock.initialCount || 0) - mortality);
    }

    // حساب عمر القطيع بالأيام
    calculateFlockAge(startDate) {
        const start = new Date(startDate);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // إضافة مزرعة جديدة
    addNewFarm() {
        const name = document.getElementById('farmName').value;
        const nameEn = document.getElementById('farmNameEn').value;
        const location = document.getElementById('farmLocation').value;
        const owner = document.getElementById('farmOwner').value;
        const phone = document.getElementById('farmPhone').value;

        const farmId = 'farm_' + Date.now();
        const newFarm = {
            id: farmId,
            name: name,
            nameEn: nameEn,
            location: location,
            locationEn: location,
            owner: owner,
            ownerEn: owner,
            phone: phone,
            email: '',
            createdAt: new Date().toISOString()
        };

        this.farms[farmId] = newFarm;

        // تهيئة البيانات للمزرعة الجديدة
        this.flocks[farmId] = [];
        this.expenses[farmId] = [];
        this.revenues[farmId] = [];
        this.invoices[farmId] = [];
        this.customers[farmId] = [];

        this.saveAllData();

        // إذا كانت هذه أول مزرعة، إعادة تحميل النظام
        const farmIds = Object.keys(this.farms);
        if (farmIds.length === 1) {
            this.currentFarm = farmId;
            localStorage.setItem('currentFarm', this.currentFarm);
            this.init(); // إعادة تهيئة النظام
        } else {
            this.loadFarmSelector();
        }

        closeModal('addFarmModal');
        this.showNotification(this.currentLanguage === 'ar' ? 'تم إضافة المزرعة بنجاح' : 'Farm added successfully');
    }

    // إضافة قطيع جديد
    addNewFlock() {
        const name = document.getElementById('flockName').value;
        const type = document.getElementById('flockType').value;
        const initialCount = parseInt(document.getElementById('flockInitialCount').value);
        const startDate = document.getElementById('flockStartDate').value;
        const breed = document.getElementById('flockBreed').value;
        const source = document.getElementById('flockSource').value;
        const notes = document.getElementById('flockNotes').value;

        const flockId = 'flock_' + Date.now();
        const newFlock = {
            id: flockId,
            name: name,
            type: type,
            initialCount: initialCount,
            startDate: startDate,
            breed: breed,
            source: source,
            notes: notes,
            mortalityRecords: [],
            weightRecords: [],
            createdAt: new Date().toISOString()
        };

        if (!this.flocks[this.currentFarm]) {
            this.flocks[this.currentFarm] = [];
        }

        this.flocks[this.currentFarm].push(newFlock);
        this.saveAllData();
        this.loadFlocksSection();
        closeModal('addFlockModal');

        this.showNotification(this.currentLanguage === 'ar' ? 'تم إضافة القطيع بنجاح' : 'Flock added successfully');
    }

    // إضافة سجل نافق
    addMortalityRecord() {
        const flockId = document.getElementById('mortalityFlockId').value;
        const date = document.getElementById('mortalityDate').value;
        const count = parseInt(document.getElementById('mortalityCount').value);
        const cause = document.getElementById('mortalityCause').value;
        const notes = document.getElementById('mortalityNotes').value;

        const farmFlocks = this.flocks[this.currentFarm] || [];
        const flock = farmFlocks.find(f => f.id === flockId);

        if (flock) {
            if (!flock.mortalityRecords) {
                flock.mortalityRecords = [];
            }

            const mortalityRecord = {
                id: 'mortality_' + Date.now(),
                date: date,
                count: count,
                cause: cause,
                notes: notes,
                createdAt: new Date().toISOString()
            };

            flock.mortalityRecords.push(mortalityRecord);
            this.saveAllData();
            this.loadFlocksSection();
            closeModal('addMortalityModal');

            this.showNotification(this.currentLanguage === 'ar' ? 'تم تسجيل النافق بنجاح' : 'Mortality record added successfully');
        }
    }

    // عرض تفاصيل القطيع
    viewFlockDetails(flockId) {
        const farmFlocks = this.flocks[this.currentFarm] || [];
        const flock = farmFlocks.find(f => f.id === flockId);

        if (flock) {
            const currentCount = this.calculateCurrentFlockCount(flock);
            const age = this.calculateFlockAge(flock.startDate);
            const mortality = this.calculateFlockMortality(flock);
            const mortalityRate = flock.initialCount > 0 ? ((mortality / flock.initialCount) * 100).toFixed(2) : 0;

            let mortalityRecordsHtml = '';
            if (flock.mortalityRecords && flock.mortalityRecords.length > 0) {
                mortalityRecordsHtml = `
                    <h4 class="font-bold mb-2">سجلات النافق:</h4>
                    <table class="w-full border border-gray-300 mb-4">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2 border">التاريخ</th>
                                <th class="p-2 border">العدد</th>
                                <th class="p-2 border">السبب</th>
                                <th class="p-2 border">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${flock.mortalityRecords.map(record => `
                                <tr>
                                    <td class="p-2 border">${this.formatDate(record.date)}</td>
                                    <td class="p-2 border">${record.count}</td>
                                    <td class="p-2 border">${record.cause}</td>
                                    <td class="p-2 border">${record.notes || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                mortalityRecordsHtml = '<p class="text-gray-600 mb-4">لا توجد سجلات نافق</p>';
            }

            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white p-6 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold">تفاصيل القطيع: ${flock.name}</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 class="font-bold mb-2">معلومات أساسية:</h4>
                                <p><strong>النوع:</strong> ${flock.type}</p>
                                <p><strong>العدد الأولي:</strong> ${flock.initialCount.toLocaleString()}</p>
                                <p><strong>العدد الحالي:</strong> ${currentCount.toLocaleString()}</p>
                                <p><strong>العمر:</strong> ${age} يوم</p>
                                <p><strong>السلالة:</strong> ${flock.breed || '-'}</p>
                                <p><strong>المصدر:</strong> ${flock.source || '-'}</p>
                            </div>

                            <div>
                                <h4 class="font-bold mb-2">إحصائيات النافق:</h4>
                                <p><strong>إجمالي النافق:</strong> ${mortality.toLocaleString()}</p>
                                <p><strong>معدل النفوق:</strong> ${mortalityRate}%</p>
                                <p><strong>معدل البقاء:</strong> ${(100 - mortalityRate).toFixed(2)}%</p>
                                <p><strong>تاريخ البداية:</strong> ${this.formatDate(flock.startDate)}</p>
                            </div>
                        </div>

                        ${mortalityRecordsHtml}

                        ${flock.notes ? `<div class="mb-4"><h4 class="font-bold mb-2">ملاحظات:</h4><p class="text-gray-700">${flock.notes}</p></div>` : ''}

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

    // تعديل القطيع
    editFlock(flockId) {
        const farmFlocks = this.flocks[this.currentFarm] || [];
        const flock = farmFlocks.find(f => f.id === flockId);

        if (flock) {
            // ملء النموذج بالبيانات الحالية
            document.getElementById('flockName').value = flock.name;
            document.getElementById('flockType').value = flock.type;
            document.getElementById('flockInitialCount').value = flock.initialCount;
            document.getElementById('flockStartDate').value = flock.startDate;
            document.getElementById('flockBreed').value = flock.breed || '';
            document.getElementById('flockSource').value = flock.source || '';
            document.getElementById('flockNotes').value = flock.notes || '';

            showAddFlockModal();

            // تغيير معالج الإرسال للتحديث
            document.getElementById('addFlockForm').onsubmit = function(e) {
                e.preventDefault();
                farmSystem.updateFlock(flockId);
            };
        }
    }

    // تحديث القطيع
    updateFlock(flockId) {
        const farmFlocks = this.flocks[this.currentFarm] || [];
        const flock = farmFlocks.find(f => f.id === flockId);

        if (flock) {
            flock.name = document.getElementById('flockName').value;
            flock.type = document.getElementById('flockType').value;
            flock.initialCount = parseInt(document.getElementById('flockInitialCount').value);
            flock.startDate = document.getElementById('flockStartDate').value;
            flock.breed = document.getElementById('flockBreed').value;
            flock.source = document.getElementById('flockSource').value;
            flock.notes = document.getElementById('flockNotes').value;

            this.saveAllData();
            this.loadFlocksSection();
            closeModal('addFlockModal');

            this.showNotification(this.currentLanguage === 'ar' ? 'تم تحديث القطيع بنجاح' : 'Flock updated successfully');
        }
    }

    // حذف القطيع
    deleteFlock(flockId) {
        const farmFlocks = this.flocks[this.currentFarm] || [];
        const flockIndex = farmFlocks.findIndex(f => f.id === flockId);

        if (flockIndex !== -1) {
            farmFlocks.splice(flockIndex, 1);
            this.saveAllData();
            this.loadFlocksSection();

            this.showNotification(this.currentLanguage === 'ar' ? 'تم حذف القطيع بنجاح' : 'Flock deleted successfully');
        }
    }

    // إعداد حساب المبلغ التلقائي للمصروفات
    setupExpenseCalculation(type) {
        if (type === 'feed') {
            const quantityInput = document.getElementById('feedQuantity');
            const priceInput = document.getElementById('feedUnitPrice');
            const amountInput = document.getElementById('expenseAmount');

            const calculateAmount = () => {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                amountInput.value = (quantity * price).toFixed(2);
            };

            quantityInput.addEventListener('input', calculateAmount);
            priceInput.addEventListener('input', calculateAmount);
        } else if (type === 'labor') {
            const monthsInput = document.getElementById('workHours'); // ID يبقى كما هو للتوافق
            const salaryInput = document.getElementById('hourlyRate'); // ID يبقى كما هو للتوافق
            const amountInput = document.getElementById('expenseAmount');

            const calculateAmount = () => {
                const months = parseFloat(monthsInput.value) || 0;
                const monthlySalary = parseFloat(salaryInput.value) || 0;
                amountInput.value = (months * monthlySalary).toFixed(2);
            };

            monthsInput.addEventListener('input', calculateAmount);
            salaryInput.addEventListener('input', calculateAmount);
        }
    }

    // إضافة مصروف جديد
    addNewExpense() {
        const type = document.getElementById('expenseType').value;
        const date = document.getElementById('expenseDate').value;
        const description = document.getElementById('expenseDescription').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const paymentMethod = document.getElementById('paymentMethod').value;
        const notes = document.getElementById('expenseNotes').value;

        const expenseId = 'expense_' + Date.now();
        const newExpense = {
            id: expenseId,
            type: type,
            date: date,
            description: description,
            amount: amount,
            paymentMethod: paymentMethod,
            notes: notes,
            createdAt: new Date().toISOString()
        };

        // إضافة الحقول المخصصة حسب النوع
        if (type === 'feed') {
            newExpense.feedType = document.getElementById('feedType').value;
            newExpense.quantity = parseFloat(document.getElementById('feedQuantity').value) || 0;
            newExpense.unitPrice = parseFloat(document.getElementById('feedUnitPrice').value) || 0;
            newExpense.unit = 'طن';
        } else if (type === 'medicine') {
            newExpense.medicineType = document.getElementById('medicineType').value;
            newExpense.quantity = parseFloat(document.getElementById('medicineQuantity').value) || 0;
            newExpense.unit = document.getElementById('medicineUnit').value;
        } else if (type === 'utilities') {
            newExpense.utilityType = document.getElementById('utilityType').value;
            newExpense.meterReading = parseFloat(document.getElementById('utilityReading').value) || 0;
        } else if (type === 'labor') {
            newExpense.workerName = document.getElementById('workerName').value;
            newExpense.workMonths = parseFloat(document.getElementById('workHours').value) || 0; // عدد الأشهر
            newExpense.monthlySalary = parseFloat(document.getElementById('hourlyRate').value) || 0; // الراتب الشهري
            // الاحتفاظ بالحقول القديمة للتوافق
            newExpense.workHours = newExpense.workMonths;
            newExpense.hourlyRate = newExpense.monthlySalary;
        }

        if (!this.expenses[this.currentFarm]) {
            this.expenses[this.currentFarm] = [];
        }

        this.expenses[this.currentFarm].push(newExpense);
        this.saveAllData();
        this.loadExpensesSection();
        this.updateDashboard();
        closeModal('addExpenseModal');

        this.showNotification(this.currentLanguage === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully');
    }

    // عرض تفاصيل المصروف
    viewExpenseDetails(expenseId) {
        const farmExpenses = this.expenses[this.currentFarm] || [];
        const expense = farmExpenses.find(e => e.id === expenseId);

        if (expense) {
            const typeNames = {
                feed: 'أعلاف',
                medicine: 'أدوية',
                utilities: 'مرافق',
                labor: 'عمالة',
                other: 'أخرى'
            };

            let specificDetails = '';

            if (expense.type === 'feed') {
                specificDetails = `
                    <p><strong>نوع العلف:</strong> ${expense.feedType}</p>
                    <p><strong>الكمية:</strong> ${expense.quantity} ${expense.unit}</p>
                    <p><strong>سعر الوحدة:</strong> ${this.formatCurrency(expense.unitPrice)}</p>
                `;
            } else if (expense.type === 'medicine') {
                specificDetails = `
                    <p><strong>نوع الدواء:</strong> ${expense.medicineType}</p>
                    <p><strong>الكمية:</strong> ${expense.quantity} ${expense.unit}</p>
                `;
            } else if (expense.type === 'utilities') {
                specificDetails = `
                    <p><strong>نوع المرفق:</strong> ${expense.utilityType}</p>
                    <p><strong>قراءة العداد:</strong> ${expense.meterReading}</p>
                `;
            } else if (expense.type === 'labor') {
                specificDetails = `
                    <p><strong>اسم العامل:</strong> ${expense.workerName}</p>
                    <p><strong>ساعات العمل:</strong> ${expense.workHours}</p>
                    <p><strong>أجر الساعة:</strong> ${this.formatCurrency(expense.hourlyRate)}</p>
                `;
            }

            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white p-6 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold">تفاصيل المصروف</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 class="font-bold mb-2">معلومات أساسية:</h4>
                                <p><strong>النوع:</strong> ${typeNames[expense.type]}</p>
                                <p><strong>الوصف:</strong> ${expense.description}</p>
                                <p><strong>التاريخ:</strong> ${this.formatDate(expense.date)}</p>
                                <p><strong>المبلغ:</strong> ${this.formatCurrency(expense.amount)}</p>
                                <p><strong>طريقة الدفع:</strong> ${expense.paymentMethod}</p>
                            </div>

                            <div>
                                <h4 class="font-bold mb-2">تفاصيل إضافية:</h4>
                                ${specificDetails}
                            </div>
                        </div>

                        ${expense.notes ? `<div class="mb-4"><h4 class="font-bold mb-2">ملاحظات:</h4><p class="text-gray-700">${expense.notes}</p></div>` : ''}

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

    // تعديل المصروف
    editExpense(expenseId) {
        const farmExpenses = this.expenses[this.currentFarm] || [];
        const expense = farmExpenses.find(e => e.id === expenseId);

        if (expense) {
            // ملء النموذج بالبيانات الحالية
            document.getElementById('expenseDate').value = expense.date;
            document.getElementById('expenseDescription').value = expense.description;
            document.getElementById('expenseAmount').value = expense.amount;
            document.getElementById('paymentMethod').value = expense.paymentMethod;
            document.getElementById('expenseNotes').value = expense.notes || '';

            // ملء الحقول المخصصة
            if (expense.type === 'feed') {
                document.getElementById('feedType').value = expense.feedType || '';
                document.getElementById('feedQuantity').value = expense.quantity || '';
                document.getElementById('feedUnitPrice').value = expense.unitPrice || '';
            } else if (expense.type === 'medicine') {
                document.getElementById('medicineType').value = expense.medicineType || '';
                document.getElementById('medicineQuantity').value = expense.quantity || '';
                document.getElementById('medicineUnit').value = expense.unit || '';
            } else if (expense.type === 'utilities') {
                document.getElementById('utilityType').value = expense.utilityType || '';
                document.getElementById('utilityReading').value = expense.meterReading || '';
            } else if (expense.type === 'labor') {
                document.getElementById('workerName').value = expense.workerName || '';
                // استخدام البيانات الجديدة إذا كانت متوفرة، وإلا استخدام القديمة للتوافق
                document.getElementById('workHours').value = expense.workMonths || expense.workHours || '';
                document.getElementById('hourlyRate').value = expense.monthlySalary || expense.hourlyRate || '';
            }

            showAddExpenseModal(expense.type);

            // تغيير معالج الإرسال للتحديث
            document.getElementById('addExpenseForm').onsubmit = function(e) {
                e.preventDefault();
                farmSystem.updateExpense(expenseId);
            };
        }
    }

    // تحديث المصروف
    updateExpense(expenseId) {
        const farmExpenses = this.expenses[this.currentFarm] || [];
        const expense = farmExpenses.find(e => e.id === expenseId);

        if (expense) {
            expense.date = document.getElementById('expenseDate').value;
            expense.description = document.getElementById('expenseDescription').value;
            expense.amount = parseFloat(document.getElementById('expenseAmount').value);
            expense.paymentMethod = document.getElementById('paymentMethod').value;
            expense.notes = document.getElementById('expenseNotes').value;

            // تحديث الحقول المخصصة
            if (expense.type === 'feed') {
                expense.feedType = document.getElementById('feedType').value;
                expense.quantity = parseFloat(document.getElementById('feedQuantity').value) || 0;
                expense.unitPrice = parseFloat(document.getElementById('feedUnitPrice').value) || 0;
            } else if (expense.type === 'medicine') {
                expense.medicineType = document.getElementById('medicineType').value;
                expense.quantity = parseFloat(document.getElementById('medicineQuantity').value) || 0;
                expense.unit = document.getElementById('medicineUnit').value;
            } else if (expense.type === 'utilities') {
                expense.utilityType = document.getElementById('utilityType').value;
                expense.meterReading = parseFloat(document.getElementById('utilityReading').value) || 0;
            } else if (expense.type === 'labor') {
                expense.workerName = document.getElementById('workerName').value;
                expense.workHours = parseFloat(document.getElementById('workHours').value) || 0;
                expense.hourlyRate = parseFloat(document.getElementById('hourlyRate').value) || 0;
            }

            this.saveAllData();
            this.loadExpensesSection();
            this.updateDashboard();
            closeModal('addExpenseModal');

            this.showNotification(this.currentLanguage === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully');
        }
    }

    // حذف المصروف
    deleteExpense(expenseId) {
        const farmExpenses = this.expenses[this.currentFarm] || [];
        const expenseIndex = farmExpenses.findIndex(e => e.id === expenseId);

        if (expenseIndex !== -1) {
            farmExpenses.splice(expenseIndex, 1);
            this.saveAllData();
            this.loadExpensesSection();
            this.updateDashboard();

            this.showNotification(this.currentLanguage === 'ar' ? 'تم حذف المصروف بنجاح' : 'Expense deleted successfully');
        }
    }

    // تصفية المصروفات
    filterExpenses() {
        const typeFilter = document.getElementById('expenseTypeFilter').value;
        const dateFilter = document.getElementById('expenseDateFilter').value;

        let farmExpenses = this.expenses[this.currentFarm] || [];

        if (typeFilter) {
            farmExpenses = farmExpenses.filter(expense => expense.type === typeFilter);
        }

        if (dateFilter) {
            farmExpenses = farmExpenses.filter(expense => expense.date === dateFilter);
        }

        const tbody = document.getElementById('expensesTable');
        tbody.innerHTML = this.generateExpensesTableRows(farmExpenses);
    }

    // تحميل قسم الإيرادات
    loadRevenuesSection() {
        const section = document.getElementById('revenues');
        const farmRevenues = this.revenues[this.currentFarm] || [];

        // تجميع الإيرادات حسب النوع
        const revenuesByType = this.groupRevenuesByType(farmRevenues);

        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-4" data-ar="إدارة الإيرادات" data-en="Revenue Management">إدارة الإيرادات</h2>
                <div class="flex flex-wrap gap-2">
                    <button onclick="showAddRevenueModal('eggs')" class="btn-primary text-white px-4 py-2 rounded hover:opacity-90 transition">
                        <i class="fas fa-egg ml-2"></i>
                        <span data-ar="بيع بيض" data-en="Sell Eggs">بيع بيض</span>
                    </button>
                    <button onclick="showAddRevenueModal('manure')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                        <i class="fas fa-leaf ml-2"></i>
                        <span data-ar="بيع سبلة" data-en="Sell Manure">بيع سبلة</span>
                    </button>
                    <button onclick="showAddRevenueModal('chickens')" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition">
                        <i class="fas fa-dove ml-2"></i>
                        <span data-ar="بيع فراخ" data-en="Sell Chickens">بيع فراخ</span>
                    </button>
                    <button onclick="showAddRevenueModal('other')" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                        <i class="fas fa-plus ml-2"></i>
                        <span data-ar="إيرادات أخرى" data-en="Other Revenue">إيرادات أخرى</span>
                    </button>
                </div>
            </div>

            <!-- إحصائيات الإيرادات -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <i class="fas fa-egg text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="البيض" data-en="Eggs">البيض</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(revenuesByType.eggs || 0)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <i class="fas fa-leaf text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="السبلة" data-en="Manure">السبلة</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(revenuesByType.manure || 0)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <i class="fas fa-dove text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="الفراخ" data-en="Chickens">الفراخ</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(revenuesByType.chickens || 0)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-gray-100 text-gray-600">
                            <i class="fas fa-ellipsis-h text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="أخرى" data-en="Other">أخرى</p>
                            <p class="text-xl font-bold text-gray-800">${this.formatCurrency(revenuesByType.other || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- جدول الإيرادات -->
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800" data-ar="سجل الإيرادات" data-en="Revenue Records">سجل الإيرادات</h3>
                    <div class="flex gap-2">
                        <select id="revenueTypeFilter" class="p-2 border border-gray-300 rounded" onchange="farmSystem.filterRevenues()">
                            <option value="" data-ar="جميع الأنواع" data-en="All Types">جميع الأنواع</option>
                            <option value="eggs" data-ar="بيض" data-en="Eggs">بيض</option>
                            <option value="manure" data-ar="سبلة" data-en="Manure">سبلة</option>
                            <option value="chickens" data-ar="فراخ" data-en="Chickens">فراخ</option>
                            <option value="other" data-ar="أخرى" data-en="Other">أخرى</option>
                        </select>
                        <input type="date" id="revenueDateFilter" class="p-2 border border-gray-300 rounded" onchange="farmSystem.filterRevenues()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="table-header text-white">
                            <tr>
                                <th class="p-3 text-right" data-ar="التاريخ" data-en="Date">التاريخ</th>
                                <th class="p-3 text-right" data-ar="النوع" data-en="Type">النوع</th>
                                <th class="p-3 text-right" data-ar="الوصف" data-en="Description">الوصف</th>
                                <th class="p-3 text-right" data-ar="الكمية" data-en="Quantity">الكمية</th>
                                <th class="p-3 text-right" data-ar="السعر" data-en="Price">السعر</th>
                                <th class="p-3 text-right" data-ar="المجموع" data-en="Total">المجموع</th>
                                <th class="p-3 text-right" data-ar="الإجراءات" data-en="Actions">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="revenuesTable">
                            ${this.generateRevenuesTableRows(farmRevenues)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // تم إزالة الرسم البياني من قسم الإيرادات

        this.applyLanguage();
    }

    // تجميع الإيرادات حسب النوع
    groupRevenuesByType(revenues) {
        const grouped = {};
        revenues.forEach(revenue => {
            const type = revenue.type || 'other';
            grouped[type] = (grouped[type] || 0) + (revenue.amount || 0);
        });
        return grouped;
    }

    // توليد صفوف جدول الإيرادات
    generateRevenuesTableRows(revenues) {
        if (revenues.length === 0) {
            return '<tr><td class="p-3 border-b text-center" colspan="7">لا توجد إيرادات مسجلة</td></tr>';
        }

        // ترتيب حسب التاريخ (الأحدث أولاً)
        const sortedRevenues = revenues.sort((a, b) => new Date(b.date) - new Date(a.date));

        return sortedRevenues.map(revenue => {
            const typeNames = {
                eggs: 'بيض',
                manure: 'سبلة',
                chickens: 'فراخ',
                other: 'أخرى'
            };

            return `
                <tr>
                    <td class="p-3 border-b">${this.formatDate(revenue.date)}</td>
                    <td class="p-3 border-b">${typeNames[revenue.type] || revenue.type}</td>
                    <td class="p-3 border-b">${revenue.description}</td>
                    <td class="p-3 border-b">${revenue.quantity ? revenue.quantity + ' ' + (revenue.unit || '') : '-'}</td>
                    <td class="p-3 border-b">${revenue.unitPrice ? this.formatCurrency(revenue.unitPrice) : '-'}</td>
                    <td class="p-3 border-b font-bold text-green-600">${this.formatCurrency(revenue.amount)}</td>
                    <td class="p-3 border-b">
                        <div class="flex flex-wrap gap-1">
                            ${!revenue.invoiceId ? `
                                <button onclick="createInvoiceFromRevenue('${revenue.id}')" class="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 bg-purple-100 rounded" title="إنشاء فاتورة">
                                    <i class="fas fa-file-invoice"></i>
                                </button>
                            ` : `
                                <span class="text-xs text-green-600 px-2 py-1 bg-green-100 rounded" title="تم إنشاء فاتورة">
                                    <i class="fas fa-check"></i>
                                </span>
                            `}
                            <button onclick="viewRevenueDetails('${revenue.id}')" class="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-100 rounded" title="عرض">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="editRevenue('${revenue.id}')" class="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-100 rounded" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteRevenue('${revenue.id}')" class="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-100 rounded" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // إعداد حساب المبلغ التلقائي للإيرادات
    setupRevenueCalculation(type) {
        if (type === 'eggs') {
            const countInput = document.getElementById('eggCount');
            const priceInput = document.getElementById('eggUnitPrice');
            const amountInput = document.getElementById('revenueAmount');

            const calculateAmount = () => {
                const count = parseFloat(countInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                amountInput.value = (count * price).toFixed(2);
            };

            countInput.addEventListener('input', calculateAmount);
            priceInput.addEventListener('input', calculateAmount);
        } else if (type === 'manure') {
            const quantityInput = document.getElementById('manureQuantity');
            const priceInput = document.getElementById('manureUnitPrice');
            const amountInput = document.getElementById('revenueAmount');

            const calculateAmount = () => {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                amountInput.value = (quantity * price).toFixed(2);
            };

            quantityInput.addEventListener('input', calculateAmount);
            priceInput.addEventListener('input', calculateAmount);
        } else if (type === 'chickens') {
            const countInput = document.getElementById('chickenCount');
            const weightInput = document.getElementById('chickenWeight');
            const priceInput = document.getElementById('chickenUnitPrice');
            const avgWeightInput = document.getElementById('chickenAvgWeight');
            const amountInput = document.getElementById('revenueAmount');

            const calculateAmount = () => {
                const count = parseFloat(countInput.value) || 0;
                const weight = parseFloat(weightInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;

                // حساب متوسط الوزن
                if (count > 0 && weight > 0) {
                    avgWeightInput.value = (weight / count).toFixed(2);
                }

                amountInput.value = (weight * price).toFixed(2);
            };

            countInput.addEventListener('input', calculateAmount);
            weightInput.addEventListener('input', calculateAmount);
            priceInput.addEventListener('input', calculateAmount);
        }
    }

    // إضافة إيراد جديد
    addNewRevenue() {
        const type = document.getElementById('revenueType').value;
        const date = document.getElementById('revenueDate').value;
        const description = document.getElementById('revenueDescription').value;
        const amount = parseFloat(document.getElementById('revenueAmount').value);
        const paymentMethod = document.getElementById('revenuePaymentMethod').value;
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const notes = document.getElementById('revenueNotes').value;

        const revenueId = 'revenue_' + Date.now();
        const newRevenue = {
            id: revenueId,
            type: type,
            date: date,
            description: description,
            amount: amount,
            paymentMethod: paymentMethod,
            customerName: customerName,
            customerPhone: customerPhone,
            notes: notes,
            createdAt: new Date().toISOString()
        };

        // إضافة الحقول المخصصة حسب النوع
        if (type === 'eggs') {
            newRevenue.eggGrade = document.getElementById('eggGrade').value;
            newRevenue.quantity = parseFloat(document.getElementById('eggCount').value) || 0;
            newRevenue.unitPrice = parseFloat(document.getElementById('eggUnitPrice').value) || 0;
            newRevenue.unit = 'بيضة';
        } else if (type === 'manure') {
            newRevenue.manureType = document.getElementById('manureType').value;
            newRevenue.quantity = parseFloat(document.getElementById('manureQuantity').value) || 0;
            newRevenue.unitPrice = parseFloat(document.getElementById('manureUnitPrice').value) || 0;
            newRevenue.unit = 'طن';
        } else if (type === 'chickens') {
            newRevenue.quantity = parseFloat(document.getElementById('chickenCount').value) || 0;
            newRevenue.weight = parseFloat(document.getElementById('chickenWeight').value) || 0;
            newRevenue.unitPrice = parseFloat(document.getElementById('chickenUnitPrice').value) || 0;
            newRevenue.avgWeight = parseFloat(document.getElementById('chickenAvgWeight').value) || 0;
            newRevenue.unit = 'كجم';
        }

        if (!this.revenues[this.currentFarm]) {
            this.revenues[this.currentFarm] = [];
        }

        this.revenues[this.currentFarm].push(newRevenue);
        this.saveAllData();
        this.loadRevenuesSection();
        this.updateDashboard();
        closeModal('addRevenueModal');

        this.showNotification(this.currentLanguage === 'ar' ? 'تم إضافة الإيراد بنجاح' : 'Revenue added successfully');
    }

    // عرض تفاصيل الإيراد
    viewRevenueDetails(revenueId) {
        const farmRevenues = this.revenues[this.currentFarm] || [];
        const revenue = farmRevenues.find(r => r.id === revenueId);

        if (revenue) {
            const typeNames = {
                eggs: 'بيض',
                manure: 'سبلة',
                chickens: 'فراخ',
                other: 'أخرى'
            };

            let specificDetails = '';

            if (revenue.type === 'eggs') {
                specificDetails = `
                    <p><strong>تصنيف البيض:</strong> ${revenue.eggGrade}</p>
                    <p><strong>عدد البيض:</strong> ${revenue.quantity} بيضة</p>
                    <p><strong>سعر البيضة:</strong> ${this.formatCurrency(revenue.unitPrice)}</p>
                `;
            } else if (revenue.type === 'manure') {
                specificDetails = `
                    <p><strong>نوع السبلة:</strong> ${revenue.manureType}</p>
                    <p><strong>الكمية:</strong> ${revenue.quantity} طن</p>
                    <p><strong>سعر الطن:</strong> ${this.formatCurrency(revenue.unitPrice)}</p>
                `;
            } else if (revenue.type === 'chickens') {
                specificDetails = `
                    <p><strong>عدد الفراخ:</strong> ${revenue.quantity}</p>
                    <p><strong>الوزن الإجمالي:</strong> ${revenue.weight} كجم</p>
                    <p><strong>متوسط الوزن:</strong> ${revenue.avgWeight} كجم</p>
                    <p><strong>سعر الكيلو:</strong> ${this.formatCurrency(revenue.unitPrice)}</p>
                `;
            }

            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white p-6 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold">تفاصيل الإيراد</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 class="font-bold mb-2">معلومات أساسية:</h4>
                                <p><strong>النوع:</strong> ${typeNames[revenue.type]}</p>
                                <p><strong>الوصف:</strong> ${revenue.description}</p>
                                <p><strong>التاريخ:</strong> ${this.formatDate(revenue.date)}</p>
                                <p><strong>المبلغ:</strong> ${this.formatCurrency(revenue.amount)}</p>
                                <p><strong>طريقة الدفع:</strong> ${revenue.paymentMethod}</p>
                            </div>

                            <div>
                                <h4 class="font-bold mb-2">تفاصيل إضافية:</h4>
                                ${specificDetails}
                                ${revenue.customerName ? `<p><strong>العميل:</strong> ${revenue.customerName}</p>` : ''}
                                ${revenue.customerPhone ? `<p><strong>الهاتف:</strong> ${revenue.customerPhone}</p>` : ''}
                            </div>
                        </div>

                        ${revenue.notes ? `<div class="mb-4"><h4 class="font-bold mb-2">ملاحظات:</h4><p class="text-gray-700">${revenue.notes}</p></div>` : ''}

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

    // تعديل الإيراد
    editRevenue(revenueId) {
        const farmRevenues = this.revenues[this.currentFarm] || [];
        const revenue = farmRevenues.find(r => r.id === revenueId);

        if (revenue) {
            // ملء النموذج بالبيانات الحالية
            document.getElementById('revenueDate').value = revenue.date;
            document.getElementById('revenueDescription').value = revenue.description;
            document.getElementById('revenueAmount').value = revenue.amount;
            document.getElementById('revenuePaymentMethod').value = revenue.paymentMethod;
            document.getElementById('customerName').value = revenue.customerName || '';
            document.getElementById('customerPhone').value = revenue.customerPhone || '';
            document.getElementById('revenueNotes').value = revenue.notes || '';

            // ملء الحقول المخصصة
            if (revenue.type === 'eggs') {
                document.getElementById('eggGrade').value = revenue.eggGrade || '';
                document.getElementById('eggCount').value = revenue.quantity || '';
                document.getElementById('eggUnitPrice').value = revenue.unitPrice || '';
            } else if (revenue.type === 'manure') {
                document.getElementById('manureType').value = revenue.manureType || '';
                document.getElementById('manureQuantity').value = revenue.quantity || '';
                document.getElementById('manureUnitPrice').value = revenue.unitPrice || '';
            } else if (revenue.type === 'chickens') {
                document.getElementById('chickenCount').value = revenue.quantity || '';
                document.getElementById('chickenWeight').value = revenue.weight || '';
                document.getElementById('chickenUnitPrice').value = revenue.unitPrice || '';
                document.getElementById('chickenAvgWeight').value = revenue.avgWeight || '';
            }

            showAddRevenueModal(revenue.type);

            // تغيير معالج الإرسال للتحديث
            document.getElementById('addRevenueForm').onsubmit = function(e) {
                e.preventDefault();
                farmSystem.updateRevenue(revenueId);
            };
        }
    }

    // تحديث الإيراد
    updateRevenue(revenueId) {
        const farmRevenues = this.revenues[this.currentFarm] || [];
        const revenue = farmRevenues.find(r => r.id === revenueId);

        if (revenue) {
            revenue.date = document.getElementById('revenueDate').value;
            revenue.description = document.getElementById('revenueDescription').value;
            revenue.amount = parseFloat(document.getElementById('revenueAmount').value);
            revenue.paymentMethod = document.getElementById('revenuePaymentMethod').value;
            revenue.customerName = document.getElementById('customerName').value;
            revenue.customerPhone = document.getElementById('customerPhone').value;
            revenue.notes = document.getElementById('revenueNotes').value;

            // تحديث الحقول المخصصة
            if (revenue.type === 'eggs') {
                revenue.eggGrade = document.getElementById('eggGrade').value;
                revenue.quantity = parseFloat(document.getElementById('eggCount').value) || 0;
                revenue.unitPrice = parseFloat(document.getElementById('eggUnitPrice').value) || 0;
            } else if (revenue.type === 'manure') {
                revenue.manureType = document.getElementById('manureType').value;
                revenue.quantity = parseFloat(document.getElementById('manureQuantity').value) || 0;
                revenue.unitPrice = parseFloat(document.getElementById('manureUnitPrice').value) || 0;
            } else if (revenue.type === 'chickens') {
                revenue.quantity = parseFloat(document.getElementById('chickenCount').value) || 0;
                revenue.weight = parseFloat(document.getElementById('chickenWeight').value) || 0;
                revenue.unitPrice = parseFloat(document.getElementById('chickenUnitPrice').value) || 0;
                revenue.avgWeight = parseFloat(document.getElementById('chickenAvgWeight').value) || 0;
            }

            this.saveAllData();
            this.loadRevenuesSection();
            this.updateDashboard();
            closeModal('addRevenueModal');

            this.showNotification(this.currentLanguage === 'ar' ? 'تم تحديث الإيراد بنجاح' : 'Revenue updated successfully');
        }
    }

    // حذف الإيراد
    deleteRevenue(revenueId) {
        const farmRevenues = this.revenues[this.currentFarm] || [];
        const revenueIndex = farmRevenues.findIndex(r => r.id === revenueId);

        if (revenueIndex !== -1) {
            farmRevenues.splice(revenueIndex, 1);
            this.saveAllData();
            this.loadRevenuesSection();
            this.updateDashboard();

            this.showNotification(this.currentLanguage === 'ar' ? 'تم حذف الإيراد بنجاح' : 'Revenue deleted successfully');
        }
    }

    // تصفية الإيرادات
    filterRevenues() {
        const typeFilter = document.getElementById('revenueTypeFilter').value;
        const dateFilter = document.getElementById('revenueDateFilter').value;

        let farmRevenues = this.revenues[this.currentFarm] || [];

        if (typeFilter) {
            farmRevenues = farmRevenues.filter(revenue => revenue.type === typeFilter);
        }

        if (dateFilter) {
            farmRevenues = farmRevenues.filter(revenue => revenue.date === dateFilter);
        }

        const tbody = document.getElementById('revenuesTable');
        tbody.innerHTML = this.generateRevenuesTableRows(farmRevenues);
    }

    // عرض تفاصيل الأرباح
    showProfitDetails() {
        const farmData = this.getFarmData(this.currentFarm);
        const totalRevenue = this.calculateTotalRevenue(farmData);
        const totalExpenses = this.calculateTotalExpenses(farmData);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

        // تحديث البطاقات
        document.getElementById('modalTotalRevenue').textContent = this.formatCurrency(totalRevenue);
        document.getElementById('modalTotalExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('modalNetProfit').textContent = this.formatCurrency(netProfit);
        document.getElementById('profitMargin').textContent = `هامش الربح: ${profitMargin}%`;

        // تحديث الجداول
        this.updateProfitDetailsTables(farmData, totalRevenue, totalExpenses);

        // تحديث الرسوم البيانية
        this.updateModalCharts(farmData);

        // إظهار النافذة
        document.getElementById('profitDetailsModal').classList.remove('hidden');
        this.applyLanguage();
    }

    // تحديث جداول تفاصيل الأرباح
    updateProfitDetailsTables(farmData, totalRevenue, totalExpenses) {
        // جدول المصروفات
        const expenseTypes = this.groupExpensesByType(farmData.expenses);
        const expenseTableBody = document.getElementById('expenseDetailsTable');
        expenseTableBody.innerHTML = '';

        Object.entries(expenseTypes).forEach(([type, amount]) => {
            const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
            const typeNames = {
                feed: 'أعلاف',
                medicine: 'أدوية',
                utilities: 'مرافق',
                labor: 'عمالة',
                other: 'أخرى'
            };

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-2 border-b">${typeNames[type] || type}</td>
                <td class="py-2 border-b font-semibold text-red-600">${this.formatCurrency(amount)}</td>
                <td class="py-2 border-b">${percentage}%</td>
            `;
            expenseTableBody.appendChild(row);
        });

        // جدول الإيرادات
        const revenueTypes = this.groupRevenuesByType(farmData.revenues);
        const revenueTableBody = document.getElementById('revenueDetailsTable');
        revenueTableBody.innerHTML = '';

        Object.entries(revenueTypes).forEach(([type, amount]) => {
            const percentage = totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : 0;
            const typeNames = {
                eggs: 'بيض',
                manure: 'سبلة',
                chickens: 'فراخ',
                other: 'أخرى'
            };

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-2 border-b">${typeNames[type] || type}</td>
                <td class="py-2 border-b font-semibold text-green-600">${this.formatCurrency(amount)}</td>
                <td class="py-2 border-b">${percentage}%</td>
            `;
            revenueTableBody.appendChild(row);
        });
    }

    // تحديث الرسوم البيانية في النافذة المنبثقة
    updateModalCharts(farmData) {
        // رسم المصروفات
        const expenseCtx = document.getElementById('modalExpenseChart');
        if (expenseCtx) {
            if (this.modalExpenseChart) {
                this.modalExpenseChart.destroy();
            }

            const expenseTypes = this.groupExpensesByType(farmData.expenses);
            this.modalExpenseChart = new Chart(expenseCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(expenseTypes).map(type => {
                        const typeNames = {
                            feed: 'أعلاف',
                            medicine: 'أدوية',
                            utilities: 'مرافق',
                            labor: 'عمالة',
                            other: 'أخرى'
                        };
                        return typeNames[type] || type;
                    }),
                    datasets: [{
                        data: Object.values(expenseTypes),
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.raw / total) * 100).toFixed(1);
                                    return `${context.label}: ${this.formatCurrency(context.raw)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // رسم الإيرادات
        const revenueCtx = document.getElementById('modalRevenueChart');
        if (revenueCtx) {
            if (this.modalRevenueChart) {
                this.modalRevenueChart.destroy();
            }

            const revenueTypes = this.groupRevenuesByType(farmData.revenues);
            this.modalRevenueChart = new Chart(revenueCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(revenueTypes).map(type => {
                        const typeNames = {
                            eggs: 'بيض',
                            manure: 'سبلة',
                            chickens: 'فراخ',
                            other: 'أخرى'
                        };
                        return typeNames[type] || type;
                    }),
                    datasets: [{
                        data: Object.values(revenueTypes),
                        backgroundColor: [
                            '#4CAF50',
                            '#2196F3',
                            '#FF9800',
                            '#9C27B0',
                            '#00BCD4',
                            '#795548'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.raw / total) * 100).toFixed(1);
                                    return `${context.label}: ${this.formatCurrency(context.raw)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // نظام الإشعارات
    showNotification(message, type = 'success') {
        const toast = document.getElementById('notificationToast');
        const messageElement = document.getElementById('notificationMessage');

        if (toast && messageElement) {
            messageElement.textContent = message;

            // تغيير لون الإشعار حسب النوع
            const toastDiv = toast.querySelector('div');
            if (type === 'success') {
                toastDiv.className = 'bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center';
                toastDiv.querySelector('i').className = 'fas fa-check-circle mr-2';
            } else if (type === 'error') {
                toastDiv.className = 'bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center';
                toastDiv.querySelector('i').className = 'fas fa-exclamation-circle mr-2';
            } else if (type === 'warning') {
                toastDiv.className = 'bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center';
                toastDiv.querySelector('i').className = 'fas fa-exclamation-triangle mr-2';
            }

            toast.classList.remove('hidden');

            // إخفاء الإشعار بعد 3 ثوانٍ
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }
    }

    // تحميل قسم العملاء
    loadCustomersSection() {
        const section = document.getElementById('customers');
        const farmCustomers = this.customers[this.currentFarm] || [];

        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-4" data-ar="إدارة العملاء" data-en="Customer Management">إدارة العملاء</h2>
                <button onclick="showAddCustomerModal()" class="btn-primary text-white px-4 py-2 rounded hover:opacity-90 transition">
                    <i class="fas fa-plus ml-2"></i>
                    <span data-ar="إضافة عميل جديد" data-en="Add New Customer">إضافة عميل جديد</span>
                </button>
            </div>

            <!-- إحصائيات العملاء -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <i class="fas fa-users text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="إجمالي العملاء" data-en="Total Customers">إجمالي العملاء</p>
                            <p class="text-2xl font-bold text-gray-800">${farmCustomers.length}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <i class="fas fa-user-check text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="عملاء نشطون" data-en="Active Customers">عملاء نشطون</p>
                            <p class="text-2xl font-bold text-gray-800">${this.calculateActiveCustomers(farmCustomers)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <i class="fas fa-credit-card text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="حسابات مدينة" data-en="Accounts Receivable">حسابات مدينة</p>
                            <p class="text-2xl font-bold text-gray-800">${this.formatCurrency(this.calculateReceivables(farmCustomers))}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-red-100 text-red-600">
                            <i class="fas fa-money-bill text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="حسابات دائنة" data-en="Accounts Payable">حسابات دائنة</p>
                            <p class="text-2xl font-bold text-gray-800">${this.formatCurrency(this.calculatePayables(farmCustomers))}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- جدول العملاء -->
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800" data-ar="قائمة العملاء" data-en="Customer List">قائمة العملاء</h3>
                    <div class="flex gap-2">
                        <input type="text" id="customerSearchInput" placeholder="البحث بالاسم أو الهاتف" class="p-2 border border-gray-300 rounded" onkeyup="farmSystem.filterCustomers()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="table-header text-white">
                            <tr>
                                <th class="p-3 text-right" data-ar="الاسم" data-en="Name">الاسم</th>
                                <th class="p-3 text-right" data-ar="الهاتف" data-en="Phone">الهاتف</th>
                                <th class="p-3 text-right" data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني</th>
                                <th class="p-3 text-right" data-ar="الرصيد" data-en="Balance">الرصيد</th>
                                <th class="p-3 text-right" data-ar="آخر تعامل" data-en="Last Transaction">آخر تعامل</th>
                                <th class="p-3 text-right" data-ar="الإجراءات" data-en="Actions">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="customersTable">
                            ${this.generateCustomersTableRows(farmCustomers)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.applyLanguage();
    }

    // حساب العملاء النشطين
    calculateActiveCustomers(customers) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return customers.filter(customer => {
            const lastTransaction = customer.lastTransactionDate ? new Date(customer.lastTransactionDate) : null;
            return lastTransaction && lastTransaction > thirtyDaysAgo;
        }).length;
    }

    // حساب الحسابات المدينة
    calculateReceivables(customers) {
        return customers.reduce((total, customer) => {
            return total + Math.max(0, customer.balance || 0);
        }, 0);
    }

    // حساب الحسابات الدائنة
    calculatePayables(customers) {
        return customers.reduce((total, customer) => {
            return total + Math.abs(Math.min(0, customer.balance || 0));
        }, 0);
    }

    // توليد صفوف جدول العملاء
    generateCustomersTableRows(customers) {
        if (customers.length === 0) {
            return '<tr><td class="p-3 border-b text-center" colspan="6">لا يوجد عملاء مسجلون</td></tr>';
        }

        return customers.map(customer => {
            const balanceClass = (customer.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600';
            const lastTransaction = customer.lastTransactionDate ? this.formatDate(customer.lastTransactionDate) : 'لا يوجد';

            return `
                <tr>
                    <td class="p-3 border-b font-semibold">${customer.name}</td>
                    <td class="p-3 border-b">${customer.phone || '-'}</td>
                    <td class="p-3 border-b">${customer.email || '-'}</td>
                    <td class="p-3 border-b ${balanceClass} font-semibold">${this.formatCurrency(customer.balance || 0)}</td>
                    <td class="p-3 border-b">${lastTransaction}</td>
                    <td class="p-3 border-b">
                        <button onclick="viewCustomerDetails('${customer.id}')" class="text-blue-600 hover:text-blue-800 ml-2">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editCustomer('${customer.id}')" class="text-green-600 hover:text-green-800 ml-2">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteCustomer('${customer.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // تصفية العملاء
    filterCustomers() {
        const searchTerm = document.getElementById('customerSearchInput').value.toLowerCase();
        const farmCustomers = this.customers[this.currentFarm] || [];

        const filteredCustomers = farmCustomers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.includes(searchTerm)) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm))
        );

        const tbody = document.getElementById('customersTable');
        tbody.innerHTML = this.generateCustomersTableRows(filteredCustomers);
    }

    // إضافة عميل جديد
    addNewCustomer() {
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        const email = document.getElementById('customerEmail').value;
        const balance = parseFloat(document.getElementById('customerBalance').value) || 0;
        const address = document.getElementById('customerAddress').value;
        const notes = document.getElementById('customerNotes').value;

        const customerId = 'customer_' + Date.now();
        const newCustomer = {
            id: customerId,
            name: name,
            phone: phone,
            email: email,
            balance: balance,
            address: address,
            notes: notes,
            createdAt: new Date().toISOString(),
            lastTransactionDate: null,
            transactions: []
        };

        if (!this.customers[this.currentFarm]) {
            this.customers[this.currentFarm] = [];
        }

        this.customers[this.currentFarm].push(newCustomer);
        this.saveAllData();
        this.loadCustomersSection();
        closeModal('addCustomerModal');

        this.showNotification(this.currentLanguage === 'ar' ? 'تم إضافة العميل بنجاح' : 'Customer added successfully');
    }

    // عرض تفاصيل العميل
    viewCustomerDetails(customerId) {
        const farmCustomers = this.customers[this.currentFarm] || [];
        const customer = farmCustomers.find(c => c.id === customerId);

        if (customer) {
            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white p-6 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold">تفاصيل العميل: ${customer.name}</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 class="font-bold mb-2">معلومات الاتصال:</h4>
                                <p><strong>الاسم:</strong> ${customer.name}</p>
                                <p><strong>الهاتف:</strong> ${customer.phone || '-'}</p>
                                <p><strong>البريد الإلكتروني:</strong> ${customer.email || '-'}</p>
                                <p><strong>العنوان:</strong> ${customer.address || '-'}</p>
                            </div>

                            <div>
                                <h4 class="font-bold mb-2">معلومات مالية:</h4>
                                <p><strong>الرصيد الحالي:</strong> <span class="${(customer.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold">${this.formatCurrency(customer.balance || 0)}</span></p>
                                <p><strong>تاريخ الإنشاء:</strong> ${this.formatDate(customer.createdAt)}</p>
                                <p><strong>آخر تعامل:</strong> ${customer.lastTransactionDate ? this.formatDate(customer.lastTransactionDate) : 'لا يوجد'}</p>
                            </div>
                        </div>

                        ${customer.notes ? `<div class="mb-4"><h4 class="font-bold mb-2">ملاحظات:</h4><p class="text-gray-700">${customer.notes}</p></div>` : ''}

                        <div class="mb-4">
                            <h4 class="font-bold mb-2">تاريخ التعاملات:</h4>
                            ${this.generateCustomerTransactionsTable(customer)}
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

    // توليد جدول تعاملات العميل
    generateCustomerTransactionsTable(customer) {
        if (!customer.transactions || customer.transactions.length === 0) {
            return '<p class="text-gray-600">لا توجد تعاملات مسجلة</p>';
        }

        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-2 border text-right">التاريخ</th>
                        <th class="p-2 border text-right">النوع</th>
                        <th class="p-2 border text-right">الوصف</th>
                        <th class="p-2 border text-right">المبلغ</th>
                        <th class="p-2 border text-right">الرصيد</th>
                    </tr>
                </thead>
                <tbody>
        `;

        customer.transactions.forEach(transaction => {
            const amountClass = transaction.amount >= 0 ? 'text-green-600' : 'text-red-600';
            tableHtml += `
                <tr>
                    <td class="p-2 border">${this.formatDate(transaction.date)}</td>
                    <td class="p-2 border">${transaction.type}</td>
                    <td class="p-2 border">${transaction.description}</td>
                    <td class="p-2 border ${amountClass}">${this.formatCurrency(transaction.amount)}</td>
                    <td class="p-2 border">${this.formatCurrency(transaction.balance)}</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // تعديل العميل
    editCustomer(customerId) {
        const farmCustomers = this.customers[this.currentFarm] || [];
        const customer = farmCustomers.find(c => c.id === customerId);

        if (customer) {
            // ملء النموذج بالبيانات الحالية
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerBalance').value = customer.balance || 0;
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerNotes').value = customer.notes || '';

            showAddCustomerModal();

            // تغيير معالج الإرسال للتحديث
            document.getElementById('addCustomerForm').onsubmit = function(e) {
                e.preventDefault();
                farmSystem.updateCustomer(customerId);
            };
        }
    }

    // تحديث العميل
    updateCustomer(customerId) {
        const farmCustomers = this.customers[this.currentFarm] || [];
        const customer = farmCustomers.find(c => c.id === customerId);

        if (customer) {
            customer.name = document.getElementById('customerName').value;
            customer.phone = document.getElementById('customerPhone').value;
            customer.email = document.getElementById('customerEmail').value;
            customer.balance = parseFloat(document.getElementById('customerBalance').value) || 0;
            customer.address = document.getElementById('customerAddress').value;
            customer.notes = document.getElementById('customerNotes').value;

            this.saveAllData();
            this.loadCustomersSection();
            closeModal('addCustomerModal');

            this.showNotification(this.currentLanguage === 'ar' ? 'تم تحديث العميل بنجاح' : 'Customer updated successfully');
        }
    }

    // حذف العميل
    deleteCustomer(customerId) {
        const farmCustomers = this.customers[this.currentFarm] || [];
        const customerIndex = farmCustomers.findIndex(c => c.id === customerId);

        if (customerIndex !== -1) {
            farmCustomers.splice(customerIndex, 1);
            this.saveAllData();
            this.loadCustomersSection();

            this.showNotification(this.currentLanguage === 'ar' ? 'تم حذف العميل بنجاح' : 'Customer deleted successfully');
        }
    }

    // تحميل قسم الفواتير
    loadInvoicesSection() {
        const section = document.getElementById('invoices');
        const farmInvoices = this.invoices[this.currentFarm] || [];

        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-4" data-ar="إدارة الفواتير" data-en="Invoice Management">إدارة الفواتير</h2>
                <button onclick="showAddInvoiceModal()" class="btn-primary text-white px-4 py-2 rounded hover:opacity-90 transition">
                    <i class="fas fa-plus ml-2"></i>
                    <span data-ar="إنشاء فاتورة جديدة" data-en="Create New Invoice">إنشاء فاتورة جديدة</span>
                </button>
            </div>

            <!-- إحصائيات الفواتير -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <i class="fas fa-file-invoice text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="إجمالي الفواتير" data-en="Total Invoices">إجمالي الفواتير</p>
                            <p class="text-2xl font-bold text-gray-800">${farmInvoices.length}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <i class="fas fa-check-circle text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="فواتير مدفوعة" data-en="Paid Invoices">فواتير مدفوعة</p>
                            <p class="text-2xl font-bold text-gray-800">${this.calculatePaidInvoices(farmInvoices)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <i class="fas fa-clock text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="فواتير معلقة" data-en="Pending Invoices">فواتير معلقة</p>
                            <p class="text-2xl font-bold text-gray-800">${this.calculatePendingInvoices(farmInvoices)}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                            <i class="fas fa-dollar-sign text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="إجمالي المبيعات" data-en="Total Sales">إجمالي المبيعات</p>
                            <p class="text-2xl font-bold text-gray-800">${this.formatCurrency(this.calculateTotalInvoiceAmount(farmInvoices))}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- جدول الفواتير -->
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800" data-ar="قائمة الفواتير" data-en="Invoice List">قائمة الفواتير</h3>
                    <div class="flex gap-2">
                        <select id="invoiceStatusFilter" class="p-2 border border-gray-300 rounded" onchange="farmSystem.filterInvoices()">
                            <option value="" data-ar="جميع الحالات" data-en="All Status">جميع الحالات</option>
                            <option value="paid" data-ar="مدفوعة" data-en="Paid">مدفوعة</option>
                            <option value="pending" data-ar="معلقة" data-en="Pending">معلقة</option>
                            <option value="cancelled" data-ar="ملغية" data-en="Cancelled">ملغية</option>
                        </select>
                        <input type="text" id="invoiceSearchInput" placeholder="البحث برقم الفاتورة أو العميل" class="p-2 border border-gray-300 rounded" onkeyup="farmSystem.filterInvoices()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="table-header text-white">
                            <tr>
                                <th class="p-3 text-right" data-ar="رقم الفاتورة" data-en="Invoice #">رقم الفاتورة</th>
                                <th class="p-3 text-right" data-ar="التاريخ" data-en="Date">التاريخ</th>
                                <th class="p-3 text-right" data-ar="العميل" data-en="Customer">العميل</th>
                                <th class="p-3 text-right" data-ar="المبلغ" data-en="Amount">المبلغ</th>
                                <th class="p-3 text-right" data-ar="الحالة" data-en="Status">الحالة</th>
                                <th class="p-3 text-right" data-ar="الإجراءات" data-en="Actions">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="invoicesTable">
                            ${this.generateInvoicesTableRows(farmInvoices)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.applyLanguage();
    }

    // حساب الفواتير المدفوعة
    calculatePaidInvoices(invoices) {
        return invoices.filter(invoice => invoice.status === 'paid').length;
    }

    // حساب الفواتير المعلقة
    calculatePendingInvoices(invoices) {
        return invoices.filter(invoice => invoice.status === 'pending').length;
    }

    // حساب إجمالي مبلغ الفواتير
    calculateTotalInvoiceAmount(invoices) {
        return invoices.reduce((total, invoice) => total + (invoice.total || 0), 0);
    }

    // توليد صفوف جدول الفواتير
    generateInvoicesTableRows(invoices) {
        if (invoices.length === 0) {
            return '<tr><td class="p-3 border-b text-center" colspan="6">لا توجد فواتير مسجلة</td></tr>';
        }

        return invoices.map(invoice => {
            const statusColors = {
                paid: 'bg-green-100 text-green-800',
                pending: 'bg-yellow-100 text-yellow-800',
                cancelled: 'bg-red-100 text-red-800'
            };

            const statusNames = {
                paid: 'مدفوعة',
                pending: 'معلقة',
                cancelled: 'ملغية'
            };

            return `
                <tr>
                    <td class="p-3 border-b font-semibold">#${invoice.invoiceNumber}</td>
                    <td class="p-3 border-b">${this.formatDate(invoice.date)}</td>
                    <td class="p-3 border-b">${invoice.customerName}</td>
                    <td class="p-3 border-b font-semibold">${this.formatCurrency(invoice.total)}</td>
                    <td class="p-3 border-b">
                        <span class="px-2 py-1 rounded-full text-xs ${statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}">
                            ${statusNames[invoice.status] || invoice.status}
                        </span>
                    </td>
                    <td class="p-3 border-b">
                        <button onclick="viewInvoiceDetails('${invoice.id}')" class="text-blue-600 hover:text-blue-800 ml-2">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="printInvoice('${invoice.id}')" class="text-green-600 hover:text-green-800 ml-2">
                            <i class="fas fa-print"></i>
                        </button>
                        <button onclick="editInvoice('${invoice.id}')" class="text-yellow-600 hover:text-yellow-800 ml-2">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteInvoice('${invoice.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // تصفية الفواتير
    filterInvoices() {
        const statusFilter = document.getElementById('invoiceStatusFilter').value;
        const searchTerm = document.getElementById('invoiceSearchInput').value.toLowerCase();
        const farmInvoices = this.invoices[this.currentFarm] || [];

        let filteredInvoices = farmInvoices;

        if (statusFilter) {
            filteredInvoices = filteredInvoices.filter(invoice => invoice.status === statusFilter);
        }

        if (searchTerm) {
            filteredInvoices = filteredInvoices.filter(invoice =>
                invoice.invoiceNumber.toString().includes(searchTerm) ||
                invoice.customerName.toLowerCase().includes(searchTerm)
            );
        }

        const tbody = document.getElementById('invoicesTable');
        tbody.innerHTML = this.generateInvoicesTableRows(filteredInvoices);
    }

    // تحميل قسم التقارير
    loadReportsSection() {
        const section = document.getElementById('reports');

        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-4" data-ar="التقارير والتحليلات" data-en="Reports & Analytics">التقارير والتحليلات</h2>
                <p class="text-gray-600 mb-6" data-ar="تقارير شاملة لتحليل أداء المزرعة" data-en="Comprehensive reports for farm performance analysis">تقارير شاملة لتحليل أداء المزرعة</p>
            </div>

            <!-- تصفية التقارير -->
            <div class="card bg-white p-6 mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4" data-ar="تصفية التقارير" data-en="Report Filters">تصفية التقارير</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="من تاريخ" data-en="From Date">من تاريخ</label>
                        <input type="date" id="reportFromDate" class="w-full p-2 border border-gray-300 rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="إلى تاريخ" data-en="To Date">إلى تاريخ</label>
                        <input type="date" id="reportToDate" class="w-full p-2 border border-gray-300 rounded">
                    </div>
                    <div class="flex items-end">
                        <button onclick="farmSystem.applyReportFilters()" class="btn-primary text-white px-4 py-2 rounded hover:opacity-90 transition">
                            <i class="fas fa-filter ml-2"></i>
                            <span data-ar="تطبيق التصفية" data-en="Apply Filter">تطبيق التصفية</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- قائمة التقارير -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <!-- تقرير الأرباح والخسائر -->
                <div class="card bg-white p-6 cursor-pointer hover:shadow-lg transition-shadow" onclick="farmSystem.showProfitLossReport()">
                    <div class="flex items-center mb-4">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <i class="fas fa-chart-line text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <h3 class="text-lg font-bold text-gray-800" data-ar="الأرباح والخسائر" data-en="Profit & Loss">الأرباح والخسائر</h3>
                            <p class="text-sm text-gray-600" data-ar="تحليل مالي شامل" data-en="Comprehensive financial analysis">تحليل مالي شامل</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500" data-ar="اضغط للعرض" data-en="Click to view">اضغط للعرض</span>
                        <i class="fas fa-arrow-left text-gray-400"></i>
                    </div>
                </div>

                <!-- تقرير القطعان والمخزون -->
                <div class="card bg-white p-6 cursor-pointer hover:shadow-lg transition-shadow" onclick="farmSystem.showInventoryReport()">
                    <div class="flex items-center mb-4">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <i class="fas fa-dove text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <h3 class="text-lg font-bold text-gray-800" data-ar="القطعان والمخزون" data-en="Flocks & Inventory">القطعان والمخزون</h3>
                            <p class="text-sm text-gray-600" data-ar="تقرير حركة المخزون" data-en="Inventory movement report">تقرير حركة المخزون</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500" data-ar="اضغط للعرض" data-en="Click to view">اضغط للعرض</span>
                        <i class="fas fa-arrow-left text-gray-400"></i>
                    </div>
                </div>

                <!-- تقرير العملاء والمبيعات -->
                <div class="card bg-white p-6 cursor-pointer hover:shadow-lg transition-shadow" onclick="farmSystem.showCustomerSalesReport()">
                    <div class="flex items-center mb-4">
                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                            <i class="fas fa-users text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <h3 class="text-lg font-bold text-gray-800" data-ar="العملاء والمبيعات" data-en="Customers & Sales">العملاء والمبيعات</h3>
                            <p class="text-sm text-gray-600" data-ar="تحليل أداء المبيعات" data-en="Sales performance analysis">تحليل أداء المبيعات</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500" data-ar="اضغط للعرض" data-en="Click to view">اضغط للعرض</span>
                        <i class="fas fa-arrow-left text-gray-400"></i>
                    </div>
                </div>

                <!-- تقرير المصروفات التفصيلي -->
                <div class="card bg-white p-6 cursor-pointer hover:shadow-lg transition-shadow" onclick="farmSystem.showDetailedExpenseReport()">
                    <div class="flex items-center mb-4">
                        <div class="p-3 rounded-full bg-red-100 text-red-600">
                            <i class="fas fa-credit-card text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <h3 class="text-lg font-bold text-gray-800" data-ar="المصروفات التفصيلي" data-en="Detailed Expenses">المصروفات التفصيلي</h3>
                            <p class="text-sm text-gray-600" data-ar="تحليل المصروفات بالتفصيل" data-en="Detailed expense analysis">تحليل المصروفات بالتفصيل</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500" data-ar="اضغط للعرض" data-en="Click to view">اضغط للعرض</span>
                        <i class="fas fa-arrow-left text-gray-400"></i>
                    </div>
                </div>

                <!-- تقرير مقارنة الفترات -->
                <div class="card bg-white p-6 cursor-pointer hover:shadow-lg transition-shadow" onclick="farmSystem.showPeriodComparisonReport()">
                    <div class="flex items-center mb-4">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <i class="fas fa-balance-scale text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <h3 class="text-lg font-bold text-gray-800" data-ar="مقارنة الفترات" data-en="Period Comparison">مقارنة الفترات</h3>
                            <p class="text-sm text-gray-600" data-ar="مقارنة الأداء بين فترتين" data-en="Performance comparison between periods">مقارنة الأداء بين فترتين</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500" data-ar="اضغط للعرض" data-en="Click to view">اضغط للعرض</span>
                        <i class="fas fa-arrow-left text-gray-400"></i>
                    </div>
                </div>

                <!-- تصدير البيانات -->
                <div class="card bg-white p-6 cursor-pointer hover:shadow-lg transition-shadow" onclick="farmSystem.showExportOptions()">
                    <div class="flex items-center mb-4">
                        <div class="p-3 rounded-full bg-indigo-100 text-indigo-600">
                            <i class="fas fa-download text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <h3 class="text-lg font-bold text-gray-800" data-ar="تصدير البيانات" data-en="Export Data">تصدير البيانات</h3>
                            <p class="text-sm text-gray-600" data-ar="تصدير كـ PDF أو Excel" data-en="Export as PDF or Excel">تصدير كـ PDF أو Excel</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500" data-ar="اضغط للعرض" data-en="Click to view">اضغط للعرض</span>
                        <i class="fas fa-arrow-left text-gray-400"></i>
                    </div>
                </div>
            </div>

            <!-- منطقة عرض التقارير -->
            <div id="reportDisplayArea" class="hidden">
                <!-- سيتم تحميل التقارير هنا ديناميكياً -->
            </div>
        `;

        // تعيين التواريخ الافتراضية
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        document.getElementById('reportFromDate').value = firstDayOfMonth.toISOString().split('T')[0];
        document.getElementById('reportToDate').value = today.toISOString().split('T')[0];

        this.applyLanguage();
    }

    // تطبيق تصفية التقارير
    applyReportFilters() {
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;

        if (!fromDate || !toDate) {
            this.showNotification('يرجى تحديد نطاق التاريخ', 'warning');
            return;
        }

        if (new Date(fromDate) > new Date(toDate)) {
            this.showNotification('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 'error');
            return;
        }

        this.reportDateRange = { from: fromDate, to: toDate };
        this.showNotification('تم تطبيق التصفية بنجاح');
    }

    // تقرير الأرباح والخسائر
    showProfitLossReport() {
        const farmData = this.getFarmData(this.currentFarm);
        const filteredData = this.filterDataByDateRange(farmData);

        const totalRevenue = this.calculateTotalRevenue(filteredData);
        const totalExpenses = this.calculateTotalExpenses(filteredData);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

        const reportArea = document.getElementById('reportDisplayArea');
        reportArea.classList.remove('hidden');

        reportArea.innerHTML = `
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800" data-ar="تقرير الأرباح والخسائر" data-en="Profit & Loss Report">تقرير الأرباح والخسائر</h3>
                    <div class="flex gap-2">
                        <button onclick="farmSystem.exportReportAsPDF('profit-loss')" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                            <i class="fas fa-file-pdf mr-2"></i>
                            <span data-ar="تصدير PDF" data-en="Export PDF">تصدير PDF</span>
                        </button>
                        <button onclick="farmSystem.exportReportAsExcel('profit-loss')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                            <i class="fas fa-file-excel mr-2"></i>
                            <span data-ar="تصدير Excel" data-en="Export Excel">تصدير Excel</span>
                        </button>
                        <button onclick="farmSystem.hideReport()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                            <i class="fas fa-times mr-2"></i>
                            <span data-ar="إغلاق" data-en="Close">إغلاق</span>
                        </button>
                    </div>
                </div>

                <!-- ملخص مالي -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 class="text-lg font-semibold text-green-800 mb-2" data-ar="إجمالي الإيرادات" data-en="Total Revenue">إجمالي الإيرادات</h4>
                        <p class="text-2xl font-bold text-green-600">${this.formatCurrency(totalRevenue)}</p>
                    </div>

                    <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 class="text-lg font-semibold text-red-800 mb-2" data-ar="إجمالي المصروفات" data-en="Total Expenses">إجمالي المصروفات</h4>
                        <p class="text-2xl font-bold text-red-600">${this.formatCurrency(totalExpenses)}</p>
                    </div>

                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 class="text-lg font-semibold text-blue-800 mb-2" data-ar="صافي الربح" data-en="Net Profit">صافي الربح</h4>
                        <p class="text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}">${this.formatCurrency(netProfit)}</p>
                        <p class="text-sm text-blue-500">هامش الربح: ${profitMargin}%</p>
                    </div>
                </div>

                <!-- الرسوم البيانية -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="text-lg font-bold text-gray-800 mb-4" data-ar="تطور الأرباح عبر الزمن" data-en="Profit Trend Over Time">تطور الأرباح عبر الزمن</h4>
                        <canvas id="profitTrendChart" height="200"></canvas>
                    </div>

                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="text-lg font-bold text-gray-800 mb-4" data-ar="توزيع الإيرادات والمصروفات" data-en="Revenue vs Expenses">توزيع الإيرادات والمصروفات</h4>
                        <canvas id="revenueExpenseChart" height="200"></canvas>
                    </div>
                </div>

                <!-- جداول تفصيلية -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-lg font-bold text-gray-800 mb-4" data-ar="تفاصيل الإيرادات" data-en="Revenue Details">تفاصيل الإيرادات</h4>
                        ${this.generateRevenueDetailsTable(filteredData.revenues)}
                    </div>

                    <div>
                        <h4 class="text-lg font-bold text-gray-800 mb-4" data-ar="تفاصيل المصروفات" data-en="Expense Details">تفاصيل المصروفات</h4>
                        ${this.generateExpenseDetailsTable(filteredData.expenses)}
                    </div>
                </div>
            </div>
        `;

        // رسم الرسوم البيانية
        setTimeout(() => {
            this.drawProfitTrendChart(filteredData);
            this.drawRevenueExpenseChart(totalRevenue, totalExpenses);
            this.applyLanguage();
        }, 100);
    }

    // تصفية البيانات حسب النطاق الزمني
    filterDataByDateRange(farmData) {
        if (!this.reportDateRange) {
            return farmData;
        }

        const fromDate = new Date(this.reportDateRange.from);
        const toDate = new Date(this.reportDateRange.to);
        toDate.setHours(23, 59, 59, 999); // نهاية اليوم

        return {
            flocks: farmData.flocks,
            expenses: farmData.expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= fromDate && expenseDate <= toDate;
            }),
            revenues: farmData.revenues.filter(revenue => {
                const revenueDate = new Date(revenue.date);
                return revenueDate >= fromDate && revenueDate <= toDate;
            }),
            invoices: farmData.invoices.filter(invoice => {
                const invoiceDate = new Date(invoice.date);
                return invoiceDate >= fromDate && invoiceDate <= toDate;
            }),
            customers: farmData.customers
        };
    }

    // إخفاء التقرير
    hideReport() {
        document.getElementById('reportDisplayArea').classList.add('hidden');
    }

    // رسم مخطط تطور الأرباح
    drawProfitTrendChart(farmData) {
        const ctx = document.getElementById('profitTrendChart');
        if (!ctx) return;

        // تجميع البيانات حسب الشهر
        const monthlyData = this.groupDataByMonth(farmData);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(monthlyData),
                datasets: [{
                    label: 'صافي الربح',
                    data: Object.values(monthlyData).map(data => data.revenue - data.expense),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return farmSystem.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // رسم مخطط الإيرادات مقابل المصروفات
    drawRevenueExpenseChart(totalRevenue, totalExpenses) {
        const ctx = document.getElementById('revenueExpenseChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['الإيرادات', 'المصروفات'],
                datasets: [{
                    data: [totalRevenue, totalExpenses],
                    backgroundColor: ['#4CAF50', '#F44336'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${farmSystem.formatCurrency(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // تجميع البيانات حسب الشهر
    groupDataByMonth(farmData) {
        const monthlyData = {};

        // معالجة الإيرادات
        farmData.revenues.forEach(revenue => {
            const month = new Date(revenue.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short' });
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, expense: 0 };
            }
            monthlyData[month].revenue += revenue.amount || 0;
        });

        // معالجة المصروفات
        farmData.expenses.forEach(expense => {
            const month = new Date(expense.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short' });
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, expense: 0 };
            }
            monthlyData[month].expense += expense.amount || 0;
        });

        return monthlyData;
    }

    // توليد جدول تفاصيل الإيرادات
    generateRevenueDetailsTable(revenues) {
        const revenueTypes = this.groupRevenuesByType(revenues);
        const total = Object.values(revenueTypes).reduce((sum, amount) => sum + amount, 0);

        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-green-50">
                    <tr>
                        <th class="p-3 border text-right">النوع</th>
                        <th class="p-3 border text-right">المبلغ</th>
                        <th class="p-3 border text-right">النسبة</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.entries(revenueTypes).forEach(([type, amount]) => {
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            const typeNames = {
                eggs: 'بيض',
                manure: 'سبلة',
                chickens: 'فراخ',
                other: 'أخرى'
            };

            tableHtml += `
                <tr>
                    <td class="p-3 border">${typeNames[type] || type}</td>
                    <td class="p-3 border font-semibold text-green-600">${this.formatCurrency(amount)}</td>
                    <td class="p-3 border">${percentage}%</td>
                </tr>
            `;
        });

        tableHtml += `
                <tr class="bg-green-100 font-bold">
                    <td class="p-3 border">الإجمالي</td>
                    <td class="p-3 border text-green-600">${this.formatCurrency(total)}</td>
                    <td class="p-3 border">100%</td>
                </tr>
            </tbody>
        </table>`;

        return tableHtml;
    }

    // توليد جدول تفاصيل المصروفات
    generateExpenseDetailsTable(expenses) {
        const expenseTypes = this.groupExpensesByType(expenses);
        const total = Object.values(expenseTypes).reduce((sum, amount) => sum + amount, 0);

        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-red-50">
                    <tr>
                        <th class="p-3 border text-right">النوع</th>
                        <th class="p-3 border text-right">المبلغ</th>
                        <th class="p-3 border text-right">النسبة</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.entries(expenseTypes).forEach(([type, amount]) => {
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            const typeNames = {
                feed: 'أعلاف',
                medicine: 'أدوية',
                utilities: 'مرافق',
                labor: 'عمالة',
                other: 'أخرى'
            };

            tableHtml += `
                <tr>
                    <td class="p-3 border">${typeNames[type] || type}</td>
                    <td class="p-3 border font-semibold text-red-600">${this.formatCurrency(amount)}</td>
                    <td class="p-3 border">${percentage}%</td>
                </tr>
            `;
        });

        tableHtml += `
                <tr class="bg-red-100 font-bold">
                    <td class="p-3 border">الإجمالي</td>
                    <td class="p-3 border text-red-600">${this.formatCurrency(total)}</td>
                    <td class="p-3 border">100%</td>
                </tr>
            </tbody>
        </table>`;

        return tableHtml;
    }

    // تحميل قسم الشراكات
    loadPartnershipsSection() {
        const section = document.getElementById('partnerships');
        const farmPartners = this.partnerships[this.currentFarm] || [];

        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-4" data-ar="إدارة الشراكات" data-en="Partnership Management">إدارة الشراكات</h2>
                <button onclick="showAddPartnerModal()" class="btn-primary text-white px-4 py-2 rounded hover:opacity-90 transition">
                    <i class="fas fa-plus ml-2"></i>
                    <span data-ar="إضافة شريك جديد" data-en="Add New Partner">إضافة شريك جديد</span>
                </button>
            </div>

            <!-- إحصائيات الشراكة -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <i class="fas fa-handshake text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="عدد الشركاء" data-en="Total Partners">عدد الشركاء</p>
                            <p class="text-2xl font-bold text-gray-800">${farmPartners.length}</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <i class="fas fa-percentage text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="إجمالي النسب" data-en="Total Percentage">إجمالي النسب</p>
                            <p class="text-2xl font-bold text-gray-800">${this.calculateTotalPartnershipPercentage(farmPartners)}%</p>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:bg-yellow-50" onclick="showPartnershipBalancesModal()" id="totalBalancesBtn">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                                <i class="fas fa-coins text-xl"></i>
                            </div>
                            <div class="mr-4">
                                <p class="text-sm text-gray-600" data-ar="إجمالي الأرصدة" data-en="Total Balances">إجمالي الأرصدة</p>
                                <p class="text-2xl font-bold text-gray-800">${this.formatCurrency(this.calculateTotalPartnerBalances(farmPartners))}</p>
                                <p class="text-xs text-yellow-600 mt-1">
                                    <i class="fas fa-eye me-1"></i>
                                    اضغط لعرض التفاصيل
                                </p>
                            </div>
                        </div>
                        <div class="text-yellow-600">
                            <i class="fas fa-chevron-left text-lg"></i>
                        </div>
                    </div>
                </div>

                <div class="card bg-white p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                            <i class="fas fa-chart-pie text-xl"></i>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm text-gray-600" data-ar="الشريك الأكبر" data-en="Major Partner">الشريك الأكبر</p>
                            <p class="text-lg font-bold text-gray-800">${this.getMajorPartner(farmPartners)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- رسم بياني لتوزيع الحصص -->
            <div class="card bg-white p-6 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4" data-ar="توزيع حصص الشراكة" data-en="Partnership Share Distribution">توزيع حصص الشراكة</h3>
                <div class="relative h-64">
                    <canvas id="partnershipChart"></canvas>
                </div>
            </div>

            <!-- جدول الشركاء -->
            <div class="card bg-white p-6 mb-8">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800" data-ar="قائمة الشركاء" data-en="Partners List">قائمة الشركاء</h3>
                    <button onclick="farmSystem.calculatePartnerShares()" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                        <i class="fas fa-calculator ml-2"></i>
                        <span data-ar="حساب الحصص" data-en="Calculate Shares">حساب الحصص</span>
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="table-header text-white">
                            <tr>
                                <th class="p-3 text-right" data-ar="اسم الشريك" data-en="Partner Name">اسم الشريك</th>
                                <th class="p-3 text-right" data-ar="النسبة %" data-en="Percentage %">النسبة %</th>
                                <th class="p-3 text-right" data-ar="الرصيد الافتتاحي" data-en="Opening Balance">الرصيد الافتتاحي</th>
                                <th class="p-3 text-right" data-ar="الرصيد الحالي" data-en="Current Balance">الرصيد الحالي</th>
                                <th class="p-3 text-right" data-ar="آخر تحديث" data-en="Last Update">آخر تحديث</th>
                                <th class="p-3 text-right" data-ar="الإجراءات" data-en="Actions">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="partnersTable">
                            ${this.generatePartnersTableRows(farmPartners)}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- تقارير الشركاء -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${farmPartners.map(partner => `
                    <div class="card bg-white p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-lg font-bold text-gray-800">${partner.name}</h4>
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">${partner.percentage}%</span>
                        </div>
                        <div class="space-y-2 mb-4">
                            <p class="text-sm text-gray-600">الرصيد: <span class="font-semibold">${this.formatCurrency(partner.balance || 0)}</span></p>
                            <p class="text-sm text-gray-600">حصة الأرباح: <span class="font-semibold">${this.formatCurrency(this.calculatePartnerProfitShare(partner))}</span></p>
                        </div>
                        <button onclick="farmSystem.showPartnerReport('${partner.id}')" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition">
                            <i class="fas fa-chart-bar ml-2"></i>
                            <span data-ar="عرض التقرير" data-en="View Report">عرض التقرير</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // رسم مخطط توزيع الحصص
        setTimeout(() => {
            this.drawPartnershipChart(farmPartners);
            this.applyLanguage();
        }, 100);
    }

    // حساب إجمالي نسب الشراكة
    calculateTotalPartnershipPercentage(partners) {
        return partners.reduce((total, partner) => total + (partner.percentage || 0), 0);
    }

    // حساب إجمالي أرصدة الشركاء
    calculateTotalPartnerBalances(partners) {
        return partners.reduce((total, partner) => total + (partner.balance || 0), 0);
    }

    // الحصول على الشريك الأكبر
    getMajorPartner(partners) {
        if (partners.length === 0) return 'لا يوجد';
        const majorPartner = partners.reduce((max, partner) =>
            (partner.percentage || 0) > (max.percentage || 0) ? partner : max
        );
        return majorPartner.name;
    }

    // رسم مخطط توزيع الشراكة
    drawPartnershipChart(partners) {
        const ctx = document.getElementById('partnershipChart');
        if (!ctx || partners.length === 0) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: partners.map(partner => partner.name),
                datasets: [{
                    data: partners.map(partner => partner.percentage || 0),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    // توليد صفوف جدول الشركاء
    generatePartnersTableRows(partners) {
        if (partners.length === 0) {
            return '<tr><td class="p-3 border-b text-center" colspan="7">لا يوجد شركاء مسجلون</td></tr>';
        }

        return partners.map(partner => {
            const openingBalanceClass = (partner.openingBalance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600';
            const balanceClass = (partner.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600';
            const lastUpdate = partner.lastUpdate ? this.formatDate(partner.lastUpdate) : 'لا يوجد';

            return `
                <tr>
                    <td class="p-3 border-b font-semibold">${partner.name}</td>
                    <td class="p-3 border-b font-bold text-blue-600">${partner.percentage || 0}%</td>
                    <td class="p-3 border-b ${openingBalanceClass} font-semibold">${this.formatCurrency(partner.openingBalance || 0)}</td>
                    <td class="p-3 border-b ${balanceClass} font-semibold">${this.formatCurrency(partner.balance || 0)}</td>
                    <td class="p-3 border-b">${lastUpdate}</td>
                    <td class="p-3 border-b">
                        <button onclick="farmSystem.showPartnerReport('${partner.id}')" class="text-blue-600 hover:text-blue-800 ml-2">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button onclick="editPartner('${partner.id}')" class="text-green-600 hover:text-green-800 ml-2">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deletePartner('${partner.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // حساب حصة الشريك من الأرباح
    calculatePartnerProfitShare(partner) {
        const farmData = this.getFarmData(this.currentFarm);
        const totalRevenue = this.calculateTotalRevenue(farmData);
        const totalExpenses = this.calculateTotalExpenses(farmData);
        const netProfit = totalRevenue - totalExpenses;

        return (netProfit * (partner.percentage || 0)) / 100;
    }

    // حساب حصص جميع الشركاء
    calculatePartnerShares() {
        const farmPartners = this.partnerships[this.currentFarm] || [];
        const farmData = this.getFarmData(this.currentFarm);
        const totalRevenue = this.calculateTotalRevenue(farmData);
        const totalExpenses = this.calculateTotalExpenses(farmData);
        const netProfit = totalRevenue - totalExpenses;

        farmPartners.forEach(partner => {
            const profitShare = (netProfit * (partner.percentage || 0)) / 100;
            const expenseShare = (totalExpenses * (partner.percentage || 0)) / 100;

            // تحديث رصيد الشريك
            partner.balance = (partner.balance || 0) + profitShare;
            partner.lastUpdate = new Date().toISOString();

            // إضافة معاملة جديدة
            if (!partner.transactions) {
                partner.transactions = [];
            }

            partner.transactions.push({
                id: 'transaction_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                type: 'profit_share',
                description: 'حصة من الأرباح',
                amount: profitShare,
                balance: partner.balance
            });
        });

        this.saveAllData();
        this.loadPartnershipsSection();
        this.showNotification('تم حساب حصص الشركاء بنجاح');
    }

    // تحميل قسم الإعدادات
    loadSettingsSection() {
        const section = document.getElementById('settings');
        const settings = this.loadData('farmSettings') || this.getDefaultSettings();

        section.innerHTML = `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800 mb-4" data-ar="إعدادات النظام" data-en="System Settings">إعدادات النظام</h2>
                <p class="text-gray-600 mb-6" data-ar="تخصيص إعدادات النظام والمزرعة" data-en="Customize system and farm settings">تخصيص إعدادات النظام والمزرعة</p>
            </div>

            <!-- الإعدادات العامة -->
            <div class="card bg-white p-6 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4" data-ar="الإعدادات العامة" data-en="General Settings">الإعدادات العامة</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="العملة الافتراضية" data-en="Default Currency">العملة الافتراضية</label>
                        <select id="defaultCurrency" class="w-full p-2 border border-gray-300 rounded">
                            <option value="EGP" ${settings.currency === 'EGP' ? 'selected' : ''}>جنيه مصري (ج.م)</option>
                            <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>دولار أمريكي ($)</option>
                            <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>يورو (€)</option>
                            <option value="SAR" ${settings.currency === 'SAR' ? 'selected' : ''}>ريال سعودي (ر.س)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="تنسيق التاريخ" data-en="Date Format">تنسيق التاريخ</label>
                        <select id="dateFormat" class="w-full p-2 border border-gray-300 rounded">
                            <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD" ${settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="اللغة الافتراضية" data-en="Default Language">اللغة الافتراضية</label>
                        <select id="defaultLanguage" class="w-full p-2 border border-gray-300 rounded">
                            <option value="ar" ${settings.language === 'ar' ? 'selected' : ''}>العربية</option>
                            <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="المنطقة الزمنية" data-en="Timezone">المنطقة الزمنية</label>
                        <select id="timezone" class="w-full p-2 border border-gray-300 rounded">
                            <option value="Africa/Cairo" ${settings.timezone === 'Africa/Cairo' ? 'selected' : ''}>القاهرة (GMT+2)</option>
                            <option value="Asia/Riyadh" ${settings.timezone === 'Asia/Riyadh' ? 'selected' : ''}>الرياض (GMT+3)</option>
                            <option value="UTC" ${settings.timezone === 'UTC' ? 'selected' : ''}>UTC (GMT+0)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- إعدادات المزرعة -->
            <div class="card bg-white p-6 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4" data-ar="إعدادات المزرعة" data-en="Farm Settings">إعدادات المزرعة</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="اسم المزرعة" data-en="Farm Name">اسم المزرعة</label>
                        <input type="text" id="farmName" value="${settings.farmName || ''}" class="w-full p-2 border border-gray-300 rounded">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="اسم المالك" data-en="Owner Name">اسم المالك</label>
                        <input type="text" id="ownerName" value="${settings.ownerName || ''}" class="w-full p-2 border border-gray-300 rounded">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="رقم الهاتف" data-en="Phone Number">رقم الهاتف</label>
                        <input type="tel" id="farmPhone" value="${settings.farmPhone || ''}" class="w-full p-2 border border-gray-300 rounded">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني</label>
                        <input type="email" id="farmEmail" value="${settings.farmEmail || ''}" class="w-full p-2 border border-gray-300 rounded">
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="عنوان المزرعة" data-en="Farm Address">عنوان المزرعة</label>
                        <textarea id="farmAddress" rows="3" class="w-full p-2 border border-gray-300 rounded">${settings.farmAddress || ''}</textarea>
                    </div>
                </div>
            </div>

            <!-- إعدادات الإشعارات -->
            <div class="card bg-white p-6 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4" data-ar="إعدادات الإشعارات" data-en="Notification Settings">إعدادات الإشعارات</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="مدة عرض الإشعارات (ثانية)" data-en="Notification Duration (seconds)">مدة عرض الإشعارات (ثانية)</label>
                        <input type="number" id="notificationDuration" value="${settings.notificationDuration || 3}" min="1" max="10" class="w-full p-2 border border-gray-300 rounded">
                    </div>

                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" id="enableSounds" ${settings.enableSounds ? 'checked' : ''} class="mr-2">
                            <span data-ar="تفعيل أصوات التنبيه" data-en="Enable Sound Alerts">تفعيل أصوات التنبيه</span>
                        </label>
                    </div>

                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" id="enableSuccessNotifications" ${settings.enableSuccessNotifications !== false ? 'checked' : ''} class="mr-2">
                            <span data-ar="إشعارات النجاح" data-en="Success Notifications">إشعارات النجاح</span>
                        </label>
                    </div>

                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" id="enableErrorNotifications" ${settings.enableErrorNotifications !== false ? 'checked' : ''} class="mr-2">
                            <span data-ar="إشعارات الأخطاء" data-en="Error Notifications">إشعارات الأخطاء</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- النسخ الاحتياطي وإدارة البيانات -->
            <div class="card bg-white p-6 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4" data-ar="النسخ الاحتياطي وإدارة البيانات" data-en="Backup & Data Management">النسخ الاحتياطي وإدارة البيانات</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button onclick="farmSystem.exportAllData()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
                        <i class="fas fa-download ml-2"></i>
                        <span data-ar="تصدير البيانات" data-en="Export Data">تصدير البيانات</span>
                    </button>

                    <button onclick="farmSystem.showImportModal()" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                        <i class="fas fa-upload ml-2"></i>
                        <span data-ar="استيراد البيانات" data-en="Import Data">استيراد البيانات</span>
                    </button>

                    <button onclick="farmSystem.showClearDataModal()" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition">
                        <i class="fas fa-broom ml-2"></i>
                        <span data-ar="مسح بيانات فترة" data-en="Clear Period Data">مسح بيانات فترة</span>
                    </button>

                    <button onclick="farmSystem.showResetSystemModal()" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                        <i class="fas fa-exclamation-triangle ml-2"></i>
                        <span data-ar="إعادة تعيين النظام" data-en="Reset System">إعادة تعيين النظام</span>
                    </button>
                </div>
            </div>

            <!-- أزرار الحفظ -->
            <div class="flex justify-end space-x-4">
                <button onclick="farmSystem.resetSettings()" class="px-6 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition">
                    <span data-ar="إعادة تعيين" data-en="Reset">إعادة تعيين</span>
                </button>
                <button onclick="farmSystem.saveSettings()" class="btn-primary text-white px-6 py-2 rounded hover:opacity-90 transition">
                    <span data-ar="حفظ الإعدادات" data-en="Save Settings">حفظ الإعدادات</span>
                </button>
            </div>
        `;

        this.applyLanguage();
    }

    // الحصول على الإعدادات الافتراضية
    getDefaultSettings() {
        return {
            currency: 'EGP',
            dateFormat: 'DD/MM/YYYY',
            language: 'ar',
            timezone: 'Africa/Cairo',
            farmName: '',
            ownerName: '',
            farmPhone: '',
            farmEmail: '',
            farmAddress: '',
            notificationDuration: 3,
            enableSounds: false,
            enableSuccessNotifications: true,
            enableErrorNotifications: true
        };
    }

    // حفظ الإعدادات
    saveSettings() {
        try {
            const settings = {
                currency: document.getElementById('defaultCurrency').value,
                dateFormat: document.getElementById('dateFormat').value,
                language: document.getElementById('defaultLanguage').value,
                timezone: document.getElementById('timezone').value,
                farmName: document.getElementById('farmName').value,
                ownerName: document.getElementById('ownerName').value,
                farmPhone: document.getElementById('farmPhone').value,
                farmEmail: document.getElementById('farmEmail').value,
                farmAddress: document.getElementById('farmAddress').value,
                notificationDuration: parseInt(document.getElementById('notificationDuration').value),
                enableSounds: document.getElementById('enableSounds').checked,
                enableSuccessNotifications: document.getElementById('enableSuccessNotifications').checked,
                enableErrorNotifications: document.getElementById('enableErrorNotifications').checked
            };

            this.saveData('farmSettings', settings);
            this.showNotification('تم حفظ الإعدادات بنجاح');

            // تطبيق اللغة الجديدة إذا تم تغييرها
            if (settings.language !== this.currentLanguage) {
                this.currentLanguage = settings.language;
                this.applyLanguage();
            }
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
            this.showNotification('خطأ في حفظ الإعدادات', 'error');
        }
    }

    // إعادة تعيين الإعدادات
    resetSettings() {
        if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات للقيم الافتراضية؟')) {
            const defaultSettings = this.getDefaultSettings();
            this.saveData('farmSettings', defaultSettings);
            this.loadSettingsSection();
            this.showNotification('تم إعادة تعيين الإعدادات بنجاح');
        }
    }

    // تصدير جميع البيانات
    exportAllData() {
        try {
            const allData = {
                farms: this.farms,
                flocks: this.flocks,
                expenses: this.expenses,
                revenues: this.revenues,
                customers: this.customers,
                invoices: this.invoices,
                partnerships: this.partnerships,
                settings: this.loadData('farmSettings'),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `farm-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            this.showNotification('تم تصدير البيانات بنجاح');
        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            this.showNotification('خطأ في تصدير البيانات', 'error');
        }
    }

    // عرض نافذة استيراد البيانات
    showImportModal() {
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg max-w-md w-full">
                    <h3 class="text-lg font-bold mb-4">استيراد البيانات</h3>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">اختر ملف النسخة الاحتياطية</label>
                        <input type="file" id="importFile" accept=".json" class="w-full p-2 border border-gray-300 rounded">
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                            إلغاء
                        </button>
                        <button onclick="farmSystem.importData()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            استيراد
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // استيراد البيانات
    importData() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('يرجى اختيار ملف للاستيراد', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // التحقق من صحة البيانات
                if (!importedData.farms || !importedData.version) {
                    throw new Error('ملف غير صالح');
                }

                // استيراد البيانات
                this.farms = importedData.farms || {};
                this.flocks = importedData.flocks || {};
                this.expenses = importedData.expenses || {};
                this.revenues = importedData.revenues || {};
                this.customers = importedData.customers || {};
                this.invoices = importedData.invoices || {};
                this.partnerships = importedData.partnerships || {};

                if (importedData.settings) {
                    this.saveData('farmSettings', importedData.settings);
                }

                // حفظ البيانات
                this.saveAllData();

                // إعادة تحميل النظام
                this.loadFarmSelector();
                this.updateDashboard();

                // إغلاق النافذة
                document.querySelector('.fixed.inset-0').remove();

                this.showNotification('تم استيراد البيانات بنجاح');
            } catch (error) {
                console.error('خطأ في استيراد البيانات:', error);
                this.showNotification('خطأ في استيراد البيانات: ملف غير صالح', 'error');
            }
        };

        reader.readAsText(file);
    }

    // إضافة شريك جديد
    addNewPartner() {
        const name = document.getElementById('partnerName').value;
        const percentage = parseFloat(document.getElementById('partnerPercentage').value);
        const phone = document.getElementById('partnerPhone').value;
        const email = document.getElementById('partnerEmail').value;
        const address = document.getElementById('partnerAddress').value;
        const notes = document.getElementById('partnerNotes').value;
        const openingBalance = parseFloat(document.getElementById('partnerOpeningBalance').value) || 0;
        const startDate = document.getElementById('partnerStartDate').value || new Date().toISOString().split('T')[0];

        // التحقق من صحة النسبة
        const currentPartners = this.partnerships[this.currentFarm] || [];
        const totalPercentage = currentPartners.reduce((sum, partner) => sum + (partner.percentage || 0), 0);

        if (totalPercentage + percentage > 100) {
            this.showNotification('إجمالي نسب الشراكة لا يمكن أن يتجاوز 100%', 'error');
            return;
        }

        const partnerId = 'partner_' + Date.now();
        const newPartner = {
            id: partnerId,
            name: name,
            percentage: percentage,
            phone: phone,
            email: email,
            address: address,
            notes: notes,
            openingBalance: openingBalance,
            balance: openingBalance, // الرصيد الحالي يبدأ بالرصيد الافتتاحي
            startDate: startDate,
            createdAt: new Date().toISOString(),
            lastUpdate: null,
            transactions: []
        };

        // إضافة معاملة الرصيد الافتتاحي إذا كان غير صفر
        if (openingBalance !== 0) {
            newPartner.transactions.push({
                id: 'opening_' + Date.now(),
                date: startDate,
                type: 'opening_balance',
                description: 'الرصيد الافتتاحي',
                amount: openingBalance,
                balance: openingBalance
            });
        }

        if (!this.partnerships[this.currentFarm]) {
            this.partnerships[this.currentFarm] = [];
        }

        this.partnerships[this.currentFarm].push(newPartner);
        this.saveAllData();
        this.loadPartnershipsSection();
        closeModal('addPartnerModal');

        this.showNotification('تم إضافة الشريك بنجاح');
    }

    // تعديل الشريك
    editPartner(partnerId) {
        const farmPartners = this.partnerships[this.currentFarm] || [];
        const partner = farmPartners.find(p => p.id === partnerId);

        if (partner) {
            document.getElementById('partnerName').value = partner.name;
            document.getElementById('partnerPercentage').value = partner.percentage || 0;
            document.getElementById('partnerPhone').value = partner.phone || '';
            document.getElementById('partnerEmail').value = partner.email || '';
            document.getElementById('partnerAddress').value = partner.address || '';
            document.getElementById('partnerNotes').value = partner.notes || '';
            document.getElementById('partnerOpeningBalance').value = partner.openingBalance || 0;
            document.getElementById('partnerStartDate').value = partner.startDate || new Date().toISOString().split('T')[0];

            showAddPartnerModal();

            document.getElementById('addPartnerForm').onsubmit = function(e) {
                e.preventDefault();
                farmSystem.updatePartner(partnerId);
            };
        }
    }

    // تحديث الشريك
    updatePartner(partnerId) {
        const farmPartners = this.partnerships[this.currentFarm] || [];
        const partner = farmPartners.find(p => p.id === partnerId);

        if (partner) {
            const newPercentage = parseFloat(document.getElementById('partnerPercentage').value);
            const otherPartnersPercentage = farmPartners
                .filter(p => p.id !== partnerId)
                .reduce((sum, p) => sum + (p.percentage || 0), 0);

            if (otherPartnersPercentage + newPercentage > 100) {
                this.showNotification('إجمالي نسب الشراكة لا يمكن أن يتجاوز 100%', 'error');
                return;
            }

            const newOpeningBalance = parseFloat(document.getElementById('partnerOpeningBalance').value) || 0;
            const oldOpeningBalance = partner.openingBalance || 0;

            // تحديث الرصيد الحالي إذا تغير الرصيد الافتتاحي
            if (newOpeningBalance !== oldOpeningBalance) {
                const difference = newOpeningBalance - oldOpeningBalance;
                partner.balance = (partner.balance || 0) + difference;

                // إضافة معاملة لتعديل الرصيد الافتتاحي
                if (!partner.transactions) {
                    partner.transactions = [];
                }

                partner.transactions.push({
                    id: 'opening_adjustment_' + Date.now(),
                    date: new Date().toISOString(),
                    type: 'opening_balance_adjustment',
                    description: 'تعديل الرصيد الافتتاحي',
                    amount: difference,
                    balance: partner.balance
                });
            }

            partner.name = document.getElementById('partnerName').value;
            partner.percentage = newPercentage;
            partner.phone = document.getElementById('partnerPhone').value;
            partner.email = document.getElementById('partnerEmail').value;
            partner.address = document.getElementById('partnerAddress').value;
            partner.notes = document.getElementById('partnerNotes').value;
            partner.openingBalance = newOpeningBalance;
            partner.startDate = document.getElementById('partnerStartDate').value;
            partner.lastUpdate = new Date().toISOString();

            this.saveAllData();
            this.loadPartnershipsSection();
            closeModal('addPartnerModal');

            this.showNotification('تم تحديث الشريك بنجاح');
        }
    }

    // حذف الشريك
    deletePartner(partnerId) {
        const farmPartners = this.partnerships[this.currentFarm] || [];
        const partnerIndex = farmPartners.findIndex(p => p.id === partnerId);

        if (partnerIndex !== -1) {
            farmPartners.splice(partnerIndex, 1);
            this.saveAllData();
            this.loadPartnershipsSection();

            this.showNotification('تم حذف الشريك بنجاح');
        }
    }

    // عرض تقرير الشريك
    showPartnerReport(partnerId) {
        const farmPartners = this.partnerships[this.currentFarm] || [];
        const partner = farmPartners.find(p => p.id === partnerId);

        if (partner) {
            const farmData = this.getFarmData(this.currentFarm);
            const totalRevenue = this.calculateTotalRevenue(farmData);
            const totalExpenses = this.calculateTotalExpenses(farmData);
            const netProfit = totalRevenue - totalExpenses;
            const partnerProfitShare = (netProfit * partner.percentage) / 100;
            const partnerExpenseShare = (totalExpenses * partner.percentage) / 100;

            const modalHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white p-6 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold">تقرير الشريك: ${partner.name}</h3>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 class="font-bold mb-2">معلومات الشريك:</h4>
                                <p><strong>الاسم:</strong> ${partner.name}</p>
                                <p><strong>نسبة الشراكة:</strong> ${partner.percentage}%</p>
                                <p><strong>الهاتف:</strong> ${partner.phone || '-'}</p>
                                <p><strong>البريد الإلكتروني:</strong> ${partner.email || '-'}</p>
                            </div>

                            <div>
                                <h4 class="font-bold mb-2">الحصص المالية:</h4>
                                <p><strong>حصة من الإيرادات:</strong> <span class="text-green-600 font-semibold">${this.formatCurrency((totalRevenue * partner.percentage) / 100)}</span></p>
                                <p><strong>حصة من المصروفات:</strong> <span class="text-red-600 font-semibold">${this.formatCurrency(partnerExpenseShare)}</span></p>
                                <p><strong>صافي حصة الأرباح:</strong> <span class="${partnerProfitShare >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold">${this.formatCurrency(partnerProfitShare)}</span></p>
                                <p><strong>الرصيد الحالي:</strong> <span class="${(partner.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold">${this.formatCurrency(partner.balance || 0)}</span></p>
                            </div>
                        </div>

                        ${partner.notes ? `<div class="mb-4"><h4 class="font-bold mb-2">ملاحظات:</h4><p class="text-gray-700">${partner.notes}</p></div>` : ''}

                        <div class="mb-4">
                            <h4 class="font-bold mb-2">تاريخ المعاملات:</h4>
                            ${this.generatePartnerTransactionsTable(partner)}
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

    // توليد جدول معاملات الشريك
    generatePartnerTransactionsTable(partner) {
        if (!partner.transactions || partner.transactions.length === 0) {
            return '<p class="text-gray-600">لا توجد معاملات مسجلة</p>';
        }

        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-2 border text-right">التاريخ</th>
                        <th class="p-2 border text-right">النوع</th>
                        <th class="p-2 border text-right">الوصف</th>
                        <th class="p-2 border text-right">المبلغ</th>
                        <th class="p-2 border text-right">الرصيد</th>
                    </tr>
                </thead>
                <tbody>
        `;

        partner.transactions.forEach(transaction => {
            const amountClass = transaction.amount >= 0 ? 'text-green-600' : 'text-red-600';
            tableHtml += `
                <tr>
                    <td class="p-2 border">${this.formatDate(transaction.date)}</td>
                    <td class="p-2 border">${transaction.type}</td>
                    <td class="p-2 border">${transaction.description}</td>
                    <td class="p-2 border ${amountClass}">${this.formatCurrency(transaction.amount)}</td>
                    <td class="p-2 border">${this.formatCurrency(transaction.balance)}</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // تقرير القطعان والمخزون
    showInventoryReport() {
        const farmData = this.getFarmData(this.currentFarm);
        const filteredData = this.filterDataByDateRange(farmData);

        const reportArea = document.getElementById('reportDisplayArea');
        reportArea.classList.remove('hidden');

        reportArea.innerHTML = `
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800" data-ar="تقرير القطعان والمخزون" data-en="Flocks & Inventory Report">تقرير القطعان والمخزون</h3>
                    <div class="flex gap-2">
                        <button onclick="farmSystem.exportReportAsPDF('inventory')" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                            <i class="fas fa-file-pdf mr-2"></i>
                            <span data-ar="تصدير PDF" data-en="Export PDF">تصدير PDF</span>
                        </button>
                        <button onclick="farmSystem.exportReportAsExcel('inventory')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                            <i class="fas fa-file-excel mr-2"></i>
                            <span data-ar="تصدير Excel" data-en="Export Excel">تصدير Excel</span>
                        </button>
                        <button onclick="farmSystem.hideReport()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                            <i class="fas fa-times mr-2"></i>
                            <span data-ar="إغلاق" data-en="Close">إغلاق</span>
                        </button>
                    </div>
                </div>

                <!-- إحصائيات القطعان -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 class="text-lg font-semibold text-blue-800 mb-2" data-ar="إجمالي القطعان" data-en="Total Flocks">إجمالي القطعان</h4>
                        <p class="text-2xl font-bold text-blue-600">${filteredData.flocks.length}</p>
                    </div>

                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 class="text-lg font-semibold text-green-800 mb-2" data-ar="الطيور الحية" data-en="Live Birds">الطيور الحية</h4>
                        <p class="text-2xl font-bold text-green-600">${this.calculateLiveBirds(filteredData)}</p>
                    </div>

                    <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 class="text-lg font-semibold text-red-800 mb-2" data-ar="إجمالي النافق" data-en="Total Mortality">إجمالي النافق</h4>
                        <p class="text-2xl font-bold text-red-600">${this.calculateTotalMortality(filteredData.flocks)}</p>
                    </div>

                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 class="text-lg font-semibold text-yellow-800 mb-2" data-ar="معدل البقاء" data-en="Survival Rate">معدل البقاء</h4>
                        <p class="text-2xl font-bold text-yellow-600">${this.calculateSurvivalRate(filteredData.flocks)}%</p>
                    </div>
                </div>

                <!-- جدول تفاصيل القطعان -->
                <div class="bg-white rounded-lg border mb-6">
                    <div class="bg-blue-50 p-4 border-b">
                        <h4 class="text-lg font-bold text-blue-800" data-ar="تفاصيل القطعان" data-en="Flock Details">تفاصيل القطعان</h4>
                    </div>
                    <div class="p-4">
                        ${this.generateFlockDetailsTable(filteredData.flocks)}
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.applyLanguage();
        }, 100);
    }

    // حساب إجمالي النافق
    calculateTotalMortality(flocks) {
        return flocks.reduce((total, flock) => {
            return total + this.calculateFlockMortality(flock);
        }, 0);
    }

    // حساب معدل البقاء
    calculateSurvivalRate(flocks) {
        const totalInitial = flocks.reduce((total, flock) => total + (flock.initialCount || 0), 0);
        const totalMortality = this.calculateTotalMortality(flocks);

        if (totalInitial === 0) return 0;
        return ((totalInitial - totalMortality) / totalInitial * 100).toFixed(2);
    }

    // توليد جدول تفاصيل القطعان
    generateFlockDetailsTable(flocks) {
        if (flocks.length === 0) {
            return '<p class="text-gray-600 text-center">لا توجد قطعان مسجلة</p>';
        }

        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-3 border text-right">اسم القطيع</th>
                        <th class="p-3 border text-right">العدد الأولي</th>
                        <th class="p-3 border text-right">العدد الحالي</th>
                        <th class="p-3 border text-right">النافق</th>
                        <th class="p-3 border text-right">معدل النفوق</th>
                        <th class="p-3 border text-right">العمر (يوم)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        flocks.forEach(flock => {
            const mortality = this.calculateFlockMortality(flock);
            const currentCount = Math.max(0, (flock.initialCount || 0) - mortality);
            const mortalityRate = flock.initialCount > 0 ? ((mortality / flock.initialCount) * 100).toFixed(2) : 0;
            const age = this.calculateFlockAge(flock.startDate);

            tableHtml += `
                <tr>
                    <td class="p-3 border font-semibold">${flock.name}</td>
                    <td class="p-3 border text-center">${flock.initialCount || 0}</td>
                    <td class="p-3 border text-center text-green-600 font-semibold">${currentCount}</td>
                    <td class="p-3 border text-center text-red-600 font-semibold">${mortality}</td>
                    <td class="p-3 border text-center">${mortalityRate}%</td>
                    <td class="p-3 border text-center">${age}</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // تقرير العملاء والمبيعات
    showCustomerSalesReport() {
        const farmData = this.getFarmData(this.currentFarm);
        const filteredData = this.filterDataByDateRange(farmData);

        const reportArea = document.getElementById('reportDisplayArea');
        reportArea.classList.remove('hidden');

        const customerSales = this.calculateCustomerSales(filteredData);

        reportArea.innerHTML = `
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800" data-ar="تقرير العملاء والمبيعات" data-en="Customers & Sales Report">تقرير العملاء والمبيعات</h3>
                    <div class="flex gap-2">
                        <button onclick="farmSystem.exportReportAsPDF('customer-sales')" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                            <i class="fas fa-file-pdf mr-2"></i>
                            <span data-ar="تصدير PDF" data-en="Export PDF">تصدير PDF</span>
                        </button>
                        <button onclick="farmSystem.exportReportAsExcel('customer-sales')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                            <i class="fas fa-file-excel mr-2"></i>
                            <span data-ar="تصدير Excel" data-en="Export Excel">تصدير Excel</span>
                        </button>
                        <button onclick="farmSystem.hideReport()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                            <i class="fas fa-times mr-2"></i>
                            <span data-ar="إغلاق" data-en="Close">إغلاق</span>
                        </button>
                    </div>
                </div>

                <!-- إحصائيات العملاء -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 class="text-lg font-semibold text-blue-800 mb-2" data-ar="إجمالي العملاء" data-en="Total Customers">إجمالي العملاء</h4>
                        <p class="text-2xl font-bold text-blue-600">${filteredData.customers.length}</p>
                    </div>

                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 class="text-lg font-semibold text-green-800 mb-2" data-ar="إجمالي المبيعات" data-en="Total Sales">إجمالي المبيعات</h4>
                        <p class="text-2xl font-bold text-green-600">${this.formatCurrency(customerSales.totalSales)}</p>
                    </div>

                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 class="text-lg font-semibold text-yellow-800 mb-2" data-ar="حسابات مدينة" data-en="Accounts Receivable">حسابات مدينة</h4>
                        <p class="text-2xl font-bold text-yellow-600">${this.formatCurrency(customerSales.receivables)}</p>
                    </div>

                    <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 class="text-lg font-semibold text-red-800 mb-2" data-ar="حسابات دائنة" data-en="Accounts Payable">حسابات دائنة</h4>
                        <p class="text-2xl font-bold text-red-600">${this.formatCurrency(customerSales.payables)}</p>
                    </div>
                </div>

                <!-- جدول أفضل العملاء -->
                <div class="bg-white rounded-lg border mb-6">
                    <div class="bg-green-50 p-4 border-b">
                        <h4 class="text-lg font-bold text-green-800" data-ar="أفضل العملاء" data-en="Top Customers">أفضل العملاء</h4>
                    </div>
                    <div class="p-4">
                        ${this.generateTopCustomersTable(customerSales.topCustomers)}
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.applyLanguage();
        }, 100);
    }

    // حساب مبيعات العملاء
    calculateCustomerSales(farmData) {
        const customerSales = {};
        let totalSales = 0;
        let receivables = 0;
        let payables = 0;

        // حساب المبيعات من الإيرادات
        farmData.revenues.forEach(revenue => {
            if (revenue.customerName) {
                if (!customerSales[revenue.customerName]) {
                    customerSales[revenue.customerName] = 0;
                }
                customerSales[revenue.customerName] += revenue.amount || 0;
                totalSales += revenue.amount || 0;
            }
        });

        // حساب الحسابات المدينة والدائنة
        farmData.customers.forEach(customer => {
            const balance = customer.balance || 0;
            if (balance > 0) {
                receivables += balance;
            } else if (balance < 0) {
                payables += Math.abs(balance);
            }
        });

        // ترتيب العملاء حسب المبيعات
        const topCustomers = Object.entries(customerSales)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        return {
            totalSales,
            receivables,
            payables,
            topCustomers
        };
    }

    // توليد جدول أفضل العملاء
    generateTopCustomersTable(topCustomers) {
        if (topCustomers.length === 0) {
            return '<p class="text-gray-600 text-center">لا توجد مبيعات مسجلة</p>';
        }

        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-3 border text-right">الترتيب</th>
                        <th class="p-3 border text-right">اسم العميل</th>
                        <th class="p-3 border text-right">إجمالي المبيعات</th>
                        <th class="p-3 border text-right">النسبة من الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const totalSales = topCustomers.reduce((sum, [, amount]) => sum + amount, 0);

        topCustomers.forEach(([customerName, amount], index) => {
            const percentage = totalSales > 0 ? ((amount / totalSales) * 100).toFixed(2) : 0;

            tableHtml += `
                <tr>
                    <td class="p-3 border text-center font-semibold">${index + 1}</td>
                    <td class="p-3 border font-semibold">${customerName}</td>
                    <td class="p-3 border text-center text-green-600 font-semibold">${this.formatCurrency(amount)}</td>
                    <td class="p-3 border text-center">${percentage}%</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // تقرير المصروفات التفصيلي
    showDetailedExpenseReport() {
        const farmData = this.getFarmData(this.currentFarm);
        const filteredData = this.filterDataByDateRange(farmData);

        const reportArea = document.getElementById('reportDisplayArea');
        reportArea.classList.remove('hidden');

        const expenseAnalysis = this.analyzeExpenses(filteredData.expenses);

        reportArea.innerHTML = `
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800" data-ar="تقرير المصروفات التفصيلي" data-en="Detailed Expense Report">تقرير المصروفات التفصيلي</h3>
                    <div class="flex gap-2">
                        <button onclick="farmSystem.exportReportAsPDF('detailed-expense')" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                            <i class="fas fa-file-pdf mr-2"></i>
                            <span data-ar="تصدير PDF" data-en="Export PDF">تصدير PDF</span>
                        </button>
                        <button onclick="farmSystem.exportReportAsExcel('detailed-expense')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                            <i class="fas fa-file-excel mr-2"></i>
                            <span data-ar="تصدير Excel" data-en="Export Excel">تصدير Excel</span>
                        </button>
                        <button onclick="farmSystem.hideReport()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                            <i class="fas fa-times mr-2"></i>
                            <span data-ar="إغلاق" data-en="Close">إغلاق</span>
                        </button>
                    </div>
                </div>

                <!-- تحليل المصروفات -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-white rounded-lg border">
                        <div class="bg-red-50 p-4 border-b">
                            <h4 class="text-lg font-bold text-red-800" data-ar="المصروفات حسب النوع" data-en="Expenses by Type">المصروفات حسب النوع</h4>
                        </div>
                        <div class="p-4">
                            ${this.generateExpensesByTypeTable(expenseAnalysis.byType)}
                        </div>
                    </div>

                    <div class="bg-white rounded-lg border">
                        <div class="bg-blue-50 p-4 border-b">
                            <h4 class="text-lg font-bold text-blue-800" data-ar="المصروفات حسب الشهر" data-en="Expenses by Month">المصروفات حسب الشهر</h4>
                        </div>
                        <div class="p-4">
                            ${this.generateExpensesByMonthTable(expenseAnalysis.byMonth)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.applyLanguage();
        }, 100);
    }

    // تحليل المصروفات
    analyzeExpenses(expenses) {
        const byType = {};
        const byMonth = {};

        expenses.forEach(expense => {
            const type = expense.type || 'other';
            const month = new Date(expense.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
            const amount = expense.amount || 0;

            byType[type] = (byType[type] || 0) + amount;
            byMonth[month] = (byMonth[month] || 0) + amount;
        });

        return { byType, byMonth };
    }

    // توليد جدول المصروفات حسب النوع
    generateExpensesByTypeTable(expensesByType) {
        const total = Object.values(expensesByType).reduce((sum, amount) => sum + amount, 0);

        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-3 border text-right">النوع</th>
                        <th class="p-3 border text-right">المبلغ</th>
                        <th class="p-3 border text-right">النسبة</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.entries(expensesByType).forEach(([type, amount]) => {
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(2) : 0;
            const typeNames = {
                feed: 'أعلاف',
                medicine: 'أدوية',
                utilities: 'مرافق',
                labor: 'عمالة',
                other: 'أخرى'
            };

            tableHtml += `
                <tr>
                    <td class="p-3 border">${typeNames[type] || type}</td>
                    <td class="p-3 border text-red-600 font-semibold">${this.formatCurrency(amount)}</td>
                    <td class="p-3 border">${percentage}%</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // توليد جدول المصروفات حسب الشهر
    generateExpensesByMonthTable(expensesByMonth) {
        let tableHtml = `
            <table class="w-full border border-gray-300">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-3 border text-right">الشهر</th>
                        <th class="p-3 border text-right">المبلغ</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.entries(expensesByMonth)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .forEach(([month, amount]) => {
                tableHtml += `
                    <tr>
                        <td class="p-3 border">${month}</td>
                        <td class="p-3 border text-red-600 font-semibold">${this.formatCurrency(amount)}</td>
                    </tr>
                `;
            });

        tableHtml += '</tbody></table>';
        return tableHtml;
    }

    // تصدير التقرير كـ PDF
    exportReportAsPDF(reportType) {
        try {
            this.showNotification('جاري تحضير ملف PDF...', 'warning');

            // التحقق من وجود مكتبة jsPDF
            if (typeof window.jspdf === 'undefined') {
                console.error('مكتبة jsPDF غير محملة');
                this.showNotification('خطأ: مكتبة PDF غير متاحة', 'error');
                return;
            }

            // إنشاء مستند PDF جديد
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // إعداد الخط للعربية
            doc.setFont('helvetica');
            doc.setFontSize(16);

            // تحسين عرض النصوص العربية
            doc.setLanguage('ar');

            // عنوان التقرير
            const reportTitles = {
                'profit-loss': 'Profit & Loss Report / تقرير الأرباح والخسائر',
                'inventory': 'Inventory Report / تقرير القطعان والمخزون',
                'customer-sales': 'Customer Sales Report / تقرير العملاء والمبيعات',
                'detailed-expense': 'Detailed Expense Report / تقرير المصروفات التفصيلي'
            };

            const title = reportTitles[reportType] || 'Report / تقرير';
            const farmName = this.farms[this.currentFarm]?.name || 'Farm / المزرعة';

            // إضافة العنوان
            doc.text(title, 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(farmName, 105, 30, { align: 'center' });
            doc.text(`Date / التاريخ: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });

            // إضافة محتوى التقرير حسب النوع
            let yPosition = 60;

            if (reportType === 'profit-loss') {
                yPosition = this.addProfitLossDataToPDF(doc, yPosition);
            } else if (reportType === 'inventory') {
                yPosition = this.addInventoryDataToPDF(doc, yPosition);
            } else if (reportType === 'customer-sales') {
                yPosition = this.addCustomerSalesDataToPDF(doc, yPosition);
            } else if (reportType === 'detailed-expense') {
                yPosition = this.addDetailedExpenseDataToPDF(doc, yPosition);
            }

            // حفظ الملف
            const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            this.showNotification('تم تصدير ملف PDF بنجاح');
            console.log('تم تصدير PDF بنجاح:', fileName);

        } catch (error) {
            console.error('خطأ في تصدير PDF:', error);
            this.showNotification(`خطأ في تصدير ملف PDF: ${error.message}`, 'error');
        }
    }

    // إضافة بيانات الأرباح والخسائر إلى PDF
    addProfitLossDataToPDF(doc, yPosition) {
        try {
            const farmData = this.getFarmData(this.currentFarm);
            const filteredData = this.filterDataByDateRange(farmData);

            const totalRevenue = this.calculateTotalRevenue(filteredData);
            const totalExpenses = this.calculateTotalExpenses(filteredData);
            const netProfit = totalRevenue - totalExpenses;

            doc.setFontSize(14);
            doc.text('الملخص المالي', 20, yPosition);
            yPosition += 8;
            doc.setFontSize(12);
            doc.text('Financial Summary', 20, yPosition);
            yPosition += 15;

            doc.setFontSize(12);
            doc.text(`إجمالي الإيرادات: ${this.formatCurrency(totalRevenue)}`, 20, yPosition);
            yPosition += 6;
            doc.text(`Total Revenue: ${this.formatCurrency(totalRevenue)}`, 20, yPosition);
            yPosition += 12;

            doc.text(`إجمالي المصروفات: ${this.formatCurrency(totalExpenses)}`, 20, yPosition);
            yPosition += 6;
            doc.text(`Total Expenses: ${this.formatCurrency(totalExpenses)}`, 20, yPosition);
            yPosition += 12;

            doc.text(`صافي الربح: ${this.formatCurrency(netProfit)}`, 20, yPosition);
            yPosition += 6;
            doc.text(`Net Profit: ${this.formatCurrency(netProfit)}`, 20, yPosition);
            yPosition += 20;

            // إضافة تفاصيل الإيرادات مع تحسين العربية
            if (filteredData.revenues.length > 0) {
                doc.setFontSize(12);
                doc.text('تفاصيل الإيرادات:', 20, yPosition);
                yPosition += 6;
                doc.text('Revenue Details:', 20, yPosition);
                yPosition += 10;

                filteredData.revenues.slice(0, 10).forEach(revenue => {
                    const arabicText = `${this.formatDate(revenue.date)} - ${revenue.description}: ${this.formatCurrency(revenue.amount)}`;
                    doc.text(arabicText, 25, yPosition);
                    yPosition += 8;

                    if (yPosition > 250) { // تجنب تجاوز حدود الصفحة
                        doc.addPage();
                        yPosition = 20;
                    }
                });
                yPosition += 10;
            }

            // إضافة تفاصيل المصروفات مع تحسين العربية
            if (filteredData.expenses.length > 0) {
                doc.text('تفاصيل المصروفات:', 20, yPosition);
                yPosition += 6;
                doc.text('Expense Details:', 20, yPosition);
                yPosition += 10;

                filteredData.expenses.slice(0, 10).forEach(expense => {
                    const arabicText = `${this.formatDate(expense.date)} - ${expense.description}: ${this.formatCurrency(expense.amount)}`;
                    doc.text(arabicText, 25, yPosition);
                    yPosition += 8;

                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                    }
                });
            }

            return yPosition;
        } catch (error) {
            console.error('خطأ في إضافة بيانات الأرباح والخسائر:', error);
            return yPosition + 20;
        }
    }

    // إضافة بيانات القطعان إلى PDF
    addInventoryDataToPDF(doc, yPosition) {
        const farmData = this.getFarmData(this.currentFarm);
        const filteredData = this.filterDataByDateRange(farmData);

        doc.setFontSize(14);
        doc.text('إحصائيات القطعان:', 20, yPosition);
        yPosition += 15;

        doc.setFontSize(12);
        doc.text(`عدد القطعان: ${filteredData.flocks.length}`, 20, yPosition);
        yPosition += 10;
        doc.text(`الطيور الحية: ${this.calculateLiveBirds(filteredData)}`, 20, yPosition);
        yPosition += 10;
        doc.text(`إجمالي النافق: ${this.calculateTotalMortality(filteredData.flocks)}`, 20, yPosition);
        yPosition += 10;
        doc.text(`معدل البقاء: ${this.calculateSurvivalRate(filteredData.flocks)}%`, 20, yPosition);
        yPosition += 20;

        return yPosition;
    }

    // إضافة بيانات العملاء إلى PDF
    addCustomerSalesDataToPDF(doc, yPosition) {
        const farmData = this.getFarmData(this.currentFarm);
        const filteredData = this.filterDataByDateRange(farmData);
        const customerSales = this.calculateCustomerSales(filteredData);

        doc.setFontSize(14);
        doc.text('إحصائيات العملاء:', 20, yPosition);
        yPosition += 15;

        doc.setFontSize(12);
        doc.text(`عدد العملاء: ${filteredData.customers.length}`, 20, yPosition);
        yPosition += 10;
        doc.text(`إجمالي المبيعات: ${this.formatCurrency(customerSales.totalSales)}`, 20, yPosition);
        yPosition += 10;
        doc.text(`حسابات مدينة: ${this.formatCurrency(customerSales.receivables)}`, 20, yPosition);
        yPosition += 10;
        doc.text(`حسابات دائنة: ${this.formatCurrency(customerSales.payables)}`, 20, yPosition);
        yPosition += 20;

        return yPosition;
    }

    // إضافة بيانات المصروفات التفصيلية إلى PDF
    addDetailedExpenseDataToPDF(doc, yPosition) {
        const farmData = this.getFarmData(this.currentFarm);
        const filteredData = this.filterDataByDateRange(farmData);
        const expenseAnalysis = this.analyzeExpenses(filteredData.expenses);

        doc.setFontSize(14);
        doc.text('تحليل المصروفات:', 20, yPosition);
        yPosition += 15;

        doc.setFontSize(12);
        Object.entries(expenseAnalysis.byType).forEach(([type, amount]) => {
            const typeNames = {
                feed: 'أعلاف',
                medicine: 'أدوية',
                utilities: 'مرافق',
                labor: 'عمالة',
                other: 'أخرى'
            };
            doc.text(`${typeNames[type] || type}: ${this.formatCurrency(amount)}`, 20, yPosition);
            yPosition += 10;
        });

        return yPosition;
    }

    // تصدير التقرير كـ Excel
    exportReportAsExcel(reportType) {
        try {
            this.showNotification('جاري تحضير ملف Excel...', 'warning');

            const farmData = this.getFarmData(this.currentFarm);
            const filteredData = this.filterDataByDateRange(farmData);

            // إنشاء مصنف جديد
            const wb = XLSX.utils.book_new();

            // إضافة أوراق العمل حسب نوع التقرير
            if (reportType === 'profit-loss') {
                this.addProfitLossSheets(wb, filteredData);
            } else if (reportType === 'inventory') {
                this.addInventorySheets(wb, filteredData);
            } else if (reportType === 'customer-sales') {
                this.addCustomerSalesSheets(wb, filteredData);
            } else if (reportType === 'detailed-expense') {
                this.addDetailedExpenseSheets(wb, filteredData);
            }

            // حفظ الملف
            const reportTitles = {
                'profit-loss': 'تقرير_الأرباح_والخسائر',
                'inventory': 'تقرير_القطعان_والمخزون',
                'customer-sales': 'تقرير_العملاء_والمبيعات',
                'detailed-expense': 'تقرير_المصروفات_التفصيلي'
            };

            const fileName = `${reportTitles[reportType]}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            this.showNotification('تم تصدير ملف Excel بنجاح');
        } catch (error) {
            console.error('خطأ في تصدير Excel:', error);
            this.showNotification('خطأ في تصدير ملف Excel', 'error');
        }
    }

    // إضافة أوراق الأرباح والخسائر
    addProfitLossSheets(wb, filteredData) {
        const totalRevenue = this.calculateTotalRevenue(filteredData);
        const totalExpenses = this.calculateTotalExpenses(filteredData);
        const netProfit = totalRevenue - totalExpenses;

        // ورقة الملخص
        const summaryData = [
            ['البيان', 'المبلغ'],
            ['إجمالي الإيرادات', totalRevenue],
            ['إجمالي المصروفات', totalExpenses],
            ['صافي الربح', netProfit]
        ];

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'الملخص');

        // ورقة تفاصيل الإيرادات
        const revenueData = [['التاريخ', 'النوع', 'الوصف', 'المبلغ']];
        filteredData.revenues.forEach(revenue => {
            revenueData.push([
                this.formatDate(revenue.date),
                revenue.type || '',
                revenue.description || '',
                revenue.amount || 0
            ]);
        });

        const revenueWs = XLSX.utils.aoa_to_sheet(revenueData);
        XLSX.utils.book_append_sheet(wb, revenueWs, 'الإيرادات');

        // ورقة تفاصيل المصروفات
        const expenseData = [['التاريخ', 'النوع', 'الوصف', 'المبلغ']];
        filteredData.expenses.forEach(expense => {
            expenseData.push([
                this.formatDate(expense.date),
                expense.type || '',
                expense.description || '',
                expense.amount || 0
            ]);
        });

        const expenseWs = XLSX.utils.aoa_to_sheet(expenseData);
        XLSX.utils.book_append_sheet(wb, expenseWs, 'المصروفات');
    }

    // إضافة أوراق القطعان
    addInventorySheets(wb, filteredData) {
        const flockData = [['اسم القطيع', 'العدد الأولي', 'العدد الحالي', 'النافق', 'معدل النفوق', 'العمر']];

        filteredData.flocks.forEach(flock => {
            const mortality = this.calculateFlockMortality(flock);
            const currentCount = Math.max(0, (flock.initialCount || 0) - mortality);
            const mortalityRate = flock.initialCount > 0 ? ((mortality / flock.initialCount) * 100).toFixed(2) : 0;
            const age = this.calculateFlockAge(flock.startDate);

            flockData.push([
                flock.name,
                flock.initialCount || 0,
                currentCount,
                mortality,
                `${mortalityRate}%`,
                age
            ]);
        });

        const flockWs = XLSX.utils.aoa_to_sheet(flockData);
        XLSX.utils.book_append_sheet(wb, flockWs, 'القطعان');
    }

    // إضافة أوراق العملاء والمبيعات
    addCustomerSalesSheets(wb, filteredData) {
        const customerSales = this.calculateCustomerSales(filteredData);

        // ورقة أفضل العملاء
        const topCustomersData = [['الترتيب', 'اسم العميل', 'إجمالي المبيعات']];
        customerSales.topCustomers.forEach(([customerName, amount], index) => {
            topCustomersData.push([index + 1, customerName, amount]);
        });

        const topCustomersWs = XLSX.utils.aoa_to_sheet(topCustomersData);
        XLSX.utils.book_append_sheet(wb, topCustomersWs, 'أفضل العملاء');

        // ورقة جميع العملاء
        const allCustomersData = [['اسم العميل', 'الهاتف', 'البريد الإلكتروني', 'الرصيد']];
        filteredData.customers.forEach(customer => {
            allCustomersData.push([
                customer.name,
                customer.phone || '',
                customer.email || '',
                customer.balance || 0
            ]);
        });

        const allCustomersWs = XLSX.utils.aoa_to_sheet(allCustomersData);
        XLSX.utils.book_append_sheet(wb, allCustomersWs, 'جميع العملاء');
    }

    // إضافة أوراق المصروفات التفصيلية
    addDetailedExpenseSheets(wb, filteredData) {
        const expenseAnalysis = this.analyzeExpenses(filteredData.expenses);

        // ورقة المصروفات حسب النوع
        const byTypeData = [['النوع', 'المبلغ']];
        Object.entries(expenseAnalysis.byType).forEach(([type, amount]) => {
            const typeNames = {
                feed: 'أعلاف',
                medicine: 'أدوية',
                utilities: 'مرافق',
                labor: 'عمالة',
                other: 'أخرى'
            };
            byTypeData.push([typeNames[type] || type, amount]);
        });

        const byTypeWs = XLSX.utils.aoa_to_sheet(byTypeData);
        XLSX.utils.book_append_sheet(wb, byTypeWs, 'حسب النوع');

        // ورقة المصروفات حسب الشهر
        const byMonthData = [['الشهر', 'المبلغ']];
        Object.entries(expenseAnalysis.byMonth).forEach(([month, amount]) => {
            byMonthData.push([month, amount]);
        });

        const byMonthWs = XLSX.utils.aoa_to_sheet(byMonthData);
        XLSX.utils.book_append_sheet(wb, byMonthWs, 'حسب الشهر');
    }

    // تقرير مقارنة الفترات
    showPeriodComparisonReport() {
        const reportArea = document.getElementById('reportDisplayArea');
        reportArea.classList.remove('hidden');

        reportArea.innerHTML = `
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800" data-ar="تقرير مقارنة الفترات" data-en="Period Comparison Report">تقرير مقارنة الفترات</h3>
                    <div class="flex gap-2">
                        <button onclick="farmSystem.hideReport()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                            <i class="fas fa-times mr-2"></i>
                            <span data-ar="إغلاق" data-en="Close">إغلاق</span>
                        </button>
                    </div>
                </div>

                <!-- اختيار الفترات للمقارنة -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 class="text-lg font-semibold text-blue-800 mb-4" data-ar="الفترة الأولى" data-en="First Period">الفترة الأولى</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="من تاريخ" data-en="From Date">من تاريخ</label>
                                <input type="date" id="period1From" class="w-full p-2 border border-gray-300 rounded">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="إلى تاريخ" data-en="To Date">إلى تاريخ</label>
                                <input type="date" id="period1To" class="w-full p-2 border border-gray-300 rounded">
                            </div>
                        </div>
                    </div>

                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 class="text-lg font-semibold text-green-800 mb-4" data-ar="الفترة الثانية" data-en="Second Period">الفترة الثانية</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="من تاريخ" data-en="From Date">من تاريخ</label>
                                <input type="date" id="period2From" class="w-full p-2 border border-gray-300 rounded">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-ar="إلى تاريخ" data-en="To Date">إلى تاريخ</label>
                                <input type="date" id="period2To" class="w-full p-2 border border-gray-300 rounded">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="text-center mb-6">
                    <button onclick="farmSystem.generatePeriodComparison()" class="btn-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition">
                        <i class="fas fa-chart-bar ml-2"></i>
                        <span data-ar="إنشاء المقارنة" data-en="Generate Comparison">إنشاء المقارنة</span>
                    </button>
                </div>

                <div id="comparisonResults" class="hidden">
                    <!-- نتائج المقارنة ستظهر هنا -->
                </div>
            </div>
        `;

        // تعيين تواريخ افتراضية
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        document.getElementById('period1From').value = lastMonth.toISOString().split('T')[0];
        document.getElementById('period1To').value = lastMonthEnd.toISOString().split('T')[0];
        document.getElementById('period2From').value = thisMonthStart.toISOString().split('T')[0];
        document.getElementById('period2To').value = today.toISOString().split('T')[0];

        setTimeout(() => {
            this.applyLanguage();
        }, 100);
    }

    // إنشاء مقارنة الفترات
    generatePeriodComparison() {
        const period1From = document.getElementById('period1From').value;
        const period1To = document.getElementById('period1To').value;
        const period2From = document.getElementById('period2From').value;
        const period2To = document.getElementById('period2To').value;

        if (!period1From || !period1To || !period2From || !period2To) {
            this.showNotification('يرجى تحديد جميع التواريخ', 'warning');
            return;
        }

        const farmData = this.getFarmData(this.currentFarm);

        // تصفية البيانات للفترة الأولى
        const period1Data = this.filterDataByCustomRange(farmData, period1From, period1To);
        const period1Revenue = this.calculateTotalRevenue(period1Data);
        const period1Expenses = this.calculateTotalExpenses(period1Data);
        const period1Profit = period1Revenue - period1Expenses;

        // تصفية البيانات للفترة الثانية
        const period2Data = this.filterDataByCustomRange(farmData, period2From, period2To);
        const period2Revenue = this.calculateTotalRevenue(period2Data);
        const period2Expenses = this.calculateTotalExpenses(period2Data);
        const period2Profit = period2Revenue - period2Expenses;

        // حساب التغييرات
        const revenueChange = period1Revenue > 0 ? ((period2Revenue - period1Revenue) / period1Revenue * 100).toFixed(2) : 0;
        const expenseChange = period1Expenses > 0 ? ((period2Expenses - period1Expenses) / period1Expenses * 100).toFixed(2) : 0;
        const profitChange = period1Profit !== 0 ? ((period2Profit - period1Profit) / Math.abs(period1Profit) * 100).toFixed(2) : 0;

        // عرض النتائج
        const resultsDiv = document.getElementById('comparisonResults');
        resultsDiv.classList.remove('hidden');

        resultsDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg border">
                    <h4 class="text-lg font-bold text-gray-800 mb-4" data-ar="الإيرادات" data-en="Revenue">الإيرادات</h4>
                    <div class="space-y-2">
                        <p><strong>الفترة الأولى:</strong> ${this.formatCurrency(period1Revenue)}</p>
                        <p><strong>الفترة الثانية:</strong> ${this.formatCurrency(period2Revenue)}</p>
                        <p class="${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold">
                            التغيير: ${revenueChange >= 0 ? '+' : ''}${revenueChange}%
                        </p>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg border">
                    <h4 class="text-lg font-bold text-gray-800 mb-4" data-ar="المصروفات" data-en="Expenses">المصروفات</h4>
                    <div class="space-y-2">
                        <p><strong>الفترة الأولى:</strong> ${this.formatCurrency(period1Expenses)}</p>
                        <p><strong>الفترة الثانية:</strong> ${this.formatCurrency(period2Expenses)}</p>
                        <p class="${expenseChange <= 0 ? 'text-green-600' : 'text-red-600'} font-semibold">
                            التغيير: ${expenseChange >= 0 ? '+' : ''}${expenseChange}%
                        </p>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg border">
                    <h4 class="text-lg font-bold text-gray-800 mb-4" data-ar="صافي الربح" data-en="Net Profit">صافي الربح</h4>
                    <div class="space-y-2">
                        <p><strong>الفترة الأولى:</strong> ${this.formatCurrency(period1Profit)}</p>
                        <p><strong>الفترة الثانية:</strong> ${this.formatCurrency(period2Profit)}</p>
                        <p class="${profitChange >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold">
                            التغيير: ${profitChange >= 0 ? '+' : ''}${profitChange}%
                        </p>
                    </div>
                </div>
            </div>
        `;

        this.applyLanguage();
    }

    // تصفية البيانات حسب نطاق مخصص
    filterDataByCustomRange(farmData, fromDate, toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);

        return {
            flocks: farmData.flocks,
            expenses: farmData.expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= from && expenseDate <= to;
            }),
            revenues: farmData.revenues.filter(revenue => {
                const revenueDate = new Date(revenue.date);
                return revenueDate >= from && revenueDate <= to;
            }),
            customers: farmData.customers
        };
    }

    // عرض خيارات التصدير
    showExportOptions() {
        const reportArea = document.getElementById('reportDisplayArea');
        reportArea.classList.remove('hidden');

        reportArea.innerHTML = `
            <div class="card bg-white p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800" data-ar="تصدير البيانات" data-en="Export Data">تصدير البيانات</h3>
                    <button onclick="farmSystem.hideReport()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition">
                        <i class="fas fa-times mr-2"></i>
                        <span data-ar="إغلاق" data-en="Close">إغلاق</span>
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
                        <i class="fas fa-file-pdf text-4xl text-red-600 mb-4"></i>
                        <h4 class="text-lg font-bold text-red-800 mb-2" data-ar="تصدير PDF" data-en="Export PDF">تصدير PDF</h4>
                        <p class="text-sm text-gray-600 mb-4" data-ar="تصدير التقارير بتنسيق PDF للطباعة" data-en="Export reports in PDF format for printing">تصدير التقارير بتنسيق PDF للطباعة</p>
                        <div class="space-y-2">
                            <button onclick="farmSystem.exportReportAsPDF('profit-loss')" class="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition">الأرباح والخسائر</button>
                            <button onclick="farmSystem.exportReportAsPDF('inventory')" class="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition">القطعان والمخزون</button>
                            <button onclick="farmSystem.exportReportAsPDF('customer-sales')" class="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition">العملاء والمبيعات</button>
                        </div>
                    </div>

                    <div class="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
                        <i class="fas fa-file-excel text-4xl text-green-600 mb-4"></i>
                        <h4 class="text-lg font-bold text-green-800 mb-2" data-ar="تصدير Excel" data-en="Export Excel">تصدير Excel</h4>
                        <p class="text-sm text-gray-600 mb-4" data-ar="تصدير البيانات بتنسيق Excel للتحليل" data-en="Export data in Excel format for analysis">تصدير البيانات بتنسيق Excel للتحليل</p>
                        <div class="space-y-2">
                            <button onclick="farmSystem.exportReportAsExcel('profit-loss')" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition">الأرباح والخسائر</button>
                            <button onclick="farmSystem.exportReportAsExcel('inventory')" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition">القطعان والمخزون</button>
                            <button onclick="farmSystem.exportReportAsExcel('customer-sales')" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition">العملاء والمبيعات</button>
                        </div>
                    </div>

                    <div class="bg-blue-50 p-6 rounded-lg border border-blue-200 text-center">
                        <i class="fas fa-download text-4xl text-blue-600 mb-4"></i>
                        <h4 class="text-lg font-bold text-blue-800 mb-2" data-ar="نسخة احتياطية" data-en="Backup">نسخة احتياطية</h4>
                        <p class="text-sm text-gray-600 mb-4" data-ar="تصدير جميع بيانات النظام" data-en="Export all system data">تصدير جميع بيانات النظام</p>
                        <button onclick="farmSystem.exportAllData()" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition">
                            <i class="fas fa-database mr-2"></i>
                            تصدير جميع البيانات
                        </button>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.applyLanguage();
        }, 100);
    }

    // تحضير حقل اسم العميل في نافذة الفاتورة
    loadCustomersForInvoice() {
        const customerInput = document.getElementById('invoiceCustomer');
        if (!customerInput) {
            console.error('حقل اسم العميل غير موجود');
            return;
        }

        const farmCustomers = this.customers[this.currentFarm] || [];

        // مسح القيمة الموجودة
        customerInput.value = '';

        // إضافة قائمة اقتراحات للعملاء الموجودين (اختياري)
        if (farmCustomers.length > 0) {
            const datalistId = 'customerSuggestions';
            let datalist = document.getElementById(datalistId);

            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = datalistId;
                customerInput.setAttribute('list', datalistId);
                customerInput.parentNode.appendChild(datalist);
            }

            datalist.innerHTML = '';
            farmCustomers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.name;
                datalist.appendChild(option);
            });
        }

        console.log(`تم تحضير حقل اسم العميل مع ${farmCustomers.length} اقتراح`);
    }

    // إضافة فاتورة جديدة
    addNewInvoice() {
        try {
            console.log('بدء إنشاء فاتورة جديدة...');

            const customerName = document.getElementById('invoiceCustomer').value.trim();
            const date = document.getElementById('invoiceDate').value;
            const notes = document.getElementById('invoiceNotes').value;

            console.log('بيانات الفاتورة:', { customerName, date, notes });

            if (!customerName) {
                this.showNotification('يرجى إدخال اسم العميل', 'warning');
                return;
            }

            // جمع عناصر الفاتورة
            const items = [];
            const tableBody = document.getElementById('invoiceItemsTable');

            if (!tableBody) {
                this.showNotification('خطأ في جدول عناصر الفاتورة', 'error');
                return;
            }

            Array.from(tableBody.children).forEach((row, index) => {
                const itemTypeSelect = row.querySelector(`select[name="itemType_${index}"]`);
                const quantityInput = row.querySelector(`input[name="quantity_${index}"]`);
                const priceInput = row.querySelector(`input[name="price_${index}"]`);

                if (itemTypeSelect && quantityInput && priceInput) {
                    const itemType = itemTypeSelect.value;
                    const quantity = parseFloat(quantityInput.value) || 0;
                    const price = parseFloat(priceInput.value) || 0;

                    if (quantity > 0 && price > 0) {
                        items.push({
                            type: itemType,
                            quantity: quantity,
                            price: price,
                            total: quantity * price
                        });
                    }
                }
            });

            console.log('عناصر الفاتورة:', items);

            if (items.length === 0) {
                this.showNotification('يرجى إضافة عنصر واحد على الأقل للفاتورة', 'warning');
                return;
            }

            // حساب المجاميع (بدون ضريبة)
            const subtotal = items.reduce((sum, item) => sum + item.total, 0);
            const tax = 0; // لا توجد ضريبة
            const total = subtotal; // الإجمالي = المجموع الفرعي

            // إنشاء الفاتورة
            const invoiceId = 'invoice_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

            const newInvoice = {
                id: invoiceId,
                invoiceNumber: this.generateInvoiceNumber(),
                customerId: null, // لا نحتاج ID العميل بعد الآن
                customerName: customerName,
                date: date,
                items: items,
                subtotal: subtotal,
                tax: tax,
                total: total,
                notes: notes,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            console.log('الفاتورة الجديدة:', newInvoice);

            // التأكد من وجود مصفوفة الفواتير
            if (!this.invoices[this.currentFarm]) {
                this.invoices[this.currentFarm] = [];
            }

            // حفظ الفاتورة
            this.invoices[this.currentFarm].push(newInvoice);
            console.log('تم إضافة الفاتورة إلى المصفوفة');

            // إضافة إيراد للفاتورة
            this.addRevenueFromInvoice(newInvoice);
            console.log('تم إضافة الإيراد المرتبط بالفاتورة');

            // حفظ البيانات
            this.saveAllData();
            console.log('تم حفظ البيانات');

            // إعادة تحميل قسم الفواتير
            this.loadInvoicesSection();
            console.log('تم إعادة تحميل قسم الفواتير');

            // إغلاق النافذة
            closeModal('addInvoiceModal');

            this.showNotification('تم إنشاء الفاتورة بنجاح');
            console.log('تم إنشاء الفاتورة بنجاح');

        } catch (error) {
            console.error('خطأ في إنشاء الفاتورة:', error);
            this.showNotification('حدث خطأ أثناء إنشاء الفاتورة', 'error');
        }
    }

    // توليد رقم فاتورة
    generateInvoiceNumber() {
        try {
            const farmInvoices = this.invoices[this.currentFarm] || [];
            const currentYear = new Date().getFullYear();
            const yearInvoices = farmInvoices.filter(invoice => {
                try {
                    return new Date(invoice.date).getFullYear() === currentYear;
                } catch (e) {
                    return false;
                }
            });

            const invoiceNumber = `${currentYear}-${(yearInvoices.length + 1).toString().padStart(4, '0')}`;
            console.log('رقم الفاتورة المولد:', invoiceNumber);
            return invoiceNumber;
        } catch (error) {
            console.error('خطأ في توليد رقم الفاتورة:', error);
            return `${new Date().getFullYear()}-0001`;
        }
    }

    // إضافة إيراد من الفاتورة
    addRevenueFromInvoice(invoice) {
        try {
            const revenueId = 'revenue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

            const newRevenue = {
                id: revenueId,
                type: 'sales',
                description: `فاتورة رقم ${invoice.invoiceNumber} - ${invoice.customerName}`,
                amount: invoice.total,
                date: invoice.date,
                customerName: invoice.customerName,
                invoiceId: invoice.id,
                createdAt: new Date().toISOString()
            };

            // التأكد من وجود مصفوفة الإيرادات
            if (!this.revenues[this.currentFarm]) {
                this.revenues[this.currentFarm] = [];
            }

            this.revenues[this.currentFarm].push(newRevenue);
            console.log('تم إضافة إيراد جديد:', newRevenue);

        } catch (error) {
            console.error('خطأ في إضافة الإيراد من الفاتورة:', error);
        }
    }

    // إنشاء فاتورة من إيراد موجود
    createInvoiceFromRevenue(revenueId) {
        try {
            const farmRevenues = this.revenues[this.currentFarm] || [];
            const revenue = farmRevenues.find(r => r.id === revenueId);

            if (!revenue) {
                this.showNotification('الإيراد غير موجود', 'error');
                return;
            }

            if (revenue.invoiceId) {
                this.showNotification('تم إنشاء فاتورة لهذا الإيراد مسبقاً', 'warning');
                return;
            }

            // فتح نافذة إنشاء الفاتورة
            document.getElementById('addInvoiceModal').classList.remove('hidden');

            // تحميل قائمة العملاء
            this.loadCustomersForInvoice();

            // تعبئة البيانات من الإيراد
            document.getElementById('invoiceDate').value = revenue.date;
            document.getElementById('invoiceNotes').value = `تم إنشاؤها من الإيراد: ${revenue.description}`;

            // اختيار العميل إذا كان موجود
            if (revenue.customerName) {
                const customerSelect = document.getElementById('invoiceCustomer');
                const farmCustomers = this.customers[this.currentFarm] || [];
                const customer = farmCustomers.find(c => c.name === revenue.customerName);
                if (customer) {
                    customerSelect.value = customer.id;
                }
            }

            // إعداد معالج الإرسال مع ربط الإيراد
            document.getElementById('addInvoiceForm').onsubmit = (e) => {
                e.preventDefault();
                this.addNewInvoiceFromRevenue(revenueId);
            };

            // إضافة عنصر افتراضي بناءً على نوع الإيراد
            this.addInvoiceItemFromRevenue(revenue);

            this.showNotification('تم تحضير الفاتورة من بيانات الإيراد');

        } catch (error) {
            console.error('خطأ في إنشاء فاتورة من الإيراد:', error);
            this.showNotification('حدث خطأ أثناء إنشاء الفاتورة', 'error');
        }
    }

    // إضافة عنصر فاتورة من بيانات الإيراد
    addInvoiceItemFromRevenue(revenue) {
        const tableBody = document.getElementById('invoiceItemsTable');
        tableBody.innerHTML = ''; // مسح العناصر الموجودة

        const row = document.createElement('tr');
        const itemIndex = 0;

        // تحديد نوع الصنف بناءً على نوع الإيراد
        let itemType = 'other';
        if (revenue.type === 'eggs') itemType = 'eggs';
        else if (revenue.type === 'manure') itemType = 'manure';
        else if (revenue.type === 'chickens') itemType = 'chickens';

        row.innerHTML = `
            <td class="p-2 border">
                <select class="w-full p-1 border border-gray-300 rounded" name="itemType_${itemIndex}" onchange="updateInvoiceCalculations()">
                    <option value="eggs" ${itemType === 'eggs' ? 'selected' : ''}>بيض</option>
                    <option value="manure" ${itemType === 'manure' ? 'selected' : ''}>سبلة</option>
                    <option value="chickens" ${itemType === 'chickens' ? 'selected' : ''}>فراخ</option>
                    <option value="other" ${itemType === 'other' ? 'selected' : ''}>أخرى</option>
                </select>
            </td>
            <td class="p-2 border">
                <input type="number" class="w-full p-1 border border-gray-300 rounded" name="quantity_${itemIndex}"
                       value="${revenue.quantity || 1}" min="0" step="0.01" onchange="updateInvoiceCalculations()" required>
            </td>
            <td class="p-2 border">
                <input type="number" class="w-full p-1 border border-gray-300 rounded" name="price_${itemIndex}"
                       value="${revenue.unitPrice || (revenue.amount / (revenue.quantity || 1))}" min="0" step="0.01" onchange="updateInvoiceCalculations()" required>
            </td>
            <td class="p-2 border">
                <span class="item-total">${this.formatCurrency(revenue.amount)}</span>
            </td>
            <td class="p-2 border text-center">
                <button type="button" onclick="removeInvoiceItem(this)" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);
        updateInvoiceCalculations();
    }

    // إضافة فاتورة جديدة من إيراد
    addNewInvoiceFromRevenue(revenueId) {
        try {
            // استخدام نفس منطق addNewInvoice مع ربط الإيراد
            const customerName = document.getElementById('invoiceCustomer').value.trim();
            const date = document.getElementById('invoiceDate').value;
            const notes = document.getElementById('invoiceNotes').value;

            if (!customerName) {
                this.showNotification('يرجى إدخال اسم العميل', 'warning');
                return;
            }

            // جمع عناصر الفاتورة
            const items = [];
            const tableBody = document.getElementById('invoiceItemsTable');

            Array.from(tableBody.children).forEach((row, index) => {
                const itemTypeSelect = row.querySelector(`select[name="itemType_${index}"]`);
                const quantityInput = row.querySelector(`input[name="quantity_${index}"]`);
                const priceInput = row.querySelector(`input[name="price_${index}"]`);

                if (itemTypeSelect && quantityInput && priceInput) {
                    const itemType = itemTypeSelect.value;
                    const quantity = parseFloat(quantityInput.value) || 0;
                    const price = parseFloat(priceInput.value) || 0;

                    if (quantity > 0 && price > 0) {
                        items.push({
                            type: itemType,
                            quantity: quantity,
                            price: price,
                            total: quantity * price
                        });
                    }
                }
            });

            if (items.length === 0) {
                this.showNotification('يرجى إضافة عنصر واحد على الأقل للفاتورة', 'warning');
                return;
            }

            // حساب المجاميع (بدون ضريبة)
            const subtotal = items.reduce((sum, item) => sum + item.total, 0);
            const tax = 0; // لا توجد ضريبة
            const total = subtotal; // الإجمالي = المجموع الفرعي

            // إنشاء الفاتورة
            const invoiceId = 'invoice_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

            const newInvoice = {
                id: invoiceId,
                invoiceNumber: this.generateInvoiceNumber(),
                customerId: null, // لا نحتاج ID العميل بعد الآن
                customerName: customerName,
                date: date,
                items: items,
                subtotal: subtotal,
                tax: tax,
                total: total,
                notes: notes,
                status: 'pending',
                revenueId: revenueId, // ربط بالإيراد الأصلي
                createdAt: new Date().toISOString()
            };

            // حفظ الفاتورة
            if (!this.invoices[this.currentFarm]) {
                this.invoices[this.currentFarm] = [];
            }

            this.invoices[this.currentFarm].push(newInvoice);

            // ربط الإيراد بالفاتورة
            const farmRevenues = this.revenues[this.currentFarm] || [];
            const revenue = farmRevenues.find(r => r.id === revenueId);
            if (revenue) {
                revenue.invoiceId = invoiceId;
                revenue.hasInvoice = true;
            }

            // حفظ البيانات
            this.saveAllData();

            // إعادة تحميل الأقسام
            this.loadInvoicesSection();
            this.loadRevenuesSection();

            // إغلاق النافذة
            closeModal('addInvoiceModal');

            this.showNotification('تم إنشاء الفاتورة من الإيراد بنجاح');

        } catch (error) {
            console.error('خطأ في إنشاء فاتورة من الإيراد:', error);
            this.showNotification('حدث خطأ أثناء إنشاء الفاتورة', 'error');
        }
    }

    // الحصول على اسم نوع الصنف
    getItemTypeName(type) {
        const typeNames = {
            eggs: 'بيض',
            manure: 'سبلة',
            chickens: 'فراخ',
            other: 'أخرى'
        };
        return typeNames[type] || type;
    }

    // عرض تفاصيل الفاتورة
    viewInvoiceDetails(invoiceId) {
        const farmInvoices = this.invoices[this.currentFarm] || [];
        const invoice = farmInvoices.find(inv => inv.id === invoiceId);

        if (!invoice) return;

        // الحصول على اسم العميل الصحيح
        let customerName = invoice.customerName;
        if (!customerName && invoice.customerId) {
            const customer = this.customers[this.currentFarm]?.find(c => c.id === invoice.customerId);
            customerName = customer ? customer.name : 'عميل غير محدد';
        }
        if (!customerName) {
            customerName = 'عميل غير محدد';
        }

        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">فاتورة رقم ${invoice.invoiceNumber}</h3>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h4 class="font-bold mb-2">معلومات العميل:</h4>
                            <p><strong>الاسم:</strong> ${customerName}</p>
                            <p><strong>التاريخ:</strong> ${this.formatDate(invoice.date)}</p>
                            <p><strong>الحالة:</strong> ${invoice.status === 'paid' ? 'مدفوعة' : 'معلقة'}</p>
                        </div>

                        <div>
                            <h4 class="font-bold mb-2">معلومات الفاتورة:</h4>
                            <p><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</p>
                            <p><strong>المجموع الفرعي:</strong> ${this.formatCurrency(invoice.subtotal)}</p>
                            <p><strong>الإجمالي:</strong> ${this.formatCurrency(invoice.total)}</p>
                        </div>
                    </div>

                    <div class="mb-6">
                        <h4 class="font-bold mb-2">عناصر الفاتورة:</h4>
                        <table class="w-full border border-gray-300">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="p-2 border text-right">الصنف</th>
                                    <th class="p-2 border text-right">الكمية</th>
                                    <th class="p-2 border text-right">السعر</th>
                                    <th class="p-2 border text-right">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invoice.items.map(item => `
                                    <tr>
                                        <td class="p-2 border">${this.getItemTypeName(item.type)}</td>
                                        <td class="p-2 border">${item.quantity}</td>
                                        <td class="p-2 border">${this.formatCurrency(item.price)}</td>
                                        <td class="p-2 border">${this.formatCurrency(item.total)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${invoice.notes ? `<div class="mb-4"><h4 class="font-bold mb-2">ملاحظات:</h4><p class="text-gray-700">${invoice.notes}</p></div>` : ''}

                    <div class="flex justify-end space-x-2">
                        <button onclick="farmSystem.printInvoice('${invoice.id}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            <i class="fas fa-print mr-2"></i>
                            طباعة
                        </button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // طباعة الفاتورة
    printInvoice(invoiceId) {
        try {
            const farmInvoices = this.invoices[this.currentFarm] || [];
            const invoice = farmInvoices.find(inv => inv.id === invoiceId);

            if (!invoice) {
                this.showNotification('الفاتورة غير موجودة', 'error');
                return;
            }

            // إنشاء نافذة طباعة مخصصة
            this.createPrintableInvoice(invoice);

        } catch (error) {
            console.error('خطأ في طباعة الفاتورة:', error);
            this.showNotification('خطأ في طباعة الفاتورة', 'error');
        }
    }

    // إنشاء فاتورة قابلة للطباعة
    createPrintableInvoice(invoice) {
        // الحصول على اسم العميل الصحيح
        let customerName = invoice.customerName;
        if (!customerName && invoice.customerId) {
            const customer = this.customers[this.currentFarm]?.find(c => c.id === invoice.customerId);
            customerName = customer ? customer.name : 'عميل غير محدد';
        }
        if (!customerName) {
            customerName = 'عميل غير محدد';
        }

        // الحصول على اسم المزرعة
        const farmName = this.farms[this.currentFarm]?.name || 'مزرعة غير محددة';

        // إنشاء HTML للطباعة
        const printHTML = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>فاتورة رقم ${invoice.invoiceNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Arial', sans-serif;
                    direction: rtl;
                    background: white;
                    color: #333;
                    line-height: 1.6;
                    padding: 20px;
                }

                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border: 2px solid #333;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .invoice-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    position: relative;
                }

                .invoice-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
                    opacity: 0.3;
                }

                .invoice-header h1 {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    position: relative;
                    z-index: 1;
                }

                .invoice-header h2 {
                    font-size: 1.5rem;
                    margin-bottom: 5px;
                    position: relative;
                    z-index: 1;
                }

                .invoice-number {
                    font-size: 1.2rem;
                    background: rgba(255,255,255,0.2);
                    padding: 10px 20px;
                    border-radius: 25px;
                    display: inline-block;
                    margin-top: 10px;
                    position: relative;
                    z-index: 1;
                }

                .invoice-body {
                    padding: 30px;
                }

                .invoice-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    border: 1px solid #e9ecef;
                }

                .info-section h3 {
                    color: #495057;
                    margin-bottom: 15px;
                    font-size: 1.2rem;
                    border-bottom: 2px solid #667eea;
                    padding-bottom: 5px;
                }

                .info-item {
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                }

                .info-label {
                    font-weight: bold;
                    color: #495057;
                }

                .info-value {
                    color: #212529;
                }

                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 30px 0;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    border-radius: 10px;
                    overflow: hidden;
                }

                .items-table th {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 1.1rem;
                }

                .items-table td {
                    padding: 12px 15px;
                    text-align: center;
                    border-bottom: 1px solid #e9ecef;
                }

                .items-table tbody tr:nth-child(even) {
                    background: #f8f9fa;
                }

                .items-table tbody tr:hover {
                    background: #e3f2fd;
                }

                .totals-section {
                    margin-top: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    border: 2px solid #667eea;
                }

                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding: 5px 0;
                }

                .total-label {
                    font-weight: bold;
                    color: #495057;
                }

                .total-value {
                    font-weight: bold;
                    color: #212529;
                }

                .final-total {
                    border-top: 2px solid #667eea;
                    padding-top: 15px;
                    margin-top: 15px;
                    font-size: 1.3rem;
                    color: #667eea;
                }

                .notes-section {
                    margin-top: 30px;
                    padding: 20px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 10px;
                }

                .notes-section h3 {
                    color: #856404;
                    margin-bottom: 10px;
                }

                .notes-content {
                    color: #856404;
                    line-height: 1.8;
                }

                .invoice-footer {
                    margin-top: 40px;
                    text-align: center;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 0.9rem;
                }

                .status-paid {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .status-pending {
                    background: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeaa7;
                }

                .status-cancelled {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                @media print {
                    body {
                        padding: 0;
                        background: white;
                    }

                    .invoice-container {
                        border: none;
                        box-shadow: none;
                        max-width: none;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .invoice-header {
                        background: #667eea !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .items-table th {
                        background: #667eea !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="invoice-header">
                    <h1>${farmName}</h1>
                    <h2>فاتورة مبيعات</h2>
                    <div class="invoice-number">رقم الفاتورة: ${invoice.invoiceNumber}</div>
                </div>

                <div class="invoice-body">
                    <div class="invoice-info">
                        <div class="info-section">
                            <h3>معلومات العميل</h3>
                            <div class="info-item">
                                <span class="info-label">اسم العميل:</span>
                                <span class="info-value">${customerName}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">تاريخ الفاتورة:</span>
                                <span class="info-value">${this.formatDate(invoice.date)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">حالة الفاتورة:</span>
                                <span class="info-value">
                                    <span class="status-badge status-${invoice.status}">
                                        ${invoice.status === 'paid' ? 'مدفوعة' : invoice.status === 'pending' ? 'معلقة' : 'ملغية'}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>معلومات المزرعة</h3>
                            <div class="info-item">
                                <span class="info-label">اسم المزرعة:</span>
                                <span class="info-value">${farmName}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">تاريخ الإنشاء:</span>
                                <span class="info-value">${this.formatDate(invoice.createdAt || invoice.date)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">رقم الفاتورة:</span>
                                <span class="info-value">${invoice.invoiceNumber}</span>
                            </div>
                        </div>
                    </div>

                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>الصنف</th>
                                <th>الكمية</th>
                                <th>سعر الوحدة</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.items.map(item => `
                                <tr>
                                    <td>${this.getItemTypeName(item.type)}</td>
                                    <td>${item.quantity}</td>
                                    <td>${this.formatCurrency(item.price)}</td>
                                    <td>${this.formatCurrency(item.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals-section">
                        <div class="total-row">
                            <span class="total-label">المجموع الفرعي:</span>
                            <span class="total-value">${this.formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div class="total-row">
                            <span class="total-label">الضريبة:</span>
                            <span class="total-value">${this.formatCurrency(invoice.tax || 0)}</span>
                        </div>
                        <div class="total-row final-total">
                            <span class="total-label">الإجمالي النهائي:</span>
                            <span class="total-value">${this.formatCurrency(invoice.total)}</span>
                        </div>
                    </div>

                    ${invoice.notes ? `
                        <div class="notes-section">
                            <h3>ملاحظات:</h3>
                            <div class="notes-content">${invoice.notes}</div>
                        </div>
                    ` : ''}

                    <div class="invoice-footer">
                        <p>تم إنشاء هذه الفاتورة بواسطة نظام إدارة مزارع الدواجن</p>
                        <p>تاريخ الطباعة: ${this.formatDate(new Date().toISOString())}</p>
                    </div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
        `;

        // فتح نافذة جديدة للطباعة
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printHTML);
        printWindow.document.close();

        this.showNotification('تم تحضير الفاتورة للطباعة', 'success');
    }

    // تصدير الفاتورة كـ PDF
    exportInvoiceAsPDF(invoice) {
        try {
            this.showNotification('جاري تحضير فاتورة PDF...', 'warning');

            // التحقق من وجود مكتبة jsPDF
            if (typeof window.jspdf === 'undefined') {
                this.showNotification('خطأ: مكتبة PDF غير متاحة', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // إعداد الخط للعربية مع تحسينات
            doc.setFont('helvetica');
            doc.setLanguage('ar');

            const farmName = this.farms[this.currentFarm]?.name || 'المزرعة';

            // رأس الفاتورة مع تحسين العربية
            doc.setFontSize(20);
            doc.text(farmName, 105, 20, { align: 'center' });

            doc.setFontSize(16);
            doc.text(`فاتورة رقم: ${invoice.invoiceNumber}`, 105, 35, { align: 'center' });

            // خط فاصل تحت العنوان
            doc.line(20, 45, 190, 45);

            // معلومات الفاتورة مع تحسين العربية
            doc.setFontSize(12);
            let yPos = 55;

            // إطار للمعلومات
            doc.rect(15, yPos - 5, 180, 35);

            // الحصول على اسم العميل الصحيح
            let customerName = invoice.customerName;
            if (!customerName && invoice.customerId) {
                const customer = this.customers[this.currentFarm]?.find(c => c.id === invoice.customerId);
                customerName = customer ? customer.name : 'عميل غير محدد';
            }
            if (!customerName) {
                customerName = 'عميل غير محدد';
            }

            // معلومات بالعربية فقط
            doc.setFontSize(14);
            doc.text(`العميل: ${customerName}`, 20, yPos + 5);
            yPos += 12;

            doc.text(`التاريخ: ${this.formatDate(invoice.date)}`, 20, yPos);
            yPos += 12;

            const statusAr = invoice.status === 'paid' ? 'مدفوعة' : 'معلقة';
            doc.text(`الحالة: ${statusAr}`, 20, yPos);
            yPos += 20;

            // عناصر الفاتورة مع تحسين العربية
            doc.setFontSize(16);
            doc.text('عناصر الفاتورة', 105, yPos, { align: 'center' });
            yPos += 15;

            // إطار الجدول
            const tableStartY = yPos;
            doc.rect(15, tableStartY - 5, 180, 15 + (invoice.items.length * 10));

            // رأس الجدول بالعربية (RTL)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');

            // خلفية رأس الجدول
            doc.setFillColor(240, 240, 240);
            doc.rect(15, tableStartY - 5, 180, 15, 'F');

            // عناوين الأعمدة من اليمين لليسار
            doc.text('الصنف', 170, yPos, { align: 'center' });
            doc.text('الكمية', 130, yPos, { align: 'center' });
            doc.text('السعر', 90, yPos, { align: 'center' });
            doc.text('الإجمالي', 50, yPos, { align: 'center' });

            // خطوط فاصلة عمودية
            doc.line(65, tableStartY - 5, 65, tableStartY + 10 + (invoice.items.length * 10));
            doc.line(105, tableStartY - 5, 105, tableStartY + 10 + (invoice.items.length * 10));
            doc.line(145, tableStartY - 5, 145, tableStartY + 10 + (invoice.items.length * 10));

            yPos += 10;

            // خط تحت الرأس
            doc.line(15, yPos, 195, yPos);
            yPos += 5;

            // عناصر الفاتورة مع ترتيب RTL
            doc.setFont('helvetica', 'normal');
            invoice.items.forEach(item => {
                doc.text(this.getItemTypeName(item.type), 170, yPos, { align: 'center' });
                doc.text(item.quantity.toString(), 130, yPos, { align: 'center' });
                doc.text(this.formatCurrency(item.price), 90, yPos, { align: 'center' });
                doc.text(this.formatCurrency(item.total), 50, yPos, { align: 'center' });
                yPos += 10;
            });

            // خط فاصل
            yPos += 5;
            doc.line(120, yPos, 190, yPos);
            yPos += 10;

            // المجاميع مع تحسين العربية
            yPos += 10;

            // إطار المجاميع
            doc.rect(120, yPos - 5, 75, 25);
            doc.setFillColor(250, 250, 250);
            doc.rect(120, yPos - 5, 75, 25, 'F');

            doc.setFontSize(12);
            doc.text(`المجموع الفرعي: ${this.formatCurrency(invoice.subtotal)}`, 125, yPos + 5);
            yPos += 12;

            // خط فاصل
            doc.line(125, yPos, 190, yPos);
            yPos += 8;

            // الإجمالي
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(`الإجمالي: ${this.formatCurrency(invoice.total)}`, 125, yPos);

            // الملاحظات مع تحسين العربية
            if (invoice.notes) {
                yPos += 25;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text('ملاحظات:', 20, yPos);
                yPos += 10;

                // إطار للملاحظات
                const notesHeight = Math.max(20, Math.ceil(invoice.notes.length / 80) * 8);
                doc.rect(15, yPos - 5, 180, notesHeight);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);

                // تقسيم النص الطويل إلى أسطر
                const noteLines = doc.splitTextToSize(invoice.notes, 170);
                doc.text(noteLines, 20, yPos);
            }

            // حفظ الملف
            const fileName = `invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            this.showNotification('تم تصدير الفاتورة كـ PDF بنجاح');

        } catch (error) {
            console.error('خطأ في تصدير فاتورة PDF:', error);
            this.showNotification(`خطأ في تصدير الفاتورة: ${error.message}`, 'error');
        }
    }

    // حذف الفاتورة
    deleteInvoice(invoiceId) {
        const farmInvoices = this.invoices[this.currentFarm] || [];
        const invoiceIndex = farmInvoices.findIndex(inv => inv.id === invoiceId);

        if (invoiceIndex !== -1) {
            // حذف الإيراد المرتبط بالفاتورة
            const farmRevenues = this.revenues[this.currentFarm] || [];
            const revenueIndex = farmRevenues.findIndex(rev => rev.invoiceId === invoiceId);
            if (revenueIndex !== -1) {
                farmRevenues.splice(revenueIndex, 1);
            }

            // حذف الفاتورة
            farmInvoices.splice(invoiceIndex, 1);

            this.saveAllData();
            this.loadInvoicesSection();

            this.showNotification('تم حذف الفاتورة بنجاح');
        }
    }

    // حفظ جميع البيانات
    saveAllData() {
        this.saveData('farms', this.farms);
        this.saveData('flocks', this.flocks);
        this.saveData('expenses', this.expenses);
        this.saveData('revenues', this.revenues);
        this.saveData('invoices', this.invoices);
        this.saveData('customers', this.customers);
        this.saveData('partnerships', this.partnerships);
        this.saveData('settings', this.settings);
        localStorage.setItem('currentFarm', this.currentFarm);
        localStorage.setItem('language', this.currentLanguage);
        localStorage.setItem('theme', this.currentTheme);
    }
}

// إنشاء مثيل من النظام
const farmSystem = new PoultryFarmSystem();

// وظائف عامة
function showSection(sectionId, event = null) {
    const targetElement = event ? event.target : null;
    farmSystem.showSection(sectionId, targetElement);

    // إذا كان القسم هو الإعدادات، تحديث جدول المزارع
    if (sectionId === 'settings') {
        setTimeout(() => {
            updateFarmsTable();
        }, 100);
    }
}

// تم إزالة دالة toggleLanguage - النظام يعمل بالعربية فقط

function toggleTheme() {
    farmSystem.currentTheme = farmSystem.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', farmSystem.currentTheme);
    farmSystem.applyTheme();
}

// دالة تسجيل الخروج العامة
function logout() {
    farmSystem.logout();
}

// دالة معالجة تسجيل الدخول بحساب Google (عامة)
function handleGoogleSignIn(response) {
    farmSystem.handleGoogleSignIn(response);
}

// دالة المزامنة اليدوية
function forceSync() {
    const syncBtn = document.getElementById('forceSyncBtn');

    if (syncBtn) {
        // إظهار مؤشر التحميل
        const originalContent = syncBtn.innerHTML;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i>';
        syncBtn.disabled = true;
        syncBtn.classList.add('syncing');

        // تحديث نص المزامنة
        const syncText = document.getElementById('syncText');
        const originalSyncText = syncText.textContent;
        syncText.textContent = 'جاري المزامنة...';

        // تنفيذ المزامنة
        farmSystem.forceSync().then(() => {
            // إظهار رسالة نجاح مؤقتة
            syncBtn.innerHTML = '<i class="fas fa-check text-xs"></i>';
            syncBtn.classList.remove('syncing');
            syncBtn.classList.add('success');
            syncText.textContent = 'تمت المزامنة';

            // العودة للحالة الأصلية بعد ثانيتين
            setTimeout(() => {
                syncBtn.innerHTML = originalContent;
                syncBtn.disabled = false;
                syncBtn.classList.remove('success');
                syncText.textContent = originalSyncText;
            }, 2000);
        }).catch(() => {
            // إظهار رسالة خطأ مؤقتة
            syncBtn.innerHTML = '<i class="fas fa-exclamation-triangle text-xs"></i>';
            syncBtn.classList.remove('syncing');
            syncBtn.classList.add('error');
            syncText.textContent = 'فشل في المزامنة';

            // العودة للحالة الأصلية بعد ثانيتين
            setTimeout(() => {
                syncBtn.innerHTML = originalContent;
                syncBtn.disabled = false;
                syncBtn.classList.remove('error');
                syncText.textContent = originalSyncText;
            }, 2000);
        });
    } else {
        // إذا لم يوجد الزر، تنفيذ المزامنة مباشرة
        farmSystem.forceSync();
    }
}

// دالة تبديل الوضع المظلم
function toggleDarkMode() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');

    body.classList.toggle('dark-mode');

    if (body.classList.contains('dark-mode')) {
        // الوضع المظلم - أيقونة القمر
        if (themeIcon) {
            themeIcon.className = 'fas fa-moon';
        }
        localStorage.setItem('darkMode', 'enabled');
    } else {
        // الوضع الفاتح - أيقونة الشمس
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
        localStorage.setItem('darkMode', 'disabled');
    }
}

// تحميل إعدادات الوضع المظلم عند بدء التشغيل
function loadDarkModeSettings() {
    const darkMode = localStorage.getItem('darkMode');
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');

    if (darkMode === 'enabled') {
        body.classList.add('dark-mode');
        if (themeIcon) {
            themeIcon.className = 'fas fa-moon';
        }
    } else {
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
    }
}

// تحميل إعدادات الوضع المظلم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadDarkModeSettings();
});

// دالة تأكيد حذف المزرعة
function confirmDeleteFarm(farmId, farmName) {
    if (Object.keys(farmSystem.farms).length <= 1) {
        farmSystem.showNotification('لا يمكن حذف المزرعة الوحيدة المتبقية', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">تأكيد حذف المزرعة</h3>
                <p class="text-sm text-gray-500 mb-6">
                    هل أنت متأكد من حذف مزرعة "<strong>${farmName}</strong>"؟<br>
                    سيتم حذف جميع البيانات المرتبطة بها نهائياً.
                </p>
                <div class="flex space-x-3 justify-center">
                    <button onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
                        إلغاء
                    </button>
                    <button onclick="farmSystem.deleteFarm('${farmId}'); this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        حذف نهائياً
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// إضافة دالة حذف المزرعة إلى farmSystem
farmSystem.confirmDeleteFarm = confirmDeleteFarm;

farmSystem.deleteFarm = function(farmId) {
    if (Object.keys(this.farms).length <= 1) {
        this.showNotification('لا يمكن حذف المزرعة الوحيدة المتبقية', 'error');
        return;
    }

    // حذف المزرعة وجميع بياناتها
    delete this.farms[farmId];
    delete this.expenses[farmId];
    delete this.revenues[farmId];
    delete this.invoices[farmId];
    delete this.customers[farmId];
    delete this.partnerships[farmId];

    // إذا كانت المزرعة المحذوفة هي المزرعة الحالية، التبديل لمزرعة أخرى
    if (this.currentFarm === farmId) {
        const remainingFarms = Object.keys(this.farms);
        if (remainingFarms.length > 0) {
            this.currentFarm = remainingFarms[0];
            localStorage.setItem('currentFarm', this.currentFarm);
        }
    }

    // حفظ البيانات وتحديث الواجهة
    this.saveAllData();
    this.loadFarmSelector();
    this.updateDashboard();

    this.showNotification('تم حذف المزرعة بنجاح', 'success');
};

// وظائف الإعدادات
function loadSettings() {
    // تحميل الإعدادات المحفوظة
    const settings = JSON.parse(localStorage.getItem('systemSettings')) || {
        language: 'ar',
        currency: 'SAR',
        darkMode: false,
        notifications: {
            sync: true,
            invoice: true,
            backup: true,
            error: true
        },
        backup: {
            auto: true,
            frequency: 'daily'
        },
        security: {
            autoLogin: false,
            encryptData: true
        }
    };

    // تطبيق الإعدادات على الواجهة
    document.getElementById('languageSetting').value = settings.language;
    document.getElementById('currencySetting').value = settings.currency;

    // إعدادات الإشعارات
    document.getElementById('syncNotifications').checked = settings.notifications.sync;
    document.getElementById('invoiceNotifications').checked = settings.notifications.invoice;
    document.getElementById('backupNotifications').checked = settings.notifications.backup;
    document.getElementById('errorNotifications').checked = settings.notifications.error;

    // إعدادات النسخ الاحتياطي
    document.getElementById('autoBackup').checked = settings.backup.auto;
    document.getElementById('backupFrequency').value = settings.backup.frequency;

    // إعدادات الأمان
    document.getElementById('autoLogin').checked = settings.security.autoLogin;
    document.getElementById('encryptData').checked = settings.security.encryptData;

    // تحديث زر الوضع المظلم في الإعدادات
    const settingsThemeToggle = document.getElementById('settingsThemeToggle');
    if (settingsThemeToggle) {
        if (document.body.classList.contains('dark-mode')) {
            settingsThemeToggle.classList.add('dark');
        } else {
            settingsThemeToggle.classList.remove('dark');
        }
    }
}

function saveSettings() {
    const settings = {
        language: document.getElementById('languageSetting').value,
        currency: document.getElementById('currencySetting').value,
        darkMode: document.body.classList.contains('dark-mode'),
        notifications: {
            sync: document.getElementById('syncNotifications').checked,
            invoice: document.getElementById('invoiceNotifications').checked,
            backup: document.getElementById('backupNotifications').checked,
            error: document.getElementById('errorNotifications').checked
        },
        backup: {
            auto: document.getElementById('autoBackup').checked,
            frequency: document.getElementById('backupFrequency').value
        },
        security: {
            autoLogin: document.getElementById('autoLogin').checked,
            encryptData: document.getElementById('encryptData').checked
        }
    };

    localStorage.setItem('systemSettings', JSON.stringify(settings));
    farmSystem.showNotification('تم حفظ الإعدادات بنجاح', 'success');

    // تطبيق بعض الإعدادات فوراً
    if (settings.language !== farmSystem.currentLanguage) {
        // يمكن إضافة تغيير اللغة هنا لاحقاً
    }
}

function cancelSettings() {
    // إعادة تحميل الإعدادات المحفوظة
    loadSettings();
    farmSystem.showNotification('تم إلغاء التغييرات', 'info');
}

function resetAllSettings() {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟')) {
        localStorage.removeItem('systemSettings');
        localStorage.removeItem('darkMode');

        // إعادة تحميل الصفحة لتطبيق الإعدادات الافتراضية
        location.reload();
    }
}

function createManualBackup() {
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '2.1.0',
            farms: farmSystem.farms,
            expenses: farmSystem.expenses,
            revenues: farmSystem.revenues,
            invoices: farmSystem.invoices,
            customers: farmSystem.customers,
            partnerships: farmSystem.partnerships,
            settings: JSON.parse(localStorage.getItem('systemSettings') || '{}')
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `poultry-farm-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        farmSystem.showNotification('تم إنشاء النسخة الاحتياطية بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
        farmSystem.showNotification('فشل في إنشاء النسخة الاحتياطية', 'error');
    }
}

function changePassword() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">تغيير كلمة المرور</h3>
            <form onsubmit="handlePasswordChange(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الحالية</label>
                    <input type="password" id="currentPassword" class="w-full p-3 border border-gray-300 rounded-lg" required>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
                    <input type="password" id="newPassword" class="w-full p-3 border border-gray-300 rounded-lg" required>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور الجديدة</label>
                    <input type="password" id="confirmPassword" class="w-full p-3 border border-gray-300 rounded-lg" required>
                </div>
                <div class="flex space-x-3 justify-end">
                    <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
                        إلغاء
                    </button>
                    <button type="submit"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        تغيير كلمة المرور
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

function handlePasswordChange(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // التحقق من كلمة المرور الحالية (افتراضياً Mohamd123)
    if (currentPassword !== 'Mohamd123') {
        farmSystem.showNotification('كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        farmSystem.showNotification('كلمة المرور الجديدة غير متطابقة', 'error');
        return;
    }

    if (newPassword.length < 6) {
        farmSystem.showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    // حفظ كلمة المرور الجديدة (في تطبيق حقيقي يجب تشفيرها)
    localStorage.setItem('userPassword', newPassword);

    // إغلاق النافذة
    event.target.closest('.fixed').remove();

    farmSystem.showNotification('تم تغيير كلمة المرور بنجاح', 'success');
}

// تحميل الإعدادات عند فتح قسم الإعدادات
farmSystem.originalShowSection = farmSystem.showSection;
farmSystem.showSection = function(sectionId) {
    this.originalShowSection(sectionId);

    if (sectionId === 'settings') {
        setTimeout(loadSettings, 100);
    }
};

// دالة عرض النافذة التفصيلية لأرصدة الشراكات
function showPartnershipBalancesModal() {
    // التحقق من وجود مدير الشراكات المحسن
    if (typeof partnershipsManager !== 'undefined') {
        partnershipsManager.showPartnershipBalancesModal();
    } else {
        // إنشاء نافذة بسيطة إذا لم يكن المدير المحسن متاحاً
        showBasicPartnershipBalances();
    }
}

// دالة عرض أرصدة الشراكات الأساسية المحسنة
function showBasicPartnershipBalances() {
    const partnerships = farmSystem.partnerships[farmSystem.currentFarm] || {};
    const partners = Object.entries(partnerships);

    if (partners.length === 0) {
        farmSystem.showNotification('لا توجد شراكات مسجلة في هذه المزرعة', 'info');
        return;
    }

    let totalBalance = 0;
    let positiveBalance = 0;
    let negativeBalance = 0;

    const partnersHtml = partners.map(([partnerId, partner]) => {
        const balance = partner.currentBalance || partner.initialBalance || 0;
        totalBalance += balance;

        if (balance > 0) {
            positiveBalance += balance;
        } else if (balance < 0) {
            negativeBalance += Math.abs(balance);
        }

        // تحديد الألوان حسب المتطلبات الجديدة
        const balanceClass = balance > 0 ? 'text-success' : balance < 0 ? 'text-danger' : 'text-secondary';
        const balanceIcon = balance > 0 ? 'fa-arrow-up' : balance < 0 ? 'fa-arrow-down' : 'fa-minus';
        const cardBorderClass = balance > 0 ? 'border-success' : balance < 0 ? 'border-danger' : 'border-secondary';

        return `
            <div class="partner-card border rounded-lg p-4 mb-3 hover:bg-gray-50 transition-colors ${cardBorderClass}"
                 data-partner-name="${partner.name.toLowerCase()}"
                 data-balance="${balance}"
                 data-balance-type="${balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero'}">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <h6 class="font-semibold text-gray-800 mb-1">
                            <i class="fas fa-user me-2"></i>
                            ${partner.name}
                        </h6>
                        <p class="text-sm text-gray-600 mb-0">
                            الرصيد الافتتاحي: ${farmSystem.formatCurrency(partner.initialBalance || 0)}
                        </p>
                        ${partner.phone ? `<p class="text-xs text-gray-500 mb-0"><i class="fas fa-phone me-1"></i>${partner.phone}</p>` : ''}
                    </div>
                    <div class="col-md-6 text-end">
                        <p class="text-sm text-gray-500 mb-1">الرصيد الحالي</p>
                        <p class="text-lg font-bold ${balanceClass} mb-0">
                            <i class="fas ${balanceIcon} me-1"></i>
                            ${farmSystem.formatCurrency(Math.abs(balance))}
                        </p>
                        <small class="text-muted">
                            التغيير: ${farmSystem.formatCurrency(balance - (partner.initialBalance || 0))}
                        </small>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const modalHtml = `
        <div class="modal fade" id="partnershipBalancesModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-handshake me-2"></i>
                            تفاصيل أرصدة الشراكات
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- أدوات البحث والفلترة -->
                        <div class="row mb-4">
                            <div class="col-md-4">
                                <label class="form-label">البحث عن شريك</label>
                                <input type="text" id="partnerSearchInput" class="form-control" placeholder="ابحث بالاسم...">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">فلترة الأرصدة</label>
                                <select id="balanceFilterSelect" class="form-select">
                                    <option value="all">جميع الأرصدة</option>
                                    <option value="positive">الأرصدة الموجبة</option>
                                    <option value="negative">الأرصدة السالبة</option>
                                    <option value="zero">الأرصدة الصفرية</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">ترتيب حسب</label>
                                <select id="sortOrderSelect" class="form-select">
                                    <option value="name">الاسم</option>
                                    <option value="balance_desc">الرصيد (الأعلى أولاً)</option>
                                    <option value="balance_asc">الرصيد (الأقل أولاً)</option>
                                </select>
                            </div>
                        </div>
                        <!-- ملخص الأرصدة -->
                        <div class="row mb-4">
                            <div class="col-md-3 text-center">
                                <div class="bg-primary text-white p-3 rounded">
                                    <h4>${partners.length}</h4>
                                    <small>إجمالي الشركاء</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="bg-success text-white p-3 rounded">
                                    <h4>${farmSystem.formatCurrency(positiveBalance)}</h4>
                                    <small>الأرصدة الموجبة</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="bg-danger text-white p-3 rounded">
                                    <h4>${farmSystem.formatCurrency(negativeBalance)}</h4>
                                    <small>الأرصدة السالبة</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="bg-info text-white p-3 rounded">
                                    <h4>${farmSystem.formatCurrency(totalBalance)}</h4>
                                    <small>صافي الأرصدة</small>
                                </div>
                            </div>
                        </div>

                        <!-- قائمة الشركاء -->
                        <h6 class="mb-3">قائمة الشركاء:</h6>
                        <div id="partnersListContainer" style="max-height: 400px; overflow-y: auto;">
                            ${partnersHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary me-2" onclick="printPartnershipBalances()">
                            <i class="fas fa-print me-1"></i>
                            طباعة
                        </button>
                        <button type="button" class="btn btn-success me-2" onclick="exportPartnershipBalancesToExcel()">
                            <i class="fas fa-file-excel me-1"></i>
                            تصدير Excel
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>
                            إغلاق
                        </button>
                        <button type="button" class="btn btn-primary" onclick="printPartnershipBalances()">
                            <i class="fas fa-print me-1"></i>
                            طباعة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // إزالة النافذة السابقة إن وجدت
    const existingModal = document.getElementById('partnershipBalancesModal');
    if (existingModal) {
        existingModal.remove();
    }

    // إضافة النافذة الجديدة
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // إظهار النافذة
    const modal = new bootstrap.Modal(document.getElementById('partnershipBalancesModal'));
    modal.show();

    // إضافة مستمعي الأحداث للبحث والفلترة
    setupPartnershipModalEventListeners();
}

// دالة إعداد مستمعي الأحداث للنافذة المنبثقة
function setupPartnershipModalEventListeners() {
    // البحث
    const searchInput = document.getElementById('partnerSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterPartnersList);
    }

    // فلترة الأرصدة
    const balanceFilter = document.getElementById('balanceFilterSelect');
    if (balanceFilter) {
        balanceFilter.addEventListener('change', filterPartnersList);
    }

    // ترتيب القائمة
    const sortOrder = document.getElementById('sortOrderSelect');
    if (sortOrder) {
        sortOrder.addEventListener('change', sortPartnersList);
    }
}

// دالة فلترة قائمة الشركاء
function filterPartnersList() {
    const searchTerm = document.getElementById('partnerSearchInput').value.toLowerCase();
    const balanceFilter = document.getElementById('balanceFilterSelect').value;
    const partnerCards = document.querySelectorAll('.partner-card');

    partnerCards.forEach(card => {
        const partnerName = card.getAttribute('data-partner-name');
        const balanceType = card.getAttribute('data-balance-type');

        let showCard = true;

        // فلترة البحث
        if (searchTerm && !partnerName.includes(searchTerm)) {
            showCard = false;
        }

        // فلترة الأرصدة
        if (balanceFilter !== 'all') {
            if (balanceFilter !== balanceType) {
                showCard = false;
            }
        }

        card.style.display = showCard ? 'block' : 'none';
    });
}

// دالة ترتيب قائمة الشركاء
function sortPartnersList() {
    const sortOrder = document.getElementById('sortOrderSelect').value;
    const container = document.getElementById('partnersListContainer');
    const cards = Array.from(container.querySelectorAll('.partner-card'));

    cards.sort((a, b) => {
        switch (sortOrder) {
            case 'name':
                return a.getAttribute('data-partner-name').localeCompare(b.getAttribute('data-partner-name'));
            case 'balance_desc':
                return parseFloat(b.getAttribute('data-balance')) - parseFloat(a.getAttribute('data-balance'));
            case 'balance_asc':
                return parseFloat(a.getAttribute('data-balance')) - parseFloat(b.getAttribute('data-balance'));
            default:
                return 0;
        }
    });

    // إعادة ترتيب العناصر في DOM
    cards.forEach(card => container.appendChild(card));
}

// دالة تصدير أرصدة الشراكات إلى Excel
function exportPartnershipBalancesToExcel() {
    const partnerships = farmSystem.partnerships[farmSystem.currentFarm] || {};
    const partners = Object.entries(partnerships);

    if (partners.length === 0) {
        farmSystem.showNotification('لا توجد شراكات لتصديرها', 'warning');
        return;
    }

    // إنشاء البيانات للتصدير
    const data = [
        ['اسم الشريك', 'الرصيد الافتتاحي', 'الرصيد الحالي', 'التغيير', 'نسبة الشراكة', 'الهاتف']
    ];

    partners.forEach(([partnerId, partner]) => {
        const currentBalance = partner.currentBalance || partner.initialBalance || 0;
        const initialBalance = partner.initialBalance || 0;
        const change = currentBalance - initialBalance;

        data.push([
            partner.name,
            initialBalance,
            currentBalance,
            change,
            (partner.percentage || 0) + '%',
            partner.phone || ''
        ]);
    });

    // تحويل البيانات إلى CSV
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });

    // تحميل الملف
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `أرصدة_الشراكات_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    farmSystem.showNotification('تم تصدير أرصدة الشراكات بنجاح', 'success');
}

// دالة طباعة أرصدة الشراكات
function printPartnershipBalances() {
    const partnerships = farmSystem.partnerships[farmSystem.currentFarm] || {};
    const partners = Object.entries(partnerships);

    const printWindow = window.open('', '_blank');
    const printHtml = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير أرصدة الشراكات</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    direction: rtl;
                    margin: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: right;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .positive { color: #28a745; }
                .negative { color: #dc3545; }
                .zero { color: #6c757d; }
                .summary {
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير أرصدة الشراكات</h1>
                <p>مزرعة: ${farmSystem.currentFarm}</p>
                <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
            </div>

            <div class="summary">
                <h3>ملخص الأرصدة:</h3>
                <p>إجمالي الشركاء: ${partners.length}</p>
                <p>صافي الأرصدة: ${farmSystem.formatCurrency(farmSystem.calculateTotalPartnerBalances(partnerships))}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>اسم الشريك</th>
                        <th>الرصيد الافتتاحي</th>
                        <th>الرصيد الحالي</th>
                        <th>التغيير</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${partners.map(([partnerId, partner]) => {
                        const currentBalance = partner.currentBalance || partner.initialBalance || 0;
                        const initialBalance = partner.initialBalance || 0;
                        const change = currentBalance - initialBalance;
                        const balanceClass = currentBalance > 0 ? 'positive' : currentBalance < 0 ? 'negative' : 'zero';
                        const status = currentBalance > 0 ? 'دائن' : currentBalance < 0 ? 'مدين' : 'متوازن';

                        return `
                            <tr>
                                <td>${partner.name}</td>
                                <td>${farmSystem.formatCurrency(initialBalance)}</td>
                                <td class="${balanceClass}">${farmSystem.formatCurrency(currentBalance)}</td>
                                <td class="${change >= 0 ? 'positive' : 'negative'}">${farmSystem.formatCurrency(change)}</td>
                                <td>${status}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
                تم إنشاء هذا التقرير بواسطة نظام إدارة مزارع الدواجن
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.print();
}

// دوال خاصة بـ Electron
if (typeof window !== 'undefined' && window.electronAPI) {
    // معالجات قائمة التطبيق
    window.electronAPI.onMenuNew(() => {
        if (confirm('هل تريد إنشاء مزرعة جديدة؟ سيتم فقدان البيانات غير المحفوظة.')) {
            farmSystem.clearAllData();
            farmSystem.showNotification('تم إنشاء مزرعة جديدة', 'success');
        }
    });

    window.electronAPI.onMenuSave(() => {
        saveDataToFile();
    });

    window.electronAPI.onMenuSaveAs((event, filePath) => {
        saveDataToFile(filePath);
    });

    window.electronAPI.onMenuOpen((event, filePath) => {
        loadDataFromFile(filePath);
    });

    window.electronAPI.onMenuExportPdf(() => {
        farmSystem.exportAllDataAsPDF();
    });

    window.electronAPI.onMenuExportExcel(() => {
        farmSystem.exportAllDataAsExcel();
    });

    // دالة حفظ البيانات في ملف
    async function saveDataToFile(filePath = null) {
        try {
            if (!filePath) {
                const result = await window.electronAPI.showSaveDialog({
                    title: 'حفظ بيانات المزرعة',
                    defaultPath: `مزرعة-${farmSystem.currentFarm}-${new Date().toISOString().split('T')[0]}.json`,
                    filters: [
                        { name: 'ملفات النسخ الاحتياطي', extensions: ['json'] },
                        { name: 'جميع الملفات', extensions: ['*'] }
                    ]
                });

                if (result.canceled) return;
                filePath = result.filePath;
            }

            const data = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                currentFarm: farmSystem.currentFarm,
                farms: farmSystem.farms,
                expenses: farmSystem.expenses,
                revenues: farmSystem.revenues,
                invoices: farmSystem.invoices,
                customers: farmSystem.customers,
                partnerships: farmSystem.partnerships,
                settings: farmSystem.settings
            };

            const saveResult = await window.electronAPI.saveFile(data, filePath);

            if (saveResult.success) {
                farmSystem.showNotification('تم حفظ البيانات بنجاح', 'success');
            } else {
                farmSystem.showNotification('فشل في حفظ البيانات: ' + saveResult.error, 'error');
            }
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            farmSystem.showNotification('حدث خطأ أثناء حفظ البيانات', 'error');
        }
    }

    // دالة تحميل البيانات من ملف
    async function loadDataFromFile(filePath = null) {
        try {
            if (!filePath) {
                const result = await window.electronAPI.showOpenDialog({
                    title: 'تحميل بيانات المزرعة',
                    filters: [
                        { name: 'ملفات النسخ الاحتياطي', extensions: ['json'] },
                        { name: 'جميع الملفات', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });

                if (result.canceled) return;
                filePath = result.filePaths[0];
            }

            const loadResult = await window.electronAPI.loadFile(filePath);

            if (loadResult.success) {
                const data = loadResult.data;

                // التحقق من صحة البيانات
                if (!data.version || !data.farms) {
                    throw new Error('ملف البيانات غير صالح');
                }

                // تحميل البيانات
                farmSystem.farms = data.farms || {};
                farmSystem.expenses = data.expenses || {};
                farmSystem.revenues = data.revenues || {};
                farmSystem.invoices = data.invoices || {};
                farmSystem.customers = data.customers || {};
                farmSystem.partnerships = data.partnerships || {};
                farmSystem.settings = data.settings || farmSystem.getDefaultSettings();

                if (data.currentFarm) {
                    farmSystem.currentFarm = data.currentFarm;
                }

                // حفظ البيانات محلياً
                farmSystem.saveAllData();

                // إعادة تحميل الواجهة
                farmSystem.loadFarmSelector();
                farmSystem.updateDashboard();

                farmSystem.showNotification('تم تحميل البيانات بنجاح', 'success');
            } else {
                farmSystem.showNotification('فشل في تحميل البيانات: ' + loadResult.error, 'error');
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            farmSystem.showNotification('حدث خطأ أثناء تحميل البيانات', 'error');
        }
    }

    // إضافة دالة مسح جميع البيانات
    farmSystem.clearAllData = function() {
        this.farms = this.getDefaultFarms();
        this.expenses = {};
        this.revenues = {};
        this.invoices = {};
        this.customers = {};
        this.partnerships = {};
        this.currentFarm = 'default';

        this.saveAllData();
        this.loadFarmSelector();
        this.updateDashboard();
    };

    // إضافة دالة حفظ جميع البيانات
    farmSystem.saveAllData = function() {
        this.saveData('farms', this.farms);
        this.saveData('expenses', this.expenses);
        this.saveData('revenues', this.revenues);
        this.saveData('invoices', this.invoices);
        this.saveData('customers', this.customers);
        this.saveData('partnerships', this.partnerships);
        this.saveData('settings', this.settings);
        localStorage.setItem('currentFarm', this.currentFarm);
    };

    console.log('تم تحميل دعم Electron بنجاح');
}

function toggleTheme() {
    farmSystem.currentTheme = farmSystem.currentTheme === 'light' ? 'dark' : 'light';
    farmSystem.applyTheme();
    farmSystem.saveAllData();
}

function switchFarm() {
    const selector = document.getElementById('farmSelector');
    const newFarmId = selector.value;

    if (newFarmId && newFarmId !== farmSystem.currentFarm) {
        farmSystem.currentFarm = newFarmId;

        // تحديث جميع الأقسام
        farmSystem.updateDashboard();

        // إعادة تحميل القسم الحالي إذا لم يكن لوحة التحكم
        const currentSection = document.querySelector('.section:not(.hidden)');
        if (currentSection && currentSection.id !== 'dashboard') {
            const sectionId = currentSection.id;
            switch(sectionId) {
                case 'flocks':
                    farmSystem.loadFlocksSection();
                    break;
                case 'expenses':
                    farmSystem.loadExpensesSection();
                    break;
                case 'revenues':
                    farmSystem.loadRevenuesSection();
                    break;
                case 'customers':
                    farmSystem.loadCustomersSection();
                    break;
                case 'invoices':
                    farmSystem.loadInvoicesSection();
                    break;
                case 'reports':
                    farmSystem.loadReportsSection();
                    break;
                case 'partnerships':
                    farmSystem.loadPartnershipsSection();
                    break;
                case 'settings':
                    farmSystem.loadSettingsSection();
                    break;
            }
        }

        farmSystem.saveAllData();
        farmSystem.showNotification(`تم التبديل إلى ${farmSystem.farms[newFarmId]?.name || 'المزرعة المحددة'}`);
    }
}

function showAddFarmModal() {
    const modal = document.getElementById('addFarmModal');
    if (!modal) {
        console.error('لم يتم العثور على نافذة إضافة المزرعة');
        return;
    }

    modal.classList.remove('hidden');

    // تركيز على حقل اسم المزرعة
    setTimeout(() => {
        const farmNameInput = document.getElementById('farmName');
        if (farmNameInput) {
            farmNameInput.focus();
        }
    }, 100);

    // إعداد معالج الإرسال
    const form = document.getElementById('addFarmForm');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();

            // إظهار مؤشر التحميل
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>جاري الإنشاء...';
                submitBtn.disabled = true;

                // استعادة النص الأصلي بعد فترة
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }

            farmSystem.addNewFarm();
        };
    }
}

function showAddFlockModal() {
    document.getElementById('addFlockModal').classList.remove('hidden');

    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('flockStartDate').value = today;

    // إعداد معالج الإرسال
    document.getElementById('addFlockForm').onsubmit = function(e) {
        e.preventDefault();
        farmSystem.addNewFlock();
    };
}

function addMortalityRecord(flockId) {
    document.getElementById('addMortalityModal').classList.remove('hidden');
    document.getElementById('mortalityFlockId').value = flockId;

    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('mortalityDate').value = today;

    // إعداد معالج الإرسال
    document.getElementById('addMortalityForm').onsubmit = function(e) {
        e.preventDefault();
        farmSystem.addMortalityRecord();
    };
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');

    // إعادة تعيين النماذج
    const forms = document.querySelectorAll(`#${modalId} form`);
    forms.forEach(form => form.reset());
}

function viewFlockDetails(flockId) {
    farmSystem.viewFlockDetails(flockId);
}

function editFlock(flockId) {
    farmSystem.editFlock(flockId);
}

function deleteFlock(flockId) {
    if (confirm('هل أنت متأكد من حذف هذا القطيع؟')) {
        farmSystem.deleteFlock(flockId);
    }
}

function showAddExpenseModal(type) {
    document.getElementById('addExpenseModal').classList.remove('hidden');
    document.getElementById('expenseType').value = type;

    // إخفاء جميع الحقول المخصصة
    document.querySelectorAll('#feedFields, #medicineFields, #utilitiesFields, #laborFields').forEach(field => {
        field.classList.add('hidden');
    });

    // إظهار الحقول المناسبة للنوع
    if (type === 'feed') {
        document.getElementById('feedFields').classList.remove('hidden');
        document.getElementById('expenseModalTitle').textContent = 'إضافة مصروف أعلاف';
    } else if (type === 'medicine') {
        document.getElementById('medicineFields').classList.remove('hidden');
        document.getElementById('expenseModalTitle').textContent = 'إضافة مصروف أدوية';
    } else if (type === 'utilities') {
        document.getElementById('utilitiesFields').classList.remove('hidden');
        document.getElementById('expenseModalTitle').textContent = 'إضافة مصروف مرافق';
    } else if (type === 'labor') {
        document.getElementById('laborFields').classList.remove('hidden');
        document.getElementById('expenseModalTitle').textContent = 'إضافة مصروف عمالة';
    } else {
        document.getElementById('expenseModalTitle').textContent = 'إضافة مصروف آخر';
    }

    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;

    // إعداد معالج الإرسال
    document.getElementById('addExpenseForm').onsubmit = function(e) {
        e.preventDefault();
        farmSystem.addNewExpense();
    };

    // إعداد حساب المبلغ التلقائي
    farmSystem.setupExpenseCalculation(type);
}

function viewExpenseDetails(expenseId) {
    farmSystem.viewExpenseDetails(expenseId);
}

function editExpense(expenseId) {
    farmSystem.editExpense(expenseId);
}

function deleteExpense(expenseId) {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
        farmSystem.deleteExpense(expenseId);
    }
}

function showAddRevenueModal(type) {
    document.getElementById('addRevenueModal').classList.remove('hidden');
    document.getElementById('revenueType').value = type;

    // إخفاء جميع الحقول المخصصة
    document.querySelectorAll('#eggsFields, #manureFields, #chickensFields').forEach(field => {
        field.classList.add('hidden');
    });

    // إظهار الحقول المناسبة للنوع
    if (type === 'eggs') {
        document.getElementById('eggsFields').classList.remove('hidden');
        document.getElementById('revenueModalTitle').textContent = 'بيع بيض';
    } else if (type === 'manure') {
        document.getElementById('manureFields').classList.remove('hidden');
        document.getElementById('revenueModalTitle').textContent = 'بيع سبلة';
    } else if (type === 'chickens') {
        document.getElementById('chickensFields').classList.remove('hidden');
        document.getElementById('revenueModalTitle').textContent = 'بيع فراخ';
    } else {
        document.getElementById('revenueModalTitle').textContent = 'إيراد آخر';
    }

    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('revenueDate').value = today;

    // إعداد معالج الإرسال
    document.getElementById('addRevenueForm').onsubmit = function(e) {
        e.preventDefault();
        farmSystem.addNewRevenue();
    };

    // إعداد حساب المبلغ التلقائي
    farmSystem.setupRevenueCalculation(type);
}

function viewRevenueDetails(revenueId) {
    farmSystem.viewRevenueDetails(revenueId);
}

function editRevenue(revenueId) {
    farmSystem.editRevenue(revenueId);
}

function deleteRevenue(revenueId) {
    if (confirm('هل أنت متأكد من حذف هذا الإيراد؟')) {
        farmSystem.deleteRevenue(revenueId);
    }
}

function showProfitDetails() {
    farmSystem.showProfitDetails();
}

function showAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.remove('hidden');

    // إعداد معالج الإرسال
    document.getElementById('addCustomerForm').onsubmit = function(e) {
        e.preventDefault();
        farmSystem.addNewCustomer();
    };
}

function viewCustomerDetails(customerId) {
    farmSystem.viewCustomerDetails(customerId);
}

function editCustomer(customerId) {
    farmSystem.editCustomer(customerId);
}

function deleteCustomer(customerId) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
        farmSystem.deleteCustomer(customerId);
    }
}

// وظائف الشراكات
function showAddPartnerModal() {
    document.getElementById('addPartnerModal').classList.remove('hidden');

    // تعيين التاريخ الافتراضي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('partnerStartDate').value = today;

    document.getElementById('addPartnerForm').onsubmit = function(e) {
        e.preventDefault();
        farmSystem.addNewPartner();
    };
}

function editPartner(partnerId) {
    farmSystem.editPartner(partnerId);
}

function deletePartner(partnerId) {
    if (confirm('هل أنت متأكد من حذف هذا الشريك؟')) {
        farmSystem.deletePartner(partnerId);
    }
}

// وظائف التقارير
function showProfitLossReport() {
    farmSystem.showProfitLossReport();
}

function showInventoryReport() {
    farmSystem.showInventoryReport();
}

function showCustomerSalesReport() {
    farmSystem.showCustomerSalesReport();
}

function showDetailedExpenseReport() {
    farmSystem.showDetailedExpenseReport();
}

function showPeriodComparisonReport() {
    farmSystem.showPeriodComparisonReport();
}

function showExportOptions() {
    farmSystem.showExportOptions();
}

// وظائف الفواتير
function showAddInvoiceModal() {
    document.getElementById('addInvoiceModal').classList.remove('hidden');

    // تحميل قائمة العملاء
    farmSystem.loadCustomersForInvoice();

    // تعيين التاريخ الحالي
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];

    // إعداد معالج الإرسال
    document.getElementById('addInvoiceForm').onsubmit = function(e) {
        e.preventDefault();
        farmSystem.addNewInvoice();
    };

    // إضافة عنصر افتراضي
    addInvoiceItem();
}

function addInvoiceItem() {
    const tableBody = document.getElementById('invoiceItemsTable');
    const itemIndex = tableBody.children.length;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="p-2 border">
            <select class="w-full p-1 border border-gray-300 rounded" name="itemType_${itemIndex}" onchange="updateInvoiceCalculations()">
                <option value="eggs">بيض</option>
                <option value="manure">سبلة</option>
                <option value="chickens">فراخ</option>
                <option value="other">أخرى</option>
            </select>
        </td>
        <td class="p-2 border">
            <input type="number" class="w-full p-1 border border-gray-300 rounded" name="quantity_${itemIndex}" min="0" step="0.01" onchange="updateInvoiceCalculations()" required>
        </td>
        <td class="p-2 border">
            <input type="number" class="w-full p-1 border border-gray-300 rounded" name="price_${itemIndex}" min="0" step="0.01" onchange="updateInvoiceCalculations()" required>
        </td>
        <td class="p-2 border">
            <span class="item-total">0.00 ج.م</span>
        </td>
        <td class="p-2 border text-center">
            <button type="button" onclick="removeInvoiceItem(this)" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tableBody.appendChild(row);
}

function removeInvoiceItem(button) {
    const row = button.closest('tr');
    row.remove();
    updateInvoiceCalculations();
}

function updateInvoiceCalculations() {
    const tableBody = document.getElementById('invoiceItemsTable');
    let subtotal = 0;

    // حساب إجمالي كل عنصر
    Array.from(tableBody.children).forEach(row => {
        const quantityInput = row.querySelector('input[name^="quantity_"]');
        const priceInput = row.querySelector('input[name^="price_"]');
        const totalSpan = row.querySelector('.item-total');

        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const itemTotal = quantity * price;

        totalSpan.textContent = farmSystem.formatCurrency(itemTotal);
        subtotal += itemTotal;
    });

    // الإجمالي = المجموع الفرعي (بدون ضريبة)
    const total = subtotal;

    // تحديث المجاميع
    document.getElementById('invoiceSubtotal').textContent = farmSystem.formatCurrency(subtotal);
    document.getElementById('invoiceTotal').textContent = farmSystem.formatCurrency(total);
}

function viewInvoiceDetails(invoiceId) {
    farmSystem.viewInvoiceDetails(invoiceId);
}

// دالة تبديل المزرعة من dropdown
function switchFarmFromDropdown(farmId) {
    if (farmId === 'add_new_farm') {
        // إظهار نافذة إضافة مزرعة جديدة
        showAddFarmModal();
        // إعادة تعيين dropdown للمزرعة الحالية
        const dropdown = document.getElementById('farmsDropdown');
        if (dropdown) {
            dropdown.value = farmSystem.currentFarm || '';
        }
    } else if (farmId && farmId !== '') {
        // تبديل المزرعة
        farmSystem.switchFarm(farmId);
    }
}

function printInvoice(invoiceId) {
    farmSystem.printInvoice(invoiceId);
}

function editInvoice(invoiceId) {
    farmSystem.editInvoice(invoiceId);
}

function deleteInvoice(invoiceId) {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
        farmSystem.deleteInvoice(invoiceId);
    }
}

// ===== وظائف إدارة المزارع في صفحة الإعدادات =====

// تحديث جدول المزارع في صفحة الإعدادات
function updateFarmsTable() {
    const tableBody = document.getElementById('farmsTableBody');
    const noFarmsMessage = document.getElementById('noFarmsMessage');

    if (!tableBody) return;

    // مسح الجدول
    tableBody.innerHTML = '';

    const farms = Object.values(farmSystem.farms);

    if (farms.length === 0) {
        // إظهار رسالة عدم وجود مزارع
        if (noFarmsMessage) {
            noFarmsMessage.classList.remove('hidden');
        }
        return;
    }

    // إخفاء رسالة عدم وجود مزارع
    if (noFarmsMessage) {
        noFarmsMessage.classList.add('hidden');
    }

    // إضافة المزارع للجدول
    farms.forEach(farm => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        const isActive = farm.id === farmSystem.currentFarm;
        const createdDate = farm.createdAt ? new Date(farm.createdAt).toLocaleDateString('ar-SA') : 'غير محدد';

        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">
                <div class="flex items-center">
                    ${isActive ? '<i class="fas fa-check-circle text-green-500 mr-2"></i>' : '<i class="fas fa-warehouse text-gray-400 mr-2"></i>'}
                    <span class="font-medium">${farm.name}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${createdDate}</td>
            <td class="px-4 py-3 text-sm">
                ${isActive ?
                    '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">نشطة</span>' :
                    '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">غير نشطة</span>'
                }
            </td>
            <td class="px-4 py-3 text-sm">
                <div class="flex items-center space-x-2 space-x-reverse">
                    ${!isActive ?
                        `<button onclick="activateFarm('${farm.id}')" class="text-green-600 hover:text-green-800 transition-colors" title="تفعيل المزرعة">
                            <i class="fas fa-play"></i>
                        </button>` : ''
                    }
                    <button onclick="editFarmName('${farm.id}', '${farm.name}')" class="text-blue-600 hover:text-blue-800 transition-colors" title="تعديل الاسم">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${Object.keys(farmSystem.farms).length > 1 ?
                        `<button onclick="deleteFarmConfirm('${farm.id}', '${farm.name}')" class="text-red-600 hover:text-red-800 transition-colors" title="حذف المزرعة">
                            <i class="fas fa-trash"></i>
                        </button>` :
                        `<button class="text-gray-400 cursor-not-allowed" title="لا يمكن حذف المزرعة الوحيدة" disabled>
                            <i class="fas fa-trash"></i>
                        </button>`
                    }
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// إضافة مزرعة جديدة من صفحة الإعدادات
function addNewFarm(event) {
    event.preventDefault();

    const name = document.getElementById('newFarmName').value.trim();
    const description = document.getElementById('newFarmDescription').value.trim();

    if (!name) {
        farmSystem.showNotification('يرجى إدخال اسم المزرعة', 'error');
        return;
    }

    // التحقق من عدم تكرار الاسم
    const existingFarm = Object.values(farmSystem.farms).find(farm => farm.name === name);
    if (existingFarm) {
        farmSystem.showNotification('يوجد مزرعة بهذا الاسم بالفعل', 'error');
        return;
    }

    const farmId = 'farm_' + Date.now();
    const newFarm = {
        id: farmId,
        name: name,
        nameEn: name,
        location: '',
        locationEn: '',
        owner: '',
        ownerEn: '',
        phone: '',
        email: '',
        description: description,
        createdAt: new Date().toISOString()
    };

    farmSystem.farms[farmId] = newFarm;

    // تهيئة البيانات للمزرعة الجديدة
    farmSystem.expenses[farmId] = [];
    farmSystem.revenues[farmId] = [];
    farmSystem.invoices[farmId] = [];
    farmSystem.customers[farmId] = [];
    farmSystem.partnerships[farmId] = [];

    farmSystem.saveAllData();

    // تحديث الواجهة
    updateFarmsTable();
    farmSystem.loadFarmSelector();

    // إغلاق النافذة وإظهار رسالة نجاح
    closeAddFarmModal();
    farmSystem.showNotification('تم إضافة المزرعة بنجاح', 'success');

    // مسح النموذج
    document.getElementById('newFarmName').value = '';
    document.getElementById('newFarmDescription').value = '';
}

// تفعيل مزرعة (تبديل المزرعة النشطة)
function activateFarm(farmId) {
    if (farmId && farmSystem.farms[farmId]) {
        farmSystem.currentFarm = farmId;
        localStorage.setItem('currentFarm', farmId);

        // تحديث جميع الأقسام
        farmSystem.updateDashboard();
        farmSystem.loadExpenses();
        farmSystem.loadRevenues();
        farmSystem.loadInvoices();
        farmSystem.loadCustomers();
        farmSystem.loadPartnerships();
        farmSystem.loadFarmSelector();

        // تحديث جدول المزارع
        updateFarmsTable();

        farmSystem.showNotification(`تم التبديل إلى مزرعة: ${farmSystem.farms[farmId].name}`, 'success');
    }
}

// تعديل اسم المزرعة
function editFarmName(farmId, currentName) {
    document.getElementById('editFarmId').value = farmId;
    document.getElementById('editFarmName').value = currentName;
    document.getElementById('editFarmModal').classList.remove('hidden');

    // تركيز على حقل الاسم
    setTimeout(() => {
        document.getElementById('editFarmName').focus();
        document.getElementById('editFarmName').select();
    }, 100);
}

// تحديث اسم المزرعة
function updateFarmName(event) {
    event.preventDefault();

    const farmId = document.getElementById('editFarmId').value;
    const newName = document.getElementById('editFarmName').value.trim();

    if (!newName) {
        farmSystem.showNotification('يرجى إدخال اسم المزرعة', 'error');
        return;
    }

    // التحقق من عدم تكرار الاسم
    const existingFarm = Object.values(farmSystem.farms).find(farm => farm.name === newName && farm.id !== farmId);
    if (existingFarm) {
        farmSystem.showNotification('يوجد مزرعة بهذا الاسم بالفعل', 'error');
        return;
    }

    if (farmSystem.farms[farmId]) {
        farmSystem.farms[farmId].name = newName;
        farmSystem.farms[farmId].nameEn = newName;

        farmSystem.saveAllData();

        // تحديث الواجهة
        updateFarmsTable();
        farmSystem.loadFarmSelector();

        closeEditFarmModal();
        farmSystem.showNotification('تم تحديث اسم المزرعة بنجاح', 'success');
    }
}

// تأكيد حذف المزرعة
function deleteFarmConfirm(farmId, farmName) {
    if (Object.keys(farmSystem.farms).length <= 1) {
        farmSystem.showNotification('لا يمكن حذف المزرعة الوحيدة المتبقية', 'error');
        return;
    }

    document.getElementById('deleteFarmId').value = farmId;
    document.getElementById('deleteFarmName').textContent = farmName;
    document.getElementById('deleteFarmModal').classList.remove('hidden');
}

// تنفيذ حذف المزرعة
function confirmDeleteFarm() {
    const farmId = document.getElementById('deleteFarmId').value;

    if (!farmId || !farmSystem.farms[farmId]) {
        farmSystem.showNotification('خطأ في تحديد المزرعة', 'error');
        return;
    }

    const farmName = farmSystem.farms[farmId].name;

    // حذف المزرعة وجميع بياناتها
    delete farmSystem.farms[farmId];
    delete farmSystem.expenses[farmId];
    delete farmSystem.revenues[farmId];
    delete farmSystem.invoices[farmId];
    delete farmSystem.customers[farmId];
    delete farmSystem.partnerships[farmId];

    // إذا كانت المزرعة المحذوفة هي المزرعة الحالية، التبديل لمزرعة أخرى
    if (farmSystem.currentFarm === farmId) {
        const remainingFarms = Object.keys(farmSystem.farms);
        if (remainingFarms.length > 0) {
            farmSystem.currentFarm = remainingFarms[0];
            localStorage.setItem('currentFarm', farmSystem.currentFarm);

            // تحديث جميع الأقسام
            farmSystem.updateDashboard();
            farmSystem.loadExpenses();
            farmSystem.loadRevenues();
            farmSystem.loadInvoices();
            farmSystem.loadCustomers();
            farmSystem.loadPartnerships();
        }
    }

    farmSystem.saveAllData();

    // تحديث الواجهة
    updateFarmsTable();
    farmSystem.loadFarmSelector();

    closeDeleteFarmModal();
    farmSystem.showNotification(`تم حذف مزرعة "${farmName}" بنجاح`, 'success');
}

// إغلاق النوافذ المنبثقة
function closeAddFarmModal() {
    document.getElementById('addFarmModal').classList.add('hidden');
}

function closeEditFarmModal() {
    document.getElementById('editFarmModal').classList.add('hidden');
}

function closeDeleteFarmModal() {
    document.getElementById('deleteFarmModal').classList.add('hidden');
}



function createInvoiceFromRevenue(revenueId) {
    farmSystem.createInvoiceFromRevenue(revenueId);
}
