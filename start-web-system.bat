@echo off
chcp 65001 >nul
title نظام إدارة مزارع الدواجن - النظام الكامل مع المستخدمين
color 0A

echo.
echo ═══════════════════════════════════════════════════════════════
echo      🐔 نظام إدارة مزارع الدواجن - النظام الكامل مع المستخدمين
echo ═══════════════════════════════════════════════════════════════
echo.

echo 🔍 التحقق من وجود Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت على النظام
    echo.
    echo 📥 يرجى تحميل وتثبيت Node.js من:
    echo    https://nodejs.org/
    echo.
    echo 🔄 بعد التثبيت، قم بتشغيل هذا الملف مرة أخرى
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js مثبت بنجاح
node --version
echo.

echo 📦 التحقق من المكتبات المطلوبة...
if not exist "node_modules" (
    echo ⚠️  المكتبات غير مثبتة
    echo 🔧 تشغيل تثبيت المكتبات...
    call install-dependencies.bat
    echo.
)

echo 🌐 فتح الموقع في المتصفح...
timeout /t 2 >nul
start "" "http://localhost:3000"

echo.
echo 🚀 بدء تشغيل خادم النظام الكامل...
echo.
echo 📍 يمكنك الوصول للموقع عبر الروابط التالية:
echo    🏠 الصفحة الرئيسية: http://localhost:3000
echo    🔐 تسجيل الدخول: http://localhost:3000/login
echo    📝 إنشاء حساب: http://localhost:3000/register
echo    💼 لوحة التحكم: http://localhost:3000/dashboard
echo    🐔 نظام المزرعة: http://localhost:3000/farm-system
echo.
echo 🌍 يمكن الوصول للموقع من أي جهاز في نفس الشبكة عبر:
echo    http://[عنوان-الجهاز]:3000
echo.
echo ⏹️  لإيقاف الخادم اضغط Ctrl+C
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

:: تشغيل الخادم
node web-server.js

echo.
echo 🛑 تم إيقاف الخادم
pause