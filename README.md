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

> لا تفتح `dist/index.html` مباشرةً باستخدام `file://` لأن مسارات الموقع مصممة لخادم ويب وVercel.

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

## Vercel

الإعدادات موجودة في `vercel.json`. أمر البناء هو `npm run build` ومجلد النشر هو `dist`.

يمكن ضبط `SITE_URL` في إعدادات Vercel إذا كان النطاق النهائي مختلفًا عن `https://archiciva.vercel.app` حتى تُبنى الروابط القانونية وملف Sitemap بالنطاق الصحيح.
