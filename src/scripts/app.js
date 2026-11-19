import { loadCatalog } from "../data/catalog-client.js";
document.head.insertAdjacentHTML(
  "beforeend",
  "<style>[hidden]{display:none!important}</style>",
);
let catalogReady = true;
let products;
let catalogCategories = [];
try {
  const catalog = await loadCatalog();
  catalogCategories = catalog.categories;
  const response = await fetch("/catalog-version.json", {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("Published route inventory unavailable");
  const built = await response.json();
  // New products become discoverable only once their crawlable HTML route exists.
  products = catalog.products
    .filter((p) => Object.hasOwn(built, p.id))
    .map((p) => ({ ...p, image: p.displayImage }));
} catch (error) {
  catalogReady = false;
  products = window.__ARCHICIVA_PRODUCTS__ || [];
  console.error("Catalog refresh failed", error);
  document
    .querySelectorAll("[data-add-to-cart], [data-checkout-form] button")
    .forEach((b) => (b.disabled = true));
  const warning = document.createElement("p");
  warning.className = "container admin-message error";
  warning.textContent =
    "تعذر تحديث بيانات المنتجات. أعد تحميل الصفحة قبل إرسال الطلب.";
  document.querySelector("main")?.prepend(warning);
}
const config = window.__ARCHICIVA_CONFIG__ || {};
const normalizeArabic = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const productText = (product) =>
  normalizeArabic(
    [
      product.name,
      product.shortDescription,
      product.color,
      product.material,
      product.subcategory,
      ...(product.tags || []),
      ...(product.uses || []),
    ].join(" "),
  );
const searchProducts = (query, limit = 6) => {
  const words = normalizeArabic(query)
    .split(/\s+/)
    .filter(
      (word) =>
        word &&
        ![
          "سعر",
          "اسعار",
          "بكم",
          "كم",
          "عندكم",
          "ابغى",
          "ابي",
          "عايز",
          "منتج",
          "المنتج",
          "من",
          "عن",
          "هل",
          "في",
          "ريال",
        ].includes(word),
    );
  if (!words.length) return [];
  return products
    .filter((product) =>
      words.every((word) => productText(product).includes(word)),
    )
    .slice(0, limit);
};
const escapeHtml = (value) =>
  String(value || "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const dimensionText = (values = {}) =>
  Object.entries(values)
    .map(
      ([key, value]) =>
        `${{ lengthCm: "الطول", widthCm: "العرض", heightCm: "الارتفاع", diameterCm: "القطر" }[key] || key}: ${value} سم`,
    )
    .join(" — ");
const fileMode = location.protocol === "file:";
const assetPath = (value) => (fileMode ? value.replace(/^\//, "") : value);
const pagePath = (value) =>
  fileMode
    ? `${value.replace(/^\//, "").replace(/\/$/, "")}/index.html`
    : value;
const CART_KEY = "archiciva-cart-v1";
const number = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const money = (value) =>
  `<span class="money"><span>${number(value)}</span><img class="sar-symbol" src="${assetPath("/assets/icons/saudi-riyal-symbol.svg")}" width="14" height="16" alt="ريال سعودي"></span>`;
const pricing = (p, q = 1) =>
  `<div class="pricing pricing--compact"><strong>${money(p.price * q)}</strong>${p.originalPrice > p.price ? `<del>${money(p.originalPrice * q)}</del><span class="discount-badge">خصم ${Math.round((1 - p.price / p.originalPrice) * 100)}%</span>` : ""}</div>`;
const moneyText = (value) => `${number(value)} ريال سعودي`;
// Reconcile each published listing with its actual category, including new or moved products.
const listingGrid = document.querySelector("[data-catalog-categories]");
if (listingGrid && catalogReady) {
  const scope = JSON.parse(listingGrid.dataset.catalogCategories);
  const listing = products.filter(p => !scope || scope.includes(p.subcategory));
  if (scope?.length > 1) listing.sort((a,b)=>scope.indexOf(a.subcategory)-scope.indexOf(b.subcategory));
  listingGrid.innerHTML = listing.map(p => {
    const category = catalogCategories.find(c=>c.id===p.subcategory);
    const url = `/products/${p.slug}/`;
    const color = p.availableColors?.length;
    const choose = color || p.sizeOptions?.length > 1;
    return `<article class="product-card" data-product-card data-name="${escapeHtml([p.name,p.shortDescription,p.material,p.color,...p.tags].filter(Boolean).join(" "))}" data-category="${escapeHtml(p.subcategory)}" data-price="${p.price}" data-size="${escapeHtml(p.size)}" data-sizes="${escapeHtml(JSON.stringify(p.sizeOptions?.map(s=>s.label)||[p.size]))}" data-color="${escapeHtml(p.color)}"><a class="product-card__image" href="${url}" aria-label="عرض ${escapeHtml(p.name)}"><img src="${escapeHtml(p.image)}" width="480" height="524" loading="lazy" decoding="async" alt="${escapeHtml(p.alt)}"></a><div class="product-card__body"><span class="eyebrow">${escapeHtml(category?.shortName||category?.name||"منتج")}</span><h3><a href="${url}">${escapeHtml(p.name)}</a></h3>${pricing(p)}<div class="product-card__actions"><a class="text-link" href="${url}">عرض المنتج</a>${choose?`<a class="button button--small" href="${url}#${color?"choose-color":"choose-size"}">${color?"اختر اللون":"اختر المقاس"}</a>`:`<button class="button button--small" type="button" data-add-to-cart="${p.id}">أضف للسلة</button>`}</div></div></article>`;
  }).join("");
  const categoryFilter = document.querySelector("[data-filter-category]");
  if(categoryFilter) categoryFilter.innerHTML='<option value="">كل الأشكال</option>'+catalogCategories.filter(c=>listing.some(p=>p.subcategory===c.id)).map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  const sizeFilter = document.querySelector("[data-filter-size]");
  if(sizeFilter) sizeFilter.innerHTML='<option value="">كل الأحجام</option>'+[...new Set(listing.flatMap(p=>p.sizeOptions?.map(s=>s.label)||[p.size]))].filter(Boolean).map(s=>`<option>${escapeHtml(s)}</option>`).join("");
  document.querySelector("[data-result-count]").textContent=listing.length;
}
const safeQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity)
    ? Math.max(1, Math.min(99, Math.trunc(quantity)))
    : 1;
};
for (const card of document.querySelectorAll("[data-product-card]")) {
  const slug = card
    .querySelector("a")
    ?.getAttribute("href")
    ?.match(/products\/([^/]+)\//)?.[1];
  const p = products.find((p) => p.slug === slug);
  if (!p) {
    card.remove();
    continue;
  }
  card.dataset.price = p.price;
  card.querySelector(".pricing")?.insertAdjacentHTML("afterend", pricing(p));
  card.querySelector(".pricing")?.remove();
  const img = card.querySelector("img");
  if (img) {
    img.src = p.image;
    img.removeAttribute("srcset");
  }
}
const detail = document.querySelector("[data-product-gallery]");
if (detail) {
  const p = products.find((p) => p.id === detail.dataset.productGallery);
  if (!p) {
    document.querySelector(".product-detail").innerHTML =
      "<h1>هذا المنتج غير متاح حاليًا</h1>";
    document.querySelector(".product-tabs")?.remove();
  } else {
    const info = document.querySelector(".product-info");
    info.querySelector("h1").textContent = p.name;
    info.querySelector(".product-price").innerHTML = pricing(p);
    info.querySelector(".lead").textContent = p.shortDescription;
    if (p.contentEdited) {
      const article = document.querySelector(".product-tabs article");
      article.innerHTML =
        "<h2>تفاصيل المنتج</h2><p>" +
        escapeHtml(p.description) +
        "</p><p>" +
        escapeHtml(p.secondaryDescription) +
        "</p><ul>" +
        p.features.map((f) => "<li>" + escapeHtml(f) + "</li>").join("") +
        "</ul>";
    }
    for (const script of document.querySelectorAll(
      'script[type="application/ld+json"]',
    )) {
      try {
        const data = JSON.parse(script.textContent);
        const values = Array.isArray(data) ? data : [data];
        for (const value of values)
          if (value["@type"] === "Product") {
            value.name = p.name;
            value.description = p.shortDescription;
            value.image = p.gallery.map(
              (i) => new URL(i.url, location.origin).href,
            );
            if (value.offers) value.offers.price = p.price;
          }
        script.textContent = JSON.stringify(data);
      } catch {}
    }
    let picker = info.querySelector("[data-color-picker]");
    if (!p.colorOptions.length) {
      picker?.remove();
      picker = null;
    } else if (!picker) {
      picker = document.createElement("fieldset");
      picker.dataset.colorPicker = "";
      picker.className = "product-colors";
      info.querySelector(".quantity-add").before(picker);
    }
    if (picker)
      picker.innerHTML =
        '<legend>اختر اللون</legend><div class="product-colors__options">' +
        p.colorOptions
          .map(
            (c) =>
              '<label class="color-option"><input type="radio" name="product-color" value="' +
              escapeHtml(c.name) +
              '" data-product-color><span class="color-option__swatch" style="--swatch:' +
              c.hex +
              '"></span><span>' +
              escapeHtml(c.name) +
              "</span></label>",
          )
          .join("") +
        "</div>";
    const size = info.querySelector("[data-product-size]");
    if (size)
      size.innerHTML = p.sizeOptions
        .map(
          (s) =>
            '<option value="' +
            s.id +
            '">' +
            escapeHtml(
              s.label +
                (dimensionText(s.dimensions)
                  ? " — " + dimensionText(s.dimensions)
                  : ""),
            ) +
            "</option>",
        )
        .join("");
    size?.addEventListener("change", () => {
      const option = p.sizeOptions.find((s) => s.id === size.value);
      let pill = info.querySelector(".dimension-pill");
      if (!pill) {
        pill = document.createElement("p");
        pill.className = "dimension-pill";
        size.parentElement.before(pill);
      }
      pill.textContent = dimensionText(option?.dimensions);
      pill.hidden = !pill.textContent;
    });
    const draw = (color) => {
      const colorId = p.colorOptions.find((c) => c.name === color)?.id;
      let gallery = colorId
        ? p.gallery.filter((i) => i.color_id === colorId)
        : [];
      const hasColorImages = gallery.length > 0;
      if (!gallery.length) gallery = p.gallery.filter((i) => !i.color_id);
      if (
        !color &&
        p.gallery[0]?.is_primary &&
        !gallery.some((i) => i.id === p.gallery[0].id)
      )
        gallery.unshift(p.gallery[0]);
      if (!gallery.length && !color) gallery = p.gallery.slice(0, 1);
      const img = detail.querySelector("img");
      if (gallery[0] && img) {
        img.src = gallery[0].url;
        img.removeAttribute("srcset");
        img.alt = gallery[0].alt;
      } else if (img) {
        img.src = "/assets/images/brand/archiciva-mark-transparent.webp";
        img.removeAttribute("srcset");
        img.alt = "لا توجد صورة خاصة بهذا اللون";
      }
      detail.querySelector(".gallery-note")?.remove();
      if (color && !hasColorImages) {
        const note = document.createElement("p");
        note.className = "gallery-note";
        note.textContent = gallery.length
          ? "الصورة العامة للمنتج؛ لا تتوفر صور خاصة باللون المحدد."
          : "لا تتوفر صورة لهذا اللون. تواصل معنا للتأكد.";
        detail.append(note);
      }
      detail.querySelector(".gallery-thumbs")?.remove();
      const thumbs = document.createElement("div");
      thumbs.className = "gallery-thumbs";
      for (const i of gallery) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "عرض " + (i.alt || p.name));
        const thumb = document.createElement("img");
        thumb.src = i.url;
        thumb.alt = i.alt;
        b.append(thumb);
        b.onclick = () => {
          img.src = i.url;
          img.alt = i.alt;
        };
        thumbs.append(b);
      }
      detail.append(thumbs);
    };
    draw("");
    document.addEventListener("change", (e) => {
      if (e.target.matches("[data-product-color]")) draw(e.target.value);
    });
  }
}
const getCart = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY));
    if (!Array.isArray(stored)) return [];
    const cart = [];
    for (const item of stored) {
      if (typeof item?.id !== "string") continue;
      const color = typeof item.color === "string" ? item.color : "";
      let sizeId = typeof item.sizeId === "string" ? item.sizeId : "";
      const options = products.find((p) => p.id === item.id)?.sizeOptions;
      if (!sizeId && options?.length === 1) sizeId = options[0].id;
      const existing = cart.find(
        (entry) =>
          entry.id === item.id &&
          (entry.color || "") === color &&
          (entry.sizeId || "") === sizeId,
      );
      if (existing)
        existing.quantity = Math.min(
          99,
          existing.quantity + safeQuantity(item.quantity),
        );
      else
        cart.push({
          id: item.id,
          quantity: safeQuantity(item.quantity),
          ...(color ? { color } : {}),
          ...(sizeId ? { sizeId } : {}),
        });
    }
    return cart;
  } catch {
    return [];
  }
};
const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
  renderCart();
};
const updateCartCount = () => {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document
    .querySelectorAll("[data-cart-count]")
    .forEach((node) => (node.textContent = count));
};
const toast = (message) => {
  const node = document.querySelector("[data-toast]");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  setTimeout(() => node.classList.remove("show"), 2200);
};

