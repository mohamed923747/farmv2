@echo off
chcp 65001 >nul
title إعداد المشروع للنشر على الإنترنت
color 0A

echo.
echo ═══════════════════════════════════════════════════════════════
echo        🌍 إعداد المشروع للنشر على الإنترنت
echo ═══════════════════════════════════════════════════════════════
echo.

echo 📋 فحص الملفات المطلوبة للنشر...
echo.

:: فحص الملفات المهمة
set allFilesExist=1

if exist "web-server.js" (
    echo ✅ web-server.js موجود
) else (
    echo ❌ web-server.js غير موجود
    set allFilesExist=0
)

if exist "package-deploy.json" (
    echo ✅ package-deploy.json موجود
) else (
    echo ❌ package-deploy.json غير موجود
    set allFilesExist=0
)

if exist "Procfile" (
    echo ✅ Procfile موجود
) else (
    echo ❌ Procfile غير موجود
    set allFilesExist=0
)

if exist "railway.json" (
    echo ✅ railway.json موجود
) else (
    echo ❌ railway.json غير موجود
    set allFilesExist=0
)

if exist "Dockerfile" (
    echo ✅ Dockerfile موجود
) else (
    echo ❌ Dockerfile غير موجود
    set allFilesExist=0
)

if exist ".gitignore" (
    echo ✅ .gitignore موجود
) else (
    echo ❌ .gitignore غير موجود
    set allFilesExist=0
)

echo.

if %allFilesExist%==1 (
    echo ✅ جميع الملفات المطلوبة موجودة!
    echo.
    echo 📦 إنشاء package.json للنشر...
    copy package-deploy.json package.json >nul
    echo ✅ تم إنشاء package.json
    echo.
    
    echo 🧹 تنظيف الملفات غير المطلوبة...
    if exist "node_modules" rmdir /S /Q node_modules >nul 2>&1
    if exist "*.log" del *.log >nul 2>&1
    if exist "users.db" del users.db >nul 2>&1
    echo ✅ تم التنظيف
    echo.
    
    echo 🌍 المشروع جاهز للنشر!
    echo.
    echo 📋 الخطوات التالية:
    echo    1. اذهب إلى https://railway.app أو https://render.com
    echo    2. سجل حساب جديد
    echo    3. أنشئ مشروع جديد
    echo    4. ارفع مجلد المشروع كاملاً
    echo    5. أضف متغيرات البيئة:
    echo       NODE_ENV = production
    echo       SESSION_SECRET = your-secret-key-2024
    echo    6. انقر Deploy
    echo.
    echo 🎉 موقعك سيكون متاحاً على الإنترنت خلال دقائق!
    
) else (
    echo ❌ بعض الملفات مفقودة
    echo 🔧 يرجى تشغيل إعداد النظام أولاً
    echo.
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo.

pause