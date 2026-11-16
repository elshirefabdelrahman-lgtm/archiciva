// Read-only source inventory plus repeat-safe initial import. Never overwrites admin edits.
import fs from "node:fs";
import crypto from "node:crypto";
import { products } from "../src/data/products.js";
import { categories, categoryGroups } from "../src/data/categories.js";
const q = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const json = (value) => `${q(JSON.stringify(value))}::jsonb`;
const statements = ["begin;"];
for (const [order, c] of [...categoryGroups, ...categories].entries()) {
  statements.push(
    `insert into public.categories(id,parent_id,name,slug,description,sort_order,published,metadata) values (${q(c.id)},${c.parent ? q(c.parent) : "null"},${q(c.name)},${q(c.slug)},${q(c.description || "")},${order},true,${json(c)}) on conflict(id) do nothing;`,
  );
}
const colors = {
  رمادي: "#9aa0a0",
  ترابي: "#9d8264",
  بيج: "#dcc59f",
  سكري: "#eee5c8",
  أسود: "#111111",
  طبيعي: "#c79b61",
  عسلي: "#b8752a",
  بني: "#74462c",
  "بني داكن": "#3f2a22",
};
const inventory = [];
for (const [order, p] of products.entries()) {
  const bytes = fs.readFileSync(p.image);
  inventory.push({
    ...p,
    sourceSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  });
  const before =
    p.originalPrice > p.price ? Math.round(p.originalPrice * 100) : null;
  statements.push(
    `do $archiciva_import$ begin if not exists(select 1 from public.products where id=${q(p.id)}) then`,
  );
  statements.push(
    `insert into public.products(id,slug,category_id,name,price_minor,compare_at_price_minor,status,sort_order,details) values (${q(p.id)},${q(p.slug)},${q(p.subcategory)},${q(p.name)},${Math.round(p.price * 100)},${before ?? "null"},'published',${order},${json(p)}) on conflict(id) do nothing;`,
  );
  for (const [n, name] of (p.availableColors || []).entries())
    statements.push(
      `insert into public.product_colors(product_id,name,hex,sort_order) values (${q(p.id)},${q(name)},${q(colors[name] || "#dddddd")},${n}) on conflict(product_id,name) do nothing;`,
    );
  statements.push(
    `insert into public.product_sizes(product_id,label,dimensions,raw_text) values (${q(p.id)},${q(p.size || "المقاس الحالي")},${json(p.dimensions || {})},${q(JSON.stringify(p.dimensions || {}))}) on conflict(product_id,label) do nothing;`,
  );
  statements.push(
    `insert into public.product_images(product_id,bucket,path,alt,is_primary) values (${q(p.id)},'legacy',${q(`/assets/images/products/${p.imageName}-800.webp`)},${q(p.alt || p.name)},true) on conflict(product_id,bucket,path) do nothing;`,
  );
  statements.push("end if; end $archiciva_import$;");
}
statements.push("commit;");
fs.mkdirSync("supabase/import", { recursive: true });
fs.writeFileSync("supabase/import/catalog.sql", statements.join("\n") + "\n");
fs.writeFileSync(
  "supabase/import/catalog-inventory.json",
  JSON.stringify({ products: inventory, categories, categoryGroups }, null, 2) +
    "\n",
);
console.log(
  `Exported ${products.length} products, ${categories.length} subcategories; all source files read and checksummed. No remote changes.`,
);
