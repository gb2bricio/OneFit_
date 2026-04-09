// app.js
/* ============================================================
   V4.5 (máscara “sequencial” — UX igual maquininha / banco)
   O usuário clica no campo e digita SÓ números em sequência:
   - sempre entra no FINAL (ignora caret no meio)
   - 1 => 0,01
   - 12 => 0,12
   - 123 => 1,23
   - 1234 => 12,34
   Backspace/Delete apaga 1 dígito (centavo) por vez.
   Paste: pega só dígitos e vira moeda.
   ============================================================ */

/* -------------------- STORAGE -------------------- */
const LS_KEY = "ONEFIT_MARKETPLACE_V4_5";
const STORAGE_PRODUCTS_KEY = "ONEFIT_PRODUCTS";
const USER_ORDERS_KEY = "ONEFIT_ORDERS";
const PRO_LS_KEY = "ONEFIT_PRO_V1";
const DEFAULT_STATE = {
  cashbackCents: 20000,
  favorites: [],
  cart: [],
  ledger: [],
  ui: {
    appliedCashbackCents: 0,
    pixAmountCents: 0,
    creditAmountCents: 0,
    shippingCents: 0
  },
  currentCategory: "SUPLEMENTOS"
};
let STATE = structuredClone(DEFAULT_STATE);

/* -------------------- REGRAS -------------------- */
const CREDIT_MIN_PAY_CENTS = 100;
const CATEGORY_RULES = {
  SUPLEMENTOS: { multiplierPct: 100, maxPctCap: 40 },
  VESTUARIOS:  { multiplierPct: 80,  maxPctCap: 25 },
  UTILIDADES:  { multiplierPct: 50,  maxPctCap: 15 }
};
function getCategoryRule(cat){
  return CATEGORY_RULES[cat] || { multiplierPct: 100, maxPctCap: 100 };
}

/* -------------------- PRODUTOS -------------------- */
const PRODUCTS_FALLBACK = [
  {id:1,name:"Whey Protein",priceCents:19990,cashbackPct:30,category:"SUPLEMENTOS",img:"./img/whey.png"},
  {id:2,name:"Creatina",priceCents:8990,cashbackPct:25,category:"SUPLEMENTOS",img:"./img/creatina.png"},
  {id:3,name:"Pré Treino",priceCents:12990,cashbackPct:35,category:"SUPLEMENTOS",img:"./img/v_fort.png"},
  {id:4,name:"Barra Grego",priceCents:7990,cashbackPct:22,category:"SUPLEMENTOS",img:"./img/grego.png"},
  {id:5,name:"Creafort",priceCents:9990,cashbackPct:28,category:"SUPLEMENTOS",img:"./img/creafort.png"},
  {id:6,name:"Whey Dux",priceCents:14990,cashbackPct:26,category:"SUPLEMENTOS",img:"./img/dux.png"},

  {id:7,name:"Kimono",priceCents:5990,cashbackPct:20,category:"VESTUARIOS",img:"./img/kimono.png"},
  {id:8,name:"Luvas",priceCents:6990,cashbackPct:20,category:"VESTUARIOS",img:"../img/luva.png"},
  {id:9,name:"Legging Fitness",priceCents:8990,cashbackPct:22,category:"VESTUARIOS",img:"https://images.unsplash.com/photo-1552346154-21d32810aba3"},
  {id:10,name:"Bolsa Academia",priceCents:14990,cashbackPct:24,category:"VESTUARIOS",img:"../img/conjuntonike2.png"},
  {id:11,name:"Top Feminino",priceCents:4990,cashbackPct:20,category:"VESTUARIOS",img:"../img/conjuntonike.png"},
  {id:12,name:"Tênis Esportivo",priceCents:29990,cashbackPct:30,category:"VESTUARIOS",img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff"},

  {id:13,name:"Voucher Starbucks",priceCents:3000,cashbackPct:25,category:"UTILIDADES",img:"https://images.unsplash.com/photo-1509042239860-f550ce710b93"},
  {id:14,name:"Voucher Burger King",priceCents:4000,cashbackPct:25,category:"UTILIDADES",img:"https://images.unsplash.com/photo-1550547660-d9450f859349"},
  {id:15,name:"Voucher McDonald's",priceCents:3500,cashbackPct:25,category:"UTILIDADES",img:"https://images.unsplash.com/photo-1550317138-10000687a72b"},
  {id:16,name:"Voucher Netflix",priceCents:5500,cashbackPct:28,category:"UTILIDADES",img:"../img/netflix.png"},
  {id:17,name:"Voucher iFood",priceCents:6000,cashbackPct:30,category:"UTILIDADES",img:"https://images.unsplash.com/photo-1600891964599-f61ba0e24092"},
  {id:18,name:"Voucher Uber",priceCents:5000,cashbackPct:28,category:"UTILIDADES", img:"./img/uber.png"}
];
let PRODUCTS = [];

function safeJsonParse(v, fallback){
  try { return JSON.parse(v); } catch { return fallback; }
}

function guessCategoryFromName(name){
  const n = String(name || "").toLowerCase();
  if (n.includes("voucher") || n.includes("uber") || n.includes("netflix") || n.includes("ifood")) return "UTILIDADES";
  if (n.includes("kimono") || n.includes("luva") || n.includes("legging") || n.includes("tênis") || n.includes("tenis") || n.includes("camiseta") || n.includes("top") || n.includes("bolsa")) return "VESTUARIOS";
  return "SUPLEMENTOS";
}

function clampCents(n){
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function mapBackofficeProductToMarketplace(p){
  const id = String(p?.id || "").trim();
  if (!id) return null;

  const name = String(p?.name || "Produto").trim() || "Produto";
  const category = String(p?.category || "").trim() || guessCategoryFromName(name);
  const img = String(p?.image || "").trim() || "./img/produto-default.png";

  const originalPrice = Number(p?.price ?? 0);
  const discountPct = clampInt(Math.round(Number(p?.discount ?? 0)), 0, 100);
  const finalPrice = Number(p?.finalPrice ?? (originalPrice - (originalPrice * discountPct / 100)) ?? originalPrice);

  const originalPriceCents = clampCents(originalPrice * 100);
  const priceCents = clampCents(finalPrice * 100); // preço usado no carrinho = preço final

  const description = String(p?.description || "").trim();

  const cashback = Number(p?.cashback ?? 0);
  const cashbackValueCents = clampCents(cashback * 100);
  const cashbackPct = clampInt(Math.round((cashback / Math.max(0.01, finalPrice || originalPrice || 1)) * 100), 0, 90);

  const stock = Math.max(0, Math.floor(Number(p?.stock ?? 0)));
  const available = (p?.available !== false) && stock > 0 && String(p?.status || "").toUpperCase() !== "INDISPONIVEL";

  return {
    id,
    name,
    description,
    category,
    img,
    stock,
    available,
    priceCents,
    originalPriceCents,
    discountPct,
    cashbackPct,
    cashbackValueCents
  };
}

function loadProductsFromBackoffice(){
  const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
  const arr = safeJsonParse(raw, []);
  if (!Array.isArray(arr) || !arr.length) return [];
  return arr.map(mapBackofficeProductToMarketplace).filter(Boolean);
}

function buildProductsCatalog(){
  const fromBO = loadProductsFromBackoffice();
  return fromBO;
}

function productById(id){
  const key = String(id);
  return PRODUCTS.find(p => String(p.id) === key);
}

function buildBackofficeProductsLookup(){
  const out = { ids: new Set(), names: new Set() };
  const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
  const arr = safeJsonParse(raw, []);
  if (!Array.isArray(arr)) return out;

  for (const p of arr) {
    const id = String(p?.id || "").trim();
    const name = String(p?.name || "").trim().toLowerCase();
    if (id) out.ids.add(id);
    if (name) out.names.add(name);
  }
  return out;
}

function orderLooksBackoffice(order, lookup){
  if (!order || typeof order !== "object") return false;
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length) {
    return items.every((it) => lookup.ids.has(String(it?.id || "").trim()));
  }

  const normalizedName = String(order.name || "").trim().toLowerCase();
  return !!normalizedName && lookup.names.has(normalizedName);
}

function cleanupOrdersNotFromBackoffice(){
  const lookup = buildBackofficeProductsLookup();
  const orders = loadUserOrders();
  if (!orders.length) return;

  const cleaned = orders.filter((o) => orderLooksBackoffice(o, lookup));
  if (cleaned.length !== orders.length) {
    saveUserOrders(cleaned);
  }
}

function consumeBackofficeStock(cartItems){
  const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
  const arr = safeJsonParse(raw, []);
  if (!Array.isArray(arr) || !arr.length) return { ok: true };

  const byId = new Map();
  arr.forEach((p) => {
    const id = String(p?.id || "").trim();
    if (id) byId.set(id, p);
  });

  for (const it of cartItems) {
    const id = String(it?.id || "").trim();
    const qty = Math.max(0, Math.floor(Number(it?.qty || 0)));
    if (!id || qty <= 0) continue;

    const product = byId.get(id);
    if (!product) {
      return { ok: false, message: `Produto ${id} não encontrado no estoque atual.` };
    }

    const stock = Math.max(0, Math.floor(Number(product.stock || 0)));
    const isUnavailable = String(product.status || "").toUpperCase() === "INDISPONIVEL" || product.available === false;
    if (isUnavailable || stock < qty) {
      return {
        ok: false,
        message: `Estoque insuficiente para "${product.name || id}". Disponível: ${stock}, solicitado: ${qty}.`
      };
    }
  }

  for (const it of cartItems) {
    const id = String(it?.id || "").trim();
    const qty = Math.max(0, Math.floor(Number(it?.qty || 0)));
    if (!id || qty <= 0) continue;

    const product = byId.get(id);
    if (!product) continue;

    const stockAtual = Math.max(0, Math.floor(Number(product.stock || 0)));
    const newStock = Math.max(0, stockAtual - qty);
    product.stock = newStock;
    product.available = newStock > 0;
    product.status = newStock > 0 ? "DISPONIVEL" : "INDISPONIVEL";
  }

  localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(arr));
  return { ok: true };
}

