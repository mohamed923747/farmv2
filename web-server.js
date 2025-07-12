const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // لتمكين CDN للموارد الخارجية
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'تم تجاوز الحد الأقصى للطلبات، حاول مرة أخرى لاحقاً'
});
app.use(limiter);

// Login rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: 'تم تجاوز محاولات تسجيل الدخول، حاول مرة أخرى بعد 15 دقيقة'
});

// CORS
app.use(cors());

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'poultry-farm-secret-key-2024-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // HTTPS في بيئة الإنتاج
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'strict'
    }
}));

// Static files
app.use(express.static('.', {
    dotfiles: 'deny',
    index: false
}));

// Database setup
const dbPath = process.env.DATABASE_PATH || './users.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        console.log('📍 مسار قاعدة البيانات:', dbPath);
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        farm_name TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active INTEGER DEFAULT 1
    )`);

    // User sessions table
    db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )`);

    // Farm data table
    db.run(`CREATE TABLE IF NOT EXISTS farm_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        data_content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )`);

    console.log('✅ تم إنشاء جداول قاعدة البيانات');
}

// Validation schemas
const userRegistrationSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().min(2).max(100).required(),
    farm_name: Joi.string().max(100).optional(),
    phone: Joi.string().max(20).optional()
});

const userLoginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
});

// Middleware for authentication
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ 
            success: false, 
            message: 'يجب تسجيل الدخول أولاً' 
        });
    }
    next();
}

// Routes

// Home page
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// Login page
app.get('/login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// Register page
app.get('/register', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'register.html'));
    }
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Farm system
app.get('/farm-system', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'poultry-farm-system.html'));
});

// API Routes

// Register API
app.post('/api/register', async (req, res) => {
    try {
        const { error, value } = userRegistrationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'بيانات غير صحيحة',
                details: error.details[0].message
            });
        }

        const { username, email, password, full_name, farm_name, phone } = value;

        // Check if user already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ? OR email = ?', 
                [username, email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = uuidv4();

        // Insert new user
        db.run(`INSERT INTO users (user_id, username, email, password, full_name, farm_name, phone) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, username, email, hashedPassword, full_name, farm_name || null, phone || null],
            function(err) {
                if (err) {
                    console.error('خطأ في إنشاء المستخدم:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'حدث خطأ في إنشاء الحساب'
                    });
                }

                res.json({
                    success: true,
                    message: 'تم إنشاء الحساب بنجاح',
                    userId: userId
                });
            });

    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم'
        });
    }
});

// Login API
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { error, value } = userLoginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'بيانات غير صحيحة'
            });
        }

        const { username, password } = value;

        // Get user from database
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ? OR email = ?', 
                [username, username], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
            });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'الحساب غير مفعل'
            });
        }

        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', 
            [user.user_id]);

        // Create session
        req.session.userId = user.user_id;
        req.session.username = user.username;
        req.session.fullName = user.full_name;
        req.session.farmName = user.farm_name;

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            user: {
                userId: user.user_id,
                username: user.username,
                fullName: user.full_name,
                farmName: user.farm_name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم'
        });
    }
});

// Logout API
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'حدث خطأ في تسجيل الخروج'
            });
        }
        res.json({
            success: true,
            message: 'تم تسجيل الخروج بنجاح'
        });
    });
});

// Get user info API
app.get('/api/user', requireAuth, (req, res) => {
    db.get('SELECT user_id, username, email, full_name, farm_name, phone, created_at, last_login FROM users WHERE user_id = ?',
        [req.session.userId], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'حدث خطأ في الخادم'
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        res.json({
            success: true,
            user: user
        });
    });
});

// Save farm data API
app.post('/api/farm-data', requireAuth, (req, res) => {
    const { dataType, dataContent } = req.body;

    if (!dataType || !dataContent) {
        return res.status(400).json({
            success: false,
            message: 'البيانات مطلوبة'
        });
    }

    db.run(`INSERT INTO farm_data (user_id, data_type, data_content) VALUES (?, ?, ?)`,
        [req.session.userId, dataType, JSON.stringify(dataContent)],
        function(err) {
            if (err) {
                console.error('خطأ في حفظ البيانات:', err);
                return res.status(500).json({
                    success: false,
                    message: 'حدث خطأ في حفظ البيانات'
                });
            }

            res.json({
                success: true,
                message: 'تم حفظ البيانات بنجاح',
                dataId: this.lastID
            });
        });
});

// Get farm data API
app.get('/api/farm-data/:dataType?', requireAuth, (req, res) => {
    const { dataType } = req.params;
    let query = 'SELECT * FROM farm_data WHERE user_id = ?';
    let params = [req.session.userId];

    if (dataType) {
        query += ' AND data_type = ?';
        params.push(dataType);
    }

    query += ' ORDER BY updated_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('خطأ في استرجاع البيانات:', err);
            return res.status(500).json({
                success: false,
                message: 'حدث خطأ في استرجاع البيانات'
            });
        }

        const data = rows.map(row => ({
            id: row.id,
            dataType: row.data_type,
            dataContent: JSON.parse(row.data_content),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({
            success: true,
            data: data
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'حدث خطأ في الخادم'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
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
                <a href="/">العودة للصفحة الرئيسية</a>
            </div>
        </body>
        </html>
    `);
});

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log('🚀 خادم نظام إدارة مزارع الدواجن يعمل الآن!');
    console.log(`📍 المضيف: ${HOST}:${PORT}`);
    console.log(`🌐 البيئة: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`🏠 الرابط المحلي: http://localhost:${PORT}`);
        console.log(`🌐 رابط الشبكة: http://${HOST}:${PORT}`);
        console.log('');
        console.log('📋 الصفحات المتاحة:');
        console.log(`   🏠 الصفحة الرئيسية: http://localhost:${PORT}/`);
        console.log(`   🔐 تسجيل الدخول: http://localhost:${PORT}/login`);
        console.log(`   📝 التسجيل: http://localhost:${PORT}/register`);
        console.log(`   💼 لوحة التحكم: http://localhost:${PORT}/dashboard`);
        console.log(`   🐔 نظام المزرعة: http://localhost:${PORT}/farm-system`);
        console.log('');
        console.log('⏹️  لإيقاف الخادم اضغط Ctrl+C');
    } else {
        console.log('🌍 الخادم يعمل في بيئة الإنتاج');
    }
    console.log('=====================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف الخادم...');
    db.close((err) => {
        if (err) {
            console.error('خطأ في إغلاق قاعدة البيانات:', err.message);
        } else {
            console.log('✅ تم إغلاق قاعدة البيانات');
        }
    });
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