import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../config/supabase.js";
const db = createClient(supabaseConfig.url, supabaseConfig.key);
const root = document.querySelector("#admin-root");
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const statuses = {
  draft: "غير جاهز",
  published: "ظاهر في المتجر",
  hidden: "مخفي",
  archived: "محذوف (قابل للاستعادة)",
};
let rows = [],
  covers = new Map(),
  categories = [],
  current = null,
  colors = [],
  sizes = [],
  images = [],
  busy = false,
  dirty = false;
const check = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
const message = (text, error = false) => {
  const n = document.querySelector("#admin-message");
  n.textContent = text;
  n.className = error ? "admin-message error" : "admin-message";
};
async function run(fn) {
  if (busy) return;
  busy = true;
  root.setAttribute("aria-busy", "true");
  try {
    message("");
    await fn();
  } catch (e) {
    const friendly =
      e.code === "40001"
        ? "المنتج اتعدل من جلسة أخرى. حدّث القائمة وحاول مجددًا."
        : e.code === "42501"
          ? "لا توجد صلاحية لإتمام العملية. سجّل الدخول بحساب الأدمن."
          : e.message;
    message(friendly || "تعذر إتمام العملية. حاول مرة أخرى.", true);
  } finally {
    busy = false;
    root.removeAttribute("aria-busy");
  }
}
async function all(table) {
  let data = [];
  for (let offset = 0; ; offset += 500) {
    const page = check(
      await db
        .from(table)
        .select("*")
        .order("id")
        .range(offset, offset + 499),
    );
    data.push(...page);
    if (page.length < 500) return data;
  }
}
async function loadCovers() {
  const media = await all("product_images");
  covers = new Map(
    await Promise.all(
      rows.map(async (p) => {
        const image =
          media.find((i) => i.product_id === p.id && i.is_primary) ||
          media.find((i) => i.product_id === p.id);
        return [p.id, image ? await preview(image) : ""];
      }),
    ),
  );
}
function field(label, name, value = "", type = "text", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
function area(label, name, value = "") {
  return `<label>${label}<textarea name="${name}" rows="4">${esc(value)}</textarea></label>`;
}
function showLogin() {
  root.innerHTML = `<section class="admin-login"><span class="eyebrow">ArchiCiva</span><h1>صفحة الإدارة</h1><p>دخول مسؤولي المتجر المصرح لهم.</p><form id="admin-login">${field("البريد الإلكتروني", "email", "", "email", 'required autocomplete="username"')}${field("كلمة المرور", "password", "", "password", 'required autocomplete="current-password"')}<button class="button">تسجيل الدخول</button></form></section>`;
  document.querySelector("#admin-login").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    run(async () => {
      message("جارٍ تسجيل الدخول…");
      check(
        await db.auth.signInWithPassword({
          email: f.get("email"),
          password: f.get("password"),
        }),
      );
      await openAdmin();
    });
  };
}
async function openAdmin() {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    showLogin();
    return;
  }
  const member = check(
    await db
      .from("admin_users")
      .select("active")
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  if (!member?.active) {
    await db.auth.signOut();
    showLogin();
    throw Error("هذا الحساب غير مصرح له بإدارة المتجر.");
  }
  [rows, categories] = await Promise.all([all("products"), all("categories")]);
  await loadCovers();
  root.innerHTML = `<header class="admin-heading"><div><span class="eyebrow">ArchiCiva / إدارة المتجر</span><h1>لوحة التحكم</h1><p>${esc(user.email)}</p></div><button id="logout" class="button button--outline">تسجيل الخروج</button></header><nav class="admin-tabs"><button class="button" id="products-tab">المنتجات والأسعار</button><button class="button button--outline" id="categories-tab">الأقسام</button></nav><div id="admin-workspace"></div>`;
  document.querySelector("#logout").onclick = () =>
    run(async () => {
      if (dirty && !confirm("تجاهل التعديلات غير المحفوظة؟")) return;
      check(await db.auth.signOut());
      dirty = false;
      showLogin();
      message("تم تسجيل الخروج.");
    });
  document.querySelector("#products-tab").onclick = () => {
    if (!dirty || confirm("تجاهل التعديلات غير المحفوظة؟")) showProducts();
  };
  document.querySelector("#categories-tab").onclick = () => {
    if (!dirty || confirm("تجاهل التعديلات غير المحفوظة؟")) showCategories();
  };
  showProducts();
  message('');
}
function showProducts() {
  dirty = false;
  document.querySelector("#admin-workspace").innerHTML =
    `<section class="admin-toolbar"><input id="admin-search" type="search" placeholder="بحث بالاسم أو كود المنتج" aria-label="بحث المنتجات"><select id="admin-category" aria-label="القسم"><option value="">كل الأقسام</option>${categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select><select id="admin-status" aria-label="حالة النشر"><option value="">كل الحالات</option>${Object.entries(
      statuses,
    )
      .map(([k, v]) => `<option value="${k}">${v}</option>`)
      .join(
        "",
      )}</select><button id="new-product" class="button">إضافة منتج</button><button id="refresh-products" class="button button--outline">تحديث القائمة</button></section><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>المنتج</th><th>السعر</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody id="admin-rows"></tbody></table></div><section id="product-editor"></section>`;
  const paint = () => {
    const term = document
        .querySelector("#admin-search")
        .value.trim()
        .toLowerCase(),
      cat = document.querySelector("#admin-category").value,
      status = document.querySelector("#admin-status").value;
    document.querySelector("#admin-rows").innerHTML = rows
      .filter(
        (p) =>
          (!term || `${p.name} ${p.id}`.toLowerCase().includes(term)) &&
          (!cat || belongsToCategory(p.category_id, cat)) &&
          (!status || p.status === status),
      )
      .map(
        (p) =>
          `<tr><td><div class="admin-product-cell">${covers.get(p.id) ? `<button class="admin-cover" data-edit="${esc(p.id)}" aria-label="تعديل ${esc(p.name)}"><img src="${esc(covers.get(p.id))}" alt="${esc(p.name)}" width="110" height="120" loading="lazy"></button>` : ""}<span><strong>${esc(p.name)}</strong><small>${esc(p.id)}</small></span></div></td><td><form class="quick-price" data-price-product="${esc(p.id)}"><label>السعر الحالي<input aria-label="السعر الحالي ${esc(p.name)}" name="price" type="number" min="0.01" step="0.01" required value="${p.price_minor / 100}"></label><label>قبل الخصم (اختياري)<input aria-label="السعر قبل الخصم ${esc(p.name)}" name="before" type="number" min="0.01" step="0.01" value="${p.compare_at_price_minor == null ? "" : p.compare_at_price_minor / 100}"></label><button class="button button--small">حفظ السعر</button></form></td><td>${statuses[p.status]}</td><td><button class="button button--small" data-edit="${esc(p.id)}">الصور والبيانات</button></td></tr>`,
      )
      .join("");
    document.querySelectorAll("[data-price-product]").forEach((form) =>
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        run(async () => {
          if (dirty) throw Error("احفظ التعديلات المفتوحة أولًا.");
          const p = rows.find((p) => p.id === form.dataset.priceProduct);
          const f = new FormData(form);
          const price = Math.round(Number(f.get("price")) * 100),
            before =
              f.get("before") === ""
                ? null
                : Math.round(Number(f.get("before")) * 100);
          if (
            !Number.isSafeInteger(price) ||
            price <= 0 ||
            (before !== null &&
              (!Number.isSafeInteger(before) || before <= price))
          )
            throw Error(
              "السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي، أو اتركه فارغًا.",
            );
          const updated = check(
            await db
              .from("products")
              .update({ price_minor: price, compare_at_price_minor: before })
              .eq("id", p.id)
              .eq("version", p.version)
              .select()
              .maybeSingle(),
          );
          if (!updated)
            throw Error("المنتج اتعدل من جلسة أخرى. حدّث القائمة وحاول مجددًا.");
          rows = rows.map((row) => (row.id === p.id ? updated : row));
          message("تم حفظ السعر.");
          paint();
          if (current?.id === p.id && document.querySelector("#edit-form"))
            await editProduct(p.id);
        });
      }),
    );
    document.querySelectorAll("#admin-rows [data-edit]").forEach((button) => {
      button.addEventListener("click", () =>
        run(() => editProduct(button.dataset.edit)),
      );
    });
  };
  for (const id of ["admin-search", "admin-category", "admin-status"])
    document.getElementById(id).oninput = paint;
  document.querySelector("#new-product").onclick = () =>
    run(() => editProduct(null));
  document.querySelector("#refresh-products").onclick = () =>
    run(async () => {
      if (dirty && !confirm("تجاهل التعديلات غير المحفوظة؟")) return;
      rows = await all("products");
      await loadCovers();
      showProducts();
    });
  paint();
}
function belongsToCategory(id, selected) {
  const seen = new Set();
  while (id && !seen.has(id)) {
    if (id === selected) return true;
    seen.add(id);
    id = categories.find((c) => c.id === id)?.parent_id;
  }
  return false;
}
function categoryIsVisible(id) {
  const seen = new Set();
  while (id && !seen.has(id)) {
    seen.add(id);
    const c = categories.find((c) => c.id === id);
    if (!c?.published) return false;
    id = c.parent_id;
  }
  return true;
}
async function editProduct(id) {
  if (dirty && !confirm("تجاهل التعديلات غير المحفوظة؟")) return;
  current = id
    ? check(await db.from("products").select("*").eq("id", id).single())
    : {
        id: `AC-${crypto.randomUUID().slice(0, 8)}`,
        slug: "",
        name: "",
        category_id: categories.find(
          (c) => c.parent_id && categoryIsVisible(c.id),
        )?.id,
        status: "published",
        price_minor: 100,
        compare_at_price_minor: null,
        details: {
          features: [],
          uses: [],
          tags: [],
          careInstructions: [],
          relatedProducts: [],
          complementaryProducts: [],
        },
      };
  [colors, sizes, images] = id
    ? await Promise.all(
        ["product_colors", "product_sizes", "product_images"].map((t) =>
          db
            .from(t)
            .select("*")
            .eq("product_id", id)
            .order("sort_order")
            .then(check),
        ),
      )
    : [[], [], []];
  for (const i of images) i.preview = await preview(i);
  const d = current.details;
  const host = document.querySelector("#product-editor");
  host.innerHTML = `<form id="edit-form" class="admin-editor"><header><h2>${esc(current.name || "إضافة منتج جديد")}</h2><p>اكتب بيانات المنتج، أضف صوره، ثم اضغط حفظ.</p></header><div class="admin-form-grid">${field("اسم المنتج", "name", current.name, "text", 'required maxlength="200"')}<label>القسم<select name="category_id" required>${categories
    .filter(
      (c) =>
        c.parent_id &&
        (categoryIsVisible(c.id) || c.id === current.category_id),
    )
    .map(
      (c) =>
        `<option value="${esc(c.id)}" ${c.id === current.category_id ? "selected" : ""}>${esc(c.name)}</option>`,
    )
    .join(
      "",
    )}</select></label>${field("السعر الحالي (ريال)", "price", current.price_minor / 100, "number", 'required min="0.01" step="0.01"')}${field("السعر قبل الخصم — اختياري", "before", current.compare_at_price_minor == null ? "" : current.compare_at_price_minor / 100, "number", 'min="0.01" step="0.01"')}${field("نسبة الخصم %", "discount", current.compare_at_price_minor ? Math.round((1 - current.price_minor / current.compare_at_price_minor) * 10000) / 100 : 0, "number", 'min="0" max="99.99" step="0.01"')}<label>عرض المنتج<select name="status">${Object.entries(
    statuses,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${k === current.status ? "selected" : ""}>${v}</option>`,
    )
    .join(
      "",
    )}</select></label></div>${area("وصف المنتج", "description", d.description)}<section><h3>الألوان</h3><div id="edit-colors"></div><button type="button" id="add-color" class="button button--outline">إضافة لون</button></section><section><h3>المقاسات والأبعاد</h3><p>اترك البعد غير المناسب فارغًا. كل الأسعار حاليًا على مستوى المنتج.</p><div id="edit-sizes"></div><button type="button" id="add-size" class="button button--outline">إضافة مقاس</button></section><section><h3>صور المنتج وصور الألوان</h3><p>اختر اللون المناسب تحت كل صورة، وحدّد الصورة الرئيسية. استخدم الأسهم لترتيب الصور.</p><label>إضافة صور من جهازك — حتى 10 ميجابايت للصورة<input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div id="edit-images" class="admin-media"></div></section><div class="admin-save"><button class="button" type="submit">حفظ المنتج</button><button class="button button--outline" type="button" id="archive-product">حذف من المتجر (قابل للاستعادة)</button><button class="button button--outline" type="button" id="check-publication">هل ظهر التعديل في الموقع؟</button><span id="save-state"></span></div></form>`;
  document.querySelector("#check-publication").onclick = () =>
    run(async () => {
      const r = await fetch("/catalog-version.json", { cache: "no-store" });
      if (!r.ok) throw Error("تعذر قراءة حالة النشر");
      const versions = await r.json();
      document.querySelector("#save-state").textContent = (
        current.status === "published"
          ? versions[current.id] === current.version
          : !Object.hasOwn(versions, current.id)
      )
        ? current.status === "published"
          ? "التعديل ظاهر في الموقع."
          : "المنتج غير ظاهر في المتجر."
        : "التعديل محفوظ، وظهوره في الموقع قيد الانتظار. تحقق بعد عدة دقائق.";
    });
  const form = document.querySelector("#edit-form");
  form.oninput = () => {
    dirty = true;
  };
  form.elements.discount.oninput = () => {
    if (form.elements.discount.value === "") return;
    const percent = Number(form.elements.discount.value);
    if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return;
    const base =
      Number(form.elements.before.value) || Number(form.elements.price.value);
    if (percent === 0) {
      form.elements.before.value = "";
    } else {
      form.elements.before.value = base.toFixed(2);
      form.elements.price.value = (
        Math.round(base * 100 * (1 - percent / 100)) / 100
      ).toFixed(2);
    }
    dirty = true;
  };
  for (const k of ["price", "before"])
    form.elements[k].oninput = () => {
      const p = Number(form.elements.price.value),
        b = Number(form.elements.before.value);
      form.elements.discount.value =
        b > p ? Math.round((1 - p / b) * 10000) / 100 : 0;
    };
  document.querySelector("#add-color").onclick = () => {
    colors.push({ id: crypto.randomUUID(), name: "", hex: "#dddddd" });
    dirty = true;
    paintColors();
    paintImages();
  };
  document.querySelector("#add-size").onclick = () => {
    sizes.push({ id: crypto.randomUUID(), label: "", dimensions: {} });
    dirty = true;
    paintSizes();
  };
  document.querySelector("#image-upload").onchange = (e) => {
    const files = [...e.target.files];
    run(async () => {
      message("جارٍ رفع الصور…");
      for (const file of files) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 10485760
        )
          throw Error("صيغة صورة غير مدعومة أو الحجم يتجاوز 10 ميجابايت.");
        const path = `${current.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        check(
          await db.storage
            .from("catalog-drafts")
            .upload(path, file, { contentType: file.type, upsert: false }),
        );
        const i = {
          id: crypto.randomUUID(),
          bucket: "catalog-drafts",
          path,
          color_id: null,
          alt: current.name,
          is_primary: images.length === 0,
        };
        i.preview = await preview(i);
        images.push(i);
        dirty = true;
        paintImages();
      }
      message("تم رفع الصور. احفظ المنتج لاعتماد روابطها.");
    });
  };
  document.querySelector("#archive-product").onclick = () => {
    form.elements.status.value = "archived";
    dirty = true;
    message("تم اختيار الحذف القابل للاستعادة. اضغط حفظ المنتج للتنفيذ.");
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    run(saveProduct);
  };
  paintColors();
  paintSizes();
  paintImages();
  dirty = false;
  host.scrollIntoView({ behavior: "smooth" });
}
async function preview(i) {
  return i.bucket === "legacy"
    ? i.path
    : i.bucket === "catalog-public"
      ? db.storage.from(i.bucket).getPublicUrl(i.path).data.publicUrl
      : check(await db.storage.from(i.bucket).createSignedUrl(i.path, 3600))
          .signedUrl;
}
function paintColors() {
  const el = document.querySelector("#edit-colors");
  el.innerHTML = colors
    .map(
      (c, n) =>
        `<div class="admin-option">${field("اسم اللون", `color-${n}`, c.name, "text", "required")}<label>اللون<input type="color" value="${esc(c.hex)}" data-hex="${n}"></label><button type="button" data-remove-color="${n}">حذف اللون</button></div>`,
    )
    .join("");
  el.oninput = (e) => {
    const n = e.target.dataset.hex;
    if (n !== undefined) colors[n].hex = e.target.value;
    else {
      const m = e.target.name.match(/^color-(\d+)$/);
      if (m) colors[m[1]].name = e.target.value;
    }
  };
  el.onchange = () => paintImages();
  el.onclick = (e) => {
    const n = e.target.dataset.removeColor;
    if (n === undefined) return;
    const c = colors[n];
    if (images.some((i) => i.color_id === c.id)) {
      message("اربط صور هذا اللون بلون آخر أو احذف ارتباط الصور أولًا.", true);
      return;
    }
    colors.splice(n, 1);
    dirty = true;
    paintColors();
    paintImages();
  };
}
function paintSizes() {
  const el = document.querySelector("#edit-sizes");
  el.innerHTML = sizes
    .map(
      (s, n) =>
        `<div class="admin-option">${field("اسم المقاس", `size-${n}-label`, s.label, "text", "required")}${["lengthCm", "widthCm", "heightCm", "diameterCm"].map((k, i) => field(["الطول سم", "العرض سم", "الارتفاع سم", "القطر سم"][i], `size-${n}-${k}`, s.dimensions[k] ?? "", "number", 'min="0.01" step="0.01"')).join("")}<button type="button" data-remove-size="${n}">حذف المقاس</button></div>`,
    )
    .join("");
  el.oninput = (e) => {
    const m = e.target.name.match(/^size-(\d+)-(.+)$/);
    if (!m) return;
    const s = sizes[m[1]],
      k = m[2];
    if (k === "label") s.label = e.target.value;
    else if (e.target.value === "") delete s.dimensions[k];
    else s.dimensions[k] = Number(e.target.value);
  };
  el.onclick = (e) => {
    const n = e.target.dataset.removeSize;
    if (n !== undefined) {
      sizes.splice(n, 1);
      dirty = true;
      paintSizes();
    }
  };
}
function paintImages() {
  const el = document.querySelector("#edit-images");
  el.innerHTML = images
    .map(
      (i, n) =>
        `<article class="admin-image"><img src="${esc(i.preview)}" alt="معاينة الصورة"><label>صور اللون<select data-image-color="${n}"><option value="">صورة عامة</option>${colors.map((c) => `<option value="${c.id}" ${i.color_id === c.id ? "selected" : ""}>${esc(c.name || "لون جديد")}</option>`).join("")}</select></label><label><input type="radio" name="primary-image" data-primary="${n}" ${i.is_primary ? "checked" : ""}> الصورة الرئيسية</label><input aria-label="وصف الصورة" data-image-alt="${n}" value="${esc(i.alt)}"><div><button type="button" data-image-up="${n}" ${n === 0 ? "disabled" : ""}>↑</button><button type="button" data-image-down="${n}" ${n === images.length - 1 ? "disabled" : ""}>↓</button><button type="button" data-image-remove="${n}">إزالة الصورة من المنتج</button></div></article>`,
    )
    .join("");
  el.onchange = (e) => {
    if (e.target.dataset.imageColor !== undefined)
      images[e.target.dataset.imageColor].color_id = e.target.value || null;
    if (e.target.dataset.primary !== undefined)
      images.forEach((i, n) => {
        i.is_primary = n === Number(e.target.dataset.primary);
      });
    dirty = true;
  };
  el.oninput = (e) => {
    if (e.target.dataset.imageAlt !== undefined)
      images[e.target.dataset.imageAlt].alt = e.target.value;
  };
  el.onclick = (e) => {
    let n;
    if ((n = e.target.dataset.imageRemove) !== undefined) {
      images.splice(n, 1);
      if (images.length && !images.some((i) => i.is_primary))
        images[0].is_primary = true;
    } else if ((n = e.target.dataset.imageUp) !== undefined) {
      n = Number(n);
      [images[n - 1], images[n]] = [images[n], images[n - 1]];
    } else if ((n = e.target.dataset.imageDown) !== undefined) {
      n = Number(n);
      [images[n + 1], images[n]] = [images[n], images[n + 1]];
    } else return;
    dirty = true;
    paintImages();
  };
}
async function saveProduct() {
  const form = document.querySelector("#edit-form"),
    f = new FormData(form),
    price = Math.round(Number(f.get("price")) * 100),
    before =
      f.get("before") === "" ? null : Math.round(Number(f.get("before")) * 100);
  if (
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    (before !== null && before <= price)
  )
    throw Error(
      "السعر الأصلي يجب أن يكون أكبر من السعر الحالي، أو اتركه فارغًا لإلغاء الخصم.",
    );
  if (
    new Set(colors.map((c) => c.name.trim())).size !== colors.length ||
    colors.some((c) => !c.name.trim())
  )
    throw Error("أسماء الألوان مطلوبة ويجب ألا تتكرر.");
  if (
    new Set(sizes.map((s) => s.label.trim())).size !== sizes.length ||
    sizes.some((s) => !s.label.trim())
  )
    throw Error("أسماء المقاسات مطلوبة ويجب ألا تتكرر.");
  const status = f.get("status");
  if (status === "published" && !images.length)
    throw Error("أضف صورة واحدة على الأقل للمنتج قبل حفظه.");
  message("جارٍ الحفظ…");
  // Stage immutable copies before the atomic DB save; originals are retained for recovery.
  if (status === "published")
    for (const i of images.filter((i) => i.bucket === "catalog-drafts")) {
      const blob = check(await db.storage.from(i.bucket).download(i.path));
      check(
        await db.storage
          .from("catalog-public")
          .upload(i.path, blob, { contentType: blob.type, upsert: true }),
      );
      i.bucket = "catalog-public";
      i.preview = await preview(i);
    }
  const details = { ...current.details };
  for (const key of [
    "description",
    "shortDescription",
    "secondaryDescription",
    "material",
    "seoTitle",
    "seoDescription",
  ])
    if (f.has(key)) details[key] = f.get(key);
  for (const key of ["features", "uses", "careInstructions"])
    if (f.has(key))
      details[key] = String(f.get(key))
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
  if (
    [
      "description",
      "secondaryDescription",
      "features",
      "uses",
      "careInstructions",
    ].some(
      (key) =>
        JSON.stringify(details[key]) !==
        JSON.stringify(
          current.details[key] ?? (Array.isArray(details[key]) ? [] : ""),
        ),
    )
  )
    details.contentEdited = true;
  if (!current.version || details.description !== current.details.description) {
    details.shortDescription = String(details.description || "").slice(0, 160);
    details.seoDescription = details.shortDescription;
  }
  if (!current.version || f.get("name").trim() !== current.name)
    details.seoTitle = f.get("name").trim();
  const payload = {
    id: current.id,
    slug: current.slug || "product-" + current.id.toLowerCase(),
    name: f.get("name").trim(),
    category_id: f.get("category_id"),
    price_minor: price,
    compare_at_price_minor: before,
    status,
    details,
    colors: colors.map((c, n) => ({
      ...c,
      name: c.name.trim(),
      sort_order: n,
    })),
    sizes: sizes.map((s, n) => ({ ...s, sort_order: n })),
    images: images.map(({ preview, ...i }, n) => ({ ...i, sort_order: n })),
  };
  check(
    await db.rpc("save_catalog_product", {
      payload,
      expected_version: current.version ?? null,
    }),
  );
  dirty = false;
  rows = await all("products");
  await loadCovers();
  message("تم حفظ المنتج. قد يستغرق ظهوره في الموقع بضع دقائق.");
  await editProduct(current.id);
}
function showCategories() {
  dirty = false;
  const host = document.querySelector("#admin-workspace");
  host.innerHTML = `<h2>إدارة الأقسام</h2><div class="admin-category-list">${categories.map((c) => `<button class="button button--outline" data-category="${esc(c.id)}">${esc(c.name)} ${c.published ? "" : "(مخفي)"}</button>`).join("")}<button class="button" id="new-category">إضافة قسم</button></div><div id="category-editor"></div>`;
  const edit = (c) => {
    if (dirty && !confirm("تجاهل التعديلات غير المحفوظة؟")) return;
    const categoryId = c.id || `cat-${crypto.randomUUID().slice(0, 8)}`;
    document.querySelector("#category-editor").innerHTML =
      `<form id="category-form" class="admin-editor"><h3>بيانات القسم</h3>${field("اسم القسم", "name", c.name, "text", "required")}<label>القسم الأب<select name="parent_id"><option value="">قسم رئيسي</option>${categories
        .filter((x) => !x.parent_id && x.id !== c.id)
        .map(
          (x) =>
            `<option value="${esc(x.id)}" ${c.parent_id === x.id ? "selected" : ""}>${esc(x.name)}</option>`,
        )
        .join(
          "",
        )}</select></label>${area("الوصف", "description", c.description)}<label><input type="checkbox" name="published" ${c.published ? "checked" : ""}> ظاهر بالمتجر</label><button class="button">حفظ القسم</button></form>`;
    const form = document.querySelector("#category-form");
    const media = document.createElement("section");
    media.innerHTML =
      '<label>صورة القسم (اختيارية)<input id="category-image" type="file" accept="image/jpeg,image/png,image/webp"></label><img id="category-preview" alt="معاينة صورة القسم" style="max-width:240px" hidden><button type="button" id="remove-category-image">إزالة صورة القسم</button>';
    form.querySelector("button").before(media);
    const refreshPreview = async () => {
      const img = media.querySelector("img");
      if (!c.image_path) {
        img.hidden = true;
        return;
      }
      const [bucket, ...parts] = c.image_path.split("/");
      img.src = await preview({ bucket, path: parts.join("/") });
      img.hidden = false;
    };
    run(refreshPreview);
    media.querySelector("#category-image").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      run(async () => {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 10485760
        )
          throw Error("صيغة الصورة غير مناسبة أو الحجم أكبر من 10 ميجابايت.");
        const path = `categories/${categoryId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        check(
          await db.storage
            .from("catalog-drafts")
            .upload(path, file, { contentType: file.type }),
        );
        c.image_path = `catalog-drafts/${path}`;
        dirty = true;
        await refreshPreview();
        message("تم رفع صورة القسم. احفظ القسم لاعتمادها.");
      });
    };
    media.querySelector("#remove-category-image").onclick = () => {
      c.image_path = null;
      dirty = true;
      media.querySelector("img").hidden = true;
    };
    form.oninput = () => (dirty = true);
    form.onsubmit = (e) => {
      e.preventDefault();
      run(async () => {
        const f = new FormData(form),
          payload = {
            id: categoryId,
            name: f.get("name"),
            slug:
              c.slug ||
              (
                (categories.find((x) => x.id === f.get("parent_id"))?.slug ||
                  "") +
                "/category-" +
                categoryId.replace("cat-", "")
              ).replace(/^\//, ""),
            description: f.get("description"),
            parent_id: f.get("parent_id") || null,
            published: f.has("published"),
            image_path: c.image_path || null,
            metadata:
              c.name !== f.get("name")
                ? { ...(c.metadata || {}), shortName: f.get("name") }
                : c.metadata || {},
          };
        if (
          payload.published &&
          payload.image_path?.startsWith("catalog-drafts/")
        ) {
          const path = payload.image_path.slice("catalog-drafts/".length);
          const blob = check(
            await db.storage.from("catalog-drafts").download(path),
          );
          check(
            await db.storage
              .from("catalog-public")
              .upload(path, blob, { contentType: blob.type, upsert: true }),
          );
          payload.image_path = `catalog-public/${path}`;
        }
        check(await db.from("categories").upsert(payload));
        categories = await all("categories");
        dirty = false;
        showCategories();
        message("تم حفظ القسم. سيظهر في الموقع خلال بضع دقائق.");
      });
    };
  };
  host.onclick = (e) => {
    if (e.target.dataset.category)
      edit(categories.find((c) => c.id === e.target.dataset.category));
  };
  document.querySelector("#new-category").onclick = () =>
    edit({ published: false });
}
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
db.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    dirty = false;
    showLogin();
  }
});
run(openAdmin);