function syncMarketplaceCatalogState(){
  PRODUCTS = buildProductsCatalog();
  cleanupOrdersNotFromBackoffice();

  const allowedProductIds = new Set(PRODUCTS.map((p) => String(p.id)));
  STATE.favorites = STATE.favorites.filter((id) => allowedProductIds.has(String(id)));
  STATE.cart = STATE.cart.filter((it) => {
    const p = productById(String(it?.id || ""));
    return !!p && p.available !== false;
  });
  saveState();
}

/* -------------------- UTIL -------------------- */
function formatBRLFromCents(cents){
  const v = (cents / 100).toFixed(2);
  const [a,b] = v.split(".");
  return "R$ " + a.replace(/\B(?=(\d{3})+(?!\d))/g,".") + "," + b;
}
function clampInt(n, min, max){ return Math.max(min, Math.min(max, n)); }
function escHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function pad2(n){ return String(n).padStart(2,"0"); }
function toISODate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
}
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/* -------------------- Money (sequencial) -------------------- */
function digitsOnly(s){ return String(s || "").replace(/\D/g,""); }
function normalizeDigits(d){
  const x = digitsOnly(d).replace(/^0+(?=\d)/,"");
  return x === "" ? "0" : x;
}
function formatMaskedMoneyFromDigits(digits){
  const d = normalizeDigits(digits);
  const padded = d.padStart(3,"0");
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intWithDots},${decPart}`;
}
function centsFromDigits(digits){
  return parseInt(normalizeDigits(digits), 10);
}
function setMoneyInputFromCents(el, cents){
  const d = normalizeDigits(String(Math.max(0, cents)));
  el.dataset.digits = d;
  el.value = formatMaskedMoneyFromDigits(d);
}
function forceCaretEnd(el){
  requestAnimationFrame(()=>el.setSelectionRange(el.value.length, el.value.length));
}

/* -------------------- EDITING FLAGS -------------------- */
const EDIT = { pix:false, credit:false, shipping:false };

/* -------------------- STORAGE IO -------------------- */
function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== "object") return structuredClone(DEFAULT_STATE);

    const s = structuredClone(DEFAULT_STATE);
    s.cashbackCents = Number.isInteger(parsed.cashbackCents) ? Math.max(0, parsed.cashbackCents) : s.cashbackCents;
    s.favorites = Array.isArray(parsed.favorites) ? parsed.favorites.map(String).filter(Boolean) : [];
    s.cart = Array.isArray(parsed.cart)
      ? parsed.cart
        .filter(x => x && (typeof x.id === "string" || typeof x.id === "number") && Number.isInteger(x.qty) && x.qty>0)
        .map(x => ({ id: String(x.id), qty: x.qty }))
      : [];
    s.ledger = Array.isArray(parsed.ledger) ? parsed.ledger.slice(0,200) : [];
    if(parsed.ui && typeof parsed.ui === "object"){
      s.ui.appliedCashbackCents = Number.isInteger(parsed.ui.appliedCashbackCents) ? Math.max(0, parsed.ui.appliedCashbackCents) : 0;
      s.ui.pixAmountCents = Number.isInteger(parsed.ui.pixAmountCents) ? Math.max(0, parsed.ui.pixAmountCents) : 0;
      s.ui.creditAmountCents = Number.isInteger(parsed.ui.creditAmountCents) ? Math.max(0, parsed.ui.creditAmountCents) : 0;
      s.ui.shippingCents = Number.isInteger(parsed.ui.shippingCents) ? Math.max(0, parsed.ui.shippingCents) : 0;
    }
    if(typeof parsed.currentCategory === "string" && ["SUPLEMENTOS","VESTUARIOS","UTILIDADES"].includes(parsed.currentCategory)){
      s.currentCategory = parsed.currentCategory;
    }
    return s;
  }catch(e){
    return structuredClone(DEFAULT_STATE);
  }
}
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(STATE)); }

/* -------------------- UI SALDO -------------------- */
function setCashbackUI(){
  document.getElementById("userCashback").textContent = formatBRLFromCents(STATE.cashbackCents);
  document.getElementById("ledgerBalance").textContent = formatBRLFromCents(STATE.cashbackCents);
  document.getElementById("cashbackAvailable").textContent = formatBRLFromCents(STATE.cashbackCents);
  document.getElementById("creditMinPayHint").textContent = formatBRLFromCents(CREDIT_MIN_PAY_CENTS);
}

/* -------------------- CATEGORIAS -------------------- */
function setActiveCategory(category){
  STATE.currentCategory = category;
  saveState();
  document.querySelectorAll(".category-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.category === category);
  });
}
window.filterCategory = function(category){
  setActiveCategory(category);
  renderProducts(PRODUCTS.filter(p=>p.category===category));
};

/* -------------------- RENDER PRODUTOS -------------------- */
function renderProducts(list){
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  if (!Array.isArray(list) || !list.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="small-muted">Nenhum produto disponível. Cadastre produtos no backoffice para exibir no marketplace.</div>
      </div>
    `;
    return;
  }

  let html = "";
  for(const p of list){
    if (p.available === false) continue;
    const isFav = STATE.favorites.includes(String(p.id));
    const discountPct = Number.isFinite(p.discountPct) ? p.discountPct : 0;
    const hasDiscount = discountPct > 0 && Number.isFinite(p.originalPriceCents) && (p.originalPriceCents > p.priceCents);

    const cashbackValueCents = Number.isFinite(p.cashbackValueCents) ? p.cashbackValueCents : null;
    const cashbackByPctCents = Math.round((p.priceCents || 0) * (p.cashbackPct || 0) / 100);
    const cashbackEarnCents = cashbackValueCents !== null ? cashbackValueCents : cashbackByPctCents;

    const badgeText = hasDiscount ? `${discountPct}% OFF` : `GANHE ${formatBRLFromCents(cashbackEarnCents)}`;
    const rawDesc = String(p.description || "").trim();
    const desc = rawDesc
      .replace(/\s*⭐+\s*\d+(?:[.,]\d+)?\/5\.0\s*\([^)]*avalia(?:ção|ções)[^)]*\)\s*$/i, "")
      .trim();
    // Avaliações (exibir abaixo da descrição)
    let ratingHtml = "";
    try {
      const reviews = JSON.parse(localStorage.getItem("ONEFIT_PRODUCT_REVIEWS_V1") || "{}");
      const arr = reviews?.[String(p.id)] || [];
      if (Array.isArray(arr) && arr.length) {
        const avg = arr.reduce((s, r) => s + Number(r?.rating || 0), 0) / arr.length;
        const stars = "⭐".repeat(Math.round(avg));
        ratingHtml = `<div class="mini product-rating mt-1">${stars} ${avg.toFixed(1)}/5.0 (${arr.length} avaliação${arr.length>1?"es":""})</div>`;
      }
    } catch(e) {}
    html += `
      <div class="col-12 col-sm-6 col-lg-4" id="product-${String(p.id).replace(/[^a-zA-Z0-9_-]/g,'')}">
        <div class="product-card text-center">
          <span class="badge-cashback">${escHtml(badgeText)}</span>

          <span class="favorite-icon ${isFav?'favorite-active':''}"
                onclick="toggleFavorite('${String(p.id)}')" aria-label="Favoritar">
            ${isFav?'★':'☆'}
          </span>

          <img src="${escHtml(p.img)}" class="product-img mb-3" alt="${escHtml(p.name)}">
          <h6 class="product-title">${escHtml(p.name)}</h6>
          ${desc ? `<div class="mini product-desc mb-1">${escHtml(desc)}</div>` : ``}
          ${ratingHtml}
          ${hasDiscount ? `<div class="mini price-original">${formatBRLFromCents(p.originalPriceCents)}</div>` : ``}
          <strong class="price-current ${hasDiscount ? "has-discount" : ""}">${formatBRLFromCents(p.priceCents)}</strong>
          <div class="cashback-line">Ganhe cashback: ${formatBRLFromCents(cashbackEarnCents)}</div>

          <button class="btn btn-gold w-100 mt-3" onclick="addToCart('${String(p.id)}')">
            Adicionar
          </button>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;

  if (!html.trim()) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="small-muted">Nenhum produto disponível nesta categoria.</div>
      </div>
    `;
  }
}

