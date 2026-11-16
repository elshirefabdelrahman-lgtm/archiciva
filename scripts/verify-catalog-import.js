// Migration acceptance check; do not run after intentional owner catalog edits.
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { products as legacy } from "../src/data/products.js";
import { loadCatalog, readTable } from "../src/data/catalog-client.js";
const catalog = await loadCatalog();
const rows = await readTable("products");
assert.equal(catalog.products.length, legacy.length);
for (const p of legacy) {
  const row = rows.find((r) => r.id === p.id);
  assert.ok(row, `Missing ${p.id}`);
  assert.equal(row.slug, p.slug);
  assert.equal(row.price_minor, Math.round(p.price * 100));
  for (const key of Object.keys(p))
    if (p[key] !== undefined)
      assert.deepEqual(row.details[key], p[key], `${p.id}: ${key}`);
  const n = catalog.products.find((r) => r.id === p.id),
    image = n.gallery.find((i) => i.is_primary);
  assert.equal(image.bucket, "catalog-public");
  const expected = crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(`dist/assets/images/products/${p.imageName}-800.webp`),
    )
    .digest("hex");
  assert.ok(
    image.path.endsWith(`/${expected}.webp`),
    `Image mapping differs: ${p.id}`,
  );
}
console.log(
  `PASS: ${legacy.length} original products, all legacy fields, IDs, slugs, prices and optimized-image SHA-256 mappings match.`,
);
