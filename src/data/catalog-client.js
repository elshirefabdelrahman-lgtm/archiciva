import { supabaseConfig as config } from "../config/supabase.js";
export async function readTable(table, select = "*") {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const r = await fetch(
      `${config.url}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=id&offset=${start}&limit=500`,
      { headers: { apikey: config.key }, signal: AbortSignal.timeout(20000) },
    );
    if (!r.ok) throw new Error(`Catalog ${table}: ${r.status}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export function imageUrl(i) {
  if (i.bucket === "legacy") return i.path;
  return `${config.url}/storage/v1/object/public/catalog-public/${i.path.split("/").map(encodeURIComponent).join("/")}`;
}
export async function loadCatalog() {
  const response = await fetch(config.url + "/rest/v1/rpc/get_store_catalog", {
    method: "POST",
    headers: { apikey: config.key, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Error("Catalog snapshot: " + response.status);
  const {
    products: rows,
    categories: cats,
    product_colors: colors,
    product_sizes: sizes,
    product_images: images,
  } = await response.json();
  const sort = (a, b) =>
    a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id));
  const categories = cats
    .filter((c) => c.parent_id)
    .sort(sort)
    .map((c) => ({
      ...c.metadata,
      ...c,
      parent: c.parent_id,
      shortName: c.metadata?.shortName || c.name,
    }));
  const categoryGroups = cats
    .filter((c) => !c.parent_id)
    .sort(sort)
    .map((c) => ({ ...c.metadata, ...c }));
  const products = rows.sort(sort).map((r) => {
    const gallery = images
      .filter((i) => i.product_id === r.id)
      .sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || sort(a, b),
      );
    const variants = colors.filter((c) => c.product_id === r.id).sort(sort);
    const options = sizes.filter((s) => s.product_id === r.id).sort(sort);
    const category = cats.find((c) => c.id === r.category_id);
    return {
      currency: "SAR",
      features: [],
      uses: [],
      tags: [],
      relatedProducts: [],
      complementaryProducts: [],
      careInstructions: [],
      image: "",
      images: [],
      imageName: r.id,
      alt: r.name,
      description: "",
      material: "",
      color: "",
      ...r.details,
      id: r.id,
      slug: r.slug,
      name: r.name,
      price: r.price_minor / 100,
      originalPrice:
        r.compare_at_price_minor == null
          ? null
          : r.compare_at_price_minor / 100,
      subcategory: r.category_id,
      category: category?.parent_id || r.category_id,
      version: r.version,
      sortOrder: r.sort_order,
      shortDescription:
        r.details.shortDescription ||
        r.details.description?.slice(0, 160) ||
        r.name,
      seoTitle: r.details.seoTitle || r.name,
      seoDescription:
        r.details.seoDescription ||
        r.details.shortDescription ||
        r.details.description?.slice(0, 160) ||
        r.name,
      size: options[0]?.label || r.details.size || "",
      dimensions: options[0]?.dimensions || r.details.dimensions || {},
      displayImage: gallery[0] ? imageUrl(gallery[0]) : "",
      gallery: gallery.map((i) => ({ ...i, url: imageUrl(i) })),
      colorOptions: variants,
      availableColors: variants.map((c) => c.name),
      sizeOptions: options,
    };
  });
  return { products, categories, categoryGroups };
}
