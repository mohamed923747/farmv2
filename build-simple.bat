@echo off
echo بناء برنامج سطح المكتب...
echo.

:: التحقق من وجود Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js غير مثبت
    pause
    exit /b 1
)

echo Node.js جاهز!
echo.

:: إنهاء أي عمليات Electron قيد التشغيل
taskkill /F /IM electron.exe >nul 2>&1

:: تثبيت التبعيات
echo تثبيت التبعيات...
npm install --force
if %errorlevel% neq 0 (
    echo خطأ في تثبيت التبعيات
    pause
    exit /b 1
)

echo.
echo بناء التطبيق...
npm run build-win
if %errorlevel% neq 0 (
    echo خطأ في بناء التطبيق
    pause
    exit /b 1
)

echo.
echo تم بناء التطبيق بنجاح!
echo يمكنك العثور على الملفات في مجلد: dist
echo.

if exist "dist" (
    echo فتح مجلد النتائج...
    explorer "dist"
)

pause