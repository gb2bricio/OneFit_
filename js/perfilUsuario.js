function requireLoginAndHydrateProfile() {
  const usuarioLogadoRaw = localStorage.getItem("usuarioLogado");

  if (!usuarioLogadoRaw) {
    window.location.href = "login.html";
    return false;
  }

  let usuarioLogado = null;
  let cadastro = null;

  try {
    usuarioLogado = JSON.parse(usuarioLogadoRaw);
  } catch (e) {
    usuarioLogado = {
      email: usuarioLogadoRaw,
      nome: (usuarioLogadoRaw.split("@")[0] || "Aluno").trim(),
      celular: ""
    };
  }

  try {
    cadastro = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");
  } catch (e) {
    cadastro = null;
  }

  if (!usuarioLogado || typeof usuarioLogado !== "object") {
    window.location.href = "login.html";
    return false;
  }

  // Se existir matrícula, ela é a fonte de verdade para dados básicos.
  const loggedEmail = String(usuarioLogado.email || "").toLowerCase();
  const cadastroEmail = String(cadastro?.email || "").toLowerCase();
  const canUseCadastro = cadastro && typeof cadastro === "object" && (!cadastroEmail || cadastroEmail === loggedEmail);

  if (canUseCadastro) {
    state.profile.name = cadastro.nome || usuarioLogado.nome || "Aluno";
    state.profile.email = cadastro.email || usuarioLogado.email || "";
    state.profile.phone = cadastro.celular || usuarioLogado.celular || "";
    state.profile.cpf = cadastro.cpf || cadastro.cpfNumerico || usuarioLogado.cpf || "";
    state.profile.nacionalidade = cadastro.nacionalidade || "";
    state.profile.nascimento = cadastro.nascimento || "";
    state.profile.genero = cadastro.genero || "";
    state.profile.endereco = cadastro.endereco || "";
    state.profile.cidadeEstado = cadastro.cidadeEstado || "";
    applyEnrollmentPlanFromProfile(cadastro);
  } else {
    state.profile.email = usuarioLogado.email || "";
    state.profile.name = usuarioLogado.nome || "Aluno";
    state.profile.phone = usuarioLogado.celular || "";
    state.profile.cpf = usuarioLogado.cpf || "";
    state.profile.nacionalidade = "";
    state.profile.nascimento = "";
    state.profile.genero = "";
    state.profile.endereco = "";
    state.profile.cidadeEstado = "";
    applyEnrollmentPlanFromProfile(null);
  }

  activeProfileStorageKey = pickProfileStorageKey(usuarioLogado, cadastro);
  const persistedProfile = loadPersistedProfileByKey(activeProfileStorageKey);
  mergePersistedProfile(persistedProfile);
  defineActiveUserScopeFromProfile();

  return true;
}

function logout() {
  localStorage.removeItem("usuarioLogado");
  window.location.href = "login.html";
}

const PLAN_STORAGE_KEY = "ONEFIT_SELECTED_PLAN";
const publicCatalog = window.ONEFIT_PUBLIC_CATALOG;

function getPlanCatalog() {
  const plans = publicCatalog?.getPlans?.() || [];
  const map = {};
  plans.forEach((plan) => {
    map[String(plan.key || "").toUpperCase()] = plan;
  });
  return map;
}

function getDefaultPlanKey() {
  return publicCatalog?.getDefaultPlanKey?.() || "GOLD";
}

function getPlanFromCatalog(planKey) {
  const plans = getPlanCatalog();
  const key = String(planKey || "").toUpperCase();
  return plans[key] || null;
}

function persistCurrentPlanToStorage() {
  const plan = getPlanFromCatalog(state.currentPlan);
  if (!plan) return;

  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));

  let cadastro = null;
  try {
    cadastro = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");
  } catch (e) {
    cadastro = null;
  }
  if (!cadastro || typeof cadastro !== "object") return;

  cadastro.plano = {
    key: plan.key,
    nome: plan.short,
    label: plan.label,
    valor: plan.price
  };
  localStorage.setItem("usuarioCadastrado", JSON.stringify(cadastro));
}

function applyEnrollmentPlanFromProfile(cadastro) {
  const profilePlanKey = String(cadastro?.plano?.key || "").toUpperCase();
  if (profilePlanKey && getPlanFromCatalog(profilePlanKey)) {
    state.currentPlan = profilePlanKey;
    return;
  }

  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    const parsed = JSON.parse(raw || "null");
    const storagePlanKey = String(parsed?.key || "").toUpperCase();
    if (storagePlanKey && getPlanFromCatalog(storagePlanKey)) {
      state.currentPlan = storagePlanKey;
    }
  } catch (e) {}
}