const cartItemKey = (item) =>
  `${item.id}::${item.color || ""}::${item.sizeId || ""}`;

function addToCart(id, quantity = 1, color = "", sizeId = "") {
  if (!catalogReady) return;
  if (!products.some((product) => product.id === id)) return;
  const product = products.find((p) => p.id === id);
  if (!sizeId && product.sizeOptions?.length === 1)
    sizeId = product.sizeOptions[0].id;
  const cart = getCart();
  const existing = cart.find(
    (item) =>
      item.id === id &&
      (item.color || "") === color &&
      (item.sizeId || "") === sizeId,
  );
  if (existing)
    existing.quantity = Math.min(
      99,
      existing.quantity + safeQuantity(quantity),
    );
  else
    cart.push({
      id,
      quantity: safeQuantity(quantity),
      ...(color ? { color } : {}),
      ...(sizeId ? { sizeId } : {}),
    });
  saveCart(cart);
  toast(color ? `تمت إضافة المنتج باللون ${color}` : "تمت إضافة المنتج للسلة");
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-to-cart]");
  if (!button) return;
  const quantity = button.hasAttribute("data-quantity-source")
    ? Number(document.querySelector("[data-product-quantity]")?.value || 1)
    : 1;
  const picker = document.querySelector("[data-color-picker]");
  const color =
    document.querySelector("[data-product-color]:checked")?.value || "";
  if (picker && !color) {
    toast("اختر اللون المطلوب أولًا");
    picker.classList.add("product-colors--attention");
    picker.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  picker?.classList.remove("product-colors--attention");
  addToCart(
    button.dataset.addToCart,
    quantity,
    color,
    document.querySelector("[data-product-size]")?.value || "",
  );
});
document.addEventListener("change", (event) => {
  if (event.target.matches("[data-product-color]"))
    document
      .querySelector("[data-color-picker]")
      ?.classList.remove("product-colors--attention");
});

