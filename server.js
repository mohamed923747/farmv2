const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // Parse URL
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Default to home.html if requesting root
    if (pathname === '/') {
        pathname = '/home.html';
    }
    
    // Construct file path
    const filePath = path.join(__dirname, pathname);
    
    // Security check - prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            console.log(`File not found: ${filePath}`);
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>الصفحة غير موجودة - 404</title>
                    <style>
                        body { 
                            font-family: 'Cairo', Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-direction: column;
                        }
                        .container {
                            background: rgba(255,255,255,0.1);
                            padding: 40px;
                            border-radius: 15px;
                            backdrop-filter: blur(10px);
                        }
                        h1 { font-size: 4rem; margin: 0; }
                        p { font-size: 1.2rem; margin: 20px 0; }
                        a { 
                            color: white; 
                            text-decoration: none; 
                            background: rgba(255,255,255,0.2);
                            padding: 10px 20px;
                            border-radius: 5px;
                            transition: all 0.3s ease;
                        }
                        a:hover { background: rgba(255,255,255,0.3); }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>404</h1>
                        <p>الصفحة المطلوبة غير موجودة</p>
                        <a href="/website.html">العودة للصفحة الرئيسية</a>
                    </div>
                </body>
                </html>
            `);
            return;
        }
        
        // Get file extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        
        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error(`Error reading file: ${err}`);
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Internal Server Error');
                return;
            }
            
            // Set appropriate headers
            const headers = {
                'Content-Type': mimeType + (mimeType.startsWith('text/') ? '; charset=utf-8' : ''),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };
            
            res.writeHead(200, headers);
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log('🚀 خادم نظام إدارة مزارع الدواجن يعمل الآن!');
    console.log(`📍 الرابط المحلي: http://localhost:${PORT}`);
    console.log(`🌐 رابط الشبكة: http://192.168.1.100:${PORT} (حسب عنوان IP الخاص بك)`);
    console.log('');
    console.log('📋 الصفحات المتاحة:');
    console.log(`   🏠 الصفحة الرئيسية: http://localhost:${PORT}/website.html`);
    console.log(`   💼 نظام الإدارة: http://localhost:${PORT}/poultry-farm-system.html`);
    console.log(`   📱 وضع عدم الاتصال: http://localhost:${PORT}/offline.html`);
    console.log('');
    console.log('⏹️  لإيقاف الخادم اضغط Ctrl+C');
    console.log('=====================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف الخادم...');
    server.close(() => {
        console.log('✅ تم إيقاف الخادم بنجاح');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ خطأ غير متوقع:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ رفض غير معالج:', reason);
    process.exit(1);
});