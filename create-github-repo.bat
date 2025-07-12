@echo off
chcp 65001 >nul
title إنشاء GitHub Repository للمشروع
color 0A

echo.
echo ═══════════════════════════════════════════════════════════════
echo             📁 إنشاء GitHub Repository للمشروع
echo ═══════════════════════════════════════════════════════════════
echo.

:: تحقق من وجود Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git غير مثبت على النظام
    echo.
    echo 📥 يرجى تحميل وتثبيت Git من:
    echo    https://git-scm.com/download/win
    echo.
    echo 🔄 بعد التثبيت، قم بتشغيل هذا الملف مرة أخرى
    echo.
    pause
    exit /b 1
)

echo ✅ Git مثبت بنجاح
git --version
echo.

echo 📋 إعداد Git للمشروع...
echo.

:: إنشاء package.json إذا لم يكن موجود
if not exist "package.json" (
    if exist "package-deploy.json" (
        copy package-deploy.json package.json >nul
        echo ✅ تم إنشاء package.json
    )
)

:: تهيئة Git repository
if not exist ".git" (
    echo 🔧 تهيئة Git repository...
    git init
    echo ✅ تم تهيئة Git repository
    echo.
)

:: إضافة الملفات
echo 📦 إضافة ملفات المشروع...
git add .
echo ✅ تم إضافة الملفات

:: إنشاء الـ commit الأول
echo 💾 إنشاء commit...
git commit -m "🚀 Initial commit - نظام إدارة مزارع الدواجن"
echo ✅ تم إنشاء commit
echo.

echo 🌐 الخطوات التالية:
echo.
echo 1️⃣ اذهب إلى: https://github.com
echo 2️⃣ سجل دخول أو أنشئ حساب جديد
echo 3️⃣ انقر "New repository"
echo 4️⃣ اسم المشروع: poultry-farm-system
echo 5️⃣ الوصف: نظام إدارة مزارع الدواجن - موقع ويب متكامل
echo 6️⃣ اختر Public أو Private
echo 7️⃣ انقر "Create repository"
echo.
echo 8️⃣ انسخ الأوامر التالية وشغّلها:
echo.
echo    git remote add origin https://github.com/اسم_المستخدم/poultry-farm-system.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 💡 استبدل "اسم_المستخدم" باسم حسابك في GitHub
echo.

echo ═══════════════════════════════════════════════════════════════
echo.
echo 🎯 بعد رفع المشروع على GitHub:
echo.
echo ✅ يمكنك نشره على:
echo    • Railway: https://railway.app
echo    • Render: https://render.com  
echo    • Heroku: https://heroku.com
echo    • Vercel: https://vercel.com
echo.
echo ✅ ميزات GitHub:
echo    • تتبع التغييرات
echo    • النسخ الاحتياطية
echo    • التعاون مع الآخرين
echo    • سهولة النشر
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

pause