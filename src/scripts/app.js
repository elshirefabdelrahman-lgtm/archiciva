document.head.insertAdjacentHTML(
  "beforeend",
  "<style>[hidden]{display:none!important}</style>",
);
const products = window.__ARCHICIVA_PRODUCTS__ || [];
const config = window.__ARCHICIVA_CONFIG__ || {};
const fileMode = location.protocol === "file:";
const assetPath = (value) => (fileMode ? value.replace(/^\//, "") : value);
const pagePath = (value) =>
  fileMode
    ? `${value.replace(/^\//, "").replace(/\/$/, "")}/index.html`
    : value;
const CART_KEY = "archiciva-cart-v1";
const number = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
const money = (value) =>
  `<span class="money"><span>${number(value)}</span><img class="sar-symbol" src="${assetPath("/assets/icons/saudi-riyal-symbol.svg")}" width="14" height="16" alt="ريال سعودي"></span>`;
const pricing = (product, quantity = 1) =>
  `<div class="pricing pricing--compact"><div class="pricing__current"><span class="pricing__label">بعد الخصم</span><strong>${money(product.price * quantity)}</strong></div><div class="pricing__meta"><span class="pricing__before">قبل الخصم</span><del>${money(product.originalPrice * quantity)}</del><span class="discount-badge">خصم 20%</span></div></div>`;
const moneyText = (value) => `${number(value)} ريال سعودي`;
const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
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

function addToCart(id, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === id);
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else cart.push({ id, quantity });
  saveCart(cart);
  toast("تمت إضافة المنتج للسلة");
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-to-cart]");
  if (!button) return;
  const quantity = button.hasAttribute("data-quantity-source")
    ? Number(document.querySelector("[data-product-quantity]")?.value || 1)
    : 1;
  addToCart(button.dataset.addToCart, quantity);
});

