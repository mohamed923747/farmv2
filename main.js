const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// تعطيل تحذيرات الأمان في بيئة التطوير
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow;
let splashWindow;

// إعداد التحديث التلقائي
autoUpdater.checkForUpdatesAndNotify();

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile('splash.html');
    
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

function createMainWindow() {
    // إنشاء النافذة الرئيسية
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        show: false,
        icon: path.join(__dirname, 'assets/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        titleBarStyle: 'default',
        autoHideMenuBar: false
    });

    // تحميل ملف HTML الرئيسي
    mainWindow.loadFile('poultry-farm-system.html');

    // إظهار النافذة عند اكتمال التحميل
    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.close();
        }
        mainWindow.show();
        
        // فتح أدوات المطور في بيئة التطوير
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });

    // معالجة إغلاق النافذة
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // منع التنقل لمواقع خارجية
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    // معالجة النوافذ الجديدة
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// إنشاء قائمة التطبيق
function createMenu() {
    const template = [
        {
            label: 'ملف',
            submenu: [
                {
                    label: 'جديد',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new');
                    }
                },
                {
                    label: 'فتح',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'ملفات النسخ الاحتياطي', extensions: ['json'] },
                                { name: 'جميع الملفات', extensions: ['*'] }
                            ]
                        });
                        
                        if (!result.canceled) {
                            mainWindow.webContents.send('menu-open', result.filePaths[0]);
                        }
                    }
                },
                {
                    label: 'حفظ',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save');
                    }
                },
                {
                    label: 'حفظ باسم',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: async () => {
                        const result = await dialog.showSaveDialog(mainWindow, {
                            filters: [
                                { name: 'ملفات النسخ الاحتياطي', extensions: ['json'] }
                            ]
                        });
                        
                        if (!result.canceled) {
                            mainWindow.webContents.send('menu-save-as', result.filePath);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'تصدير PDF',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.send('menu-export-pdf');
                    }
                },
                {
                    label: 'تصدير Excel',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export-excel');
                    }
                },
                { type: 'separator' },
                {
                    label: 'خروج',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'تحرير',
            submenu: [
                {
                    label: 'تراجع',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: 'إعادة',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo'
                },
                { type: 'separator' },
                {
                    label: 'قص',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'نسخ',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'لصق',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                }
            ]
        },
        {
            label: 'عرض',
            submenu: [
                {
                    label: 'إعادة تحميل',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'تبديل أدوات المطور',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'تكبير',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
                    }
                },
                {
                    label: 'تصغير',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
                    }
                },
                {
                    label: 'حجم طبيعي',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.setZoomLevel(0);
                    }
                },
                { type: 'separator' },
                {
                    label: 'ملء الشاشة',
                    accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                }
            ]
        },
        {
            label: 'نافذة',
            submenu: [
                {
                    label: 'تصغير',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
                },
                {
                    label: 'إغلاق',
                    accelerator: 'CmdOrCtrl+W',
                    role: 'close'
                }
            ]
        },
        {
            label: 'مساعدة',
            submenu: [
                {
                    label: 'حول البرنامج',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'حول البرنامج',
                            message: 'نظام إدارة مزارع الدواجن',
                            detail: 'الإصدار 1.0.0\nبرنامج شامل لإدارة مزارع الدواجن\nيدعم المزامنة السحابية والعمل من أجهزة متعددة'
                        });
                    }
                },
                {
                    label: 'دليل المستخدم',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/user-guide');
                    }
                },
                {
                    label: 'التحقق من التحديثات',
                    click: () => {
                        autoUpdater.checkForUpdatesAndNotify();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// معالجات IPC
ipcMain.handle('save-file', async (event, data, filePath) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
});

// أحداث التطبيق
app.whenReady().then(() => {
    createSplashWindow();
    
    setTimeout(() => {
        createMainWindow();
        createMenu();
    }, 2000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// معالجة التحديثات
autoUpdater.on('checking-for-update', () => {
    console.log('جاري البحث عن تحديثات...');
});

autoUpdater.on('update-available', (info) => {
    console.log('تحديث متوفر:', info);
});

autoUpdater.on('update-not-available', (info) => {
    console.log('لا توجد تحديثات متوفرة:', info);
});

autoUpdater.on('error', (err) => {
    console.log('خطأ في التحديث:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "سرعة التحميل: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - تم تحميل ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('تم تحميل التحديث:', info);
    autoUpdater.quitAndInstall();
});