const menuButton = document.querySelector(".menu-toggle");
menuButton?.addEventListener("click", () => {
  const nav = document.querySelector("#main-nav");
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

const backToTop = document.querySelector("[data-back-to-top]");
const updateBackToTop = () =>
  backToTop?.classList.toggle("is-visible", window.scrollY > 650);
window.addEventListener("scroll", updateBackToTop, { passive: true });
backToTop?.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" }),
);
updateBackToTop();

const homeAd = document.querySelector("[data-home-ad]");
if (homeAd) {
  const adObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && document.visibilityState === "visible") {
          homeAd.play().catch(() => {});
        } else {
          homeAd.pause();
        }
      }
    },
    { threshold: 0.55 },
  );
  adObserver.observe(homeAd);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") homeAd.pause();
  });
}

function setupAutoCarousels() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  document.querySelectorAll("[data-auto-carousel]").forEach((carousel) => {
    const cards = [...carousel.children];
    if (cards.length < 3) return;
    let index = 0;
    let paused = false;
    let timer;
    const scrollToIndex = () =>
      carousel.scrollTo({ left: cards[index].offsetLeft, behavior: "smooth" });
    const syncIndex = () => {
      index = cards.reduce(
        (closest, card, cardIndex) =>
          Math.abs(card.offsetLeft - carousel.scrollLeft) <
          Math.abs(cards[closest].offsetLeft - carousel.scrollLeft)
            ? cardIndex
            : closest,
        0,
      );
    };
    const move = () => {
      if (paused) return;
      const cardWidth = cards[0].getBoundingClientRect().width;
      const visible = Math.max(1, Math.round(carousel.clientWidth / cardWidth));
      index = index >= cards.length - visible ? 0 : index + 1;
      scrollToIndex();
    };
    const start = () => {
      clearInterval(timer);
      timer = setInterval(move, 3200);
    };
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
      start();
    };
    carousel.addEventListener("pointerenter", pause);
    carousel.addEventListener("pointerleave", resume);
    carousel.addEventListener("touchstart", pause, { passive: true });
    carousel.addEventListener("touchend", resume, { passive: true });
    carousel.addEventListener("focusin", pause);
    carousel.addEventListener("focusout", resume);
    const shell = carousel.closest("[data-carousel-shell]");
    shell
      ?.querySelector("[data-carousel-prev]")
      ?.addEventListener("click", () => {
        syncIndex();
        index = index <= 0 ? cards.length - 1 : index - 1;
        scrollToIndex();
        if (!reduceMotion) start();
      });
    shell
      ?.querySelector("[data-carousel-next]")
      ?.addEventListener("click", () => {
        syncIndex();
        index = index >= cards.length - 1 ? 0 : index + 1;
        scrollToIndex();
        if (!reduceMotion) start();
      });
    if (!reduceMotion) start();
  });
}
setupAutoCarousels();
const searchPanel = document.querySelector("[data-search-panel]");
document
  .querySelector("[data-search-toggle]")
  ?.addEventListener("click", () => {
    searchPanel.hidden = false;
    document.querySelector("#global-search")?.focus();
  });
