import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { site } from "../src/config/site.js";
import { categories, categoryGroups } from "../src/data/categories.js";
import { products } from "../src/data/products.js";
import { homePage, categoryPage, groupPage, productPage, listingPage, staticPage, cartPage, finderPage } from "../src/templates/render.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const dist=path.join(root,"dist");
const ensure=p=>fs.mkdirSync(p,{recursive:true});
const whatsappGreeting=encodeURIComponent("مرحبًا، أود الاستفسار عن منتجات ArchiCiva");
const finalizeHtml=(html,route)=>{
  const depth=route==="/"?0:route.split("/").filter(Boolean).length;
  const baseHref=depth?"../".repeat(depth):"./";
  const fileNavigation=`<script>if(location.protocol==="file:"){document.addEventListener("click",function(event){const link=event.target.closest("a[href]");if(!link)return;const raw=link.getAttribute("href");if(!raw||raw.startsWith("http")||raw.startsWith("mailto:")||raw.startsWith("tel:")||raw.startsWith("#"))return;event.preventDefault();const clean=raw.replace(/^\\//,"").split("#")[0].split("?")[0];const target=clean===""?"index.html":clean.endsWith("/")?clean+"index.html":clean;location.href=new URL(target,document.baseURI).href;});}</script>`;
  return html
  .replace("<head>",`<head><base href="${baseHref}">${fileNavigation}`)
  .replace(/<p class="demo-note">[^<]*<\/p>/g,"")
  .replace(/الأسعار المعروضة تجريبية وتحتاج إلى اعتماد قبل الطلب النهائي\./g,"السعر ظاهر في بطاقة المنتج وصفحته، ويمكن إرسال المنتجات المختارة عبر واتساب.")
  .replace(/<span>الأسعار الحالية تجريبية وتحتاج إلى اعتماد\.<\/span>/g,`<a class="whatsapp-link" href="https://wa.me/${site.whatsapp}?text=${whatsappGreeting}" target="_blank" rel="noopener">تواصل عبر واتساب</a>`)
  .replace(/>\+966 58 287 3279<\/a>/g,' class="whatsapp-link">ابدأ المحادثة على واتساب</a>')
  .replace(new RegExp(`href="https://wa.me/${site.whatsapp}"`,'g'),`href="https://wa.me/${site.whatsapp}?text=${whatsappGreeting}"`)
  .replace(/<button class="assistant-fab"([^>]*)><span>✦<\/span> مساعدة<\/button>/g,'<button class="assistant-fab"$1><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4l4 3 4-3h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-3 10H7v-2h10v2Zm0-4H7V6h10v2Zm-4 8H7v-2h6v2Z"/></svg><span class="assistant-fab__label">مساعدة</span></button>')
  .replace(/ ر\.س/g," ريال")
  .replace("</head>",'<link rel="stylesheet" href="/assets/styles/overrides.css?v=20261002-5"></head>')
  .replace(/href="\/"/g,'href="index.html"')
  .replace(/(href|src)="\/(?!\/)/g,'$1="')
  .replace(/([", ])\/assets\//g,"$1assets/");
};
const write=(route,html)=>{const target=path.join(dist,route.replace(/^\//,""));ensure(target);fs.writeFileSync(path.join(target,"index.html"),finalizeHtml(html,route));};
const copy=(source,target)=>{ensure(path.dirname(target));fs.copyFileSync(source,target);};

fs.rmSync(dist,{recursive:true,force:true});ensure(dist);
copy(path.join(root,"src/styles/main.css"),path.join(dist,"assets/styles/main.css"));
copy(path.join(root,"src/styles/overrides.css"),path.join(dist,"assets/styles/overrides.css"));
copy(path.join(root,"src/scripts/app.js"),path.join(dist,"assets/scripts/app.js"));
copy(path.join(root,"src/assets/saudi-riyal-symbol.svg"),path.join(dist,"assets/icons/saudi-riyal-symbol.svg"));
copy(path.join(root,"node_modules/@fontsource-variable/alexandria/files/alexandria-arabic-wght-normal.woff2"),path.join(dist,"assets/fonts/alexandria-arabic.woff2"));
copy(path.join(root,"node_modules/@fontsource-variable/alexandria/files/alexandria-latin-wght-normal.woff2"),path.join(dist,"assets/fonts/alexandria-latin.woff2"));

const jobs=[];
for(const p of products){
  const source=path.join(root,p.image);
  for(const width of [480,800]){
    const height=width===480?524:874;
    const target=path.join(dist,"assets/images/products",`${p.imageName}-${width}.webp`);
    ensure(path.dirname(target));
    jobs.push(sharp(source).resize({width,height,fit:"contain",background:"#ffffff"}).webp({quality:82,effort:5}).toFile(target));
  }
}
for(const width of [960,1600]){const target=path.join(dist,"assets/images/hero",`archiciva-hero-${width}.webp`);ensure(path.dirname(target));jobs.push(sharp(path.join(root,"source-assets","brand","cover.png")).resize({width,withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(target));}
for(const width of [960,1600]){const target=path.join(dist,"assets/images/hero",`about-office-${width}.webp`);ensure(path.dirname(target));jobs.push(sharp(path.join(root,"source-assets","brand","about-office-reception.jpg")).resize({width,withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(target));}
ensure(path.join(dist,"assets/images/brand"));
jobs.push(sharp(path.join(root,"source-assets","brand","logo.png")).resize(256,256).webp({quality:88}).toFile(path.join(dist,"assets/images/brand/archiciva-logo.webp")));
jobs.push(sharp(path.join(root,"source-assets","brand","logo.png")).resize(180,180).png().toFile(path.join(dist,"assets/images/brand/apple-touch-icon.png")));
jobs.push(sharp(path.join(root,"source-assets","brand","logo.png")).resize(32,32).png().toFile(path.join(dist,"assets/images/brand/favicon-32.png")));
await Promise.all(jobs);

write("/",homePage());
write("/products/",listingPage({title:"كل المنتجات",description:"تصفح جميع المراكن والأحواض والنوافير والشلالات وقطع الديكور المتوفرة في الكتالوج الحالي.",path:"/products/",items:products,heading:"كل المنتجات",intro:"تصفح الكتالوج الحالي واستخدم البحث والفلاتر للوصول إلى المنتج الأقرب لمساحتك."}));
for(const group of categoryGroups)write(`/${group.slug}/`,groupPage(group));
for(const category of categories)if(!categoryGroups.some(group=>group.slug===category.slug))write(`/${category.slug}/`,categoryPage(category));
for(const p of products)write(`/products/${p.slug}/`,productPage(p));
write("/cart/",cartPage());
write("/product-finder/",finderPage());
write("/about/",staticPage({title:"من نحن",description:"ArchiCiva تقدم منتجات مختارة لتنسيق المساحات الداخلية والخارجية.",path:"/about/",body:`<h2>نبذة عن الشركة</h2><p>شركة <strong>تشييد العمارة العربية</strong> هي شركة رائدة في مجال <strong>التشطيبات والـFit-Out والأعمال الخشبية والأثاث</strong>، بالإضافة إلى تقديم منتجات <strong>ديكورية وزراعية مصنوعة من الفيبر جلاس</strong> للمساحات الداخلية والخارجية.</p><p>نؤمن بأن <strong>التفاصيل تصنع الفرق</strong>، لذلك نحرص على تقديم حلول متكاملة تجمع بين <strong>الجودة العالية، والتصميم العصري، والدقة في التنفيذ</strong>، لتلبية احتياجات عملائنا وتحويل أفكارهم إلى مساحات مميزة تجمع بين الجمال والوظيفية.</p><h2>من نحن</h2><p>شركة متخصصة في <strong>أعمال التشطيبات والـFit-Out والأعمال الخشبية والأثاث</strong>، مع تقديم مجموعة متنوعة من <strong>المنتجات الديكورية والزراعية المصنوعة من الفيبر جلاس</strong>، والمصممة لتناسب المساحات الداخلية والخارجية.</p><p>نسعى إلى تقديم حلول تجمع بين <strong>التصميم المميز، جودة الخامات، ودقة التنفيذ</strong>، لنمنح كل مساحة طابعًا خاصًا يعكس ذوق واحتياجات عملائنا.</p>`}))
write("/contact/",staticPage({title:"تواصل معنا",description:"تواصل مع ArchiCiva للاستفسار عن المنتجات وتأكيد تفاصيل الطلب.",path:"/contact/",body:`<h2>واتساب</h2><p>للاستفسار عن المقاسات والخامات والتجهيز والتوصيل، تواصل معنا عبر الرقم المعتمد.</p><p><a class="button" href="https://wa.me/${site.whatsapp}?text=${whatsappGreeting}" target="_blank" rel="noopener">ابدأ المحادثة على واتساب</a></p><p>لم يتم نشر عنوان فعلي أو ساعات عمل لعدم توفر بيانات معتمدة.</p>`}));
write("/faq/",staticPage({title:"الأسئلة الشائعة",description:"إجابات واضحة عن طريقة الطلب والأسعار واختيار المنتجات في ArchiCiva.",path:"/faq/",body:`<div class="faq-list"><details><summary>كيف أطلب؟</summary><p>أضف المنتجات إلى السلة، أدخل بيانات التواصل، ثم راجع وأرسل الرسالة المنظمة عبر واتساب.</p></details><details><summary>هل الأسعار نهائية؟</summary><p>السعر ظاهر في بطاقة المنتج وصفحته، ويمكن إرسال المنتجات المختارة عبر واتساب.</p></details><details><summary>هل يوجد توصيل؟</summary><p>معلومات نطاق وتكلفة التوصيل غير متوفرة حاليًا. تواصل عبر واتساب لمعرفة التفاصيل.</p></details><details><summary>كيف أختار المقاس؟</summary><p>قِس المساحة وقارنها بالأبعاد المذكورة. إذا لم تظهر أبعاد المنتج فتحتاج إلى تأكيد عبر واتساب.</p></details><details><summary>هل يمكن طلب أكثر من قطعة؟</summary><p>نعم، يمكن زيادة الكمية في السلة وإرسال ملخص المنتجات والكميات.</p></details></div>`}));
write("/shipping-returns/",staticPage({title:"الشحن والاستبدال",description:"صفحة مخصصة لسياسات الشحن والاستبدال عند اعتمادها.",path:"/shipping-returns/",body:`<div class="policy-grid"><article><span class="eyebrow">01</span><h2>الشحن والتوصيل</h2><p>تختلف إمكانية التوصيل وتكلفته ومدته بحسب المدينة وحجم المنتج وطبيعة التجهيز. تُراجع هذه التفاصيل مع العميل قبل اعتماد الطلب.</p></article><article><span class="eyebrow">02</span><h2>الاستبدال والاسترجاع</h2><p>لم تُزوّدنا الشركة حتى الآن بشروط استبدال واسترجاع معتمدة للنشر. يرجى طلب التفاصيل عبر واتساب قبل تأكيد الطلب.</p></article><article><span class="eyebrow">03</span><h2>المنتجات الكبيرة أو المجهزة</h2><p>قد تحتاج النوافير والشلالات والقطع الكبيرة إلى تنسيق خاص للنقل أو التجهيز. تُؤكد المتطلبات المتاحة لكل منتج أثناء مراجعة الطلب.</p></article><article><span class="eyebrow">04</span><h2>قبل اعتماد الطلب</h2><p>راجع اسم المنتج والكمية والمدينة والعنوان وأي ملاحظات، ثم أرسل ملخص السلة عبر واتساب للحصول على المعلومات المتاحة.</p></article></div><p class="policy-note">سيتم تحديث هذه الصفحة عند اعتماد سياسة شحن واسترجاع رسمية من الشركة.</p>`}))
write("/privacy/",staticPage({title:"الخصوصية",description:"معلومات الخصوصية الخاصة باستخدام متجر ArchiCiva.",path:"/privacy/",body:`<h2>البيانات في النسخة الحالية</h2><p>تعمل السلة محليًا داخل متصفحك. لا يرسل الموقع بيانات الطلب إلى خادم؛ تُجهز رسالة واتساب لتراجعها قبل إرسالها.</p><p>لا توجد بوابة دفع أو حسابات مستخدمين في النسخة الحالية.</p>`}));

const urls=["/","/products/","/product-finder/","/about/","/contact/","/faq/","/shipping-returns/","/privacy/",...categoryGroups.map(x=>`/${x.slug}/`),...categories.map(x=>`/${x.slug}/`),...products.map(x=>`/products/${x.slug}/`)];
fs.writeFileSync(path.join(dist,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url=>`<url><loc>${site.url}${url}</loc></url>`).join("")}</urlset>`);
fs.writeFileSync(path.join(dist,"robots.txt"),`User-agent: *\nAllow: /\nDisallow: /cart/\nSitemap: ${site.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(dist,"404.html"),finalizeHtml(staticPage({title:"الصفحة غير موجودة",description:"لم نتمكن من العثور على الصفحة المطلوبة.",path:"/404/",body:`<p>قد يكون الرابط تغير أو كُتب بطريقة غير صحيحة.</p><p><a class="button" href="/">العودة للرئيسية</a></p>`}),"/"));
console.log(`Built ${products.length} products and ${new Set(urls).size} indexable routes.`);