function formatDateToBR(dateObj) {
  return `${pad2(dateObj.getDate())}/${pad2(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
}

function addMonthsKeepingDay(dateObj, months) {
  const src = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const targetMonthDate = new Date(src.getFullYear(), src.getMonth() + months, 1);
  const lastDay = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
  const day = Math.min(src.getDate(), lastDay);
  return new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), day);
}

function recalculateDueDate(planKey) {
  const plan = getPlanFromCatalog(planKey);
  if (!plan) return;
  const nextDue = addMonthsKeepingDay(new Date(), plan.cycleMonths || 1);
  state.dueDate = formatDateToBR(nextDue);
}

/* =========================
  DADOS / MODELOS
  ========================= */

const DEFAULT_WORKOUTS = () => ({});

/* =========================
   STORAGE - TREINOS
   ========================= */
const WORKOUTS_STORAGE = "ONEFIT_WORKOUTS_V1";
const AGENDA_STORAGE = "ONEFIT_USER_AGENDA_V1";
const PRO_LS_KEY = "ONEFIT_PRO_V1";
const PROFILE_STORAGE_PREFIX = "ONEFIT_PROFILE_V1";
let activeProfileStorageKey = "";
let activeUserScope = "";

function normalizeUserIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
}

function getCurrentUserScope() {
  return normalizeUserIdentity(activeUserScope);
}

function getScopedStorageKey(baseKey) {
  const scope = getCurrentUserScope();
  return scope ? `${baseKey}:${scope}` : baseKey;
}

function buildProfileStorageKey(id) {
  const normalized = normalizeUserIdentity(id);
  if (!normalized) return "";
  return `${PROFILE_STORAGE_PREFIX}:${normalized}`;
}

function getProfileStorageCandidates(usuarioLogado, cadastro) {
  const ids = [];
  const pushIf = (v) => {
    const x = normalizeUserIdentity(v);
    if (!x) return;
    if (!ids.includes(x)) ids.push(x);
  };

  pushIf(usuarioLogado?.email);
  pushIf(cadastro?.email);
  pushIf(sanitizeCpf(usuarioLogado?.cpf));
  pushIf(sanitizeCpf(cadastro?.cpf || cadastro?.cpfNumerico));
  pushIf(usuarioLogado?.nome);

  return ids.map(buildProfileStorageKey).filter(Boolean);
}

function loadPersistedProfileByKey(storageKey) {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = JSON.parse(raw || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function savePersistedProfileByKey(storageKey, profile) {
  if (!storageKey) return false;
  try {
    localStorage.setItem(storageKey, JSON.stringify(profile));
    return true;
  } catch (e) {
    return false;
  }
}

function pickProfileStorageKey(usuarioLogado, cadastro) {
  const candidates = getProfileStorageCandidates(usuarioLogado, cadastro);
  const firstWithData = candidates.find((key) => !!loadPersistedProfileByKey(key));
  return firstWithData || candidates[0] || "";
}

function mergePersistedProfile(profileData) {
  if (!profileData || typeof profileData !== "object") return;
  state.profile = {
    ...state.profile,
    ...profileData,
    // Nome e CPF seguem a origem base (login/matrícula), não do cache do perfil.
    name: state.profile.name,
    cpf: state.profile.cpf
  };
}

function defineActiveUserScopeFromProfile() {
  activeUserScope =
    normalizeUserIdentity(state.profile.email) ||
    sanitizeCpf(state.profile.cpf) ||
    normalizeUserIdentity(state.profile.name) ||
    "";
}

function migrateScopedStorage(baseKey, previousScope, nextScope) {
  const oldNorm = normalizeUserIdentity(previousScope);
  const newNorm = normalizeUserIdentity(nextScope);
  if (!oldNorm || !newNorm || oldNorm === newNorm) return;

  const oldKey = `${baseKey}:${oldNorm}`;
  const newKey = `${baseKey}:${newNorm}`;

  try {
    const payload = localStorage.getItem(oldKey);
    if (!payload) return;
    localStorage.setItem(newKey, payload);
    localStorage.removeItem(oldKey);
  } catch (e) {}
}

function loadWorkoutsFromStorage() {
  const scopedKey = getScopedStorageKey(WORKOUTS_STORAGE);
  try {
    const raw = localStorage.getItem(scopedKey);
    const obj = JSON.parse(raw || "null");
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch (e) {
    // segue para fallback legado
  }

  // Migração de legado global -> escopo do usuário atual
  try {
    const rawLegacy = localStorage.getItem(WORKOUTS_STORAGE) || localStorage.getItem("ONEFIT_WORKOUTS");
    const legacyObj = JSON.parse(rawLegacy || "null");
    if (!legacyObj || typeof legacyObj !== "object") return null;
    localStorage.setItem(scopedKey, JSON.stringify(legacyObj));
    return legacyObj;
  } catch (e) {
    return null;
  }
}

function saveWorkoutsToStorage() {
  const scopedKey = getScopedStorageKey(WORKOUTS_STORAGE);
  try {
    const payload = JSON.stringify(state.workouts);
    localStorage.setItem(scopedKey, payload);
  } catch (e) {}
}

function loadAgendaFromStorage() {
  const scopedKey = getScopedStorageKey(AGENDA_STORAGE);
  try {
    const raw = localStorage.getItem(scopedKey);
    const arr = JSON.parse(raw || "null");
    if (!Array.isArray(arr)) return null;
    return arr;
  } catch (e) {
    // segue para fallback legado
  }

  // Migração de legado global -> escopo do usuário atual
  try {
    const rawLegacy = localStorage.getItem(AGENDA_STORAGE);
    const legacyArr = JSON.parse(rawLegacy || "null");
    if (!Array.isArray(legacyArr)) return null;
    localStorage.setItem(scopedKey, JSON.stringify(legacyArr));
    return legacyArr;
  } catch (e) {
    return null;
  }
}

function saveAgendaToStorage() {
  const scopedKey = getScopedStorageKey(AGENDA_STORAGE);
  try {
    localStorage.setItem(scopedKey, JSON.stringify(state.agenda.events.slice(0, 500)));
  } catch (e) {}
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadProState() {
  try {
    const raw = localStorage.getItem(PRO_LS_KEY);
    const parsed = JSON.parse(raw || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveProState(obj) {
  try {
    localStorage.setItem(PRO_LS_KEY, JSON.stringify(obj));
  } catch (e) {}
}

function syncAgendaEventToPro(ev) {
  if (!ev || ev.type !== "AULA") return;
  const pro = loadProState();
  if (!pro) return;
  if (!pro.agenda || typeof pro.agenda !== "object") pro.agenda = { events: [] };
  if (!Array.isArray(pro.agenda.events)) pro.agenda.events = [];

  // Evita duplicar: mesmo date+time+title+student
  const student = state.profile?.name || "Aluno";
  const key = `${ev.date}|${ev.time}|${ev.title}|${student}`;
  const exists = pro.agenda.events.some((p) => `${p.dateISO}|${p.time}|${p.title}|${p.studentName || ""}` === key);
  if (exists) return;

  pro.agenda.events.push({
    id: uid(),
    studentId: null,
    studentName: student,
    title: `${ev.title} (Aluno: ${student})`,
    type: "AULA",
    dateISO: ev.date,
    time: ev.time,
    place: "Academia",
    note: ev.note || ""
  });

  saveProState(pro);
}

/* =========================
   STORAGE - COMPRAS
   ========================= */
const ORDERS_STORAGE = "ONEFIT_ORDERS";
const PAYMENTS_STORAGE = "ONEFIT_USER_PAYMENTS_V1";
const PRODUCT_REVIEWS_STORAGE = "ONEFIT_PRODUCT_REVIEWS_V1";
const BACKOFFICE_PRODUCTS_STORAGE = "ONEFIT_PRODUCTS";

/* =========================
   STATE
   ========================= */
let state = {
  currentPlan: getDefaultPlanKey(),
  dueDate: "10/03/2026",
  profile: {
    name: "Rodrigo Mielli",
    email: "rodrigo@email.com",
    phone: "",
    cpf: "",
    nacionalidade: "",
    nascimento: "",
    genero: "",
    endereco: "",
    cidadeEstado: "",
    goal: "",
    height: "",
    weight: "",
    avatarDataUrl: ""
  },
  kpis: {
    workoutsThisMonth: 12,
    workoutsGoal: 16,
    attendancePct: 82,
    savingsTotal: 187.5
  },
  workouts: {},
  payments: [
    { month: "Março/2026", plan: "ONE FIT", amount: 119.9, due: "10/03/2026", paidOn: "05/03/2026", status: "PENDENTE" },
    { month: "Fevereiro/2026", plan: "ONE FIT", amount: 119.9, due: "10/02/2026", paidOn: "05/02/2026", status: "PAGA" },
    { month: "Janeiro/2026", plan: "ONE FIT", amount: 119.9, due: "10/01/2026", paidOn: "10/01/2026", status: "PAGA" },
    { month: "Dezembro/2025", plan: "ONE FIT", amount: 119.9, due: "10/12/2025", paidOn: "14/12/2025", status: "PAGA" }
  ],
  cashback: {
    balance: 87.5,
    goal: 200.0,
    history: []
  },
  agenda: {
    events: [
      { type: "AULA", title: "Funcional", date: addDaysISO(1), time: "19:00" }
    ]
  },
  ui: {
    monthCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    lastAddedISO: "",
    ordersFilter: "ALL",
    viewMeta: {
      "view-perfil": { title: "Perfil", sub: "Atualize seus dados e acompanhe suas métricas." },
      "view-plano": { title: "Meu plano", sub: "Confira o plano atual e faça upgrade em 1 clique." },
      "view-historico": { title: "Histórico", sub: "Pagamentos, status e cashback por mês." },
      "view-cashbacks": { title: "Meus Cashbacks", sub: "Saldo, regras e extrato detalhado." },
      "view-compras": { title: "Minhas Compras", sub: "Acompanhe o status e entrega dos seus pedidos." },
      "view-treinos": { title: "Treinos", sub: "Monte sua ficha de treino." },
      "view-agenda": { title: "Minha Agenda", sub: "Calendário mensal dos meus eventos." },
      "view-aulas": { title: "Aulas Coletivas", sub: "Escolha a melhor data para agendar sua aula" },
      "view-avaliacao": { title: "Avaliação Física", sub: "Agende avaliação e registre na agenda." }
    }
  }
};

/* =========================
   UTIL
   ========================= */
function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatBRL(n) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMoneyBRL(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function parseBRDate(s) {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function formatBRL2(n) {
  return (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayBR() {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function loadPaymentsFromStorage() {
  const scopedKey = getScopedStorageKey(PAYMENTS_STORAGE);
  try {
    const raw = localStorage.getItem(scopedKey);
    const arr = JSON.parse(raw || "null");
    if (!Array.isArray(arr)) return null;
    return arr;
  } catch (e) {
    // segue para fallback legado
  }

  // Migração de legado global -> escopo do usuário atual
  try {
    const rawLegacy = localStorage.getItem(PAYMENTS_STORAGE);
    const legacyArr = JSON.parse(rawLegacy || "null");
    if (!Array.isArray(legacyArr)) return null;
    localStorage.setItem(scopedKey, JSON.stringify(legacyArr));
    return legacyArr;
  } catch (e) {
    return null;
  }
}

function savePaymentsToStorage() {
  const scopedKey = getScopedStorageKey(PAYMENTS_STORAGE);
  try {
    localStorage.setItem(scopedKey, JSON.stringify(state.payments.slice(0, 120)));
  } catch (e) {}
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function isSameISO(a, b) {
  return a === b;
}

function niceDateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const opts = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };
  return dt.toLocaleDateString("pt-BR", opts);
}

function escHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function setMonthCursorToISO(iso) {
  const dt = parseISO(iso);
  state.ui.monthCursor = new Date(dt.getFullYear(), dt.getMonth(), 1);
}

function formatDateBR(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 767.98px)").matches;
}

function shortMonthLabel(label) {
  const raw = String(label || "");
  const [monthRaw, yearRaw = ""] = raw.split("/");
  const month = monthRaw.trim().toLowerCase();
  const map = {
    janeiro: "Jan",
    fevereiro: "Fev",
    março: "Mar",
    marco: "Mar",
    abril: "Abr",
    maio: "Mai",
    junho: "Jun",
    julho: "Jul",
    agosto: "Ago",
    setembro: "Set",
    outubro: "Out",
    novembro: "Nov",
    dezembro: "Dez"
  };

  const short = map[month];
  if (!short) return raw;
  return yearRaw ? `${short}/${yearRaw.trim()}` : short;
}

/* =========================
   MICROINTERAÇÕES
   ========================= */
function bindRipple() {
  document.querySelectorAll(".btn-anim").forEach((btn) => {
    if (btn.dataset.rippleBound === "1") return;
    btn.dataset.rippleBound = "1";

    btn.addEventListener("click", function (e) {
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const s = document.createElement("span");
      s.className = "ripple-span";
      s.style.width = s.style.height = size + "px";
      s.style.left = x - size / 2 + "px";
      s.style.top = y - size / 2 + "px";
      this.appendChild(s);

      setTimeout(() => s.remove(), 650);
    });
  });
}

/* =========================
   COUNTERS
   ========================= */
function animateCounter(el, toValue, opts = {}) {
  if (!el) return;

  const duration = opts.duration ?? 900;
  const decimals = opts.decimals ?? 2;

  const fromRaw = (el.textContent || "").trim();
  let from = 0;

  if (fromRaw && fromRaw !== "--" && fromRaw !== "—") {
    const normalized = fromRaw.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    from = Number.isFinite(parsed) ? parsed : 0;
  }

  const start = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + (toValue - from) * eased;

    el.textContent = val.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* =========================
   CASHBACK RADIAL
   ========================= */
function animateRadialProgress(pct) {
  const ring = document.getElementById("cbRing");
  const pctEl = document.getElementById("cbPctLabel");
  if (!ring || !pctEl) return;

  const r = 48;
  const C = 2 * Math.PI * r;

  const fromDash = ring.dataset.dash ? Number(ring.dataset.dash) : 0;
  const toDash = (Math.max(0, Math.min(100, pct)) / 100) * C;

  const start = performance.now();
  const duration = 900;

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const cur = fromDash + (toDash - fromDash) * eased;

    ring.setAttribute("stroke-dasharray", `${cur} ${Math.max(0, C - cur)}`);
    pctEl.textContent = Math.round((cur / C) * 100);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      ring.dataset.dash = String(toDash);
    }
  }

  requestAnimationFrame(tick);
}

/* =========================
   NAVEGAÇÃO
   ========================= */
function setStageMeta(viewId) {
  const meta = state.ui.viewMeta[viewId] || { title: "Área do Aluno", sub: "" };
  const t = document.getElementById("stageTitle");
  const s = document.getElementById("stageSub");
  if (t) t.textContent = meta.title;
  if (s) s.textContent = meta.sub;
}

function activateNav(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));

  const el = document.getElementById(viewId);
  if (el) el.classList.add("is-active");

  document.querySelectorAll(".nav-itemx").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.view === viewId);
  });

  setStageMeta(viewId);

  if (location.hash.replace("#", "") !== viewId) {
    location.hash = viewId;
  }

  document.querySelectorAll(".js-stagger").forEach((node) => node.classList.remove("in"));

  el?.querySelectorAll(".js-stagger")?.forEach((node, i) => {
    setTimeout(() => node.classList.add("in"), 80 * i);
  });

  if (viewId === "view-dashboard") setTimeout(renderDashboardKpis, 80);
  if (viewId === "view-perfil") {
    setTimeout(() => {
      hydrateProfile();
      calculateIMC();
      animateProfileProgress();
      renderCashbackCard();
      renderMiniKpis();
    }, 80);
  }
  if (viewId === "view-treinos") setTimeout(renderWorkouts, 80);
  if (viewId === "view-agenda") setTimeout(renderAgendaCalendar, 60);
  if (viewId === "view-compras") setTimeout(renderOrders, 60);
}

function goView(viewId) {
  activateNav(viewId);

  const ocEl = document.getElementById("mobileMenu");
  if (ocEl) {
    const oc = bootstrap.Offcanvas.getInstance(ocEl);
    if (oc) oc.hide();
  }
}

function cloneMenuToMobile() {
  const desktopBtns = [...document.querySelectorAll("#navRail .nav-itemx")];
  const mobile = document.getElementById("navRailMobile");
  if (!mobile) return;

  mobile.innerHTML = "";

  desktopBtns.forEach((btn) => {
    const clone = btn.cloneNode(true);
    clone.addEventListener("click", () => goView(clone.dataset.view));
    mobile.appendChild(clone);
  });
}

function bindNavClicks() {
  document.querySelectorAll("#navRail .nav-itemx").forEach((btn) => {
    btn.addEventListener("click", () => goView(btn.dataset.view));
  });
}

function loadViewFromHash() {
  const h = (location.hash || "").replace("#", "").trim();
  const viewId = h && document.getElementById(h) ? h : "view-perfil";
  activateNav(viewId);
}

/* =========================
   PERFIL
   ========================= */
function calculateIMC() {
  const h = parseFloat(state.profile.height);
  const w = parseFloat(state.profile.weight);

  const out = document.getElementById("imcValue");
  const hint = document.getElementById("imcHint");
  if (!out) return;

  if (!h || !w) {
    out.textContent = "--";
    if (hint) hint.textContent = "Informe altura e peso para calcular.";
    return;
  }

  const imc = w / ((h / 100) * (h / 100));
  out.textContent = imc.toFixed(1);

  if (hint) {
    let faixa = "Saudável";
    if (imc < 18.5) faixa = "Abaixo do peso";
    else if (imc < 25) faixa = "Saudável";
    else if (imc < 30) faixa = "Sobrepeso";
    else faixa = "Obesidade";
    hint.textContent = `Faixa: ${faixa}`;
  }
}

function animateProfileProgress() {
  const done = state.kpis.workoutsThisMonth;
  const goal = Math.max(1, state.kpis.workoutsGoal);
  const pct = Math.max(0, Math.min(100, (done / goal) * 100));

  const t = document.getElementById("profileProgressText");
  const b = document.getElementById("profileProgressBar");
  if (t) t.textContent = pct.toFixed(0) + "%";
  if (b) b.style.width = pct.toFixed(0) + "%";
}

function hydrateProfile() {
  const p = state.profile;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("profileName", p.name || "—");
  set("profileEmail", p.email || "—");
  set("profilePhone", p.phone || "—");
  set("profileGoal", p.goal || "—");
  set("profileHeight", p.height ? `${p.height} cm` : "—");
  set("profileWeight", p.weight ? `${p.weight} kg` : "—");

  const avatarImg = document.getElementById("profileAvatar");
  const placeholder = document.getElementById("avatarPlaceholder");

  if (avatarImg && placeholder) {
    if (p.avatarDataUrl) {
      avatarImg.src = p.avatarDataUrl;
      avatarImg.style.display = "block";
      placeholder.style.display = "none";
    } else {
      avatarImg.style.display = "none";
      placeholder.style.display = "block";
    }
  }

  const inp = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  };

  inp("inpName", p.name || "");
  inp("inpEmail", p.email || "");
  inp("inpPhone", p.phone || "");
  inp("inpCpf", p.cpf || "");
  inp("inpNacionalidade", p.nacionalidade || "");
  inp("inpNascimento", p.nascimento || "");
  inp("inpGenero", p.genero || "");
  inp("inpEndereco", p.endereco || "");
  inp("inpCidadeEstado", p.cidadeEstado || "");
  inp("inpGoal", p.goal || "");
  inp("inpHeight", p.height || "");
  inp("inpWeight", p.weight || "");
}

function saveProfile() {
  const get = (id) => (document.getElementById(id)?.value || "").trim();
  const previousUserScope = activeUserScope;

  // Nome e CPF são travados (não editáveis)
  const emailBefore = state.profile.email;

  state.profile.email = get("inpEmail");
  state.profile.phone = get("inpPhone");
  state.profile.nacionalidade = get("inpNacionalidade");
  state.profile.nascimento = (document.getElementById("inpNascimento")?.value || "").trim();
  state.profile.genero = (document.getElementById("inpGenero")?.value || "").trim();
  state.profile.endereco = get("inpEndereco");
  state.profile.cidadeEstado = get("inpCidadeEstado");
  state.profile.goal = get("inpGoal");
  state.profile.height = get("inpHeight");
  state.profile.weight = get("inpWeight");

  const usuarioLogadoRaw = localStorage.getItem("usuarioLogado");
  let usuarioLogado = {};

  try {
    usuarioLogado = JSON.parse(usuarioLogadoRaw || "{}");
  } catch (e) {
    usuarioLogado = {};
  }

  usuarioLogado.nome = state.profile.name;
  usuarioLogado.email = state.profile.email;
  usuarioLogado.celular = state.profile.phone;
  if (state.profile.cpf) usuarioLogado.cpf = state.profile.cpf;

  localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

  // Mantém os dados da matrícula sincronizados para login futuro (sem permitir trocar nome/CPF)
  let cadastro = null;
  try {
    cadastro = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");
  } catch (e) {
    cadastro = null;
  }

  if (cadastro && typeof cadastro === "object") {
    // Mantém sincronia com cadastro sem perder edição para valores vazios.
    if (state.profile.email) cadastro.email = state.profile.email;
    cadastro.celular = state.profile.phone;
    cadastro.nacionalidade = state.profile.nacionalidade;
    cadastro.nascimento = state.profile.nascimento;
    cadastro.genero = state.profile.genero;
    cadastro.endereco = state.profile.endereco;
    cadastro.cidadeEstado = state.profile.cidadeEstado;
    localStorage.setItem("usuarioCadastrado", JSON.stringify(cadastro));

    // Se o usuário trocou email e tinha "lembrar-me", atualiza o preenchimento automático
    if (emailBefore && emailBefore !== state.profile.email) {
      const savedUser = localStorage.getItem("usuario");
      if (savedUser && savedUser.toLowerCase() === emailBefore.toLowerCase()) {
        localStorage.setItem("usuario", state.profile.email);
      }
    }
  }

  const previousStorageKey = activeProfileStorageKey;
  const nextStorageKey =
    buildProfileStorageKey(state.profile.email) ||
    buildProfileStorageKey(sanitizeCpf(state.profile.cpf)) ||
    previousStorageKey;
  activeProfileStorageKey = nextStorageKey;
  defineActiveUserScopeFromProfile();

  const profileToPersist = {
    email: state.profile.email || "",
    phone: state.profile.phone || "",
    nacionalidade: state.profile.nacionalidade || "",
    nascimento: state.profile.nascimento || "",
    genero: state.profile.genero || "",
    endereco: state.profile.endereco || "",
    cidadeEstado: state.profile.cidadeEstado || "",
    goal: state.profile.goal || "",
    height: state.profile.height || "",
    weight: state.profile.weight || "",
    avatarDataUrl: state.profile.avatarDataUrl || ""
  };
  const persisted = savePersistedProfileByKey(activeProfileStorageKey, profileToPersist);

  // Migra storage caso a chave de identidade do usuário mude (ex.: troca de e-mail).
  if (persisted && previousStorageKey && previousStorageKey !== activeProfileStorageKey) {
    try {
      localStorage.removeItem(previousStorageKey);
    } catch (e) {}
  }

  // Migra demais dados do usuário quando o identificador principal mudar.
  migrateScopedStorage(WORKOUTS_STORAGE, previousUserScope, activeUserScope);
  migrateScopedStorage(AGENDA_STORAGE, previousUserScope, activeUserScope);
  migrateScopedStorage(PAYMENTS_STORAGE, previousUserScope, activeUserScope);

  // Confirmação real: lê de volta o storage para garantir que foi salvo.
  const persistedReadback = loadPersistedProfileByKey(activeProfileStorageKey);
  const isPersistedOk = !!(persisted && persistedReadback && persistedReadback.email === profileToPersist.email);

  hydrateProfile();
  calculateIMC();
  animateProfileProgress();

  const modalEl = document.getElementById("profileModal");
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  if (modal) modal.hide();

  setTimeout(() => {
    if (isPersistedOk) {
      alert("Perfil atualizado e salvo com sucesso! Seus dados continuarão ao fazer login novamente.");
    } else {
      alert("Perfil atualizado na tela, mas houve falha ao confirmar o salvamento local.");
    }
  }, 120);
}

/* =========================
   PLANO
   ========================= */
function setCurrentPlan(planKey) {
  const plan = getPlanFromCatalog(planKey);
  if (!plan) return;
  state.currentPlan = planKey;
  recalculateDueDate(planKey);

  const label = plan.label;
  const a = document.getElementById("currentPlanLabelStatus");
  const b = document.getElementById("profilePlanLabel");
  const c = document.getElementById("dueDateLabel");

  if (a) a.textContent = label;
  if (b) b.textContent = label;
  if (c) c.textContent = state.dueDate;

  state.payments = state.payments.map((p) => ({
    ...p,
    plan: plan.short,
    amount: plan.price
  }));
  savePaymentsToStorage();

  persistCurrentPlanToStorage();
  renderPayments();
  renderCashback();
  syncPlanModalState();
}

function renderPlanChoices() {
  const container = document.getElementById("planChoicesContainer");
  if (!container) return;

  const plans = publicCatalog?.getPlans?.() || [];
  container.innerHTML = plans
    .map((plan, index) => {
      const marginClass = index < plans.length - 1 ? " mb-3" : "";
      const inactiveNote = plan.status !== "ATIVO" ? `<div class="small mt-1 text-warning">Plano indisponível para novas trocas</div>` : "";
      return `
        <div class="plan-card${marginClass}" id="plan_${escHtml(plan.key)}" data-plan-key="${escHtml(plan.key)}"
          onclick="handlePlanClick('${escHtml(plan.key)}')">
          <strong>${escHtml(plan.short)}</strong><br> R$ ${formatBRL2(plan.price)}
          <div class="small mt-1 text-muted" id="tag_${escHtml(plan.key)}"></div>
          ${inactiveNote}
        </div>
      `;
    })
    .join("");
}

function syncPlanModalState() {
  const plans = publicCatalog?.getPlans?.() || [];
  plans.forEach((plan) => {
    const card = document.getElementById(`plan_${plan.key}`);
    const tag = document.getElementById(`tag_${plan.key}`);
    if (!card || !tag) return;

    const isCurrent = plan.key === state.currentPlan;
    const isActive = plan.status === "ATIVO";
    card.classList.toggle("is-current", isCurrent);
    card.style.opacity = isActive || isCurrent ? "1" : "0.55";
    tag.textContent = isCurrent ? "Plano atual" : (isActive ? "" : "Indisponível");
  });
}

function handlePlanClick(planKey) {
  const plan = getPlanFromCatalog(planKey);
  if (!plan) return;
  if (plan.status !== "ATIVO" && planKey !== state.currentPlan) {
    alert("Esse plano está indisponível para novas trocas.");
    return;
  }
  if (planKey === state.currentPlan) return;

  setCurrentPlan(planKey);

  const modalEl = document.getElementById("planModal");
  const modal = modalEl
    ? bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)
    : null;

  if (modal) modal.hide();

  setTimeout(() => alert("Plano alterado com sucesso!"), 150);
}

/* =========================
   PAGAMENTOS + CASHBACK
   ========================= */
function cashbackFromPayment(payment) {
  const due = parseBRDate(payment.due);
  const paid = parseBRDate(payment.paidOn);

  if (paid < due) return { kind: "Antecipada", value: +(payment.amount * 0.1).toFixed(2) };
  if (paid.getTime() === due.getTime()) return { kind: "No vencimento", value: +(payment.amount * 0.05).toFixed(2) };
  return { kind: "Atrasada", value: 0.0 };
}

function buildCashbackHistory() {
  state.cashback.history = state.payments.map((p) => {
    const cb = cashbackFromPayment(p);
    return { month: p.month, kind: cb.kind, paidOn: p.paidOn, value: cb.value };
  });
}

function renderPayments() {
  const tbody = document.getElementById("paymentsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.payments.forEach((p) => {
    const cb = cashbackFromPayment(p);
    const monthLabel = isMobileViewport() ? shortMonthLabel(p.month) : p.month;

    const statusBadge =
      p.status === "PAGA"
        ? `<span class="badge" style="background:var(--success)">PAGO</span>`
        : `<span class="badge" style="background:var(--danger)">PENDENTE</span>`;

    const cbBadge =
      cb.value > 0
        ? `<span class="badge" style="background:rgba(var(--gold-glow), .85); color:#000; font-weight:900;">+ R$ ${formatBRL(cb.value)}</span>`
        : `<span class="badge" style="background:rgba(255,255,255,.10); color:rgba(255,255,255,.85); font-weight:900;">R$ 0,00</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escHtml(monthLabel)}</td>
      <td>${escHtml(p.plan)}</td>
      <td>R$ ${formatBRL(p.amount)}</td>
      <td>${statusBadge}</td>
      <td>
        ${cbBadge}
        <div class="small text-muted mt-1">${escHtml(cb.kind)}</div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCashback() {
  buildCashbackHistory();

  const pill = document.getElementById("cashbackPill");
  if (pill) animateCounter(pill, state.cashback.balance, { duration: 850, decimals: 2 });

  const tbody = document.getElementById("cashbackTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.cashback.history.forEach((h) => {
    const monthLabel = isMobileViewport() ? shortMonthLabel(h.month) : h.month;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escHtml(monthLabel)}</td>
      <td>${escHtml(h.kind)}</td>
      <td>${escHtml(h.paidOn)}</td>
      <td><strong>${h.value > 0 ? `R$ ${formatBRL(h.value)}` : "R$ 0,00"}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCashbackCard() {
  const bal = document.getElementById("cashbackBalance");
  const goal = document.getElementById("cbGoalLabel");

  if (goal) goal.textContent = formatBRL(state.cashback.goal);
  if (bal) animateCounter(bal, state.cashback.balance, { duration: 900, decimals: 2 });

  const pct = (state.cashback.balance / Math.max(1, state.cashback.goal)) * 100;
  animateRadialProgress(pct);
}

function useCashback() {
  if (state.cashback.balance <= 0) {
    alert("Você não tem cashback disponível no momento.");
    return;
  }

  window.location.href = "./marketplace.html";
}

async function payNow() {
  // compatibilidade com o botão "PAGAR AGORA"
  openHistoryPayModal();
}

/* =========================
   HISTÓRICO - MODAL DE PAGAMENTO (split PIX/CRÉDITO)
   ========================= */
let histPay = {
  paymentIndex: -1,
  totalCents: 0,
  method: "pix",
  pixCopied: false,
  lastPreview: null
};

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

function normalizeDigits(d) {
  const x = digitsOnly(d).replace(/^0+(?=\d)/, "");
  return x === "" ? "0" : x;
}

function formatMaskedMoneyFromDigits(digits) {
  const d = normalizeDigits(digits);
  const padded = d.padStart(3, "0");
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intWithDots},${decPart}`;
}

function centsFromDigits(digits) {
  return parseInt(normalizeDigits(digits), 10);
}

function setMoneyInputDigits(el, digits) {
  if (!el) return;
  const d = normalizeDigits(digits);
  el.dataset.digits = d;
  el.value = formatMaskedMoneyFromDigits(d);
}

function bindSequentialMoneyInput(el, which) {
  if (!el) return;
  if (!el.dataset.digits) setMoneyInputDigits(el, "0");

  const applyDigits = (newDigits) => {
    const d = normalizeDigits(newDigits);
    el.dataset.digits = d;
    el.value = formatMaskedMoneyFromDigits(d);
    if (which === "pix") histPay.pixDigits = d;
    else histPay.creditDigits = d;
    refreshHistPayPreview();
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  };

  el.addEventListener("focus", () => {
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  });
  el.addEventListener("mouseup", (e) => {
    e.preventDefault();
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  });
  el.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const nav = ["Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (nav.includes(e.key)) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const d = el.dataset.digits || "0";
      const next = d.length <= 1 ? "0" : d.slice(0, -1);
      applyDigits(next);
      return;
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const d = el.dataset.digits || "0";
      const next = d === "0" ? e.key : d + e.key;
      applyDigits(next.slice(0, 12));
      return;
    }
    if (e.key === "," || e.key === ".") {
      e.preventDefault();
      return;
    }
    e.preventDefault();
  });
  el.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text") || "";
    const d = digitsOnly(text);
    applyDigits(d ? d.slice(0, 12) : "0");
  });
}

function maskCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
function maskExp(value) {
  const d = value.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + "/" + d.slice(2);
}
function maskCvv(value) {
  return value.replace(/\D/g, "").slice(0, 4);
}
function luhnCheck(numStr) {
  const s = numStr.replace(/\s+/g, "");
  if (!/^\d{12,19}$/.test(s)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function validateCreditFieldsIfNeeded(creditCents) {
  if (creditCents <= 0) return null;
  const number = (document.getElementById("histCardNumber")?.value || "").trim();
  const exp = (document.getElementById("histCardExp")?.value || "").trim();
  const cvv = (document.getElementById("histCardCvv")?.value || "").trim();
  const digits = number.replace(/\s+/g, "");
  if (!luhnCheck(digits)) return "Número do cartão inválido.";
  if (!/^\d{2}\/\d{2}$/.test(exp)) return "Validade inválida (use MM/AA).";
  const mm = Number(exp.slice(0, 2));
  if (!(mm >= 1 && mm <= 12)) return "Mês de validade inválido.";
  if (!/^\d{3,4}$/.test(cvv)) return "CVV inválido.";
  return null;
}

function refreshHistPayPreview() {
  const total = histPay.totalCents;
  const pix = centsFromDigits(histPay.pixDigits);
  const credit = centsFromDigits(histPay.creditDigits);
  const paid = pix + credit;
  const diff = total - paid;
  histPay.lastPreview = { total, pix, credit, paid, diff };

  const paidLabel = document.getElementById("histPaidLabel");
  const diffLabel = document.getElementById("histDiffLabel");
  if (paidLabel) paidLabel.textContent = `R$ ${formatBRL2(paid / 100)}`;
  if (diffLabel) {
    if (diff > 0) diffLabel.textContent = `Falta R$ ${formatBRL2(diff / 100)}`;
    else if (diff < 0) diffLabel.textContent = `Excedeu R$ ${formatBRL2((-diff) / 100)}`;
    else diffLabel.textContent = "R$ 0,00";
  }

  const val = document.getElementById("histPayValidation");
  if (!val) return;
  val.style.display = "none";
  val.textContent = "";
  val.className = "mini mt-2 text-danger";

  const errors = [];
  if (total <= 0) errors.push("Total inválido.");
  if (diff !== 0) errors.push("Pagamento precisa fechar o total.");
  const creditErr = validateCreditFieldsIfNeeded(credit);
  if (creditErr) errors.push(creditErr);

  if (errors.length) {
    val.style.display = "block";
    val.textContent = "⛔ " + errors.join(" ");
  }
}

const HIST_PIX_PAYLOAD =
  "00020126580014BR.GOV.BCB.PIX0136chave-pix-exemplo@onefit.com5204000053039865405119.905802BR5920ONE FIT ACADEMIA LTDA6009SAO PAULO62070503***6304ABCD";

function histEnsurePixQr() {
  const qrEl = document.getElementById("histPixQr");
  if (!qrEl || typeof QRCode === "undefined") return;
  qrEl.innerHTML = "";
  new QRCode(qrEl, {
    text: HIST_PIX_PAYLOAD,
    width: 160,
    height: 160,
    correctLevel: QRCode.CorrectLevel.M
  });
  const codeEl = document.getElementById("histPixCode");
  if (codeEl) codeEl.value = HIST_PIX_PAYLOAD;
}

window.histSelectPay = function (type) {
  histPay.method = type === "card" ? "card" : "pix";
  document.querySelectorAll("#paymentModal .payment-option").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-pay") === histPay.method);
  });
  const pix = document.getElementById("histPixFields");
  const card = document.getElementById("histCardFields");
  if (pix) pix.classList.toggle("d-none", histPay.method !== "pix");
  if (card) card.classList.toggle("d-none", histPay.method !== "card");
  if (histPay.method === "pix") histEnsurePixQr();
};

window.histCopyPixCode = async function () {
  const codeEl = document.getElementById("histPixCode");
  const feedback = document.getElementById("histCopyFeedback");
  const proofWrap = document.getElementById("histPixProofWrap");
  if (!codeEl) return;
  const code = codeEl.value;
  try {
    await navigator.clipboard.writeText(code);
  } catch (e) {
    codeEl.focus();
    codeEl.select();
    document.execCommand("copy");
  }
  histPay.pixCopied = true;
  if (feedback) {
    feedback.style.display = "block";
    setTimeout(() => (feedback.style.display = "none"), 1500);
  }
  if (proofWrap) proofWrap.style.display = "block";
};

window.histFillFakeCard = function () {
  const n = document.getElementById("histCardNumber");
  const e = document.getElementById("histCardExp");
  const c = document.getElementById("histCardCvv");
  if (n) n.value = "4242 4242 4242 4242";
  if (e) e.value = "12/30";
  if (c) c.value = "123";
};

function histNormalizeExp(str) {
  const d = digitsOnly(str).slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + "/" + d.slice(2, 4);
}

function histValidateCard() {
  const feedback = document.getElementById("histCardFeedback");
  if (feedback) feedback.style.display = "none";
  const n = (document.getElementById("histCardNumber")?.value || "").trim();
  const e = (document.getElementById("histCardExp")?.value || "").trim();
  const c = (document.getElementById("histCardCvv")?.value || "").trim();

  const digits = n.replace(/\s+/g, "");
  const exp = histNormalizeExp(e);
  const cvv = digitsOnly(c);
  const ok = luhnCheck(digits) && /^\d{2}\/\d{2}$/.test(exp) && /^\d{3,4}$/.test(cvv);
  if (!ok && feedback) feedback.style.display = "block";
  return ok;
}

function histValidatePix() {
  const proof = document.getElementById("histPixProof");
  const file = proof?.files?.[0];
  return histPay.pixCopied && !!file;
}

window.openHistoryPayModal = function (monthLabel) {
  let idx = -1;
  if (monthLabel) idx = state.payments.findIndex((p) => p.month === monthLabel && p.status !== "PAGA");
  if (idx < 0) idx = state.payments.findIndex((p) => p.status !== "PAGA");
  if (idx < 0) {
    alert("Não há mensalidades pendentes.");
    return;
  }

  histPay.paymentIndex = idx;
  histPay.totalCents = Math.round((Number(state.payments[idx].amount) || 0) * 100);
  histPay.method = "pix";
  histPay.pixCopied = false;

  const totalLabel = document.getElementById("histPayTotalLabel");
  if (totalLabel) totalLabel.textContent = `R$ ${formatBRL2(histPay.totalCents / 100)}`;

  // reset UI
  window.histSelectPay("pix");
  const proofWrap = document.getElementById("histPixProofWrap");
  if (proofWrap) proofWrap.style.display = "none";
  const proof = document.getElementById("histPixProof");
  if (proof) proof.value = "";
  const cardFeedback = document.getElementById("histCardFeedback");
  if (cardFeedback) cardFeedback.style.display = "none";
  const cn = document.getElementById("histCardNumber");
  const ce = document.getElementById("histCardExp");
  const cc = document.getElementById("histCardCvv");
  if (cn) cn.value = "";
  if (ce) ce.value = "";
  if (cc) cc.value = "";

  // Validação de 1 dia após último pagamento
  const lastPaid = state.payments
    .filter((p) => p.status === "PAGA" && p.paidOn)
    .sort((a, b) => {
      const dateA = parseBRDate(a.paidOn);
      const dateB = parseBRDate(b.paidOn);
      return dateB - dateA;
    })[0];

  if (lastPaid) {
    const lastPaidDate = parseBRDate(lastPaid.paidOn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastPaidDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastPaidDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      const validationMsg = document.getElementById("histPayValidationMsg");
      if (validationMsg) {
        validationMsg.style.display = "block";
        validationMsg.textContent = `⛔ Você só pode realizar um pagamento após 1 dia do último pagamento. Último pagamento: ${lastPaid.paidOn}`;
        validationMsg.className = "mini mt-2 text-danger";
      }
    } else {
      const validationMsg = document.getElementById("histPayValidationMsg");
      if (validationMsg) {
        validationMsg.style.display = "none";
        validationMsg.textContent = "";
      }
    }
  }

  const modalEl = document.getElementById("paymentModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
};

window.histConfirmPayment = async function () {
  // Validação de 1 dia após último pagamento
  const lastPaid = state.payments
    .filter((p) => p.status === "PAGA" && p.paidOn)
    .sort((a, b) => {
      const dateA = parseBRDate(a.paidOn);
      const dateB = parseBRDate(b.paidOn);
      return dateB - dateA;
    })[0];

  if (lastPaid) {
    const lastPaidDate = parseBRDate(lastPaid.paidOn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastPaidDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastPaidDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      alert(`Você só pode realizar um pagamento após 1 dia do último pagamento.\nÚltimo pagamento: ${lastPaid.paidOn}`);
      return;
    }
  }

  if (histPay.method === "pix") {
    if (!histValidatePix()) {
      alert("Para finalizar no Pix: copie o código e anexe o comprovante.");
      return;
    }
  } else {
    if (!histValidateCard()) {
      alert("Preencha os dados do cartão (ou clique em “Usar cartão teste”).");
      return;
    }
  }

  const btn = document.getElementById("histConfirmPayBtn");
  const btnTextBefore = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Processando...";
  }
  await new Promise((r) => setTimeout(r, 600));

  const i = histPay.paymentIndex;
  if (i < 0 || !state.payments[i]) {
    alert("Pagamento não encontrado.");
    return;
  }

  state.payments[i].status = "PAGA";
  state.payments[i].paidOn = todayBR();
  if (histPay.method === "pix") {
    const fileName = document.getElementById("histPixProof")?.files?.[0]?.name || "comprovante";
    state.payments[i].metodo = `PIX (comprovante: ${fileName})`;
  } else {
    state.payments[i].metodo = "CARTÃO DE CRÉDITO (teste)";
  }

  savePaymentsToStorage();
  renderPayments();
  renderCashback();

  const modalEl = document.getElementById("paymentModal");
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  modal?.hide();

  setTimeout(() => alert("Pagamento realizado! ✅ O histórico foi atualizado."), 120);

  if (btn) {
    btn.disabled = false;
    btn.textContent = btnTextBefore || "PAGAR";
  }
};

/* =========================
   DASHBOARD
   ========================= */
function renderDashboardKpis() {
  const k = state.kpis;

  const elW = document.getElementById("kpiWorkouts");
  const elWG = document.getElementById("kpiWorkoutsGoal");
  const elA = document.getElementById("kpiAttendance");
  const elS = document.getElementById("kpiSavings");

  if (elW) elW.textContent = String(k.workoutsThisMonth);
  if (elWG) elWG.textContent = String(k.workoutsGoal);
  if (elA) elA.textContent = String(k.attendancePct);
  if (elS) animateCounter(elS, k.savingsTotal, { duration: 850, decimals: 2 });

  const wPct = Math.max(0, Math.min(100, (k.workoutsThisMonth / Math.max(1, k.workoutsGoal)) * 100));
  const bw = document.getElementById("kpiBarWorkouts");
  if (bw) bw.style.width = wPct.toFixed(0) + "%";

  const aPct = Math.max(0, Math.min(100, k.attendancePct));
  const ba = document.getElementById("kpiBarAttendance");
  if (ba) ba.style.width = aPct.toFixed(0) + "%";
}

function renderMiniKpis() {
  const k = state.kpis;

  const w = document.getElementById("miniWorkouts");
  const wg = document.getElementById("miniWorkoutsGoal");
  const a = document.getElementById("miniAttendance");
  const s = document.getElementById("miniSavings");

  if (w) w.textContent = String(k.workoutsThisMonth);
  if (wg) wg.textContent = String(k.workoutsGoal);
  if (a) a.textContent = String(k.attendancePct);
  if (s) animateCounter(s, k.savingsTotal, { duration: 800, decimals: 2 });

  const wPct = Math.max(0, Math.min(100, (k.workoutsThisMonth / Math.max(1, k.workoutsGoal)) * 100));
  const bw = document.getElementById("miniBarWorkouts");
  if (bw) bw.style.width = wPct.toFixed(0) + "%";

  const aPct = Math.max(0, Math.min(100, k.attendancePct));
  const ba = document.getElementById("miniBarAttendance");
  if (ba) ba.style.width = aPct.toFixed(0) + "%";
}

/* =========================
   MINHAS COMPRAS
   ========================= */
function seedOrders() {
  // Desativado: não semear pedidos mock para evitar itens fora do backoffice.
}

function getBackofficeProductsLookup() {
  const out = { ids: new Set(), names: new Set() };
  try {
    const raw = localStorage.getItem(BACKOFFICE_PRODUCTS_STORAGE);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return out;

    arr.forEach((p) => {
      const id = String(p?.id || "").trim();
      const name = String(p?.name || "").trim().toLowerCase();
      if (id) out.ids.add(id);
      if (name) out.names.add(name);
    });
  } catch (e) {}
  return out;
}

function isBackofficeOrder(order, lookup) {
  if (!order || typeof order !== "object") return false;
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    return items.every((it) => lookup.ids.has(String(it?.id || "").trim()));
  }

  const name = String(order.name || "").trim().toLowerCase();
  return !!name && lookup.names.has(name);
}

function cleanupOrdersNotFromBackoffice() {
  const lookup = getBackofficeProductsLookup();
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr) || !arr.length) return;

    const cleaned = arr.filter((order) => isBackofficeOrder(order, lookup));
    if (cleaned.length !== arr.length) {
      localStorage.setItem(ORDERS_STORAGE, JSON.stringify(cleaned));
    }
  } catch (e) {}
}

function getAllOrders() {
  cleanupOrdersNotFromBackoffice();
  return JSON.parse(localStorage.getItem(ORDERS_STORAGE) || "[]");
}

function getVisibleOrders() {
  const all = getAllOrders();
  const search = (document.getElementById("ordersSearch")?.value || "").trim().toLowerCase();
  const filter = state.ui.ordersFilter || "ALL";

  return all.filter((order) => {
    const matchesFilter = filter === "ALL" || order.status === filter;
    const matchesSearch =
      !search ||
      String(order.name || "").toLowerCase().includes(search) ||
      String(order.id || "").toLowerCase().includes(search);

    return matchesFilter && matchesSearch;
  });
}

function businessDaysBetween(fromISO, toISO) {
  if (!fromISO || !toISO) return Infinity;
  const from = new Date(fromISO + "T00:00:00");
  const to = new Date(toISO + "T00:00:00");
  if (!(from instanceof Date) || !(to instanceof Date) || isNaN(from) || isNaN(to)) return Infinity;
  if (to < from) return 0;

  let days = 0;
  const cur = new Date(from);
  while (cur <= to) {
    const dow = cur.getDay(); // 0 dom - 6 sáb
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  // não contar o próprio dia da entrega como "dia útil após"
  return Math.max(0, days - 1);
}

function statusFromTrackStep(step) {
  const s = Number(step || 1);
  if (s <= 1) return "AGUARDANDO";
  if (s === 2) return "ENVIADO";
  if (s === 3) return "ENTREGA";
  return "ENTREGUE";
}

function clampTrackStep(step) {
  const s = Math.max(1, Math.min(4, parseInt(step || "1", 10)));
  return Number.isFinite(s) ? s : 1;
}

function updateOrderStatusFromTrack(order) {
  if (!order) return order;
  if (order.status === "CANCELADO" || order.status === "DEVOLVIDO") return order;
  order.trackStep = clampTrackStep(order.trackStep || 1);
  order.status = statusFromTrackStep(order.trackStep);
  if (order.status === "ENTREGUE" && !order.delivered) {
    order.delivered = toISODate(new Date());
  }
  return order;
}

let trackingCtx = { orderId: "", step: 1 };

window.openTracking = function (orderId) {
  const orders = getAllOrders();
  const order = orders.find((o) => String(o.id) === String(orderId));
  if (!order) return;

  updateOrderStatusFromTrack(order);
  trackingCtx.orderId = String(order.id);
  trackingCtx.step = clampTrackStep(order.trackStep || 1);
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));

  renderTrackingModal(order);

  const modalEl = document.getElementById("trackingModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
};

function renderTrackingModal(order) {
  const subtitle = document.getElementById("trackingSubtitle");
  const body = document.getElementById("trackingBody");
  if (subtitle) subtitle.textContent = `Pedido #${order.id} • Status: ${order.status}`;
  if (!body) return;

  const steps = [
    { n: 1, label: "Pedido" },
    { n: 2, label: "Enviado" },
    { n: 3, label: "Entrega" },
    { n: 4, label: "Recebido" }
  ];

  const current = clampTrackStep(order.trackStep || 1);
  body.innerHTML = `
    <div class="text-muted small mb-2">Clique em “Avançar etapa” para simular a entrega e testar os filtros.</div>
    <div class="d-flex flex-column gap-2">
      ${steps.map((s) => {
        const done = s.n < current;
        const cur = s.n === current;
        const badge = done ? "✅" : (cur ? "🟡" : "⚪");
        const cls = done ? "text-success" : (cur ? "text-warning" : "text-muted");
        return `<div class="d-flex justify-content-between align-items-center">
          <div class="${cls}" style="font-weight:900;">${badge} ${s.label}</div>
          <div class="small text-muted">Etapa ${s.n}/4</div>
        </div>`;
      }).join("")}
    </div>
    <hr style="border-color: rgba(255,255,255,.10); margin: 14px 0;">
    <div class="small text-muted">
      <div><strong>Compra:</strong> ${escHtml(order.date || "—")}</div>
      <div><strong>Entrega:</strong> ${escHtml(order.delivered || "—")}</div>
    </div>
  `;
}