document
  .querySelector("[data-search-close]")
  ?.addEventListener("click", () => (searchPanel.hidden = true));
document.querySelector("#global-search")?.addEventListener("input", (event) => {
  const query = event.target.value.trim();
  const results = document.querySelector("[data-search-results]");
  if (query.length < 2) {
    results.innerHTML = "";
    return;
  }
  const matched = searchProducts(query);
  results.innerHTML = matched.length
    ? matched
        .map(
          (item) =>
            `<a href="${pagePath(`/products/${item.slug}/`)}"><img src="${item.image}" width="50" height="50" alt=""><span><b>${escapeHtml(item.name)}</b><small>${moneyText(item.price)}</small></span></a>`,
        )
        .join("")
    : `<p>لا توجد نتائج مطابقة.</p>`;
});

function setupFilters() {
  const grid = document.querySelector("[data-product-grid]");
  if (!grid) return;
  const cards = [...grid.querySelectorAll("[data-product-card]")];
  const search = document.querySelector("[data-filter-search]");
  const category = document.querySelector("[data-filter-category]");
  const size = document.querySelector("[data-filter-size]");
  const price = document.querySelector("[data-filter-price]");
  const sort = document.querySelector("[data-sort]");
  const apply = () => {
    const query = normalizeArabic(search?.value || "");
    const words = query.split(/\s+/).filter(Boolean);
    const maxPrice = Number(price?.value || Infinity);
    let visible = cards.filter(
      (card) =>
        (!words.length ||
          words.every((word) =>
            normalizeArabic(card.dataset.name).includes(word),
          )) &&
        (!category?.value || card.dataset.category === category.value) &&
        (!size?.value ||
          (card.dataset.sizes
            ? JSON.parse(card.dataset.sizes).includes(size.value)
            : card.dataset.size === size.value)) &&
        Number(card.dataset.price) <= maxPrice,
    );
    cards.forEach((card) => (card.hidden = !visible.includes(card)));
    if (sort?.value === "price-asc")
      visible.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
    if (sort?.value === "price-desc")
      visible.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
    visible.forEach((card) => grid.append(card));
    document.querySelector("[data-result-count]").textContent = visible.length;
    document.querySelector("[data-empty-state]").hidden = visible.length > 0;
  };
  [search, category, size, price, sort].forEach((control) =>
    control?.addEventListener(
      control.tagName === "INPUT" ? "input" : "change",
      apply,
    ),
  );
  document
    .querySelector("[data-filter-reset]")
    ?.addEventListener("click", () => {
      search.value = "";
      if (category) category.value = "";
      size.value = "";
      price.value = "";
      sort.value = "default";
      apply();
    });
}

