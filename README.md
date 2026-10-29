# ArchiCiva Store

متجر عربي ثابت وسريع، مبني بـ HTML وCSS وJavaScript، ويُولّد من بيانات المنتجات الموجودة في `src/data`.

## تنظيم المشروع

- `src/`: القوالب والبيانات والتنسيقات والتفاعلات.
- `scripts/`: أوامر البناء والتحقق.
- `source-assets/brand/`: ملفات الهوية والغلاف الأصلية.
- `source-assets/raw/`: صور المنتجات الأصلية مرتبة حسب التصنيف.
- `dist/`: نسخة الموقع الناتجة عن البناء، ولا تُعدل يدويًا.
- `node_modules/`: حزم التشغيل المحلية، ويمكن إنشاؤها مجددًا بـ `npm install`.

## التشغيل محليًا

> لا تفتح `dist/index.html` مباشرةً باستخدام `file://` لأن مسارات الموقع مصممة لخادم ويب.

```bash
npm install
npm run build
npm start -- --listen 4173
```

ثم افتح: `http://localhost:4173/`

## التحقق

```bash
npm run validate
```

## النشر على Hostinger

الموقع ثابت. يُنشئ `npm run build` الصفحات والملفات في `dist/`، ثم ينسخها `npm run sync:hostinger` إلى جذر المستودع حتى يجدها خادم Hostinger داخل `public_html` مباشرة. يجب أن يكون إعداد Git في hPanel على فرع `main` ومسار النشر `public_html`، مع تفعيل Auto-deployment. ملف `index.html` في الجذر هو مدخل الموقع.

عند تغيير المصدر أو الصور، يبني GitHub Actions الموقع ويتحقق منه ثم يضيف النسخة الناتجة إلى `main`. يتبع Hostinger آخر commit على الفرع تلقائيًا. إن كانت حماية الفرع تمنع GitHub Actions من الدفع، يلزم السماح للـworkflow بالدفع أو تشغيل `npm run build && npm run validate && npm run sync:hostinger` محليًا وإضافة الملفات الناتجة إلى commit التعديل.

النطاق الافتراضي للروابط وملف Sitemap هو `https://archiciva.store`، ويمكن تجاوزه بمتغير `SITE_URL` عند البناء. لا يحتاج الموقع خادم Node.js دائمًا؛ Node يُستخدم للبناء فقط.
