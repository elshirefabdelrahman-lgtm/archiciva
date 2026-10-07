import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { products } from "../src/data/products.js";
import { categories } from "../src/data/categories.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const dist=path.join(root,"dist");
const errors=[];
const required=["id","name","slug","category","subcategory","price","currency","image","images","imageName","alt","shortDescription","description","material","color","size","dimensions","features","uses","tags","relatedProducts","complementaryProducts","seoTitle","seoDescription"];
const seenIds=new Set(),seenSlugs=new Set();
for(const product of products){for(const key of required)if(!(key in product))errors.push(`${product.id||"unknown"}: missing ${key}`);if(seenIds.has(product.id))errors.push(`Duplicate id ${product.id}`);if(seenSlugs.has(product.slug))errors.push(`Duplicate slug ${product.slug}`);seenIds.add(product.id);seenSlugs.add(product.slug);if(!categories.some(category=>category.id===product.subcategory))errors.push(`${product.id}: invalid category`);if(!Number.isInteger(product.price)||product.price<=0)errors.push(`${product.id}: invalid price`);if(!fs.existsSync(path.join(root,product.image)))errors.push(`${product.id}: missing source image`);for(const width of [480,800])if(!fs.existsSync(path.join(dist,"assets/images/products",`${product.imageName}-${width}.webp`)))errors.push(`${product.id}: missing WebP ${width}`);}
const htmlFiles=[];const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);entry.isDirectory()?walk(target):entry.name.endsWith(".html")&&htmlFiles.push(target);}};if(fs.existsSync(dist))walk(dist);else errors.push("dist does not exist; run npm run build");
for(const file of htmlFiles){
  const html=fs.readFileSync(file,"utf8");
  const relative=path.relative(dist,file);
  for(const marker of ["<title>","meta name=\"description\"","rel=\"canonical\"","<h1","<base href="])if(!html.includes(marker))errors.push(`${relative}: missing ${marker}`);
  const baseHref=html.match(/<base href="([^"]+)">/)?.[1];
  const baseDir=baseHref?path.resolve(path.dirname(file),baseHref):null;
  if(baseDir!==dist)errors.push(`${relative}: file-mode base does not resolve to dist root`);
  if(/(?:src|href)="\/(?!\/)/.test(html))errors.push(`${relative}: root-relative URL breaks direct file opening`);
  for(const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)){const local=path.resolve(baseDir,match[1]);if(!fs.existsSync(local))errors.push(`${relative}: broken file-mode asset ${match[1]}`);}
  for(const match of html.matchAll(/href="([^"?#]+)"/g)){
    const href=match[1];
    if(href===baseHref||/^(?:https?:|mailto:|tel:|assets\/)/.test(href))continue;
    const target=href==="index.html"?path.join(dist,"index.html"):href.endsWith("/")?path.resolve(baseDir,href,"index.html"):path.resolve(baseDir,href);
    if(!fs.existsSync(target))errors.push(`${relative}: broken internal link ${href}`);
  }
}
for(const file of ["robots.txt","sitemap.xml","assets/images/brand/favicon-32.png","assets/styles/main.css","assets/styles/overrides.css","assets/scripts/app.js","assets/icons/saudi-riyal-symbol.svg","assets/fonts/alexandria-arabic.woff2","assets/fonts/alexandria-latin.woff2"])if(!fs.existsSync(path.join(dist,file)))errors.push(`Missing ${file}`);
for(const file of ["assets/images/hero/about-office-960.webp","assets/images/hero/about-office-1600.webp"])if(!fs.existsSync(path.join(dist,file)))errors.push(`Missing ${file}`);
if(errors.length){console.error(errors.join("\n"));process.exit(1);}console.log(`Validation passed: ${products.length} products, ${htmlFiles.length} HTML files, no missing local assets.`);
