const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 بدء عملية إنشاء ملف exe...');

// التحقق من وجود الملفات المطلوبة
const requiredFiles = ['main.js', 'package.json', 'poultry-farm-system.html'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
    console.error('❌ الملفات التالية مفقودة:', missingFiles.join(', '));
    process.exit(1);
}

try {
    console.log('📦 تثبيت electron-builder...');
    execSync('npm install electron-builder@latest --no-optional --force', { stdio: 'inherit' });
    
    console.log('🔨 إنشاء ملف exe...');
    execSync('npx electron-builder --win --x64 --config.electronVersion=27.0.0', { stdio: 'inherit' });
    
    console.log('✅ تم إنشاء ملف exe بنجاح في مجلد dist!');
    
} catch (error) {
    console.error('❌ خطأ في عملية البناء:', error.message);
    
    // محاولة بديلة باستخدام electron-packager
    console.log('🔄 محاولة بديلة باستخدام electron-packager...');
    try {
        execSync('npm install electron-packager --save-dev --force', { stdio: 'inherit' });
        execSync('npx electron-packager . "نظام إدارة مزارع الدواجن" --platform=win32 --arch=x64 --out=dist --overwrite', { stdio: 'inherit' });
        console.log('✅ تم إنشاء التطبيق بنجاح باستخدام electron-packager في مجلد dist!');
    } catch (packagerError) {
        console.error('❌ فشل في الطريقة البديلة أيضاً:', packagerError.message);
        process.exit(1);
    }
}