function renderCart() {
  const container = document.querySelector("[data-cart-items]");
  if (!container) return;
  const cart = getCart();
  const unavailable = cart.filter(
    (entry) => !products.some((p) => p.id === entry.id),
  );
  const rows = cart
    .map((entry) => ({
      entry,
      product: products.find((item) => item.id === entry.id),
    }))
    .filter((row) => row.product);
  const empty = document.querySelector("[data-cart-empty]");
  empty.hidden = rows.length > 0;
  container.innerHTML = rows
    .map(
      ({ entry, product }) =>
        `<article class="cart-item"><img src="${product.image}" width="90" height="95" alt=""><div><h3><a href="${pagePath(`/products/${product.slug}/`)}">${escapeHtml(product.name)}</a></h3>${entry.color ? `<p class="cart-item__color">اللون: <strong>${escapeHtml(entry.color)}</strong></p>` : ""}${entry.sizeId ? `<p>المقاس: ${escapeHtml(product.sizeOptions?.find((s) => s.id === entry.sizeId)?.label || "مقاس لم يعد متاحًا")}</p>` : ""}<small>سعر القطعة</small>${pricing(product)}<div class="cart-item__controls"><button type="button" data-cart-decrease="${encodeURIComponent(cartItemKey(entry))}" aria-label="تقليل الكمية">−</button><b>${entry.quantity}</b><button type="button" data-cart-increase="${encodeURIComponent(cartItemKey(entry))}" aria-label="زيادة الكمية">+</button><button class="remove-button" type="button" data-cart-remove="${encodeURIComponent(cartItemKey(entry))}" aria-label="حذف ${escapeHtml(product.name)} من السلة" title="حذف من السلة"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4m-8 3 1 13h10l1-13M10 11v6m4-6v6"/></svg></button></div></div><div class="cart-item__total"><small>إجمالي ${entry.quantity} قطعة</small><strong>${money(product.price * entry.quantity)}</strong></div></article>`,
    )
    .join("");
  for (const entry of unavailable) {
    const warning = document.createElement("article");
    warning.className = "cart-item";
    warning.innerHTML =
      "<p>المنتج " +
      escapeHtml(entry.id) +
      ' لم يعد متاحًا. أزله من السلة قبل إرسال الطلب.</p><button class="button button--outline" data-cart-remove="' +
      encodeURIComponent(cartItemKey(entry)) +
      '">إزالة المنتج غير المتاح</button>';
    container.append(warning);
  }
  if (unavailable.length) empty.hidden = true;
  const total = rows.reduce(
    (sum, row) => sum + row.product.price * row.entry.quantity,
    0,
  );
  document
    .querySelectorAll("[data-cart-subtotal],[data-cart-total]")
    .forEach((node) => (node.innerHTML = money(total)));
}
document.addEventListener("click", (event) => {
  const button = event.target.closest(
    "[data-cart-increase],[data-cart-decrease],[data-cart-remove]",
  );
  if (!button) return;
  const cart = getCart();
  const key = decodeURIComponent(
    button.getAttribute("data-cart-increase") ||
      button.getAttribute("data-cart-decrease") ||
      button.getAttribute("data-cart-remove"),
  );
  const item = cart.find((entry) => cartItemKey(entry) === key);
  if (!item) return;
  if (button.hasAttribute("data-cart-increase"))
    item.quantity = Math.min(99, item.quantity + 1);
  if (button.hasAttribute("data-cart-decrease"))
    item.quantity = Math.max(1, item.quantity - 1);
  saveCart(
    button.hasAttribute("data-cart-remove")
      ? cart.filter((entry) => cartItemKey(entry) !== key)
      : cart,
  );
});
document
  .querySelector("[data-checkout-form]")
  ?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const checkoutForm = event.currentTarget;
    if (!catalogReady) return;
    const previous = products;
    try {
      products = (await loadCatalog()).products.map((p) => ({
        ...p,
        image: p.displayImage,
      }));
    } catch {
      toast("تعذر تحديث الأسعار. حاول مرة أخرى قبل إرسال الطلب.");
      return;
    }
    renderCart();
    const cart = getCart();
    if (
      cart.some((e) => {
        const old = previous.find((p) => p.id === e.id),
          now = products.find((p) => p.id === e.id);
        return old && now && old.price !== now.price;
      })
    ) {
      toast("تم تحديث الأسعار. راجع الإجمالي ثم أرسل الطلب مجددًا.");
      return;
    }
    const invalid = cart.some((e) => {
      const p = products.find((p) => p.id === e.id);
      return (
        !p ||
        (p.sizeOptions.length > 1 && !e.sizeId) ||
        (e.color && !p.availableColors.includes(e.color)) ||
        (e.sizeId && !p.sizeOptions.some((s) => s.id === e.sizeId))
      );
    });
    if (invalid) {
      toast(
        "يوجد منتج أو لون أو مقاس لم يعد متاحًا. احذف السطر وأعد اختيار المنتج.",
      );
      return;
    }
    if (!cart.length) {
      toast("أضف منتجًا واحدًا على الأقل");
      return;
    }
    const form = new FormData(checkoutForm);
    const lines = cart.map((entry, index) => {
      const product = products.find((item) => item.id === entry.id);
      const productUrl = new URL(`/products/${product.slug}/`, location.origin)
        .href;
      const chosenColor = product.colorOptions?.find(
        (c) => c.name === entry.color,
      );
      const chosenSize = product.sizeOptions?.find(
        (s) => s.id === entry.sizeId,
      );
      const chosenImage = chosenColor
        ? product.gallery?.find((i) => i.color_id === chosenColor.id)?.url ||
          product.gallery?.find((i) => !i.color_id)?.url
        : product.image;
      const imageUrl = chosenImage
        ? new URL(chosenImage, location.origin).href
        : "لا تتوفر صورة خاصة بهذا اللون";
      return `${index + 1}) ${product.name}\nرقم المنتج: ${product.id}${entry.color ? `\nاللون: ${entry.color}` : ""}${entry.sizeId ? `\nالمقاس: ${chosenSize?.label || ""}\nالأبعاد: ${dimensionText(chosenSize?.dimensions)}` : ""}\nالكمية: ${entry.quantity}\nسعر القطعة: ${moneyText(product.price)}\nإجمالي المنتج: ${moneyText(product.price * entry.quantity)}\nرابط المنتج: ${productUrl}\nصورة المنتج: ${imageUrl}`;
    });
    const total = cart.reduce((sum, entry) => {
      const product = products.find((item) => item.id === entry.id);
      return sum + product.price * entry.quantity;
    }, 0);
    const message = `*طلب جديد | ArchiCiva*\n\n*بيانات العميل*\nالاسم: ${form.get("name")}\nالهاتف: ${form.get("phone")}\nالمدينة: ${form.get("city")}\nالعنوان: ${form.get("address")}\nالملاحظات: ${form.get("notes") || "لا يوجد"}\nتفاصيل إضافية: ${form.get("details") || "لا يوجد"}\n\n*المنتجات (${cart.length})*\n\n${lines.join("\n\n──────────\n\n")}\n\n*الإجمالي النهائي: ${moneyText(total)}*\n\nيرجى مراجعة تفاصيل الطلب والتواصل مع العميل لتأكيده.`;
    window.location.assign(
      `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`,
    );
  });