window.trackingNextStep = function () {
  const orders = getAllOrders();
  const order = orders.find((o) => String(o.id) === String(trackingCtx.orderId));
  if (!order) return;
  if (order.status === "CANCELADO" || order.status === "DEVOLVIDO") return;
  order.trackStep = clampTrackStep((order.trackStep || 1) + 1);
  updateOrderStatusFromTrack(order);
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
  renderTrackingModal(order);
  renderOrders();
};

window.trackingPrevStep = function () {
  const orders = getAllOrders();
  const order = orders.find((o) => String(o.id) === String(trackingCtx.orderId));
  if (!order) return;
  if (order.status === "CANCELADO" || order.status === "DEVOLVIDO") return;
  order.trackStep = clampTrackStep((order.trackStep || 1) - 1);
  updateOrderStatusFromTrack(order);
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
  renderTrackingModal(order);
  renderOrders();
};

function loadOrders() {
  renderOrders();
}

function renderOrders() {
  const list = document.getElementById("ordersList");
  const counter = document.getElementById("ordersCount");

  if (!list || !counter) return;

  const orders = getVisibleOrders();

  counter.textContent = `${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}`;
  list.innerHTML = "";

  if (!orders.length) {
    list.innerHTML = `
      <div class="orders-empty">
        <div class="orders-empty-ico">🛒</div>
        <div class="orders-empty-title">Nenhuma compra encontrada</div>
        <div class="orders-empty-sub">Tente mudar o filtro ou buscar outro pedido.</div>
      </div>
    `;
    return;
  }

  orders.forEach((order) => {
    updateOrderStatusFromTrack(order);
    const card = document.createElement("div");
    card.className = "order-card";

    const statusClass = String(order.status || "").toLowerCase();
    const shipping = Number(order.shipping || 0);
    const total = Number(order.total || 0) || (Number(order.price || 0) + shipping);

    const canCancel = order.status !== "ENTREGUE" && order.status !== "CANCELADO" && order.status !== "DEVOLVIDO";
    const deliveredISO = order.delivered || "";
    const todayISO = toISODate(new Date());
    const businessDaysAfterDelivery = deliveredISO ? businessDaysBetween(deliveredISO, todayISO) : Infinity;
    const canReturn = order.status === "ENTREGUE" && businessDaysAfterDelivery <= 7;

    card.innerHTML = `
      <div class="order-top">
        <div class="order-product">
          <div class="order-thumb">
            <img src="${escHtml(order.image || "./img/produto-default.png")}" alt="${escHtml(order.name || "Produto")}">
          </div>

          <div class="order-meta">
            <div class="order-title">${escHtml(order.name || "Produto")}</div>
            <div class="order-sub">${escHtml(order.category || "Categoria")}</div>
            <div class="order-price">${formatMoneyBRL(Number(order.price || 0))}</div>
            ${shipping > 0 ? `<div class="mini text-muted mt-1"><strong>Frete:</strong> ${formatMoneyBRL(shipping)} • <strong>Total:</strong> ${formatMoneyBRL(total)}</div>` : ``}
            <div class="mini text-muted mt-1" style="cursor:pointer;" onclick="openTracking('${order.id}')">
              <strong>Rastreio:</strong> clique para simular etapas
            </div>
          </div>
        </div>

        <div class="order-right">
          <div class="order-code">Pedido #${escHtml(order.id || "")}</div>
          <div class="order-status status-${statusClass}">
            ${escHtml(order.status || "AGUARDANDO")}
          </div>
        </div>
      </div>

      <div class="order-progress">
        ${(() => {
          const current = clampTrackStep(order.trackStep || 1);
          const labels = ["Pedido", "Enviado", "Entrega", "Recebido"];
          return labels
            .map((lab, idx) => {
              const step = idx + 1;
              const isDone = step < current;
              const isCurrent = step === current;
              const cls = isDone ? "is-done" : isCurrent ? "is-current" : "";
              const lock = step > current + 1 ? "data-locked=\"1\"" : "";
              return `<div class="order-step ${cls}" ${lock} style="cursor:pointer;" onclick="toggleTrackStep('${order.id}', ${step})">
                <div class="step-title">${lab}</div>
              </div>`;
            })
            .join("");
        })()}
      </div>

      <div class="order-bottom">
        <div class="order-info-line">
          <span><strong>Compra:</strong> ${escHtml(order.date || "—")}</span>
          ${order.delivered ? `<span><strong>Entrega:</strong> ${escHtml(order.delivered)}</span>` : ""}
        </div>

        <div class="d-flex gap-2 flex-wrap">
          <button class="icon-btn btn-anim icon-mini" type="button" onclick="downloadInvoice('${order.id}')">
            📄 Nota Fiscal
          </button>

          <button class="icon-btn btn-anim icon-mini" type="button" onclick="openSupport('${order.id}')">
            💬 Suporte
          </button>

          ${canCancel ? `
            <button class="icon-btn btn-anim icon-mini" type="button" onclick="cancelOrder('${order.id}')">
              ❌ Cancelar
            </button>
          ` : ``}

          ${order.status === "ENTREGUE" && !order.reviewed ? `
            <button class="icon-btn btn-anim icon-mini" type="button" onclick="reviewProduct('${order.id}')">
              ⭐ Avaliar
            </button>
          ` : order.reviewed ? `
            <span class="text-muted small">✅ Avaliado</span>
          ` : ""}

          ${order.status === "ENTREGUE" ? `
            <button class="icon-btn btn-anim icon-mini" type="button" onclick="requestReturn('${order.id}')"
              ${canReturn ? "" : "disabled"} title="${canReturn ? "Devolução disponível" : "Prazo de devolução expirou (7 dias úteis)"}">
              🔄 Devolver
            </button>
          ` : ""}
        </div>
      </div>
    `;

    list.appendChild(card);
  });

  bindRipple();
}

