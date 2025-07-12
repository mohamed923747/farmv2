const { contextBridge, ipcRenderer } = require('electron');

// تعريض APIs آمنة للواجهة الأمامية
contextBridge.exposeInMainWorld('electronAPI', {
    // عمليات الملفات
    saveFile: (data, filePath) => ipcRenderer.invoke('save-file', data, filePath),
    loadFile: (filePath) => ipcRenderer.invoke('load-file', filePath),
    
    // حوارات النظام
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    
    // معالجات القائمة
    onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
    onMenuOpen: (callback) => ipcRenderer.on('menu-open', callback),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
    onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
    onMenuExportPdf: (callback) => ipcRenderer.on('menu-export-pdf', callback),
    onMenuExportExcel: (callback) => ipcRenderer.on('menu-export-excel', callback),
    
    // إزالة المستمعين
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // معلومات النظام
    platform: process.platform,
    isElectron: true
});

// إضافة CSS خاص بـ Electron
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        /* تحسينات خاصة بـ Electron */
        body {
            -webkit-user-select: none;
            user-select: none;
            overflow-x: hidden;
        }
        
        input, textarea, [contenteditable] {
            -webkit-user-select: text;
            user-select: text;
        }
        
        /* شريط التمرير المخصص */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
        
        /* تحسين الخطوط */
        * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* إخفاء شريط التمرير الأفقي */
        html {
            overflow-x: hidden;
        }
        
        /* تحسين الأزرار */
        button {
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        button:hover {
            transform: translateY(-1px);
        }
        
        /* تحسين النوافذ المنبثقة */
        .modal {
            backdrop-filter: blur(5px);
        }
        
        /* تحسين الإشعارات */
        .notification {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-radius: 8px;
        }
        
        /* تحسين الجداول */
        table {
            border-collapse: separate;
            border-spacing: 0;
        }
        
        /* تحسين البطاقات */
        .card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        /* تحسين الشريط الجانبي */
        .sidebar {
            border-right: 1px solid #e5e7eb;
        }
        
        /* تحسين مؤشر المزامنة */
        #syncIndicator {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        /* تحسين النماذج */
        input:focus, select:focus, textarea:focus {
            outline: none;
            ring: 2px;
            ring-color: #3b82f6;
            border-color: #3b82f6;
        }
        
        /* تحسين الرسوم البيانية */
        canvas {
            border-radius: 8px;
        }
        
        /* تحسين شاشة تسجيل الدخول */
        #loginScreen {
            backdrop-filter: blur(10px);
        }
        
        /* تحسين أزرار Google */
        .g_id_signin {
            border-radius: 8px !important;
        }
        
        /* تحسين الطباعة */
        @media print {
            .no-print {
                display: none !important;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        /* تحسين الاستجابة */
        @media (max-width: 768px) {
            .desktop-only {
                display: none !important;
            }
        }
        
        /* تحسين التحديد */
        ::selection {
            background-color: #3b82f6;
            color: white;
        }
        
        /* تحسين التركيز */
        *:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
        }
        
        /* تحسين الرسوم المتحركة */
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        /* تحسين الظلال */
        .shadow-custom {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        /* تحسين الحدود */
        .border-custom {
            border: 1px solid #e5e7eb;
        }
        
        /* تحسين الخلفيات */
        .bg-gradient-custom {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        /* تحسين النصوص */
        .text-shadow {
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        /* تحسين الأيقونات */
        .icon {
            transition: transform 0.2s ease;
        }
        
        .icon:hover {
            transform: scale(1.1);
        }
        
        /* تحسين التحميل */
        .loading {
            position: relative;
            overflow: hidden;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
            0% { left: -100%; }
            100% { left: 100%; }
        }
    `;
    document.head.appendChild(style);
});

// إضافة معالجات خاصة بـ Electron
window.addEventListener('DOMContentLoaded', () => {
    // منع السحب والإفلات للملفات
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // منع القائمة السياقية الافتراضية
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // منع اختصارات لوحة المفاتيح غير المرغوب فيها
    document.addEventListener('keydown', (e) => {
        // منع F12 (أدوات المطور) إلا في بيئة التطوير
        if (e.key === 'F12' && !process.argv.includes('--dev')) {
            e.preventDefault();
        }
        
        // منع Ctrl+Shift+I (أدوات المطور) إلا في بيئة التطوير
        if (e.ctrlKey && e.shiftKey && e.key === 'I' && !process.argv.includes('--dev')) {
            e.preventDefault();
        }
        
        // منع Ctrl+U (عرض المصدر)
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
        }
    });
    
    console.log('تم تحميل نظام إدارة مزارع الدواجن - إصدار سطح المكتب');
});