const faq = [
  {
    keys: ["توصيل", "شحن"],
    answer:
      "تفاصيل نطاق وتكلفة التوصيل غير متوفرة عندي حاليًا. تواصل معنا عبر واتساب لمعرفة التفاصيل.",
  },
  {
    keys: ["سعر", "اسعار", "الأسعار"],
    answer:
      "تلقى السعر ظاهر في بطاقة كل منتج وصفحته، وتقدر تجمع المنتجات في السلة وترسلها عبر واتساب.",
  },
  {
    keys: ["اطلب", "طلب", "كيف أطلب"],
    answer:
      "أضف المنتجات للسلة، راجع الكميات، أدخل بياناتك، ثم أرسل ملخص الطلب عبر واتساب.",
  },
  {
    keys: ["مقاس", "الحجم"],
    answer:
      "قِس المساحة المتاحة وقارنها بالأبعاد المكتوبة. إذا ما كان المقاس ظاهر، تواصل معنا عبر واتساب للتأكيد.",
  },
  {
    keys: ["مدخل", "مداخل"],
    answer:
      "غالبًا تناسب المداخل المراكن الطويلة أو القطع الكبيرة بحسب مساحة المدخل. أقدر أبدأ معك أسئلة الاختيار وأرتب الأقرب.",
  },
  {
    keys: ["أكثر من قطعة", "كمية"],
    answer:
      "أكيد، تقدر تزيد الكمية من السلة وتجمع أكثر من منتج في نفس رسالة الطلب.",
  },
  {
    keys: ["تواصل", "واتساب"],
    answer: "اضغط زر واتساب في الموقع لفتح المحادثة مباشرة وإرسال استفسارك.",
  },
];
const steps = [
  {
    key: "place",
    question: "هلا والله 👋 وش المكان اللي تبي تنسقه؟",
    options: [
      "مدخل فيلا",
      "حوش",
      "حديقة",
      "مكتب",
      "مطعم / كافيه",
      "داخل المنزل",
      "مكان تجاري",
    ],
  },
  {
    key: "space",
    question: "تقريبًا وش حجم المساحة؟",
    options: ["صغيرة", "متوسطة", "كبيرة"],
  },
  {
    key: "type",
    question: "وش النوع اللي تفضله؟",
    options: [
      "مركن",
      "حوض مربع",
      "حوض مستطيل",
      "نافورة",
      "شلال",
      "لاند سكيب وتنسيق حدائق",
    ],
  },
  {
    key: "budget",
    question: "ميزانيتك تقريبًا كم؟",
    options: ["200", "500", "1000", "2000", "5000", "بدون حد"],
  },
];
function scoreProducts(a, widen = false) {
  const categoryMap = {
    مركن: ["spherical", "round", "oval", "rattan-bamboo", "fiber-decor"],
    "حوض مربع": ["square"],
    "حوض مستطيل": ["rectangular"],
    نافورة: ["fountains"],
    شلال: ["waterfalls"],
    "لاند سكيب وتنسيق حدائق": ["planters", "water-features"],
  };
  const sizeMap = { صغيرة: "صغير", متوسطة: "متوسط", كبيرة: "كبير" };
  const wanted = categoryMap[a.type] || [];
  const budget = Number(a.budget);
  return products
    .filter(
      (product) =>
        widen ||
        a.type === "لاند سكيب وتنسيق حدائق" ||
        wanted.includes(product.subcategory),
    )
    .filter(
      (product) => widen || a.budget === "بدون حد" || product.price <= budget,
    )
    .map((product) => {
      let score = 0,
        reasons = [];
      if (product.uses.includes(a.place)) {
        score += 4;
        reasons.push("يناسب المكان");
      }
      if (wanted.includes(product.subcategory)) {
        score += 5;
        reasons.push("من النوع المطلوب");
      }
      if (product.size === sizeMap[a.space]) {
        score += 3;
        reasons.push("حجمه قريب من المساحة");
      }
      if (a.budget === "بدون حد" || product.price <= budget) {
        score += 4;
        reasons.push("ضمن الميزانية");
      }
      return { product, score, reasons };
    })
    .sort((x, y) => y.score - x.score || x.product.price - y.product.price)
    .slice(0, 3);
}
function assistantMarkup(floating = false) {
  return `<div class="assistant-widget"><header class="assistant-header"><span><b>مساعدة</b><small>مساعد اختيار آلي</small></span>${floating ? '<button type="button" data-assistant-close aria-label="إغلاق">×</button>' : ""}</header><div class="assistant-messages" data-assistant-messages></div><div class="assistant-options" data-assistant-options></div><div class="assistant-actions" data-assistant-actions hidden></div></div>`;
}
function initAssistant(root, floating = false) {
  if (!root) return;
  root.innerHTML = assistantMarkup(floating);
  const messages = root.querySelector("[data-assistant-messages]");
  const options = root.querySelector("[data-assistant-options]");
  const actions = root.querySelector("[data-assistant-actions]");
  let step = 0;
  const assistantState = { answers: {}, recommendations: [] };
  const addMessage = (text, user = false) => {
    const node = document.createElement("div");
    node.className = `assistant-message${user ? " assistant-message--user" : ""}`;
    node.innerHTML = text;
    messages.append(node);
    messages.scrollTop = messages.scrollHeight;
  };
  const ask = () => {
    const current = steps[step];
    addMessage(current.question);
    options.innerHTML =
      current.options
        .map(
          (option) =>
            `<button type="button" data-answer="${option}">${current.key === "budget" ? `${option} ريال` : option}</button>`,
        )
        .join("") +
      '<button type="button" data-faq-mode>اسأل عن منتج أو خدمة</button>';
  };
  const showResults = () => {
    let scored = scoreProducts(assistantState.answers);
    const expanded = !scored.length;
    if (expanded) scored = scoreProducts(assistantState.answers, true);
    assistantState.recommendations = scored.map((item) => item.product);
    addMessage(
      `${expanded ? "ما لقيت منتجًا بنفس النوع والميزانية؛ هذه أقرب بدائل متاحة وأسعارها الحالية:" : "هذه أقرب الخيارات لك وأسعارها الحالية:"}<div class="assistant-results">${scored.map(({ product, reasons }) => `<a class="assistant-result" href="${pagePath(`/products/${product.slug}/`)}"><img src="${product.image}" alt=""><span><b>${escapeHtml(product.name)}</b><small>${moneyText(product.price)} · ${reasons.slice(0, 2).join("، ") || "شاهد التفاصيل"}</small></span></a>`).join("")}</div>`,
    );
    options.innerHTML = `<button type="button" data-assistant-restart>إعادة الاختيار</button><button type="button" data-faq-mode>اسأل عن منتج أو خدمة</button>`;
    actions.hidden = false;
    actions.innerHTML = `<button class="button" type="button" data-assistant-whatsapp>أرسل اختياري عبر واتساب</button>`;
  };
  const answerQuestion = (query) => {
    const normalized = normalizeArabic(query);
    const matched = searchProducts(query, 4);
    if (matched.length)
      return `لقيت المنتجات دي من الكتالوج الحالي، اضغط على أي منتج لتشوف التفاصيل:<div class="assistant-results">${matched.map((product) => `<a class="assistant-result" href="${pagePath(`/products/${product.slug}/`)}"><img src="${product.image}" alt=""><span><b>${escapeHtml(product.name)}</b><small>${moneyText(product.price)} · السعر الحالي</small></span></a>`).join("")}</div>`;
    if (
      /لاند|حدائق|تنسيق|صيانه|زراعه|اضاءه|برجول|تفصيل|جمله|مشاريع/.test(
        normalized,
      )
    )
      return `نقدم خدمات تنسيق الحدائق واللاند سكيب، والتفصيل حسب الطلب، والبيع بالجملة للتجار وأصحاب المشاريع. السعر حسب تفاصيل المشروع؛ تواصل معنا لعرض مناسب. <a href="${pagePath("/landscaping/")}">خدمات اللاند سكيب</a> · <a href="${pagePath("/custom-design/")}">التفصيل حسب الطلب</a> · <a href="${pagePath("/wholesale/")}">بيع الجملة</a>`;
    const match = faq.find((item) =>
      item.keys.some((key) => normalized.includes(normalizeArabic(key))),
    );
    return (
      match?.answer ||
      "ما عندي معلومة مؤكدة عن هذا السؤال. اكتب اسم المنتج أو تواصل معنا عبر واتساب للتفاصيل."
    );
  };
  options.addEventListener("click", (event) => {
    const answer = event.target.closest("[data-answer]");
    if (answer) {
      const current = steps[step];
      assistantState.answers[current.key] = answer.dataset.answer;
      addMessage(
        current.key === "budget" && answer.dataset.answer !== "بدون حد"
          ? `${answer.dataset.answer} ريال`
          : answer.dataset.answer,
        true,
      );
      step++;
      options.innerHTML = "";
      setTimeout(() => (step < steps.length ? ask() : showResults()), 180);
      return;
    }
    if (event.target.closest("[data-assistant-restart]")) {
      step = 0;
      messages.innerHTML = "";
      actions.hidden = true;
      assistantState.answers = {};
      assistantState.recommendations = [];
      ask();
    }
    if (event.target.closest("[data-faq-mode]")) {
      addMessage(
        "اكتب اسم منتج أو اسأل عن سعره أو إحدى خدماتنا. الأسعار تتحدث من الكتالوج الحالي.",
      );
      options.innerHTML =
        '<input type="search" data-faq-input aria-label="سؤالك" placeholder="مثال: حوض مستطيل أو تنسيق حدائق"><button type="button" data-faq-send>إرسال</button><button type="button" data-assistant-restart>ابدأ الاختيار</button>';
    }
  });
  options.addEventListener("click", (event) => {
    if (!event.target.closest("[data-faq-send]")) return;
    const input = options.querySelector("[data-faq-input]");
    const query = input.value.trim();
    if (!query) return;
    addMessage(escapeHtml(query), true);
    addMessage(answerQuestion(query));
    input.value = "";
  });
  options.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("[data-faq-input]")) {
      event.preventDefault();
      options.querySelector("[data-faq-send]")?.click();
    }
  });
  actions.addEventListener("click", (event) => {
    if (!event.target.closest("[data-assistant-whatsapp]")) return;
    const a = assistantState.answers;
    const picks = assistantState.recommendations
      .map(
        (product, index) =>
          `${index + 1}. ${product.name} — ${moneyText(product.price)}\n${new URL(`/products/${product.slug}/`, location.origin).href}`,
      )
      .join("\n");
    const message = `مرحبًا، استخدمت مساعد ArchiCiva وهذه اختياراتي:\n\nالمكان: ${a.place}\nالمساحة: ${a.space}\nالنوع: ${a.type}\nالميزانية: ${a.budget} ريال\n\nالمنتجات المقترحة:\n${picks}\n\nأرغب في معرفة التفاصيل المتاحة.`;
    window.open(
      `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener",
    );
  });
  root
    .querySelector("[data-assistant-close]")
    ?.addEventListener("click", () => {
      root.hidden = true;
    });
  ask();
}
const shell = document.querySelector("[data-assistant]");
let shellReady = false;
document.querySelectorAll("[data-assistant-open]").forEach((button) =>
  button.addEventListener("click", () => {
    shell.hidden = false;
    if (!shellReady) {
      initAssistant(shell, true);
      shellReady = true;
    }
  }),
);
initAssistant(document.querySelector("[data-assistant-inline]"));

updateCartCount();
renderCart();
setupFilters();