window.toggleTrackStep = function (orderId, step) {
  const orders = getAllOrders();
  const order = orders.find((o) => String(o.id) === String(orderId));
  if (!order) return;
  if (order.status === "CANCELADO" || order.status === "DEVOLVIDO") return;

  const cur = clampTrackStep(order.trackStep || 1);
  const target = clampTrackStep(step || 1);

  // só permite habilitar a próxima etapa se a anterior estiver habilitada
  if (target > cur + 1) {
    alert("Habilite as etapas anteriores primeiro.");
    return;
  }

  // toggle: clicar na etapa atual desabilita (volta 1 etapa)
  if (target === cur && cur > 1) {
    order.trackStep = cur - 1;
  } else if (target === cur && cur === 1) {
    order.trackStep = 1;
  } else {
    order.trackStep = target;
  }

  updateOrderStatusFromTrack(order);
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
  renderOrders();
};

function initOrdersFilters() {
  document.querySelectorAll(".orders-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".orders-filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.ui.ordersFilter = btn.dataset.status || "ALL";
      renderOrders();
    });
  });

  const search = document.getElementById("ordersSearch");
  if (search) {
    search.addEventListener("input", renderOrders);
  }
}

function downloadInvoice(id) {
  const orders = getAllOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) {
    alert("Pedido não encontrado.");
    return;
  }
  const sub = document.getElementById("invSubtitle");
  const body = document.getElementById("invBody");
  if (sub) sub.textContent = `Pedido #${order.id} • ${order.status}`;
  if (body) {
    const delivered = order.delivered || "—";
    const total = Number(order.total || (Number(order.price || 0) + Number(order.shipping || 0)));
    body.innerHTML = `
      <div class="mb-2"><strong>Produto:</strong> ${escHtml(order.name || "—")}</div>
      <div class="mb-2"><strong>Categoria:</strong> ${escHtml(order.category || "—")}</div>
      <div class="mb-2"><strong>Data da compra:</strong> ${escHtml(order.date || "—")}</div>
      <div class="mb-2"><strong>Entrega:</strong> ${escHtml(delivered)}</div>
      <hr style="border-color: rgba(255,255,255,.15);">
      <div class="mb-1"><strong>Itens:</strong> 1</div>
      <div class="mb-1"><strong>Preço:</strong> ${formatMoneyBRL(Number(order.price || 0))}</div>
      ${Number(order.shipping || 0) > 0 ? `<div class="mb-1"><strong>Frete:</strong> ${formatMoneyBRL(Number(order.shipping || 0))}</div>` : ``}
      <div class="mb-1"><strong>Total:</strong> ${formatMoneyBRL(total)}</div>
      <div class="text-muted mt-2">Documento fictício para testes locais.</div>
    `;
  }
  const modalEl = document.getElementById("invoiceModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
}

