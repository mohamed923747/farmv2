/**
 * Service Worker for Poultry Farm Management System
 * خدمة العمل للعمل بدون اتصال ونظام التخزين المؤقت
 */

const CACHE_NAME = 'poultry-farm-v2.0.0';
const OFFLINE_URL = '/offline.html';

// الملفات الأساسية للتخزين المؤقت
const CORE_FILES = [
    '/',
    '/website.html',
    '/poultry-farm-system.html',
    '/manifest.json',
    '/css/website-styles.css',
    '/js/partnerships-enhanced.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// الملفات الديناميكية للتخزين المؤقت عند الطلب
const DYNAMIC_CACHE = 'poultry-farm-dynamic-v2.0.0';

// تثبيت Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching core files');
                return cache.addAll(CORE_FILES);
            })
            .then(() => {
                console.log('Service Worker: Core files cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Error caching core files:', error);
            })
    );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

// اعتراض طلبات الشبكة
self.addEventListener('fetch', event => {
    // تجاهل الطلبات غير HTTP/HTTPS
    if (!event.request.url.startsWith('http')) {
        return;
    }

    // تجاهل طلبات POST وPUT وDELETE
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // إذا وُجد في التخزين المؤقت، أرجعه
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // إذا لم يوجد، جرب الشبكة
                return fetch(event.request)
                    .then(response => {
                        // تحقق من صحة الاستجابة
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // نسخ الاستجابة للتخزين المؤقت
                        const responseToCache = response.clone();

                        // تخزين الملفات الديناميكية
                        if (shouldCacheDynamically(event.request.url)) {
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => {
                                    console.log('Service Worker: Caching dynamic file:', event.request.url);
                                    cache.put(event.request, responseToCache);
                                });
                        }

                        return response;
                    })
                    .catch(error => {
                        console.log('Service Worker: Network failed, trying cache:', error);
                        
                        // إذا فشلت الشبكة، جرب التخزين المؤقت الديناميكي
                        return caches.match(event.request)
                            .then(cachedResponse => {
                                if (cachedResponse) {
                                    return cachedResponse;
                                }
                                
                                // إذا كان طلب HTML، أرجع صفحة عدم الاتصال
                                if (event.request.headers.get('accept').includes('text/html')) {
                                    return caches.match(OFFLINE_URL);
                                }
                                
                                // للطلبات الأخرى، أرجع استجابة خطأ
                                return new Response('Network error happened', {
                                    status: 408,
                                    headers: { 'Content-Type': 'text/plain' }
                                });
                            });
                    });
            })
    );
});

// تحديد ما إذا كان يجب تخزين الملف ديناميكياً
function shouldCacheDynamically(url) {
    // تخزين الصور والخطوط وملفات CSS/JS
    const cacheableExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.woff', '.woff2', '.ttf'];
    const shouldCache = cacheableExtensions.some(ext => url.includes(ext));
    
    // تجنب تخزين APIs الخارجية
    const isExternalAPI = url.includes('api.') || url.includes('supabase.co');
    
    return shouldCache && !isExternalAPI;
}

// معالجة رسائل من الصفحة الرئيسية
self.addEventListener('message', event => {
    console.log('Service Worker: Received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    
    if (event.data && event.data.type === 'CACHE_DATA') {
        // تخزين بيانات مخصصة
        caches.open(DYNAMIC_CACHE)
            .then(cache => {
                const response = new Response(JSON.stringify(event.data.data));
                return cache.put(event.data.key, response);
            })
            .then(() => {
                event.ports[0].postMessage({ success: true });
            })
            .catch(error => {
                event.ports[0].postMessage({ success: false, error: error.message });
            });
    }
});

// معالجة تحديث التطبيق
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered');
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// تنفيذ المزامنة في الخلفية
async function doBackgroundSync() {
    try {
        console.log('Service Worker: Performing background sync');
        
        // هنا يمكن إضافة منطق مزامنة البيانات مع الخادم
        // مثل رفع البيانات المحفوظة محلياً
        
        // إشعار الصفحة الرئيسية بنجاح المزامنة
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_SUCCESS',
                message: 'تمت المزامنة في الخلفية بنجاح'
            });
        });
        
    } catch (error) {
        console.error('Service Worker: Background sync failed:', error);
        
        // إشعار الصفحة الرئيسية بفشل المزامنة
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_ERROR',
                message: 'فشلت المزامنة في الخلفية',
                error: error.message
            });
        });
    }
}

// معالجة الإشعارات Push
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'إشعار جديد من نظام إدارة مزارع الدواجن',
        icon: '/assets/icon-192x192.png',
        badge: '/assets/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'عرض التفاصيل',
                icon: '/assets/checkmark.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/assets/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('نظام إدارة مزارع الدواجن', options)
    );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        // فتح التطبيق
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // إغلاق الإشعار فقط
        console.log('Service Worker: Notification dismissed');
    } else {
        // النقر على الإشعار نفسه
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// تنظيف التخزين المؤقت القديم
self.addEventListener('periodicsync', event => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(cleanupOldCache());
    }
});

async function cleanupOldCache() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        
        // حذف الملفات الأقدم من 7 أيام
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response.headers.get('date');
            
            if (dateHeader) {
                const responseDate = new Date(dateHeader).getTime();
                if (responseDate < oneWeekAgo) {
                    await cache.delete(request);
                    console.log('Service Worker: Deleted old cache entry:', request.url);
                }
            }
        }
        
        console.log('Service Worker: Cache cleanup completed');
    } catch (error) {
        console.error('Service Worker: Cache cleanup failed:', error);
    }
}

// إضافة معلومات التشخيص
self.addEventListener('error', event => {
    console.error('Service Worker: Error occurred:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Unhandled promise rejection:', event.reason);
});

console.log('Service Worker: Script loaded successfully');
