import fs from "node:fs";
import { build } from "esbuild";
fs.mkdirSync("dist/dev-import", { recursive: true });
fs.writeFileSync(
  "dist/dev-import/index.html",
  '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="robots" content="noindex"><title>ترحيل صور الكتالوج</title><h1>ترحيل الصور الحالية إلى Supabase</h1><p>أداة محلية للأدمن المسجل. ترفع الصور المنشورة وتتحقق من بصمتها دون حذف الملفات الأصلية.</p><label>اختر صور WebP مقاس 800<input id="files" type="file" accept="image/webp" multiple></label><pre id="progress">بانتظار اختيار ملفات الصور.</pre><script type="module" src="./import.js"></script></html>',
);
await build({
  entryPoints: ["scripts/browser-media-import.js"],
  bundle: true,
  format: "esm",
  outfile: "dist/dev-import/import.js",
  target: "es2022",
});
console.log(
  "Local migration page ready at http://localhost:4173/dev-import/ — full build removes it.",
);