function openSupport(id) {
  const orders = getAllOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) {
    alert("Pedido não encontrado.");
    return;
  }
  // Abre modal de suporte
  const modalEl = document.getElementById("supportModal");
  if (modalEl) {
    const orderIdEl = document.getElementById("supportOrderId");
    const orderNameEl = document.getElementById("supportOrderName");
    if (orderIdEl) orderIdEl.textContent = order.id;
    if (orderNameEl) orderNameEl.textContent = order.name;
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  } else {
    alert(`Abrindo suporte do pedido ${id}\n\nProduto: ${order.name}`);
  }
}

let reviewCtx = { orderId: "", productId: "", rating: 0 };

function loadProductReviews() {
  try {
    const raw = localStorage.getItem(PRODUCT_REVIEWS_STORAGE);
    const obj = JSON.parse(raw || "null");
    if (!obj || typeof obj !== "object") return {};
    return obj;
  } catch (e) {
    return {};
  }
}

function saveProductReviews(reviews) {
  try {
    localStorage.setItem(PRODUCT_REVIEWS_STORAGE, JSON.stringify(reviews));
  } catch (e) {}
}

function updateProductDescriptionInMarketplace(productId, rating, reviewText) {
  // Atualiza a descrição do produto no marketplace com a avaliação
  const STORAGE_PRODUCTS_KEY = "ONEFIT_PRODUCTS";
  const products = JSON.parse(localStorage.getItem(STORAGE_PRODUCTS_KEY) || "[]");
  
  // Tenta encontrar pelo ID do pedido (que pode ser o ID do produto)
  let product = products.find((p) => String(p.id) === String(productId));
  
  // Se não encontrar, tenta pelo nome do pedido
  if (!product) {
    const orders = getAllOrders();
    const order = orders.find((o) => o.id === productId);
    if (order) {
      // Tenta encontrar produto pelo nome
      product = products.find((p) => String(p.name || "").toLowerCase() === String(order.name || "").toLowerCase());
    }
  }
  
  if (product) {
    const reviews = loadProductReviews();
    const reviewKey = String(product.id || productId);
    const productReviews = reviews[reviewKey] || [];
    productReviews.push({
      rating,
      review: reviewText,
      date: toISODate(new Date())
    });
    reviews[reviewKey] = productReviews;
    saveProductReviews(reviews);
    
    // Calcula média de avaliações
    const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    const stars = "⭐".repeat(Math.round(avgRating));
    
    // Atualiza descrição do produto
    if (!product.description) product.description = "";
    const ratingText = `\n\n${stars} ${avgRating.toFixed(1)}/5.0 (${productReviews.length} avaliação${productReviews.length > 1 ? "ões" : ""})`;
    if (!product.description.includes("⭐")) {
      product.description += ratingText;
    } else {
      // Substitui avaliação anterior
      product.description = product.description.replace(/\n\n⭐.*/, ratingText);
    }
    
    localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  }
}

