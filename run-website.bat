@echo off
chcp 65001 >nul
title نظام إدارة مزارع الدواجن - تشغيل الموقع
color 0A

echo.
echo ═══════════════════════════════════════════════════════════════
echo              🐔 نظام إدارة مزارع الدواجن - تشغيل الموقع
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
echo 🌐 فتح الموقع في المتصفح...
start "" "http://localhost:3000"

echo.
echo 🚀 بدء تشغيل خادم الويب...
echo.
echo 📍 يمكنك الوصول للموقع عبر الروابط التالية:
echo    🏠 الصفحة الرئيسية: http://localhost:3000
echo    💼 نظام الإدارة: http://localhost:3000/poultry-farm-system.html
echo    ℹ️ معلومات النظام: http://localhost:3000/website.html
echo    📊 نظام المحاسبة: http://localhost:3000/index.html
echo.
echo ⏹️  لإيقاف الخادم اضغط Ctrl+C
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

:: تشغيل الخادم
node server.js

echo.
echo 🛑 تم إيقاف الخادم
pause