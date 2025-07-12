@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   إنشاء ملف exe لنظام إدارة مزارع الدواجن
echo ========================================
echo.

echo 🔧 بدء عملية البناء...
node build-exe.js

echo.
echo 📁 فحص النتائج...
if exist "dist" (
    echo ✅ تم إنشاء مجلد dist بنجاح!
    dir dist /b
    echo.
    echo 🎉 تم الانتهاء! ستجد ملف exe في مجلد dist
) else (
    echo ❌ لم يتم إنشاء مجلد dist
)

echo.
pause