@echo off
chcp 65001 >nul
title تثبيت مكتبات نظام إدارة مزارع الدواجن
color 0A

echo.
echo ═══════════════════════════════════════════════════════════════
echo        🐔 نظام إدارة مزارع الدواجن - تثبيت المكتبات المطلوبة
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

echo 📦 تثبيت المكتبات المطلوبة...
echo.

echo 🔧 تثبيت Express.js (خادم الويب)...
call npm install express

echo 🔧 تثبيت Express Session (إدارة الجلسات)...
call npm install express-session

echo 🔧 تثبيت bcryptjs (تشفير كلمات المرور)...
call npm install bcryptjs

echo 🔧 تثبيت SQLite3 (قاعدة البيانات)...
call npm install sqlite3

echo 🔧 تثبيت Body Parser (معالجة البيانات)...
call npm install body-parser

echo 🔧 تثبيت CORS (دعم المشاركة عبر المصادر)...
call npm install cors

echo 🔧 تثبيت Helmet (الأمان)...
call npm install helmet

echo 🔧 تثبيت Rate Limiter (حماية من الهجمات)...
call npm install express-rate-limit

echo 🔧 تثبيت UUID (معرفات فريدة)...
call npm install uuid

echo 🔧 تثبيت Joi (التحقق من صحة البيانات)...
call npm install joi

echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo ✅ تم تثبيت جميع المكتبات بنجاح!
echo.
echo 🚀 يمكنك الآن تشغيل الموقع باستخدام:
echo    start-web-system.bat
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

pause