const menuButton = document.querySelector(".menu-toggle");
menuButton?.addEventListener("click", () => {
  const nav = document.querySelector("#main-nav");
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
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
  const query = event.target.value.trim().toLowerCase();
  const results = document.querySelector("[data-search-results]");
  if (query.length < 2) {
    results.innerHTML = "";
    return;
  }
  const matched = products
    .filter((item) =>
      [
        item.name,
        item.shortDescription,
        item.color,
        item.material,
        item.subcategory,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 6);
  results.innerHTML = matched.length
    ? matched
        .map(
          (item) =>
            `<a href="${pagePath(`/products/${item.slug}/`)}"><img src="${item.image}" width="50" height="50" alt=""><span><b>${item.name}</b><small>${money(item.price)}</small></span></a>`,
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
    const query = (search?.value || "").trim().toLowerCase();
    const maxPrice = Number(price?.value || Infinity);
    let visible = cards.filter(
      (card) =>
        (!query || card.dataset.name.toLowerCase().includes(query)) &&
        (!category?.value || card.dataset.category === category.value) &&
        (!size?.value || card.dataset.size === size.value) &&
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
        `<article class="cart-item"><img src="${product.image}" width="90" height="95" alt=""><div><h3><a href="${pagePath(`/products/${product.slug}/`)}">${product.name}</a></h3>${pricing(product)}<div class="cart-item__controls"><button type="button" data-cart-decrease="${product.id}" aria-label="تقليل الكمية">−</button><b>${entry.quantity}</b><button type="button" data-cart-increase="${product.id}" aria-label="زيادة الكمية">+</button><button class="remove-button" type="button" data-cart-remove="${product.id}">حذف</button></div></div><div class="cart-item__total"><small>إجمالي المنتج</small>${pricing(product, entry.quantity)}</div></article>`,
    )
    .join("");
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
  const id =
    button.getAttribute("data-cart-increase") ||
    button.getAttribute("data-cart-decrease") ||
    button.getAttribute("data-cart-remove");
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  if (button.hasAttribute("data-cart-increase"))
    item.quantity = Math.min(99, item.quantity + 1);
  if (button.hasAttribute("data-cart-decrease"))
    item.quantity = Math.max(1, item.quantity - 1);
  saveCart(
    button.hasAttribute("data-cart-remove")
      ? cart.filter((entry) => entry.id !== id)
      : cart,
  );
});
document
  .querySelector("[data-checkout-form]")
  ?.addEventListener("submit", (event) => {
    event.preventDefault();
    const cart = getCart();
    if (!cart.length) {
      toast("أضف منتجًا واحدًا على الأقل");
      return;
    }
    const form = new FormData(event.currentTarget);
    const lines = cart.map((entry, index) => {
      const product = products.find((item) => item.id === entry.id);
      return `${index + 1}. المنتج: ${product.name}\nالكمية: ${entry.quantity}\nالسعر: ${moneyText(product.price)}\nالإجمالي: ${moneyText(product.price * entry.quantity)}`;
    });
    const total = cart.reduce((sum, entry) => {
      const product = products.find((item) => item.id === entry.id);
      return sum + product.price * entry.quantity;
    }, 0);
    const message = `طلب جديد من متجر ArchiCiva\n\nاسم العميل: ${form.get("name")}\nرقم الهاتف: ${form.get("phone")}\nالمدينة: ${form.get("city")}\nالعنوان: ${form.get("address")}\nالملاحظات: ${form.get("notes") || "لا يوجد"}\nتفاصيل إضافية: ${form.get("details") || "لا يوجد"}\n\nالمنتجات:\n${lines.join("\n\n")}\n\nالإجمالي: ${moneyText(total)}`;
    window.open(
      `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener",
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
const assistantState = { answers: {}, recommendations: [] };
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
    options: ["مركن", "حوض مربع", "حوض مستطيل", "نافورة", "شلال", "ديكور وأثاث"],
  },
  {
    key: "budget",
    question: "ميزانيتك تقريبًا كم؟",
    options: ["200", "500", "1000", "1500", "2000"],
  },
];
function scoreProducts() {
  const a = assistantState.answers;
  const categoryMap = {
    مركن: ["spherical", "round", "oval", "rattan-bamboo"],
    "حوض مربع": ["square"],
    "حوض مستطيل": ["rectangular"],
    نافورة: ["fountains"],
    شلال: ["waterfalls"],
    "ديكور وأثاث": ["decor"],
  };
  const sizeMap = { صغيرة: "صغير", متوسطة: "متوسط", كبيرة: "كبير" };
  return products
    .map((product) => {
      let score = 0,
        reasons = [];
      if (product.uses.includes(a.place)) {
        score += 4;
        reasons.push("يناسب المكان");
      }
      if ((categoryMap[a.type] || []).includes(product.subcategory)) {
        score += 5;
        reasons.push("من النوع المطلوب");
      }
      if (product.size === sizeMap[a.space]) {
        score += 3;
        reasons.push("حجمه قريب من المساحة");
      }
      const budget = Number(a.budget);
      if (product.price <= budget) {
        score += 4;
        reasons.push("ضمن الميزانية");
      } else if (product.price - budget <= 500) {
        score += 1;
        reasons.push("قريب من الميزانية");
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
  assistantState.answers = {};
  assistantState.recommendations = [];
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
    options.innerHTML = current.options
      .map(
        (option) =>
          `<button type="button" data-answer="${option}">${current.key === "budget" ? `${option} ريال` : option}</button>`,
      )
      .join("");
  };
  const showResults = () => {
    const scored = scoreProducts();
    assistantState.recommendations = scored.map((item) => item.product);
    addMessage(
      `هذي الخيارات اللي أشوفها مناسبة لك 👇<div class="assistant-results">${scored.map(({ product, reasons }) => `<a class="assistant-result" href="${pagePath(`/products/${product.slug}/`)}"><img src="${product.image}" alt=""><span><b>${product.name}</b><small>${moneyText(product.price)} · ${reasons.slice(0, 2).join("، ") || "أقرب خيار متاح"}</small></span></a>`).join("")}</div>`,
    );
    options.innerHTML = `<button type="button" data-assistant-restart>إعادة الاختيار</button><button type="button" data-faq-mode>عندي سؤال</button>`;
    actions.hidden = false;
    actions.innerHTML = `<button class="button" type="button" data-assistant-whatsapp>أرسل اختياري عبر واتساب</button>`;
  };
  options.addEventListener("click", (event) => {
    const answer = event.target.closest("[data-answer]");
    if (answer) {
      const current = steps[step];
      assistantState.answers[current.key] = answer.dataset.answer;
      addMessage(
        current.key === "budget"
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
      ask();
    }
    if (event.target.closest("[data-faq-mode]")) {
      addMessage("اكتب سؤالك هنا، وإذا المعلومة غير متوفرة بقول لك بكل وضوح.");
      options.innerHTML =
        '<input type="text" data-faq-input placeholder="مثال: هل يوجد توصيل؟"><button type="button" data-faq-send>إرسال</button>';
    }
  });
  options.addEventListener("click", (event) => {
    if (!event.target.closest("[data-faq-send]")) return;
    const input = options.querySelector("[data-faq-input]");
    const query = input.value.trim();
    if (!query) return;
    addMessage(query, true);
    const match = faq.find((item) =>
      item.keys.some((key) => query.includes(key)),
    );
    addMessage(
      match?.answer ||
        "المعلومة هذي مو متوفرة عندي حاليًا. تواصل معنا عبر واتساب لمعرفة التفاصيل.",
    );
    input.value = "";
  });
  actions.addEventListener("click", (event) => {
    if (!event.target.closest("[data-assistant-whatsapp]")) return;
    const a = assistantState.answers;
    const picks = assistantState.recommendations
      .map(
        (product, index) =>
          `${index + 1}. ${product.name} — ${money(product.price)}`,
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
