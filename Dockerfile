# استخدام Node.js الرسمي كصورة أساسية
FROM node:18-alpine

# تعيين مجلد العمل
WORKDIR /app

# نسخ ملفات package
COPY package-deploy.json package.json
COPY package-lock.json* ./

# تثبيت المكتبات
RUN npm ci --only=production

# نسخ بقية الملفات
COPY . .

# إنشاء مجلد لقاعدة البيانات
RUN mkdir -p /app/data

# تعيين متغيرات البيئة
ENV NODE_ENV=production
ENV PORT=3000

# فتح المنفذ
EXPOSE 3000

# إنشاء مستخدم غير root للأمان
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# تغيير ملكية الملفات
RUN chown -R nextjs:nodejs /app
USER nextjs

# تشغيل التطبيق
CMD ["node", "web-server.js"]