/* -------------------- FAVORITOS -------------------- */
window.toggleFavorite = function(id){
  const key = String(id);
  if(STATE.favorites.includes(key)) STATE.favorites = STATE.favorites.filter(f=>f!==key);
  else STATE.favorites.push(key);
  saveState();
  updateFavorites();
  renderProducts(PRODUCTS.filter(p=>p.category===STATE.currentCategory));
};

function updateFavorites(){
  document.getElementById("favoriteCount").textContent = STATE.favorites.length;
  const container = document.getElementById("favoriteItems");
  container.innerHTML = "";
  const grouped = {};
  for(const id of STATE.favorites){
    const p = productById(id);
    if(!p) continue;
    if(!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }
  for(const cat of Object.keys(grouped)){
    container.innerHTML += `<h6 class="mt-3 text-warning">${cat}</h6>`;
    for(const p of grouped[cat]){
      container.innerHTML += `<div style="cursor:pointer" onclick="goToProduct('${String(p.id)}')">⭐ ${p.name}</div>`;
    }
  }
}

window.goToProduct = function(id){
  const p = productById(id);
  if(!p) return;
  setActiveCategory(p.category);
  renderProducts(PRODUCTS.filter(x=>x.category===p.category));
  setTimeout(()=>{
    const safe = String(id).replace(/[^a-zA-Z0-9_-]/g,'');
    document.getElementById(`product-${safe}`).scrollIntoView({behavior:"smooth"});
    const card = document.getElementById(`product-${safe}`).querySelector(".product-card");
    card.classList.add("highlight");
    setTimeout(()=>card.classList.remove("highlight"),2000);
  },250);
};

/* -------------------- CARRINHO -------------------- */
function cartCount(){ return STATE.cart.reduce((acc,i)=>acc+i.qty,0); }
function cartItemsExpanded(){
  const out = [];
  for(const it of STATE.cart){
    const p = productById(it.id);
    if(!p) continue;
    out.push({
      id: p.id, name: p.name, qty: it.qty,
      priceCents: p.priceCents, category: p.category,
      cashbackPctBase: p.cashbackPct,
      cashbackValueCents: Number.isFinite(p.cashbackValueCents) ? p.cashbackValueCents : null
    });
  }
  return out;
}

window.addToCart = function(id){
  const key = String(id);
  const p = productById(key);
  if(!p || p.available === false){
    alert("Produto indisponível no momento.");
    return;
  }
  const stock = Math.max(0, Math.floor(Number(p.stock || 0)));
  if (stock <= 0){
    alert("Produto sem estoque no momento.");
    return;
  }
  const found = STATE.cart.find(i=>String(i.id)===key);
  if(found){
    if (found.qty >= stock){
      alert(`Limite de estoque atingido para "${p.name}". Disponível: ${stock} unidade(s).`);
      return;
    }
    found.qty++;
  }
  else STATE.cart.push({id:key, qty:1});
  saveState();
  updateCart();
};

window.changeQty = function(id, delta){
  const key = String(id);
  const found = STATE.cart.find(i=>String(i.id)===key);
  if(!found) return;
  const p = productById(key);
  if (!p) return;

  if (delta > 0){
    const stock = Math.max(0, Math.floor(Number(p.stock || 0)));
    if (stock <= 0 || found.qty >= stock){
      alert(`Não é possível adicionar mais "${p.name}". Estoque disponível: ${stock} unidade(s).`);
      return;
    }
  }

  found.qty += delta;
  if(found.qty <= 0) STATE.cart = STATE.cart.filter(i=>String(i.id)!==key);
  saveState();
  updateCart();
};

window.clearCart = function(){
  STATE.cart = [];
  STATE.ui.appliedCashbackCents = 0;
  STATE.ui.pixAmountCents = 0;
  STATE.ui.creditAmountCents = 0;
  STATE.ui.shippingCents = 0;
  saveState();
  updateCart();
};

function updateCart(){
  const cartItemsEl = document.getElementById("cartItems");
  document.getElementById("cartCount").textContent = cartCount();

  if(STATE.cart.length === 0){
    cartItemsEl.innerHTML = `<div class="small-muted">Seu carrinho está vazio.</div>`;
    resetPayUIForEmpty();
    return;
  }

  let html = "";
  for(const it of STATE.cart){
    const p = productById(it.id);
    if(!p) continue;
    const stock = Math.max(0, Math.floor(Number(p.stock || 0)));
    const plusDisabled = it.qty >= stock;
    const line = p.priceCents * it.qty;
    html += `
      <div class="mb-3">
        <strong>${p.name}</strong>
        <div class="d-flex align-items-center gap-2 qty-control mt-2">
          <button class="btn btn-sm btn-light" onclick="changeQty('${String(p.id)}',-1)">-</button>
          <span>${it.qty}</span>
          <button class="btn btn-sm btn-light" onclick="changeQty('${String(p.id)}',1)" ${plusDisabled ? 'disabled' : ''}>+</button>
        </div>
        <div>${formatBRLFromCents(line)}</div>
      </div>
    `;
  }
  cartItemsEl.innerHTML = html;

  if(!EDIT.pix) setMoneyInputFromCents(document.getElementById("pixAmount"), STATE.ui.pixAmountCents);
  if(!EDIT.credit) setMoneyInputFromCents(document.getElementById("creditAmount"), STATE.ui.creditAmountCents);
  if(!EDIT.shipping) setMoneyInputFromCents(document.getElementById("shippingAmount"), STATE.ui.shippingCents);

  refreshPricingFromServer();
}

function resetPayUIForEmpty(){
  document.getElementById("cartSubtotal").textContent = "R$ 0,00";
  document.getElementById("orderTotal").textContent = "R$ 0,00";
  document.getElementById("maxCashbackAllowed").textContent = "R$ 0,00";
  document.getElementById("cashbackApplied").textContent = "R$ 0,00";
  document.getElementById("totalPaid").textContent = "R$ 0,00";
  document.getElementById("diffToClose").textContent = "R$ 0,00";
  document.getElementById("cashbackEarned").textContent = "R$ 0,00";
  document.getElementById("summaryValidation").style.display = "none";

  const slider = document.getElementById("cashbackSlider");
  slider.min = 0; slider.max = 0; slider.value = 0;

  if(!EDIT.pix) setMoneyInputFromCents(document.getElementById("pixAmount"), 0);
  if(!EDIT.credit) setMoneyInputFromCents(document.getElementById("creditAmount"), 0);
  if(!EDIT.shipping) setMoneyInputFromCents(document.getElementById("shippingAmount"), 0);
}

/* -------------------- MONEY MASK (sequencial) -------------------- */
function bindSequentialMoneyInput(el, which){
  if(!el.dataset.digits){
    el.dataset.digits = normalizeDigits(String(0));
    el.value = formatMaskedMoneyFromDigits(el.dataset.digits);
  }

  const applyDigits = (newDigits)=>{
    const d = normalizeDigits(newDigits);
    el.dataset.digits = d;
    el.value = formatMaskedMoneyFromDigits(d);

    const cents = centsFromDigits(d);
    if(which === "pix") STATE.ui.pixAmountCents = cents;
    else if(which === "credit") STATE.ui.creditAmountCents = cents;
    else STATE.ui.shippingCents = cents;

    saveState();
    refreshPricingFromServer();
    forceCaretEnd(el);
  };

  el.addEventListener("focus", ()=>{
    EDIT[which] = true;
    forceCaretEnd(el);
  });

  // sempre mantém caret no fim
  el.addEventListener("mouseup", (e)=>{ e.preventDefault(); forceCaretEnd(el); });
  el.addEventListener("keyup", ()=> forceCaretEnd(el));
  el.addEventListener("click", ()=> forceCaretEnd(el));

  el.addEventListener("keydown", (e)=>{
    if(e.ctrlKey || e.metaKey || e.altKey) return;

    const nav = ["Tab","ArrowLeft","ArrowRight","Home","End"];
    if(nav.includes(e.key)) return;

    if(e.key === "Backspace" || e.key === "Delete"){
      e.preventDefault();
      const d = el.dataset.digits || "0";
      const next = d.length <= 1 ? "0" : d.slice(0, -1);
      applyDigits(next);
      return;
    }

    if(/^\d$/.test(e.key)){
      e.preventDefault();
      const d = el.dataset.digits || "0";
      const next = (d === "0") ? e.key : (d + e.key);
      applyDigits(next.slice(0, 12));
      return;
    }

    if(e.key === "," || e.key === "."){
      e.preventDefault();
      return;
    }

    e.preventDefault();
  });

  el.addEventListener("paste", (e)=>{
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text") || "";
    const d = digitsOnly(text);
    if(!d) return applyDigits("0");
    applyDigits(d.slice(0, 12));
  });

  el.addEventListener("blur", async ()=>{
    EDIT[which] = false;
    await refreshPricingFromServer();
    if(lastPreview){
      if(which === "pix") setMoneyInputFromCents(el, lastPreview.pixAmountCents);
      else if(which === "credit") setMoneyInputFromCents(el, lastPreview.creditAmountCents);
      else setMoneyInputFromCents(el, lastPreview.shippingCents || 0);
    }
  });
}

/* -------------------- MOCK API -------------------- */
const MockAPI = {
  async previewOrder(payload){
    await new Promise(r=>setTimeout(r, 20));
    return ServerPricing.preview(payload);
  },
  async placeOrder(payload){
    await new Promise(r=>setTimeout(r, 60));
    return ServerPricing.place(payload);
  }
};

/* -------------------- SERVER PRICING -------------------- */
const ServerPricing = {
  preview(payload){
    const { cartItems, userCashbackCents, desiredCashbackApplyCents, desiredPixAmountCents, desiredCreditAmountCents, desiredShippingCents } = payload;

    let subtotalCents = 0;
    for(const it of cartItems) subtotalCents += it.priceCents * it.qty;

    const shippingCents = clampInt(desiredShippingCents, 0, 9_999_999);
    const orderTotalCents = subtotalCents + shippingCents;

    const maxCashbackAllowedCents = Math.min(userCashbackCents, orderTotalCents);
    const cashbackAppliedCents = clampInt(desiredCashbackApplyCents, 0, maxCashbackAllowedCents);

    const pixAmountCents = clampInt(desiredPixAmountCents, 0, orderTotalCents);
    const creditAmountCents = clampInt(desiredCreditAmountCents, 0, orderTotalCents);

    const totalPaidCents = cashbackAppliedCents + pixAmountCents + creditAmountCents;
    const diffCents = orderTotalCents - totalPaidCents;

    // cashback aplicado é alocado apenas sobre itens (frete não gera cashback)
    const lines = ServerPricing.allocateDiscountAcrossItems(cartItems, clampInt(cashbackAppliedCents, 0, subtotalCents), subtotalCents);
    const isPayComplete = (diffCents === 0);

    let earnedCashbackCents = 0;
    if(isPayComplete){
      for(const line of lines){
        // Se existir cashback absoluto cadastrado no produto, usa esse valor.
        // Senão, fallback para cálculo por % (com regras por categoria).
        if (Number.isFinite(line.cashbackValueCents) && line.cashbackValueCents > 0){
          earnedCashbackCents += Math.round(line.cashbackValueCents) * Math.max(1, line.qty || 1);
        } else {
          const rule = getCategoryRule(line.category);
          const pctScaled = Math.floor((line.cashbackPctBase * rule.multiplierPct) / 100);
          const pctEffective = Math.min(pctScaled, rule.maxPctCap);
          earnedCashbackCents += Math.round((line.paidCents * pctEffective) / 100);
        }
      }
    }

    const errors = [];
    const warnings = [];

    if(subtotalCents <= 0) errors.push("Carrinho vazio.");
    if(diffCents > 0 && orderTotalCents > 0) errors.push("Pagamento incompleto: falta " + formatBRLFromCents(diffCents) + ".");
    if(diffCents < 0 && orderTotalCents > 0) errors.push("Pagamento excedeu o total em " + formatBRLFromCents(-diffCents) + ".");
    if(creditAmountCents > 0 && creditAmountCents < CREDIT_MIN_PAY_CENTS) errors.push("Crédito mínimo: se usar crédito, pague ao menos " + formatBRLFromCents(CREDIT_MIN_PAY_CENTS) + ".");
    if(desiredCashbackApplyCents > maxCashbackAllowedCents) warnings.push("Cashback aplicado foi limitado ao saldo/subtotal.");

    return {
      ok: errors.length === 0,
      subtotalCents,
      shippingCents,
      orderTotalCents,
      maxCashbackAllowedCents,
      cashbackAppliedCents,
      pixAmountCents,
      creditAmountCents,
      totalPaidCents,
      diffCents,
      earnedCashbackCents,
      errors,
      warnings
    };
  },

  place(payload){
    const preview = ServerPricing.preview(payload);
    if(!preview.ok) return { ok:false, preview, message:"Não foi possível finalizar: verifique o pagamento." };
    const orderId = "OF" + Date.now().toString(36).toUpperCase();
    return { ok:true, orderId, preview, message:"Pedido confirmado." };
  },

  allocateDiscountAcrossItems(cartItems, appliedCents, subtotalCents){
    const lines = cartItems.map(it => ({
      id: it.id,
      name: it.name,
      category: it.category,
      qty: it.qty,
      itemSubtotalCents: it.priceCents * it.qty,
      discountCents: 0,
      paidCents: it.priceCents * it.qty,
      cashbackPctBase: it.cashbackPctBase,
      cashbackValueCents: (it && Number.isFinite(it.cashbackValueCents)) ? it.cashbackValueCents : null
    }));
    if(appliedCents <= 0 || subtotalCents <= 0 || lines.length === 0) return lines;

    let allocated = 0;
    for(const line of lines){
      const disc = Math.floor((line.itemSubtotalCents * appliedCents) / subtotalCents);
      line.discountCents = disc;
      allocated += disc;
    }
    let remainder = appliedCents - allocated;
    let idx = 0;
    while(remainder > 0 && lines.length > 0){
      lines[idx].discountCents += 1;
      remainder -= 1;
      idx = (idx + 1) % lines.length;
    }
    for(const line of lines){
      line.discountCents = clampInt(line.discountCents, 0, line.itemSubtotalCents);
      line.paidCents = line.itemSubtotalCents - line.discountCents;
    }
    return lines;
  }
};

/* -------------------- PREVIEW UI -------------------- */
let lastPreview = null;
async function refreshPricingFromServer(){
  const payload = {
    cartItems: cartItemsExpanded(),
    userCashbackCents: STATE.cashbackCents,
    desiredCashbackApplyCents: STATE.ui.appliedCashbackCents,
    desiredPixAmountCents: STATE.ui.pixAmountCents,
    desiredCreditAmountCents: STATE.ui.creditAmountCents,
    desiredShippingCents: STATE.ui.shippingCents
  };
  const preview = await MockAPI.previewOrder(payload);
  lastPreview = preview;

  document.getElementById("cartSubtotal").textContent = formatBRLFromCents(preview.subtotalCents);
  document.getElementById("orderTotal").textContent = formatBRLFromCents(preview.orderTotalCents ?? preview.subtotalCents);

  const slider = document.getElementById("cashbackSlider");
  slider.min = 0;
  slider.max = preview.maxCashbackAllowedCents;
  slider.value = preview.cashbackAppliedCents;

  document.getElementById("cashbackApplied").textContent = formatBRLFromCents(preview.cashbackAppliedCents);
  document.getElementById("maxCashbackAllowed").textContent = formatBRLFromCents(preview.maxCashbackAllowedCents);

  if(!EDIT.pix) setMoneyInputFromCents(document.getElementById("pixAmount"), preview.pixAmountCents);
  if(!EDIT.credit) setMoneyInputFromCents(document.getElementById("creditAmount"), preview.creditAmountCents);
  if(!EDIT.shipping) setMoneyInputFromCents(document.getElementById("shippingAmount"), preview.shippingCents || 0);

  document.getElementById("totalPaid").textContent = formatBRLFromCents(preview.totalPaidCents);

  let diffLabel = "R$ 0,00";
  if(preview.diffCents > 0) diffLabel = "Falta " + formatBRLFromCents(preview.diffCents);
  if(preview.diffCents < 0) diffLabel = "Excedeu " + formatBRLFromCents(-preview.diffCents);
  document.getElementById("diffToClose").textContent = diffLabel;

  document.getElementById("cashbackEarned").textContent = formatBRLFromCents(preview.earnedCashbackCents);

  const valEl = document.getElementById("summaryValidation");
  valEl.style.display = "none";
  valEl.textContent = "";
  valEl.className = "mini mt-2";

  if(preview.warnings.length){
    valEl.style.display = "block";
    valEl.classList.add("text-warning");
    valEl.textContent = "⚠️ " + preview.warnings.join(" ");
  }
  if(preview.errors.length){
    valEl.style.display = "block";
    valEl.classList.remove("text-warning");
    valEl.classList.add("text-danger");
    valEl.textContent = "⛔ " + preview.errors.join(" ");
  }

  STATE.ui.appliedCashbackCents = preview.cashbackAppliedCents;
  STATE.ui.pixAmountCents = preview.pixAmountCents;
  STATE.ui.creditAmountCents = preview.creditAmountCents;
  STATE.ui.shippingCents = preview.shippingCents || 0;
  saveState();
}

/* -------------------- CASHBACK SLIDER -------------------- */
window.onCashbackSlider = function(){
  const val = Number(document.getElementById("cashbackSlider").value);
  STATE.ui.appliedCashbackCents = Number.isFinite(val) ? val : 0;
  saveState();
  refreshPricingFromServer();
};
window.setCashbackMax = function(){
  const slider = document.getElementById("cashbackSlider");
  slider.value = slider.max;
  window.onCashbackSlider();
};
window.setCashbackZero = function(){
  const slider = document.getElementById("cashbackSlider");
  slider.value = 0;
  window.onCashbackSlider();
};

/* -------------------- AUTO FILL -------------------- */
function fillFakeCreditData(){
  const n = document.getElementById("cardNumber");
  const e = document.getElementById("cardExp");
  const c = document.getElementById("cardCvv");
  const inst = document.getElementById("installments");
  if (n && !String(n.value || "").trim()) n.value = "4242 4242 4242 4242"; // Luhn ok
  if (e && !String(e.value || "").trim()) e.value = "12/30";
  if (c && !String(c.value || "").trim()) c.value = "123";
  if (inst && !String(inst.value || "").trim()) inst.value = "1";
}
window.autofillRemainderToPix = function(){
  if(!lastPreview) return;
  const need = lastPreview.diffCents;
  if(need === 0) return;
  const cap = (Number.isFinite(lastPreview.orderTotalCents) ? lastPreview.orderTotalCents : lastPreview.subtotalCents);
  STATE.ui.pixAmountCents = clampInt(lastPreview.pixAmountCents + need, 0, cap);
  saveState();
  if(!EDIT.pix) setMoneyInputFromCents(document.getElementById("pixAmount"), STATE.ui.pixAmountCents);
  refreshPricingFromServer();
};
window.autofillRemainderToCredit = function(){
  if(!lastPreview) return;
  const need = lastPreview.diffCents;
  if(need === 0) return;
  const cap = (Number.isFinite(lastPreview.orderTotalCents) ? lastPreview.orderTotalCents : lastPreview.subtotalCents);
  STATE.ui.creditAmountCents = clampInt(lastPreview.creditAmountCents + need, 0, cap);
  saveState();
  if(!EDIT.credit) setMoneyInputFromCents(document.getElementById("creditAmount"), STATE.ui.creditAmountCents);
  fillFakeCreditData();
  refreshPricingFromServer();
};

/* -------------------- EXTRATO -------------------- */
function pushLedger(entry){
  STATE.ledger.unshift(entry);
  STATE.ledger = STATE.ledger.slice(0,200);
}
function formatTS(ts){
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}
function updateLedgerUI(){
  setCashbackUI();
  const container = document.getElementById("ledgerItems");
  container.innerHTML = "";
  if(!STATE.ledger.length){
    container.innerHTML = `<div class="small-muted">Sem movimentações ainda.</div>`;
    return;
  }
  for(const it of STATE.ledger){
    const sign = it.type === "PLUS" ? "+" : "-";
    const cls = it.type === "PLUS" ? "ledger-plus" : "ledger-minus";
    const title = it.type === "PLUS" ? "Cashback ganho" : "Cashback usado";
    container.innerHTML += `
      <div class="ledger-item">
        <div class="d-flex justify-content-between align-items-center">
          <strong>${title}</strong>
          <strong class="${cls}">${sign} ${formatBRLFromCents(it.amountCents)}</strong>
        </div>
        <div class="mini mt-1">${formatTS(it.ts)} • ${it.method || "-"} • Pedido: ${it.orderId || "-"}</div>
        ${it.note ? `<div class="mini mt-1">${it.note}</div>` : ``}
      </div>
    `;
  }
}

/* -------------------- CARTÃO: máscaras + validação -------------------- */
function maskCardNumber(value){
  const digits = value.replace(/\D/g,"").slice(0,19);
  return digits.replace(/(.{4})/g,"$1 ").trim();
}
function maskExp(value){
  const d = value.replace(/\D/g,"").slice(0,4);
  if(d.length <= 2) return d;
  return d.slice(0,2) + "/" + d.slice(2);
}
function maskCvv(value){ return value.replace(/\D/g,"").slice(0,4); }
function luhnCheck(numStr){
  const s = numStr.replace(/\s+/g,"");
  if(!/^\d{12,19}$/.test(s)) return false;
  let sum = 0;
  let dbl = false;
  for(let i=s.length-1;i>=0;i--){
    let d = Number(s[i]);
    if(dbl){
      d *= 2;
      if(d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}
function validateCreditFieldsIfNeeded(creditAmountCents){
  if(creditAmountCents <= 0) return null;
  const number = (document.getElementById("cardNumber").value || "").trim();
  const exp = (document.getElementById("cardExp").value || "").trim();
  const cvv = (document.getElementById("cardCvv").value || "").trim();
  const digits = number.replace(/\s+/g,"");
  if(!luhnCheck(digits)) return "Número do cartão inválido (Luhn).";
  if(!/^\d{2}\/\d{2}$/.test(exp)) return "Validade inválida (use MM/AA).";
  const mm = Number(exp.slice(0,2));
  if(!(mm>=1 && mm<=12)) return "Mês de validade inválido.";
  if(!/^\d{3,4}$/.test(cvv)) return "CVV inválido.";
  return null;
}
function wirePaymentMasks(){
  const cardNumber = document.getElementById("cardNumber");
  const cardExp = document.getElementById("cardExp");
  const cardCvv = document.getElementById("cardCvv");
  cardNumber.addEventListener("input", ()=>{ cardNumber.value = maskCardNumber(cardNumber.value); });
  cardExp.addEventListener("input", ()=>{ cardExp.value = maskExp(cardExp.value); });
  cardCvv.addEventListener("input", ()=>{ cardCvv.value = maskCvv(cardCvv.value); });
}

/* -------------------- CHECKOUT -------------------- */
window.checkout = async function(){
  if(STATE.cart.length === 0){
    alert("Carrinho vazio!");
    return;
  }

  const creditCents = lastPreview ? lastPreview.creditAmountCents : STATE.ui.creditAmountCents;
  const msgEl = document.getElementById("creditValidationMsg");
  const err = validateCreditFieldsIfNeeded(creditCents);
  if(err){
    msgEl.style.display = "block";
    msgEl.textContent = "⚠️ " + err;
    return;
  }else{
    msgEl.style.display = "none";
    msgEl.textContent = "";
  }

  const payload = {
    cartItems: cartItemsExpanded(),
    userCashbackCents: STATE.cashbackCents,
    desiredCashbackApplyCents: STATE.ui.appliedCashbackCents,
    desiredPixAmountCents: STATE.ui.pixAmountCents,
    desiredCreditAmountCents: STATE.ui.creditAmountCents,
    desiredShippingCents: STATE.ui.shippingCents
  };

  const result = await MockAPI.placeOrder(payload);
  if(!result.ok){
    alert(result.message + "\n\n" + (result.preview?.errors || []).join("\n"));
    await refreshPricingFromServer();
    return;
  }

  const stockResult = consumeBackofficeStock(payload.cartItems);
  if (!stockResult.ok){
    syncMarketplaceCatalogState();
    updateFavorites();
    renderProducts(PRODUCTS.filter((p) => p.category === STATE.currentCategory));
    updateCart();
    alert("Não foi possível concluir a compra:\n" + stockResult.message);
    return;
  }
  syncMarketplaceCatalogState();

  const preview = result.preview;
  const orderId = result.orderId;
  const before = STATE.cashbackCents;

  STATE.cashbackCents = Math.max(0, STATE.cashbackCents - preview.cashbackAppliedCents);
  STATE.cashbackCents = STATE.cashbackCents + preview.earnedCashbackCents;

  const method = `PIX:${formatBRLFromCents(preview.pixAmountCents)} + CRÉDITO:${formatBRLFromCents(preview.creditAmountCents)} + FRETE:${formatBRLFromCents(preview.shippingCents || 0)}`;
  if(preview.cashbackAppliedCents > 0){
    pushLedger({ ts: Date.now(), type:"MINUS", amountCents: preview.cashbackAppliedCents, method, orderId,
      note:`Aplicado no pagamento. Total (itens + frete): ${formatBRLFromCents(preview.orderTotalCents || preview.subtotalCents)}.`
    });
  }
  if(preview.earnedCashbackCents > 0){
    pushLedger({ ts: Date.now(), type:"PLUS", amountCents: preview.earnedCashbackCents, method, orderId,
      note:`Cashback ganho sobre valor pago (subtotal - cashback aplicado).`
    });
  }

  persistOrderEverywhere(orderId, preview);

  STATE.cart = [];
  STATE.ui.appliedCashbackCents = 0;
  STATE.ui.pixAmountCents = 0;
  STATE.ui.creditAmountCents = 0;
  STATE.ui.shippingCents = 0;

  saveState();
  setCashbackUI();
  updateFavorites();
  updateLedgerUI();
  updateCart();

  alert(
    "Compra realizada!\n\n" +
    "Pedido: " + orderId + "\n" +
    "Subtotal: " + formatBRLFromCents(preview.subtotalCents) + "\n" +
    "Frete: " + formatBRLFromCents(preview.shippingCents || 0) + "\n" +
    "Total: " + formatBRLFromCents(preview.orderTotalCents || preview.subtotalCents) + "\n" +
    "Cashback usado: " + formatBRLFromCents(preview.cashbackAppliedCents) + "\n" +
    "PIX: " + formatBRLFromCents(preview.pixAmountCents) + "\n" +
    "Crédito: " + formatBRLFromCents(preview.creditAmountCents) + "\n" +
    "Cashback ganho: " + formatBRLFromCents(preview.earnedCashbackCents) + "\n" +
    "Saldo antes: " + formatBRLFromCents(before) + "\n" +
    "Saldo agora: " + formatBRLFromCents(STATE.cashbackCents)
  );
};

/* -------------------- PEDIDOS (persistência p/ painéis) -------------------- */
function loadUserOrders(){
  const raw = localStorage.getItem(USER_ORDERS_KEY);
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr : [];
}

function saveUserOrders(arr){
  localStorage.setItem(USER_ORDERS_KEY, JSON.stringify(arr.slice(0, 300)));
}

function loadProState(){
  const raw = localStorage.getItem(PRO_LS_KEY);
  const parsed = safeJsonParse(raw, null);
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

function saveProState(obj){
  try{ localStorage.setItem(PRO_LS_KEY, JSON.stringify(obj)); }catch(e){}
}

function persistOrderEverywhere(orderId, preview){
  const items = cartItemsExpanded();
  const first = items[0] || null;
  const subtotalCents = preview.subtotalCents || 0;
  const shippingCents = preview.shippingCents || 0;
  const totalCents = preview.orderTotalCents || (subtotalCents + shippingCents);

  const userOrder = {
    id: orderId,
    name: first ? first.name : "Compra Marketplace",
    category: first ? first.category : "Marketplace",
    price: +(subtotalCents / 100).toFixed(2),
    shipping: +(shippingCents / 100).toFixed(2),
    total: +(totalCents / 100).toFixed(2),
    image: first ? (productById(first.id)?.img || "./img/produto-default.png") : "./img/produto-default.png",
    status: "AGUARDANDO",
    date: toISODate(new Date()),
    items: items.map(it => ({ id: String(it.id), name: it.name, qty: it.qty, priceCents: it.priceCents }))
  };

  const orders = loadUserOrders();
  orders.unshift(userOrder);
  saveUserOrders(orders);

  const pro = loadProState();
  if (pro){
    if (!Array.isArray(pro.orders)) pro.orders = [];
    pro.orders.unshift({
      id: uid(),
      code: "#" + orderId,
      product: userOrder.name,
      category: userOrder.category,
      price: userOrder.price,
      shipping: userOrder.shipping,
      total: userOrder.total,
      status: "AGUARDANDO",
      purchaseDate: userOrder.date,
      deliveryDate: "",
      invoiceUrl: "#",
      supportUrl: "#",
      thumb: userOrder.image,
      trackStep: 2
    });
    saveProState(pro);
  }
}

/* -------------------- DEMO ACTIONS -------------------- */
window.resetAllDemo = function(){
  if(!confirm("Resetar cashback, carrinho, favoritos e extrato?")) return;
  STATE = structuredClone(DEFAULT_STATE);
  saveState();
  setCashbackUI();
  updateFavorites();
  updateLedgerUI();
  setActiveCategory("SUPLEMENTOS");
  renderProducts(PRODUCTS.filter(p=>p.category==="SUPLEMENTOS"));
  updateCart();
  alert("Resetado!");
};

window.seedCashbackDemo = function(){
  const add = 15000;
  STATE.cashbackCents += add;
  pushLedger({ ts: Date.now(), type:"PLUS", amountCents:add, method:"DEMO", orderId:"BONUS", note:"Crédito extra para teste." });
  saveState();
  setCashbackUI();
  updateLedgerUI();
  refreshPricingFromServer();
};

/* -------------------- INIT -------------------- */
window.addEventListener("DOMContentLoaded", async ()=>{
  STATE = loadState();
  syncMarketplaceCatalogState();

  setCashbackUI();
  updateFavorites();
  updateLedgerUI();

  setActiveCategory(STATE.currentCategory);
  renderProducts(PRODUCTS.filter(p=>p.category===STATE.currentCategory));

  const pixEl = document.getElementById("pixAmount");
  const creditEl = document.getElementById("creditAmount");
  const shippingEl = document.getElementById("shippingAmount");

  setMoneyInputFromCents(pixEl, STATE.ui.pixAmountCents);
  setMoneyInputFromCents(creditEl, STATE.ui.creditAmountCents);
  setMoneyInputFromCents(shippingEl, STATE.ui.shippingCents);

  bindSequentialMoneyInput(pixEl, "pix");
  bindSequentialMoneyInput(creditEl, "credit");
  bindSequentialMoneyInput(shippingEl, "shipping");

  document.getElementById("cashbackSlider").value = STATE.ui.appliedCashbackCents;

  wirePaymentMasks();
  updateCart();
  await refreshPricingFromServer();
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_PRODUCTS_KEY) return;
  syncMarketplaceCatalogState();
  updateFavorites();
  renderProducts(PRODUCTS.filter((p) => p.category === STATE.currentCategory));
  updateCart();
});