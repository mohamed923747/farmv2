-- إعداد قاعدة البيانات لنظام إدارة مزارع الدواجن
-- Supabase Database Setup

-- إنشاء جدول بيانات المزارع
CREATE TABLE IF NOT EXISTS farm_data (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    data_type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_farm_data_user_id ON farm_data(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_data_farm_id ON farm_data(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_data_type ON farm_data(data_type);
CREATE INDEX IF NOT EXISTS idx_farm_data_user_farm ON farm_data(user_id, farm_id);

-- إنشاء جدول معلومات المستخدمين
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture_url TEXT,
    login_type TEXT DEFAULT 'google',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول سجل النشاطات
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس لسجل النشاطات
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_farm_id ON activity_log(farm_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);

-- إنشاء جدول النسخ الاحتياطي
CREATE TABLE IF NOT EXISTS data_backups (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    backup_data JSONB NOT NULL,
    backup_type TEXT DEFAULT 'auto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للنسخ الاحتياطي
CREATE INDEX IF NOT EXISTS idx_data_backups_user_id ON data_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_data_backups_created_at ON data_backups(created_at);

-- دالة تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_farm_data_updated_at 
    BEFORE UPDATE ON farm_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- دالة إنشاء نسخة احتياطية تلقائية
CREATE OR REPLACE FUNCTION create_auto_backup()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء نسخة احتياطية عند التحديث
    INSERT INTO data_backups (user_id, backup_data, backup_type)
    VALUES (NEW.user_id, NEW.data, 'auto');
    
    -- حذف النسخ الاحتياطية القديمة (أكثر من 30 يوم)
    DELETE FROM data_backups 
    WHERE user_id = NEW.user_id 
    AND backup_type = 'auto' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء trigger للنسخ الاحتياطي التلقائي
CREATE TRIGGER auto_backup_trigger 
    AFTER UPDATE ON farm_data 
    FOR EACH ROW 
    EXECUTE FUNCTION create_auto_backup();

-- دالة تسجيل النشاطات
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id TEXT,
    p_farm_id TEXT,
    p_action_type TEXT,
    p_action_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_log (user_id, farm_id, action_type, action_data)
    VALUES (p_user_id, p_farm_id, p_action_type, p_action_data);
END;
$$ language 'plpgsql';

-- دالة الحصول على بيانات المستخدم
CREATE OR REPLACE FUNCTION get_user_data(p_user_id TEXT)
RETURNS TABLE(
    farm_id TEXT,
    data_type TEXT,
    data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT fd.farm_id, fd.data_type, fd.data, fd.updated_at
    FROM farm_data fd
    WHERE fd.user_id = p_user_id
    ORDER BY fd.updated_at DESC;
END;
$$ language 'plpgsql';

-- دالة تنظيف البيانات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- حذف سجل النشاطات الأقدم من 90 يوم
    DELETE FROM activity_log 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- حذف النسخ الاحتياطية الأقدم من 30 يوم
    DELETE FROM data_backups 
    WHERE backup_type = 'auto' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- تحديث إحصائيات الجداول
    ANALYZE farm_data;
    ANALYZE activity_log;
    ANALYZE data_backups;
END;
$$ language 'plpgsql';

-- إنشاء مهمة تنظيف دورية (يجب تفعيلها من لوحة تحكم Supabase)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

-- إعداد Row Level Security (RLS)
ALTER TABLE farm_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول farm_data
CREATE POLICY "Users can view their own data" ON farm_data
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own data" ON farm_data
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own data" ON farm_data
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own data" ON farm_data
    FOR DELETE USING (user_id = auth.uid()::text);

-- سياسات الأمان لجدول user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid()::text);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid()::text);

-- سياسات الأمان لجدول activity_log
CREATE POLICY "Users can view their own activity" ON activity_log
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own activity" ON activity_log
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- سياسات الأمان لجدول data_backups
CREATE POLICY "Users can view their own backups" ON data_backups
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own backups" ON data_backups
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- دالة إنشاء الجداول (للاستخدام من JavaScript)
CREATE OR REPLACE FUNCTION create_user_data_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
    -- هذه الدالة موجودة للتوافق مع الكود
    -- الجداول تم إنشاؤها بالفعل أعلاه
    RETURN;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_farms_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
    -- هذه الدالة موجودة للتوافق مع الكود
    RETURN;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_farm_data_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
    -- هذه الدالة موجودة للتوافق مع الكود
    RETURN;
END;
$$ language 'plpgsql';

-- إدراج بيانات تجريبية (اختياري)
-- INSERT INTO user_profiles (id, email, name, login_type) 
-- VALUES ('test_user', 'test@example.com', 'مستخدم تجريبي', 'local')
-- ON CONFLICT (id) DO NOTHING;

-- عرض ملخص الجداول المنشأة
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('farm_data', 'user_profiles', 'activity_log', 'data_backups')
ORDER BY tablename;
