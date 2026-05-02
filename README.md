# لوحة تحكم الشبكة 🌐

**For English version, see [README_EN.md](README_EN.md)**

لوحة تحكم حديثة لإدارة ومتابعة الأجهزة في شبكتك مع قاعدة بيانات SQLite.

## المميزات

- 📡 إدارة الشبكات والأجهزة
- 🔍 فحص الشبكة التلقائي واليدوي لاكتشاف الأجهزة
- 📊 عرض بصري للإحصائيات
- 🏷️ إدارة الوسوم الكاملة
- 💾 قاعدة بيانات SQLite
- 🌐 دعم اللغات (عربي/إنجليزي) مع تبديل سهل
- 🌓 الوضع الداكن/الفاتح
- ⭐ إدارة المفضلة والمجموعات (إنشاء، تعديل، حذف، ترتيب)
- 🔐 نظام المصادقة (Admin و Visitor)
- 🔑 تغيير كلمات المرور (Admin و Visitor)
- 📈 عرض تفصيلي للشبكة مع تجميع الأجهزة
- 📊 إحصائيات شاملة (الأجهزة المتصلة/غير المتصلة)
- 🎯 واجهة مستخدم حديثة ومتجاوبة

---

## 📑 الصفحات المتاحة

- **صفحة الإعدادات الأولية (Setup)** - إعداد كلمات المرور عند أول تشغيل
- **صفحة تسجيل الدخول (Login)** - تسجيل الدخول للمستخدمين
- **قائمة الشبكات (Networks List)** - عرض وإدارة جميع الشبكات
- **عرض الشبكة (Network View)** - عرض تفصيلي لشبكة معينة مع تجميع الأجهزة
- **قائمة الأجهزة (Hosts List)** - عرض جميع الأجهزة في جميع الشبكات
- **المفضلة (Favorites)** - إدارة الأجهزة المفضلة والمجموعات
- **إدارة الوسوم (Tags Management)** - إنشاء وإدارة الوسوم
- **تغيير كلمة مرور Admin** - تغيير كلمة مرور المسؤول
- **تغيير كلمة مرور Visitor** - تغيير كلمة مرور الزائر

---

## 🚀 تجربة وتشغيل البرنامج (Docker Compose)

الطريقة الموصى بها لتجربة البرنامج هي **Docker Compose**: يُبنى كل شيء داخل الصورة (الواجهة والخادم)، فكلما عدّلت الكود تحتاج إعادة بناء وتشغيل كما بالأسفل.

| الغرض | الأمر |
|--------|--------|
| تشغيل مع إعادة بناء الصورة (المخرجات في الطرفية) | `docker compose up --build` |
| نفس الشيء في الخلفية (daemon) | `docker compose up --build -d` |
| إيقاف الحاويات بعد التعديل أو قبل إعادة البناء | `docker compose down` |
| إيقاف **ومسح بيانات التطبيق** (volume قاعدة البيانات ثم إعادة تشغيل نظيفة) | `docker compose down -v` ثم `docker compose up --build` |

**بعد كل تغيير على الكود:** نفّذ `docker compose down` ثم `docker compose up --build` (أضف `-d` إذا أردت التشغيل في الخلفية).

---

## 🚀 التشغيل في Production (Docker)

```bash
# 1. Clone المشروع
git clone https://github.com/balnaimi/Shabakati.git
cd Shabakati

# 2. نسخ ملف .env.example إلى .env
cp .env.example .env

# 3. تعديل ملف .env وتحديث القيم التالية:
#    ALLOWED_ORIGINS=http://your-ip:3001 أو http://your-domain:3001
#    BASE_URL=http://your-ip:3001 أو http://your-domain:3001
#    مثال: ALLOWED_ORIGINS=http://192.168.1.100:3001
#    مثال: BASE_URL=http://192.168.1.100:3001

# 4. حفظ الملف

# 5. تشغيل البرنامج — أمامي مع البناء:
docker compose up --build

#    أو في الخلفية:
docker compose up --build -d
```

البرنامج سيكون متاحاً على: http://your-ip:3001 أو http://your-domain:3001

---

## 💻 التشغيل في وضع التطوير

```bash
# 1. تثبيت Node.js 24 LTS (إذا لم يكن مثبتاً)

# 2. تثبيت البكجات
(cd web && npm install)
(cd server && npm install)

# 3. الدخول إلى مجلد scripts وتشغيل السكريبت
cd scripts
./dev.sh
```

بعد التشغيل، البرنامج سيكون متاحاً على:
- **الواجهة:** http://localhost:5173
- **API:** http://localhost:3001/api

---

## 🔄 إعادة تعيين قاعدة البيانات

```bash
cd server
node resetDatabase.js
```

---

## 👤 إضافة مستخدم Admin

لإضافة مستخدم admin جديد:

```bash
cd server
node addAdmin.js [username] [password]
```

أو باستخدام متغير البيئة:

```bash
cd server
ADMIN_PASSWORD=yourpassword node addAdmin.js [username]
```

**مثال:**
```bash
cd server
node addAdmin.js admin mypassword123
```

---

## 📦 التبعيات

### Frontend
- React 18.3.1
- React DOM 18.3.1
- React Router DOM 6.28.0
- Vite 7.2.7 (أداة البناء)

### Backend
- Express 4.22.1
- SQLite (better-sqlite3 12.6.0)
- bcrypt 6.0.0 (تشفير كلمات المرور)
- jsonwebtoken 9.0.3 (المصادقة)
- winston 3.19.0 (التسجيل)
- ping 1.0.0 (فحص الأجهزة)
- validator 13.15.26 (التحقق من البيانات)

### المتطلبات
- Node.js 24 LTS أو أحدث

---

## 📄 الترخيص

راجع ملف `LICENSE` للتفاصيل.