window.setReviewRating = function (rating) {
  reviewCtx.rating = rating;
  for (let i = 1; i <= 5; i++) {
    const star = document.getElementById(`reviewStar${i}`);
    if (star) {
      star.textContent = i <= rating ? "★" : "☆";
      star.style.color = i <= rating ? "#f5b400" : "#666";
    }
  }
};

window.submitReview = function () {
  if (reviewCtx.rating === 0) {
    alert("Por favor, selecione uma avaliação (estrelas).");
    return;
  }
  
  const reviewText = (document.getElementById("reviewText")?.value || "").trim();
  const orders = getAllOrders();
  const order = orders.find((o) => o.id === reviewCtx.orderId);
  
  if (!order) {
    alert("Pedido não encontrado.");
    return;
  }
  
  // Salva avaliação
  updateProductDescriptionInMarketplace(order.id, reviewCtx.rating, reviewText);
  
  // Marca pedido como avaliado
  order.reviewed = true;
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
  
  const modalEl = document.getElementById("reviewModal");
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  modal?.hide();
  
  renderOrders();
  alert("Avaliação enviada com sucesso! ✅ A avaliação foi adicionada à descrição do produto no marketplace.");
};

function reviewProduct(id) {
  const orders = getAllOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) {
    alert("Pedido não encontrado.");
    return;
  }
  if (order.status !== "ENTREGUE") {
    alert("Você só pode avaliar produtos após a entrega.");
    return;
  }
  reviewCtx.orderId = id;
  reviewCtx.productId = order.id;
  reviewCtx.rating = 0;
  
  // Reset stars
  for (let i = 1; i <= 5; i++) {
    const star = document.getElementById(`reviewStar${i}`);
    if (star) {
      star.textContent = "☆";
      star.style.color = "#666";
    }
  }
  
  const reviewText = document.getElementById("reviewText");
  if (reviewText) reviewText.value = "";
  
  const modalEl = document.getElementById("reviewModal");
  if (modalEl) {
    const productNameEl = document.getElementById("reviewProductName");
    if (productNameEl) productNameEl.textContent = order.name;
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function requestReturn(id) {
  const orders = getAllOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return;

  if (order.status !== "ENTREGUE") {
    alert("Você só pode devolver após a entrega.");
    return;
  }

  const deliveredISO = order.delivered || "";
  const todayISO = toISODate(new Date());
  const businessDaysAfterDelivery = deliveredISO ? businessDaysBetween(deliveredISO, todayISO) : Infinity;
  if (businessDaysAfterDelivery > 7) {
    alert("Prazo de devolução expirado. A devolução é permitida até 7 dias úteis após a entrega.");
    return;
  }

  if (!confirm("Solicitar devolução do pedido?")) return;

  order.status = "DEVOLVIDO";
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
  renderOrders();
}

function cancelOrder(id) {
  const orders = getAllOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return;

  if (order.status === "ENTREGUE") {
    alert("Não é possível cancelar após a entrega.");
    return;
  }
  if (order.status === "CANCELADO" || order.status === "DEVOLVIDO") return;

  if (!confirm("Cancelar este pedido?")) return;
  order.status = "CANCELADO";
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
  renderOrders();
}

function saveMarketplaceOrder(product) {
  const orders = getAllOrders();

  const newOrder = {
    id: "OF" + Date.now(),
    name: product.name || "Produto",
    category: product.category || "Marketplace",
    price: Number(product.price || 0),
    image: product.image || "./img/produto-default.png",
    status: "AGUARDANDO",
    date: toISODate(new Date()),
    delivered: "",
    trackStep: 1
  };

  orders.unshift(newOrder);
  localStorage.setItem(ORDERS_STORAGE, JSON.stringify(orders));
  renderOrders();
}

/* =========================
   TREINOS
   ========================= */
function renderWorkouts() {
  const root = document.getElementById("workoutAccDynamic");
  if (!root) return;

  const keys = Object.keys(state.workouts || {});
  keys.sort(); // A, B, C...
  const groups = keys.map((key) => ({ key, tag: `TREINO ${key}` }));

  if (!groups.length) {
    root.innerHTML = `
      <div class="text-muted" style="padding:10px 4px;">
        Nenhum treino cadastrado. Use “ADICIONAR TREINO” para criar seu primeiro treino.
      </div>
    `;
    bindRipple();
    return;
  }

  root.innerHTML = groups.map((g, idx) => {
    const wk = state.workouts[g.key];
    const collapseId = `wk_${g.key}`;
    const headId = `wk_head_${g.key}`;
    const rows = (wk.items || []).map((it, i) => `
      <tr>
        <td style="font-weight:900;color:rgba(255,255,255,.95)">${escHtml(it.name)}</td>
        <td style="color:rgba(var(--gold-glow), .92); font-weight:900">${escHtml(it.sets ?? "")}</td>
        <td style="color:rgba(var(--gold-glow), .92); font-weight:900">${escHtml(it.reps ?? "")}</td>
        <td style="color:rgba(var(--gold-glow), .78); font-weight:800">${escHtml(it.note ?? "")}</td>
        <td class="text-end">
          <button class="icon-btn btn-anim icon-mini" type="button"
            onclick="openEditExercise('${g.key}', ${i})" aria-label="Editar exercício">
            <i class="bi bi-pencil"></i>
          </button>

          <button class="icon-btn btn-anim icon-mini ms-2" type="button"
            onclick="removeExercise('${g.key}', ${i})" aria-label="Remover exercício">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");

    const mobileRows = (wk.items || []).map((it, i) => {
      const sets = String(it.sets ?? "").trim();
      const reps = String(it.reps ?? "").trim();
      const volume = [sets, reps].filter(Boolean).join("x");
      const note = String(it.note ?? "").trim();

      return `
        <div class="wk-mobile-row">
          <div class="wk-mobile-main">
            <span class="wk-mobile-name">${escHtml(it.name)}</span>
            ${volume ? `<span class="wk-mobile-volume">- ${escHtml(volume)}</span>` : ""}
            ${note ? `<span class="wk-mobile-note">${escHtml(note)}</span>` : ""}
          </div>

          <div class="wk-mobile-actions">
            <button class="icon-btn btn-anim icon-mini" type="button"
              onclick="openEditExercise('${g.key}', ${i})" aria-label="Editar exercício">
              <i class="bi bi-pencil"></i>
            </button>

            <button class="icon-btn btn-anim icon-mini" type="button"
              onclick="removeExercise('${g.key}', ${i})" aria-label="Remover exercício">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    const empty = `
      <tr>
        <td colspan="5" class="text-muted">Nenhum exercício cadastrado. Clique em “ADICIONAR EXERCÍCIO”.</td>
      </tr>
    `;

    return `
      <div class="accordion-item ${idx ? "mt-2" : ""}">
        <h2 class="accordion-header" id="${headId}">
          <button class="accordion-button collapsed" type="button"
            data-bs-toggle="collapse" data-bs-target="#${collapseId}">
            ${escHtml(wk.title)} <span class="ms-2 workout-tag">${g.tag}</span>
          </button>
        </h2>

        <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#workoutAccDynamic">
          <div class="accordion-body">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div class="text-muted">Edite sua lista: séries + repetições + observação.</div>
              <button class="btn btn-gold btn-anim btn-edit"
                onclick="openAddExercise('${g.key}')">ADICIONAR EXERCÍCIO</button>
            </div>

            <div class="workout-mobile-list d-lg-none">
              ${mobileRows || `<div class="text-muted">Nenhum exercício cadastrado. Clique em “ADICIONAR EXERCÍCIO”.</div>`}
            </div>

            <div class="table-responsive d-none d-lg-block">
              <table class="table table-dark table-borderless align-middle mb-0 table-workout">
                <thead>
                  <tr>
                    <th class="col-wk-ex">Exercício</th>
                    <th class="col-wk-series" style="width:110px">Séries</th>
                    <th class="col-wk-reps" style="width:140px">Repetições</th>
                    <th class="col-wk-obs">Obs.</th>
                    <th class="text-end col-wk-actions" style="width:220px">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || empty}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  bindRipple();
}

function sanitizeWorkoutKey(raw) {
  const k = String(raw || "").trim().toUpperCase();
  if (!k) return "";
  if (!/^[A-Z0-9]{1,6}$/.test(k)) return "";
  return k;
}

function getNextWorkoutKey() {
  const used = new Set(Object.keys(state.workouts || {}).map((k) => String(k).toUpperCase()));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const ch of alphabet) {
    if (!used.has(ch)) return ch;
  }

  let n = 1;
  while (used.has(`T${n}`)) n++;
  return `T${n}`;
}

window.openAddWorkout = function () {
  const keyInput = document.getElementById("inpNewWorkoutKey");
  const titleInput = document.getElementById("inpNewWorkoutTitle");
  if (keyInput) keyInput.value = getNextWorkoutKey();
  if (titleInput) titleInput.value = "";
  
  const modalEl = document.getElementById("addWorkoutModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
};

window.confirmAddWorkout = function () {
  const keyInput = document.getElementById("inpNewWorkoutKey");
  const titleInput = document.getElementById("inpNewWorkoutTitle");
  if (!titleInput) return;
  
  const key = sanitizeWorkoutKey(keyInput?.value?.trim()) || getNextWorkoutKey();
  if (!key) {
    alert("Código do treino inválido. Use letras/números (ex.: A, B, D).");
    return;
  }
  if (state.workouts[key]) {
    alert("Esse treino já existe.");
    return;
  }
  const title = titleInput.value.trim() || `Treino ${key}`;
  state.workouts[key] = { title, items: [] };
  saveWorkoutsToStorage();
  renderWorkouts();
  
  const modalEl = document.getElementById("addWorkoutModal");
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  modal?.hide();
  
  alert(`Treino ${key} adicionado! ✅`);
};

window.openRemoveWorkout = function () {
  const select = document.getElementById("selectWorkoutToRemove");
  if (!select) return;
  
  select.innerHTML = '<option value="">Selecione um treino...</option>';
  const keys = Object.keys(state.workouts || {}).sort();
  keys.forEach((k) => {
    const wk = state.workouts[k];
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} - ${wk.title || `Treino ${k}`}`;
    select.appendChild(opt);
  });
  
  const modalEl = document.getElementById("removeWorkoutModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
};

window.confirmRemoveWorkout = function () {
  const select = document.getElementById("selectWorkoutToRemove");
  if (!select) return;
  
  const key = select.value.trim();
  if (!key || !state.workouts[key]) {
    alert("Selecione um treino válido.");
    return;
  }
  
  const wk = state.workouts[key];
  if (!confirm(`Remover o treino ${key} (${wk.title}) inteiro?\n\n⚠️ Isso apagará todos os exercícios deste treino.`)) return;
  
  delete state.workouts[key];
  try {
    // Atualiza storage garantindo remoção consistente
    localStorage.setItem(getScopedStorageKey(WORKOUTS_STORAGE), JSON.stringify(state.workouts));
  } catch (e) {}
  renderWorkouts();
  saveWorkoutsToStorage();
  alert(`Treino ${key} removido! ✅`);
  
  const modalEl = document.getElementById("removeWorkoutModal");
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  modal?.hide();
};

function openAddExercise(workoutKey) {
  const title = document.getElementById("exerciseModalTitle");
  if (title) title.textContent = "Adicionar Exercício";

  document.getElementById("inpWorkoutKey").value = workoutKey;
  document.getElementById("inpExerciseIndex").value = "-1";

  document.getElementById("inpExName").value = "";
  document.getElementById("inpExSets").value = "3";
  document.getElementById("inpExReps").value = "12";
  document.getElementById("inpExNote").value = "";

  const modalEl = document.getElementById("exerciseModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
}

function openEditExercise(workoutKey, index) {
  const wk = state.workouts[workoutKey];
  const ex = wk?.items?.[index];
  if (!wk || !ex) return;

  const title = document.getElementById("exerciseModalTitle");
  if (title) title.textContent = "Editar Exercício";

  document.getElementById("inpWorkoutKey").value = workoutKey;
  document.getElementById("inpExerciseIndex").value = String(index);

  document.getElementById("inpExName").value = ex.name ?? "";
  document.getElementById("inpExSets").value = String(ex.sets ?? "");
  document.getElementById("inpExReps").value = String(ex.reps ?? "");
  document.getElementById("inpExNote").value = String(ex.note ?? "");

  const modalEl = document.getElementById("exerciseModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
}

function saveExercise() {
  const workoutKey = (document.getElementById("inpWorkoutKey")?.value || "").trim();
  const idxRaw = (document.getElementById("inpExerciseIndex")?.value || "").trim();

  const name = (document.getElementById("inpExName")?.value || "").trim();
  const setsRaw = (document.getElementById("inpExSets")?.value || "").trim();
  const reps = (document.getElementById("inpExReps")?.value || "").trim();
  const note = (document.getElementById("inpExNote")?.value || "").trim();

  if (!workoutKey || !state.workouts[workoutKey]) return;
  if (!name) {
    alert("Informe o nome do exercício.");
    return;
  }

  const sets = Math.max(1, parseInt(setsRaw || "1", 10));
  const exObj = { name, sets, reps, note };

  const idx = parseInt(idxRaw || "-1", 10);
  if (!Number.isFinite(idx) || idx < 0) {
    state.workouts[workoutKey].items.push(exObj);
  } else {
    state.workouts[workoutKey].items[idx] = exObj;
  }

  const modalEl = document.getElementById("exerciseModal");
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  modal?.hide();

  renderWorkouts();
  saveWorkoutsToStorage();
}

function removeExercise(workoutKey, index) {
  const wk = state.workouts[workoutKey];
  if (!wk || !wk.items?.[index]) return;

  const exName = wk.items[index].name || "exercício";
  if (!confirm(`Remover "${exName}"?`)) return;

  wk.items.splice(index, 1);
  renderWorkouts();
  saveWorkoutsToStorage();
}

function resetWorkouts() {
  if (!confirm("Resetar treinos para o padrão? (isso apaga suas alterações)")) return;
  state.workouts = {};
  renderWorkouts();
  saveWorkoutsToStorage();
}

// Limpa todos os treinos (para começar do zero)
window.clearWorkouts = function () {
  if (!confirm("Apagar todos os treinos e exercícios? Essa ação não pode ser desfeita.")) return;
  state.workouts = {};
  renderWorkouts();
  try {
    localStorage.removeItem(getScopedStorageKey(WORKOUTS_STORAGE));
    // remove chave legada, se existir
    localStorage.removeItem("ONEFIT_WORKOUTS");
  } catch (e) {}
  saveWorkoutsToStorage();
  alert("Treinos limpos.");
};

/* =========================
   AGENDA
   ========================= */
function monthLabel(d) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function getEventsForISO(iso) {
  return state.agenda.events.filter((ev) => isSameISO(ev.date, iso));
}

function renderAgendaCalendar() {
  const root = document.getElementById("agendaCalendar");
  const label = document.getElementById("agendaMonthLabel");
  if (!root || !label) return;

  root.innerHTML = "";

  const cursor = new Date(state.ui.monthCursor.getFullYear(), state.ui.monthCursor.getMonth(), 1);
  label.textContent = monthLabel(cursor);

  const startDow = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  for (let i = 0; i < startDow; i++) {
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.style.opacity = ".25";
    cell.innerHTML = `
      <div class="cal-top">
        <span class="day-number">—</span>
        <span class="badge-pill"> </span>
      </div>
    `;
    root.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const iso = toISODate(d);
    const evs = getEventsForISO(iso);

    const cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.dataset.iso = iso;

    if (state.ui.lastAddedISO && iso === state.ui.lastAddedISO) {
      cell.classList.add("is-highlight");
      setTimeout(() => {
        state.ui.lastAddedISO = "";
        cell.classList.remove("is-highlight");
      }, 1800);
    }

    const badgeText = evs.length ? `${evs.length} evento(s)` : "Livre";
    const badgeClass = evs.length ? "badge-pill is-busy" : "badge-pill";

    cell.innerHTML = `
      <div class="cal-top">
        <span class="day-number">${pad2(day)}</span>
        <span class="${badgeClass}">${badgeText}</span>
      </div>

      ${evs.map((ev) => `
        <div class="event">
          <strong>${escHtml(ev.title)}</strong><br>
          <small>${escHtml(ev.time)} • ${escHtml(ev.type)}</small>
        </div>
      `).join("")}
    `;

    root.appendChild(cell);

    // clique para detalhes do dia
    if (evs.length) {
      cell.style.cursor = "pointer";
      cell.addEventListener("click", () => openAgendaDayModal(iso));
    }
  }

  // também renderiza lista compacta (usada em tablet/celular via CSS)
  renderAgendaCompactList();
}

function renderAgendaCompactList() {
  const box = document.getElementById("agendaCompactList");
  if (!box) return;

  const cursor = state.ui.monthCursor;
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const from = `${y}-${pad2(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${pad2(m + 1)}-${pad2(lastDay)}`;

  const events = (state.agenda.events || [])
    .filter((ev) => ev?.date && ev.date >= from && ev.date <= to)
    .slice()
    .sort((a, b) => (a.date + " " + (a.time || "00:00")).localeCompare(b.date + " " + (b.time || "00:00")));

  if (!events.length) {
    box.innerHTML = `<div class="text-muted">Nenhum agendamento neste mês.</div>`;
    return;
  }

  // agrupa por dia
  const map = new Map();
  events.forEach((ev) => {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date).push(ev);
  });

  const days = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  box.innerHTML = days
    .map(([iso, evs]) => {
      return `
        <div class="day-group" style="margin-top:10px;">
          <div class="day-head">
            <div>
              <h6>${escHtml(niceDateLabel(iso))}</h6>
              <div class="text-muted small">${evs.length} evento(s)</div>
            </div>
            <button class="icon-btn btn-anim" type="button" onclick="openAgendaDayModal('${iso}')">
              Ver
            </button>
          </div>
          ${evs
            .slice()
            .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))
            .map((ev) => {
              const note = ev.note ? `<div class="text-muted small mt-1">${escHtml(ev.note)}</div>` : "";
              return `
                <div class="event-row">
                  <div class="event-main">
                    <strong>${escHtml(ev.time)} • ${escHtml(ev.title)}</strong>
                    <div class="event-sub">
                      <span class="chip">${escHtml(ev.type)}</span>
                    </div>
                    ${note}
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    })
    .join("");
}

function prevMonth() {
  const d = state.ui.monthCursor;
  state.ui.monthCursor = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  renderAgendaCalendar();
}

function nextMonth() {
  const d = state.ui.monthCursor;
  state.ui.monthCursor = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  renderAgendaCalendar();
}

/* =========================
   AGENDAMENTOS
   ========================= */
let slotsDayISO = addDaysISO(0);
let assessDayISO = addDaysISO(3);

function makeClassSlots(iso) {
  return [
    { time: "07:00", title: "Bike Indoor", coach: "Ana" },
    { time: "12:15", title: "Funcional", coach: "Marcos" },
    { time: "19:00", title: "Zumba", coach: "Lia" }
  ].map((s) => ({ ...s, date: iso }));
}

function makeAssessSlots(iso) {
  return [
    { time: "08:30", title: "Avaliação Física", pro: "Fisiologista" },
    { time: "10:00", title: "Avaliação Física", pro: "Fisiologista" },
    { time: "18:30", title: "Avaliação Física", pro: "Fisiologista" }
  ].map((s) => ({ ...s, date: iso }));
}

function setSlotsDay(addDays) {
  slotsDayISO = addDaysISO(addDays);
  const l = document.getElementById("slotsDayLabel");
  if (l) l.textContent = niceDateLabel(slotsDayISO);
  renderClassSlots();
}

function setAssessDay(addDays) {
  assessDayISO = addDaysISO(addDays);
  const l = document.getElementById("assessDayLabel");
  if (l) l.textContent = niceDateLabel(assessDayISO);
  renderAssessSlots();
}

function alreadyInAgenda(type, title, date, time) {
  return state.agenda.events.some((ev) =>
    ev.type === type && ev.title === title && ev.date === date && ev.time === time
  );
}

function addToAgenda(ev) {
  if (alreadyInAgenda(ev.type, ev.title, ev.date, ev.time)) {
    alert("Você já tem esse agendamento na sua agenda.");
    return;
  }

  const obj = { id: uid(), ...ev };
  state.agenda.events.push(obj);
  saveAgendaToStorage();
  syncAgendaEventToPro(obj);
  state.ui.lastAddedISO = ev.date;
  setMonthCursorToISO(ev.date);

  goView("view-agenda");
  renderAgendaCalendar();

  setTimeout(() => {
    const cell = document.querySelector(`.cal-cell[data-iso="${ev.date}"]`);
    cell?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 150);

  alert('Agendado com sucesso! ✅ Já entrou em "Minha agenda".');
}

function canCancelAgendaEvent(ev) {
  if (!ev?.date) return false;
  // comparação robusta por data (ignora hora), permitindo cancelar apenas datas futuras
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = String(ev.date).split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const evDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  return evDate.getTime() > today.getTime();
}

window.cancelAgendaEvent = function (id) {
  const ev = state.agenda.events.find((e) => String(e.id) === String(id));
  if (!ev) {
    alert("Agendamento não encontrado.");
    return;
  }
  
  if (!canCancelAgendaEvent(ev)) {
    const todayISO = toISODate(new Date());
    if (ev.date < todayISO) {
      alert("Não é possível cancelar agendamentos passados.");
    } else {
      alert("Não é possível cancelar este agendamento.");
    }
    return;
  }
  
  if (!confirm(`Cancelar este agendamento?\n\n${ev.title}\n${niceDateLabel(ev.date)} às ${ev.time || "—"}`)) return;

  state.agenda.events = state.agenda.events.filter((e) => String(e.id) !== String(id));
  saveAgendaToStorage();

  // remove também do profissional (se for aula)
  if (ev.type === "AULA") {
    const pro = loadProState();
    if (pro?.agenda?.events && Array.isArray(pro.agenda.events)) {
      const student = state.profile?.name || "Aluno";
      const key = `${ev.date}|${ev.time}|${ev.title}|${student}`;
      pro.agenda.events = pro.agenda.events.filter((p) => {
        const pk = `${p.dateISO}|${p.time}|${String(p.title || "").replace(` (Aluno: ${student})`, "")}|${p.studentName || student}`;
        return pk !== key;
      });
      saveProState(pro);
    }
  }

  renderAgendaCalendar();
  
  // Fecha o modal se estiver aberto
  const modalEl = document.getElementById("agendaDayModal");
  const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  modal?.hide();
  
  alert("Agendamento cancelado ✅");
};

window.openAgendaDayModal = function (iso) {
  // Garante ids antes de renderizar
  try {
    let changed = false;
    state.agenda.events = state.agenda.events.map((e) => {
      if (e && !e.id) {
        changed = true;
        return { id: uid(), ...e };
      }
      return e;
    });
    if (changed) saveAgendaToStorage();
  } catch (e) {}
  const evs = getEventsForISO(iso);
  const title = document.getElementById("agendaDayTitle");
  const sub = document.getElementById("agendaDaySub");
  const body = document.getElementById("agendaDayBody");
  if (title) title.textContent = `Agenda • ${niceDateLabel(iso)}`;
  if (sub) sub.textContent = `${evs.length} evento(s) neste dia.`;
  if (!body) return;

  if (!evs.length) {
    body.innerHTML = `<div class="text-muted">Nenhum evento neste dia.</div>`;
  } else {
    body.innerHTML = evs
      .slice()
      .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))
      .map((ev) => {
        const canCancel = canCancelAgendaEvent(ev);
        const note = ev.note ? `<div class="text-muted small mt-1">${escHtml(ev.note)}</div>` : "";
        return `
          <div class="slot" style="padding:10px 12px;">
            <div class="left">
              <strong>${escHtml(ev.time)} • ${escHtml(ev.title)}</strong>
              <span>${escHtml(ev.type)}${ev.coach ? ` • Prof: ${escHtml(ev.coach)}` : ""}</span>
              ${note}
            </div>
            <div class="d-flex align-items-center gap-2">
              ${canCancel ? `<button class="btn btn-sm agenda-cancel-btn" onclick="cancelAgendaEvent('${ev.id}')">Cancelar</button>` : `<span class="text-muted small">Não cancelável</span>`}
            </div>
          </div>
        `;
      })
      .join("");
  }

  const modalEl = document.getElementById("agendaDayModal");
  const modal = modalEl ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)) : null;
  modal?.show();
};

function renderClassSlots() {
  const root = document.getElementById("classSlots");
  if (!root) return;
  root.innerHTML = "";

  makeClassSlots(slotsDayISO).forEach((s) => {
    const wrap = document.createElement("div");
    wrap.className = "slot";

    const left = document.createElement("div");
    left.className = "left";
    left.innerHTML = `
      <strong>${escHtml(s.time)} • ${escHtml(s.title)}</strong>
      <span>Professor(a): ${escHtml(s.coach)}</span>
    `;

    const right = document.createElement("div");
    right.className = "d-flex align-items-center gap-2";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "AULA";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-gold btn-anim btn-edit";
    btn.textContent = "AGENDAR";

    btn.addEventListener("click", () => {
      addToAgenda({
        type: "AULA",
        title: s.title,
        date: s.date,
        time: s.time
      });
    });

    right.appendChild(tag);
    right.appendChild(btn);
    wrap.appendChild(left);
    wrap.appendChild(right);
    root.appendChild(wrap);
  });

  bindRipple();
}

function renderAssessSlots() {
  const root = document.getElementById("assessSlots");
  if (!root) return;
  root.innerHTML = "";

  makeAssessSlots(assessDayISO).forEach((s) => {
    const wrap = document.createElement("div");
    wrap.className = "slot";

    const left = document.createElement("div");
    left.className = "left";
    left.innerHTML = `
      <strong>${escHtml(s.time)} • ${escHtml(s.title)}</strong>
      <span>Responsável: ${escHtml(s.pro)}</span>
    `;

    const right = document.createElement("div");
    right.className = "d-flex align-items-center gap-2";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "AVALIAÇÃO";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-gold btn-anim btn-edit";
    btn.textContent = "AGENDAR";

    btn.addEventListener("click", () => {
      addToAgenda({
        type: "AVALIAÇÃO",
        title: "Avaliação Física",
        date: s.date,
        time: s.time
      });
    });

    right.appendChild(tag);
    right.appendChild(btn);
    wrap.appendChild(left);
    wrap.appendChild(right);
    root.appendChild(wrap);
  });

  bindRipple();
}

/* =========================
   INIT
   ========================= */
window.addEventListener("DOMContentLoaded", () => {
  if (!requireLoginAndHydrateProfile()) return;

  // payments persistence
  const storedPayments = loadPaymentsFromStorage();
  if (storedPayments) state.payments = storedPayments;

  seedOrders();
  // treinos persistence
  const storedWorkouts = loadWorkoutsFromStorage();
  if (storedWorkouts) state.workouts = storedWorkouts;
  // agenda persistence
  const storedAgenda = loadAgendaFromStorage();
  if (storedAgenda) state.agenda.events = storedAgenda;
  // Garante que todos eventos tenham id
  try {
    let mutated = false;
    state.agenda.events = (state.agenda.events || []).map((ev) => {
      if (!ev || typeof ev !== "object") return ev;
      if (!ev.id) {
        mutated = true;
        return { id: uid(), ...ev };
      }
      return ev;
    });
    if (mutated) saveAgendaToStorage();
  } catch (e) {}

  bindNavClicks();
  cloneMenuToMobile();
  bindRipple();
  initOrdersFilters();

  // modal pagamento (Histórico): binds
  const histCardNumber = document.getElementById("histCardNumber");
  const histCardExp = document.getElementById("histCardExp");
  const histCardCvv = document.getElementById("histCardCvv");
  if (histCardNumber) histCardNumber.addEventListener("input", () => (histCardNumber.value = maskCardNumber(histCardNumber.value)));
  if (histCardExp) histCardExp.addEventListener("input", () => (histCardExp.value = histNormalizeExp(histCardExp.value)));
  if (histCardCvv) histCardCvv.addEventListener("input", () => (histCardCvv.value = digitsOnly(histCardCvv.value).slice(0, 4)));

  const planModalEl = document.getElementById("planModal");
  if (planModalEl) {
    renderPlanChoices();
    planModalEl.addEventListener("show.bs.modal", () => {
      renderPlanChoices();
      syncPlanModalState();
    });
  }

  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "inpAvatar") {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        state.profile.avatarDataUrl = String(reader.result || "");
        hydrateProfile();
      };
      reader.readAsDataURL(file);
    }
  });

  setCurrentPlan(state.currentPlan);
  hydrateProfile();
  calculateIMC();
  animateProfileProgress();

  renderPayments();
  renderCashback();
  renderAgendaCalendar();
  renderOrders();

  const sdl = document.getElementById("slotsDayLabel");
  const adl = document.getElementById("assessDayLabel");
  if (sdl) sdl.textContent = niceDateLabel(slotsDayISO);
  if (adl) adl.textContent = niceDateLabel(assessDayISO);

  renderClassSlots();
  renderAssessSlots();

  loadViewFromHash();

  setTimeout(() => {
    const activeView = document.querySelector(".view.is-active");
    activeView?.querySelectorAll(".js-stagger").forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), 80 * i);
    });
  }, 30);

  setTimeout(() => {
    renderCashbackCard();
    renderMiniKpis();
  }, 120);
});

window.addEventListener("hashchange", loadViewFromHash);

let paymentsResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(paymentsResizeTimer);
  paymentsResizeTimer = setTimeout(() => {
    renderPayments();
    renderCashback();
  }, 120);
});