@echo off
echo ====================================
echo   Poultry Farm Management System
echo   Auto Build Tool
echo ====================================
echo.

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed
    echo Please download and install Node.js from: https://nodejs.org
    pause
    exit /b 1
)

echo Found Node.js:
node --version

:: Check for npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo Found npm:
npm --version
echo.

:: التحقق من وجود package.json
if not exist "package.json" (
    echo ❌ خطأ: ملف package.json غير موجود
    echo تأكد من تشغيل هذا الملف في مجلد المشروع الصحيح
    pause
    exit /b 1
)

echo ✅ تم العثور على ملف package.json
echo.

:: عرض قائمة الخيارات
echo اختر نوع البناء:
echo.
echo 1. تثبيت التبعيات فقط
echo 2. تشغيل في وضع التطوير
echo 3. بناء للويندوز 64-bit
echo 4. بناء للويندوز 32-bit
echo 5. بناء لكلا الإصدارين
echo 6. بناء النسخة المحمولة فقط
echo 7. تنظيف وإعادة البناء
echo 8. خروج
echo.

set /p choice="أدخل اختيارك (1-8): "

if "%choice%"=="1" goto install_deps
if "%choice%"=="2" goto run_dev
if "%choice%"=="3" goto build_win64
if "%choice%"=="4" goto build_win32
if "%choice%"=="5" goto build_both
if "%choice%"=="6" goto build_portable
if "%choice%"=="7" goto clean_build
if "%choice%"=="8" goto exit
goto invalid_choice

:install_deps
echo.
echo 📦 جاري تثبيت التبعيات...
npm install
if %errorlevel% neq 0 (
    echo ❌ فشل في تثبيت التبعيات
    pause
    exit /b 1
)
echo ✅ تم تثبيت التبعيات بنجاح
goto end

:run_dev
echo.
echo 🚀 جاري تشغيل التطبيق في وضع التطوير...
npm run dev
goto end

:build_win64
echo.
echo 🔨 جاري بناء التطبيق للويندوز 64-bit...
npm run build-win64
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء التطبيق
    pause
    exit /b 1
)
echo ✅ تم بناء التطبيق بنجاح
goto show_output

:build_win32
echo.
echo 🔨 جاري بناء التطبيق للويندوز 32-bit...
npm run build-win32
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء التطبيق
    pause
    exit /b 1
)
echo ✅ تم بناء التطبيق بنجاح
goto show_output

:build_both
echo.
echo 🔨 جاري بناء التطبيق لكلا الإصدارين...
npm run build-win
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء التطبيق
    pause
    exit /b 1
)
echo ✅ تم بناء التطبيق بنجاح
goto show_output

:build_portable
echo.
echo 🔨 جاري بناء النسخة المحمولة...
npm run build -- --win portable
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء النسخة المحمولة
    pause
    exit /b 1
)
echo ✅ تم بناء النسخة المحمولة بنجاح
goto show_output

:clean_build
echo.
echo 🧹 جاري تنظيف الملفات القديمة...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "dist" rmdir /s /q "dist"
if exist "package-lock.json" del "package-lock.json"

echo 📦 جاري إعادة تثبيت التبعيات...
npm install
if %errorlevel% neq 0 (
    echo ❌ فشل في تثبيت التبعيات
    pause
    exit /b 1
)

echo 🔨 جاري إعادة البناء...
npm run build-win
if %errorlevel% neq 0 (
    echo ❌ فشل في إعادة البناء
    pause
    exit /b 1
)
echo ✅ تم تنظيف وإعادة البناء بنجاح
goto show_output

:invalid_choice
echo.
echo ❌ اختيار غير صحيح. يرجى اختيار رقم من 1 إلى 8.
echo.
goto end

:show_output
echo.
echo 📁 ملفات البناء متوفرة في مجلد: dist\
if exist "dist" (
    echo.
    echo الملفات المُنشأة:
    dir /b "dist\*.exe" 2>nul
    echo.
    echo 💡 نصيحة: يمكنك اختبار المثبت قبل التوزيع
)
goto end

:exit
echo.
echo 👋 شكراً لاستخدام أداة البناء
exit /b 0

:end
echo.
echo ====================================
echo    انتهت العملية
echo ====================================
echo.
echo هل تريد:
echo 1. فتح مجلد البناء
echo 2. تشغيل التطبيق
echo 3. خروج
echo.
set /p final_choice="أدخل اختيارك (1-3): "

if "%final_choice%"=="1" (
    if exist "dist" (
        explorer "dist"
    ) else (
        echo مجلد البناء غير موجود
    )
)

if "%final_choice%"=="2" (
    if exist "dist\win-unpacked\نظام إدارة مزارع الدواجن.exe" (
        start "" "dist\win-unpacked\نظام إدارة مزارع الدواجن.exe"
    ) else (
        echo ملف التطبيق غير موجود. يرجى البناء أولاً.
    )
)

pause
