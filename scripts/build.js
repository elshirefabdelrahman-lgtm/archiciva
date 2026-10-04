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
const policyIcons={
  1:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7h-7a5 5 0 0 0-5 5v1"/><path d="m17 4 3 3-3 3M4 17h7a5 5 0 0 0 5-5v-1"/><path d="m7 20-3-3 3-3"/></svg>',
  2:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
  3:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 7 8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10"/><path d="m8 5 8 4"/></svg>',
  4:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 3.8 18a2 2 0 0 0 1.8 3h12.8a2 2 0 0 0 1.8-3z"/><path d="M12 9v5M12 18h.01"/></svg>',
  5:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  6:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  7:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-6a3 3 0 0 1-1-2V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/><path d="M8 9h8M8 13h5"/></svg>'
};
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
  .replace(/<span class="policy-number">0([1-7])<\/span>/g,(_,number)=>`<span class="policy-icon">${policyIcons[number]}</span>`)
  .replace(/<div class="container hero__content">[\s\S]*?<\/div><\/section><section class="category-strip/, '<div class="container hero__content"><h1>تشييد العمارة العربية</h1><strong class="hero__tagline">نصنع الجمال في كل مساحة</strong><div class="hero__services" aria-label="خدمات ومنتجات الشركة"><span>مراكن</span><span>شلالات</span><span>نوافير</span><span>أثاث</span><span>ديكور</span><span>تنسيق حدائق</span></div><div class="hero__actions"><a class="button hero__primary" href="/products/">اكتشف منتجاتنا</a><a class="button button--glass" href="/product-finder/">ساعدني أختار</a></div></div></section><section class="category-strip')
  .replace(/<div class="benefits">[\s\S]*?<\/div><\/div><\/section><section class="whatsapp-cta">/,'<div class="benefits"><article><span>01</span><h3>خبرة واحترافية</h3><p>تنفيذ منظم يراعي تفاصيل العمل وجودة النتيجة.</p></article><article><span>02</span><h3>خدمات متكاملة</h3><p>من التصميم والتجهيز إلى تنسيق عناصر المساحة.</p></article><article><span>03</span><h3>تصاميم عصرية</h3><p>حلول متنوعة تناسب طبيعة المساحة واحتياج العميل.</p></article><article><span>04</span><h3>جودة في التنفيذ</h3><p>اهتمام بالخامات والتفاصيل في كل مرحلة.</p></article></div></div></section><section class="whatsapp-cta">')
  .replace(/favicon-32\.png/g,"favicon-32.png?v=20261002-7")
  .replace(/apple-touch-icon\.png/g,"apple-touch-icon.png?v=20261002-7")
  .replace(/archiciva-logo\.webp/g,"archiciva-mark-transparent.webp")
  .replace("</head>",'<link rel="stylesheet" href="/assets/styles/overrides.css?v=20261004-9"></head>')
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
const transparentLogo=path.join(root,"source-assets","brand","logo-transparent.png");
const brandMark=()=>sharp(transparentLogo).extract({left:175,top:70,width:900,height:650});
jobs.push(brandMark().resize({width:300,height:220,fit:"contain"}).webp({quality:92,alphaQuality:100}).toFile(path.join(dist,"assets/images/brand/archiciva-mark-transparent.webp")));
jobs.push(brandMark().resize({width:180,height:180,fit:"contain"}).png().toFile(path.join(dist,"assets/images/brand/apple-touch-icon.png")));
jobs.push(brandMark().resize({width:32,height:32,fit:"contain"}).png().toFile(path.join(dist,"assets/images/brand/favicon-32.png")));
await Promise.all(jobs);

write("/",homePage());
write("/products/",listingPage({title:"كل المنتجات",description:"تصفح جميع المراكن والأحواض والنوافير والشلالات وقطع الديكور المتوفرة في الكتالوج الحالي.",path:"/products/",items:products,heading:"كل المنتجات",intro:"تصفح الكتالوج الحالي واستخدم البحث والفلاتر للوصول إلى المنتج الأقرب لمساحتك."}));
for(const group of categoryGroups)write(`/${group.slug}/`,groupPage(group));
for(const category of categories)if(!categoryGroups.some(group=>group.slug===category.slug))write(`/${category.slug}/`,categoryPage(category));
for(const p of products)write(`/products/${p.slug}/`,productPage(p));
write("/cart/",cartPage());
write("/product-finder/",finderPage());
write("/about/",staticPage({title:"من نحن",description:"شركة تشييد العمارة العربية للتشطيبات والـFit-Out والأعمال الخشبية والأثاث والمنتجات المصنوعة من الفيبر جلاس.",path:"/about/",body:`<div class="about-story-grid"><article class="about-story-card"><span class="eyebrow">01</span><h2>نبذة عن الشركة</h2><p>شركة <strong>تشييد العمارة العربية</strong> هي شركة رائدة في مجال <strong>التشطيبات والـFit-Out والأعمال الخشبية والأثاث</strong>، بالإضافة إلى تقديم منتجات <strong>ديكورية وزراعية مصنوعة من الفيبر جلاس</strong> للمساحات الداخلية والخارجية.</p><p>نؤمن بأن <strong>التفاصيل تصنع الفرق</strong>، لذلك نحرص على تقديم حلول متكاملة تجمع بين <strong>الجودة العالية، والتصميم العصري، والدقة في التنفيذ</strong>، لتلبية احتياجات عملائنا وتحويل أفكارهم إلى مساحات مميزة تجمع بين الجمال والوظيفية.</p></article><article class="about-story-card"><span class="eyebrow">02</span><h2>من نحن</h2><p>شركة متخصصة في <strong>أعمال التشطيبات والـFit-Out والأعمال الخشبية والأثاث</strong>، مع تقديم مجموعة متنوعة من <strong>المنتجات الديكورية والزراعية المصنوعة من الفيبر جلاس</strong>، والمصممة لتناسب المساحات الداخلية والخارجية.</p><p>نسعى إلى تقديم حلول تجمع بين <strong>التصميم المميز، جودة الخامات، ودقة التنفيذ</strong>، لنمنح كل مساحة طابعًا خاصًا يعكس ذوق واحتياجات عملائنا.</p></article></div>`}))
write("/contact/",staticPage({title:"تواصل معنا",description:"تواصل مع ArchiCiva للاستفسار عن المنتجات وتأكيد تفاصيل الطلب.",path:"/contact/",body:`<h2>واتساب</h2><p>للاستفسار عن المقاسات والخامات والتجهيز والتوصيل، تواصل معنا عبر الرقم المعتمد.</p><p><a class="button" href="https://wa.me/${site.whatsapp}?text=${whatsappGreeting}" target="_blank" rel="noopener">ابدأ المحادثة على واتساب</a></p><p>لم يتم نشر عنوان فعلي أو ساعات عمل لعدم توفر بيانات معتمدة.</p>`}));
write("/faq/",staticPage({title:"الأسئلة الشائعة",description:"إجابات واضحة عن طريقة الطلب والأسعار واختيار المنتجات في ArchiCiva.",path:"/faq/",body:`<div class="faq-list"><details><summary>كيف أطلب؟</summary><p>أضف المنتجات إلى السلة، أدخل بيانات التواصل، ثم راجع وأرسل الرسالة المنظمة عبر واتساب.</p></details><details><summary>هل الأسعار نهائية؟</summary><p>السعر ظاهر في بطاقة المنتج وصفحته، ويمكن إرسال المنتجات المختارة عبر واتساب.</p></details><details><summary>هل يوجد توصيل؟</summary><p>معلومات نطاق وتكلفة التوصيل غير متوفرة حاليًا. تواصل عبر واتساب لمعرفة التفاصيل.</p></details><details><summary>كيف أختار المقاس؟</summary><p>قِس المساحة وقارنها بالأبعاد المذكورة. إذا لم تظهر أبعاد المنتج فتحتاج إلى تأكيد عبر واتساب.</p></details><details><summary>هل يمكن طلب أكثر من قطعة؟</summary><p>نعم، يمكن زيادة الكمية في السلة وإرسال ملخص المنتجات والكميات.</p></details></div>`}));
write("/shipping-returns/",staticPage({title:"سياسة الاستبدال والاسترجاع",description:"ضوابط الاستبدال والاسترجاع لدى شركة تشييد العمارة العربية داخل المملكة ودول الخليج.",path:"/shipping-returns/",body:`<header class="policy-intro"><span class="eyebrow">شركة تشييد العمارة العربية</span><h2>سياسة واضحة لحماية حقوق العميل</h2><p>تهدف هذه السياسة إلى توضيح ضوابط الاستبدال والاسترجاع للمنتجات التي يتم شراؤها من شركة تشييد العمارة، بما يضمن وضوح الإجراءات والحقوق والالتزامات بين الشركة والعميل.</p></header><div class="policy-sections"><article><span class="policy-number">01</span><div><h2>الاستبدال والاسترجاع داخل المملكة العربية السعودية</h2><ul><li>يحق للعميل طلب استرجاع أو استبدال المنتج خلال خمسة أيام عمل من تاريخ استلام الطلب، وفقاً للشروط الواردة في هذه السياسة.</li><li>يشترط لقبول طلب الاسترجاع أو الاستبدال أن يكون المنتج بحالته الأصلية وغير مستخدم.</li><li>يجب أن يكون المنتج محفوظاً في تغليفه الأصلي، مع تقديم صور توضح حالة المنتج قبل إعادته إلى الشركة.</li></ul></div></article><article><span class="policy-number">02</span><div><h2>تكاليف الشحن</h2><ul><li>في حالة الاسترجاع، يتحمل العميل تكلفة إعادة المنتج إلى الشركة، ويتم خصم تكلفة الشحن ذات الصلة من المبلغ المسترد عند انطباق شروط الاسترجاع.</li><li>في حالة الاستبدال، يتحمل العميل تكلفة شحن المنتج إلى الشركة، وكذلك تكلفة شحن المنتج البديل إليه.</li></ul></div></article><article><span class="policy-number">03</span><div><h2>إجراءات الاسترجاع والاستبدال</h2><ul><li>يبدأ تنفيذ طلب الاسترجاع أو الاستبدال بعد وصول المنتج إلى الشركة وإجراء الفحص اللازم للتأكد من مطابقته لشروط السياسة.</li><li>بعد اعتماد الطلب، يتم استرداد المبلغ أو تجهيز المنتج البديل وفقاً للحالة والاتفاق مع العميل.</li><li>تستغرق معالجة طلبات الاسترجاع عادةً من 7 إلى 14 يوم عمل بعد استلام المنتج وفحصه، بحسب إجراءات المعالجة وطريقة الدفع.</li></ul></div></article><article><span class="policy-number">04</span><div><h2>الحالات المستثناة</h2><ul><li>لا يُقبل الاسترجاع أو الاستبدال إذا كان المنتج قد تم استخدامه أو تعرض لتغيير يؤثر على حالته الأصلية.</li><li>يكون الاستبدال بسبب وجود عيب أو تلف مثبت في المنتج، مع مراعاة إجراءات الفحص والتحقق.</li><li>المنتجات المصنّعة أو المنفذة حسب طلب العميل، بما في ذلك المنتجات المفصلة وفق مقاسات أو مواصفات أو رغبات خاصة، لا تكون قابلة للاسترجاع أو الاستبدال ما لم يوجد عيب أو خطأ من الشركة.</li><li>رسوم خدمات التركيب، إن وجدت، غير قابلة للاسترداد.</li></ul></div></article><article><span class="policy-number">05</span><div><h2>طلبات الاستبدال والاسترجاع لدول الخليج</h2><ul><li>المنتجات المشحونة إلى دول الخليج غير قابلة للاسترجاع، ويقتصر الاستبدال على الحالات التي يثبت فيها وجود عيب أو تلف في المنتج.</li><li>يتم تقييم الحالة بعد استلام البلاغ والمستندات أو الصور المطلوبة، ثم تحديد الإجراء المناسب.</li></ul></div></article><article><span class="policy-number">06</span><div><h2>المبالغ المدفوعة عبر خدمات الدفع بالتقسيط</h2><ul><li>في حال إتمام عملية الشراء من خلال خدمة دفع بالتقسيط أو وسيط دفع، قد تُخصم الرسوم التي تم تحصيلها من جهة الدفع، بالإضافة إلى تكاليف الشحن، وفقاً لشروط مزود الخدمة وطبيعة العملية.</li></ul></div></article><article><span class="policy-number">07</span><div><h2>التواصل وتقديم الطلب</h2><ul><li>يجب على العميل التواصل مع شركة تشييد العمارة خلال المدة المحددة في هذه السياسة لتقديم طلب الاسترجاع أو الاستبدال.</li><li>يفضل إرفاق رقم الطلب وصور المنتج وحالته وأي معلومات تساعد على سرعة دراسة الطلب.</li><li>تحتفظ الشركة بحق التحقق من حالة المنتج قبل اعتماد أي طلب استرجاع أو استبدال.</li></ul></div></article></div>`}))
write("/privacy/",staticPage({title:"الخصوصية",description:"معلومات الخصوصية الخاصة باستخدام متجر ArchiCiva.",path:"/privacy/",body:`<h2>البيانات في النسخة الحالية</h2><p>تعمل السلة محليًا داخل متصفحك. لا يرسل الموقع بيانات الطلب إلى خادم؛ تُجهز رسالة واتساب لتراجعها قبل إرسالها.</p><p>لا توجد بوابة دفع أو حسابات مستخدمين في النسخة الحالية.</p>`}));

const urls=["/","/products/","/product-finder/","/about/","/contact/","/faq/","/shipping-returns/","/privacy/",...categoryGroups.map(x=>`/${x.slug}/`),...categories.map(x=>`/${x.slug}/`),...products.map(x=>`/products/${x.slug}/`)];
fs.writeFileSync(path.join(dist,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url=>`<url><loc>${site.url}${url}</loc></url>`).join("")}</urlset>`);
fs.writeFileSync(path.join(dist,"robots.txt"),`User-agent: *\nAllow: /\nDisallow: /cart/\nSitemap: ${site.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(dist,"404.html"),finalizeHtml(staticPage({title:"الصفحة غير موجودة",description:"لم نتمكن من العثور على الصفحة المطلوبة.",path:"/404/",body:`<p>قد يكون الرابط تغير أو كُتب بطريقة غير صحيحة.</p><p><a class="button" href="/">العودة للرئيسية</a></p>`}),"/"));
console.log(`Built ${products.length} products and ${new Set(urls).size} indexable routes.`);
