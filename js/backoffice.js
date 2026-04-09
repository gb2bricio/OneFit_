/* ========================= STORAGE KEYS ========================= */
const STORAGE_PRODUCTS_KEY = 'ONEFIT_PRODUCTS';
const STORAGE_USER_PAYMENTS_KEY = 'ONEFIT_USER_PAYMENTS_V1';
const STORAGE_ENROLLMENTS_KEY = 'ONEFIT_ENROLLMENTS_V1';
const STORAGE_PRESENCE_KEY = 'ONEFIT_BACKOFFICE_PRESENCE_V1';
const publicCatalog = window.ONEFIT_PUBLIC_CATALOG;

/* ========================= STATE (DEMO) ========================= */
let state = {
  users: [],
  payments: [],
  cashbackMovements: [],
  presence: [],
  staff: [],
  plans: [],
  products: [],
  tokensCommercialized: 0,
  ui: {
    viewMeta: {
      "view-overview": { title:"Visão geral", sub:"KPIs rápidos para operação do backoffice." },
      "view-users":    { title:"Usuários", sub:"Cadastro, status, matrícula e contrato." },
      "view-payments": { title:"Pagamentos", sub:"Filtros por tipo + histórico detalhado." },
      "view-cashback": { title:"Cashbacks", sub:"Crédito, débito, massa e controle." },
      "view-access":   { title:"Acessos", sub:"Liberação/bloqueio e presenças por usuário." },
      "view-products": { title:"Produtos", sub:"Cadastro de itens do marketplace, foto, desconto, cashback e estoque." },
      "view-plans":    { title:"Mensalidades", sub:"Cadastro de planos exibidos na home e na matrícula." },
      "view-staff":    { title:"Professores", sub:"Cadastro de profissionais e status." }
    }
  }
};

/* ========================= UTIL ========================= */
function pad2(n){ return String(n).padStart(2,'0'); }

function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function escHtml(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function formatBRL(n){
  const v = Number(n || 0);
  return v.toLocaleString('pt-BR',{ minimumFractionDigits:2, maximumFractionDigits:2 });
}

function parseISODate(iso){
  if (!iso) return null;
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m-1, d);
}

function inRangeISO(iso, fromISO, toISO){
  const d = parseISODate(iso);
  if (!d) return false;
  const from = fromISO ? parseISODate(fromISO) : null;
  const to = toISO ? parseISODate(toISO) : null;
  if (from && d < from) return false;
  if (to){
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23,59,59,999);
    if (d > end) return false;
  }
  return true;
}

function genId(prefix){
  return prefix + Math.floor(Math.random()*9_000_000 + 1_000_000);
}

function badge(status){
  let bg = 'rgba(255,255,255,.10)', color='#fff';
  if (status === 'ATIVO' || status === 'LIBERADO' || status === 'DISPONIVEL') {
    bg = 'rgba(46, 204, 113, .85)';
    color='#000';
  }
  if (status === 'SUSPENSO' || status === 'BLOQUEADO' || status === 'INDISPONIVEL') {
    bg = 'rgba(231, 76, 60, .85)';
    color='#000';
  }

  return `<span class="badge" style="background:${bg}; color:${color}; font-weight:900;">${escHtml(status)}</span>`;
}

function daysAgoISO(n){
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function closeModal(id){
  const el = document.getElementById(id);
  if (!el) return;
  let inst = bootstrap.Modal.getInstance(el);
  if (!inst) inst = new bootstrap.Modal(el);
  inst.hide();
}

function safeJsonParse(v, fallback){
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function parseBRDateToISO(brDate){
  const [dd, mm, yyyy] = String(brDate || '').split('/').map(Number);
  if (!dd || !mm || !yyyy) return '';
  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
}

function onlyDigitsEnrollment(str){
  return String(str || '').replace(/\D/g, '');
}

function addMonthsToISO(isoDate, monthsToAdd){
  const [y, m, d] = String(isoDate || '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return todayISO();
  const src = new Date(y, m - 1, d);
  const targetMonthDate = new Date(src.getFullYear(), src.getMonth() + monthsToAdd, 1);
  const lastDay = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
  const day = Math.min(src.getDate(), lastDay);
  const out = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), day);
  return `${out.getFullYear()}-${pad2(out.getMonth() + 1)}-${pad2(out.getDate())}`;
}

function enrollmentPlanNote(rec){
  const label = rec?.plano?.label || rec?.plano?.nome || '';
  const key = rec?.plano?.key ? ` (${rec.plano.key})` : '';
  if (!label) return 'Matrícula online';
  return `Plano: ${label}${key} — matrícula online`;
}

function mergeEnrollmentsFromStorage(){
  const list = safeJsonParse(localStorage.getItem(STORAGE_ENROLLMENTS_KEY) || '[]', []);
  if (!Array.isArray(list) || !list.length) return;

  const byEmail = new Map();
  list.forEach((rec) => {
    if (!rec || typeof rec !== 'object') return;
    const email = String(rec.email || '').trim().toLowerCase();
    if (!email) return;
    const prev = byEmail.get(email);
    const t = new Date(rec.criadoEm || 0).getTime();
    if (!prev || t >= new Date(prev.criadoEm || 0).getTime()) byEmail.set(email, rec);
  });

  for (const rec of byEmail.values()){
    const email = String(rec.email || '').trim().toLowerCase();
    const cpfDigits = onlyDigitsEnrollment(rec.cpfNumerico || rec.cpf || '');
    const exists = state.users.find((u) => {
      const uEmail = String(u.email || '').trim().toLowerCase();
      const uCpf = onlyDigitsEnrollment(u.cpf || '');
      if (uEmail === email) return true;
      if (cpfDigits.length === 11 && uCpf === cpfDigits) return true;
      return false;
    });

    if (exists){
      exists.note = enrollmentPlanNote(rec);
      continue;
    }

    const maxId = state.users.reduce((acc, u) => Math.max(acc, Number(u.id) || 0), 1000);
    const newId = String(maxId + 1);
    const enrollISO = String(rec.criadoEm || new Date().toISOString()).slice(0, 10);
    const months = Math.max(1, Number(rec.plano?.cycleMonths || 1));
    const contractEnd = addMonthsToISO(enrollISO, months);

    state.users.push({
      id: newId,
      name: rec.nome || 'Aluno',
      email,
      cpf: rec.cpf || '',
      status: 'ATIVO',
      enrollAt: enrollISO,
      contractEnd,
      access: 'LIBERADO',
      cashback: 0,
      note: enrollmentPlanNote(rec),
    });

    if (rec.pagamento && String(rec.pagamento.status || '').toUpperCase() === 'PAGO'){
      const payISO = String(rec.pagamento.pagoEm || rec.criadoEm || '').slice(0, 10) || enrollISO;
      const amount = Number(rec.plano?.valor || 0);
      const payType = inferPayType(rec.pagamento.metodo);
      state.payments.unshift({
        id: genId('PAY'),
        date: payISO,
        type: payType,
        amount,
        userId: newId,
        note: `Matrícula — ${rec.plano?.label || rec.plano?.nome || 'Plano'}`,
      });
    }
  }
}

function normalizeUserId(value){
  return String(value ?? '')
    .replace(/#/g, '')
    .trim();
}

function inferPayType(method){
  const m = String(method || '').toUpperCase();
  if (m.includes('PIX')) return 'PIX';
  if (m.includes('ASSINATURA')) return 'CREDITO';
  if (m.includes('CART') || m.includes('CRÉDITO') || m.includes('CREDITO')) return 'CREDITO';
  if (m.includes('DEBIT')) return 'DEBITO';
  if (m.includes('BOLETO')) return 'BOLETO';
  return 'PIX';
}

function resolveExternalUserId(){
  const cadastro = safeJsonParse(localStorage.getItem('usuarioCadastrado') || 'null', null);
  const email = String(cadastro?.email || '').toLowerCase();
  const byEmail = state.users.find((u) => String(u.email || '').toLowerCase() === email);
  if (byEmail) return byEmail.id;
  return '1001';
}

function readExternalUserPayments(){
  const arr = safeJsonParse(localStorage.getItem(STORAGE_USER_PAYMENTS_KEY) || '[]', []);
  if (!Array.isArray(arr)) return [];
  const userId = resolveExternalUserId();
  return arr
    .filter((p) => String(p?.status || '').toUpperCase() === 'PAGA')
    .map((p, i) => {
      const isoDate = parseBRDateToISO(p.paidOn || '');
      if (!isoDate) return null;
      const amount = Number(p.amount || 0);
      if (!amount) return null;
      const sourceKey = `${p.month || ''}|${p.paidOn || ''}|${amount}|${p.metodo || ''}|${i}`;
      return {
        id: `EXT-USR-${btoa(unescape(encodeURIComponent(sourceKey))).replace(/=/g, '').slice(0, 18)}`,
        date: isoDate,
        type: inferPayType(p.metodo),
        amount,
        userId,
        note: `[Perfil do aluno] ${p.month || 'Mensalidade'}`
      };
    })
    .filter(Boolean);
}

function savePresenceStorage(){
  try {
    localStorage.setItem(STORAGE_PRESENCE_KEY, JSON.stringify(state.presence));
  } catch (err) {
    console.error('Falha ao salvar presencas no localStorage:', err);
    alert('Nao foi possivel salvar no navegador. Verifique as permissoes/espaco e tente novamente.');
    throw err;
  }
}

function loadPresenceStorage(){
  const raw = localStorage.getItem(STORAGE_PRESENCE_KEY);
  if (raw === null) return null;
  const items = safeJsonParse(raw, []);
  if (!Array.isArray(items)) return [];
  return items
    .filter((p) => p && p.date && p.userId)
    .map((p) => ({
      id: String(p.id || genId('PR')),
      date: String(p.date),
      userId: normalizeUserId(p.userId),
      note: String(p.note || '')
    }));
}

/* ========================= PRODUCTS UTIL ========================= */
function productFinalPrice(product){
  const price = Number(product?.price || 0);
  const discount = Number(product?.discount || 0);
  const finalValue = price - (price * discount / 100);
  return Math.max(0, finalValue);
}

function normalizeProductAvailability(product){
  const stock = Math.max(0, Number(product.stock || 0));
  const statusUpper = String(product.status || '').toUpperCase();
  const keepManualUnavailable = product.available === false || statusUpper === 'INDISPONIVEL';
  product.stock = stock;
  product.available = stock > 0 && !keepManualUnavailable;
  product.status = product.available ? 'DISPONIVEL' : 'INDISPONIVEL';
  product.finalPrice = productFinalPrice(product);
  return product;
}

function saveProductsStorage(){
  const payload = state.products.map(p => normalizeProductAvailability({ ...p }));
  localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(payload));
}

function loadProductsStorage(){
  const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
  const items = safeJsonParse(raw, []);
  if (!Array.isArray(items)) return [];
  return items.map(p => normalizeProductAvailability({ ...p }));
}

function syncProductsToMarketplaceStorage(showAlert = false){
  saveProductsStorage();
  if (showAlert) alert('Produtos sincronizados com sucesso no localStorage do marketplace.');
}

function productImageHtml(product){
  if (product.image){
    return `<img src="${escHtml(product.image)}" class="product-image-thumb" alt="${escHtml(product.name)}">`;
  }
  return `<div class="product-image-fallback">IMG</div>`;
}

function getProductById(productId){
  return state.products.find(p => p.id === productId);
}

/* ========================= PUBLIC CATALOG ========================= */
function loadPublicStaffStorage(){
  return publicCatalog ? publicCatalog.getStaff() : [];
}

function savePublicStaffStorage(){
  if (!publicCatalog) return;
  state.staff = publicCatalog.saveStaff(state.staff);
}

function loadPublicPlansStorage(){
  return publicCatalog ? publicCatalog.getPlans() : [];
}

function savePublicPlansStorage(){
  if (!publicCatalog) return;
  state.plans = publicCatalog.savePlans(state.plans);
}

function getPlanById(planId){
  return state.plans.find(plan => plan.key === planId);
}

/* ========================= RIPPLE ========================= */
function bindRipple(){
  document.querySelectorAll('.btn-anim').forEach(btn=>{
    if (btn.dataset.rippleBound === '1') return;
    btn.dataset.rippleBound = '1';
    btn.addEventListener('click', function(e){
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const s = document.createElement('span');
      s.className = 'ripple-span';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (x - size/2) + 'px';
      s.style.top = (y - size/2) + 'px';
      this.appendChild(s);
      setTimeout(()=> s.remove(), 650);
    });
  });
}

/* ========================= NAV ========================= */
function setStageMeta(viewId){
  const meta = state.ui.viewMeta[viewId] || { title:"Backoffice", sub:"" };
  const stageTitleEl = document.getElementById('stageTitle');
  const stageSubEl = document.getElementById('stageSub');
  if (stageTitleEl) stageTitleEl.textContent = meta.title;
  if (stageSubEl) stageSubEl.textContent = meta.sub;
}

function activateNav(viewId){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
  document.getElementById(viewId)?.classList.add('is-active');

  document.querySelectorAll('.nav-itemx').forEach(b => {
    b.classList.toggle('is-active', b.dataset.view === viewId);
  });

  setStageMeta(viewId);

  if (location.hash.replace('#','') !== viewId) location.hash = viewId;

  document.getElementById(viewId)?.querySelectorAll('.js-stagger')?.forEach((node, i) => {
    node.classList.remove('in');
    setTimeout(() => node.classList.add('in'), 80 * i);
  });

  if (viewId === 'view-overview') setTimeout(renderOverview, 60);
  if (viewId === 'view-users') setTimeout(renderUsers, 60);
  if (viewId === 'view-payments') setTimeout(renderPayments, 60);
  if (viewId === 'view-cashback') setTimeout(renderCashback, 60);
  if (viewId === 'view-access') setTimeout(renderAccess, 60);
  if (viewId === 'view-products') setTimeout(renderProducts, 60);
  if (viewId === 'view-plans') setTimeout(renderPlans, 60);
  if (viewId === 'view-staff') setTimeout(renderStaff, 60);
}

function goView(viewId){
  activateNav(viewId);
  const ocEl = document.getElementById('mobileMenu');
  if (ocEl){
    const oc = bootstrap.Offcanvas.getInstance(ocEl);
    oc?.hide();
  }
}

function bindNavClicks(){
  document.querySelectorAll('#navRail .nav-itemx').forEach(btn => {
    btn.addEventListener('click', () => goView(btn.dataset.view));
  });
}

function cloneMenuToMobile(){
  const desktopBtns = [...document.querySelectorAll('#navRail .nav-itemx')];
  const mobile = document.getElementById('navRailMobile');
  mobile.innerHTML = '';
  desktopBtns.forEach(btn => {
    const clone = btn.cloneNode(true);
    clone.addEventListener('click', () => goView(clone.dataset.view));
    mobile.appendChild(clone);
  });
}

function loadViewFromHash(){
  const h = (location.hash || '').replace('#','').trim();
  const viewId = (h && document.getElementById(h)) ? h : 'view-overview';
  activateNav(viewId);
}

/* ========================= DEMO DATA ========================= */
function seedDemo(){
  state.users = [
    { id:'1001', name:'Rodrigo Mielli', email:'rodrigo@email.com', cpf:'123.456.789-10', status:'ATIVO', enrollAt: daysAgoISO(120), contractEnd: daysAgoISO(-60), access:'LIBERADO', cashback: 87.50, note:'' },
    { id:'1002', name:'Ana Souza', email:'ana@email.com', cpf:'987.654.321-00', status:'ATIVO', enrollAt: daysAgoISO(30), contractEnd: daysAgoISO(90), access:'LIBERADO', cashback: 12.00, note:'Plano anual' },
    { id:'1003', name:'Marcos Lima', email:'marcos@email.com', cpf:'111.222.333-44', status:'SUSPENSO', enrollAt: daysAgoISO(200), contractEnd: daysAgoISO(-5), access:'BLOQUEADO', cashback: 0.00, note:'Inadimplência' },
    { id:'1004', name:'Lia Santos', email:'lia@email.com', cpf:'555.666.777-88', status:'INATIVO', enrollAt: daysAgoISO(400), contractEnd: daysAgoISO(10), access:'BLOQUEADO', cashback: 3.50, note:'' },
  ];

  state.payments = [
    { id: genId('PAY'), date: daysAgoISO(3), type:'PIX', amount:119.90, userId:'1001', note:'Mensalidade' },
    { id: genId('PAY'), date: daysAgoISO(18), type:'CREDITO', amount:119.90, userId:'1002', note:'Mensalidade' },
    { id: genId('PAY'), date: daysAgoISO(28), type:'BOLETO', amount:119.90, userId:'1003', note:'Mensalidade' },
    { id: genId('PAY'), date: daysAgoISO(40), type:'DEBITO', amount:119.90, userId:'1001', note:'Mensalidade' },
  ];

  state.cashbackMovements = [
    { id: genId('CB'), date: daysAgoISO(3), type:'CREDITO', amount: 12.00, userId:'1001', reason:'Bônus pontualidade' },
    { id: genId('CB'), date: daysAgoISO(18), type:'CREDITO', amount: 6.00, userId:'1002', reason:'Campanha' },
    { id: genId('CB'), date: daysAgoISO(28), type:'DEBITO', amount: 5.00, userId:'1001', reason:'Uso em compra' },
  ];

  state.presence = [
    { id: genId('PR'), date: daysAgoISO(1), userId:'1001', note:'' },
    { id: genId('PR'), date: daysAgoISO(2), userId:'1001', note:'' },
    { id: genId('PR'), date: daysAgoISO(5), userId:'1002', note:'' },
    { id: genId('PR'), date: daysAgoISO(8), userId:'1002', note:'' },
    { id: genId('PR'), date: daysAgoISO(12), userId:'1003', note:'' },
  ];

  state.staff = publicCatalog ? publicCatalog.getDefaultStaff() : [];

  state.plans = publicCatalog ? publicCatalog.getDefaultPlans() : [];

  state.products = [
    normalizeProductAvailability({
      id: 'PROD1001',
      name: 'Whey Protein 900g',
      description: 'Suplemento proteico premium sabor baunilha.',
      price: 199.90,
      discount: 10,
      cashback: 15.00,
      stock: 18,
      image: '',
    }),
    normalizeProductAvailability({
      id: 'PROD1002',
      name: 'Creatina 300g',
      description: 'Creatina monohidratada para força e performance.',
      price: 89.90,
      discount: 5,
      cashback: 6.00,
      stock: 42,
      image: '',
    }),
    normalizeProductAvailability({
      id: 'PROD1003',
      name: 'Garrafa Térmica ONE FIT',
      description: 'Garrafa térmica personalizada da academia.',
      price: 59.90,
      discount: 0,
      cashback: 4.50,
      stock: 0,
      image: '',
    }),
  ];

  state.tokensCommercialized = 420;

  document.getElementById('payDateFrom').value = daysAgoISO(30);
  document.getElementById('payDateTo').value = todayISO();
  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString('pt-BR');

  saveProductsStorage();

  renderOverview();
  renderUsers();
  renderPayments();
  renderCashback();
  renderAccess();
  renderProducts();
  renderPlans();
  renderStaff();
  bindRipple();
}

/* ========================= OVERVIEW ========================= */
function sumPayments30d(){
  const from = daysAgoISO(30);
  return state.payments
    .filter(p => inRangeISO(p.date, from, todayISO()))
    .reduce((acc,p)=> acc + Number(p.amount||0), 0);
}

function countPresence30d(){
  const from = daysAgoISO(30);
  return state.presence.filter(x => inRangeISO(x.date, from, todayISO())).length;
}

function calcCbTotals(){
  let credited = 0, debited = 0;
  for (const m of state.cashbackMovements){
    const v = Number(m.amount||0);
    if (m.type === 'CREDITO') credited += v;
    if (m.type === 'DEBITO') debited += v;
  }
  const aggBalance = state.users.reduce((acc,u)=> acc + Number(u.cashback||0), 0);
  return { credited, debited, aggBalance };
}

function calcProductTotals(){
  const total = state.products.length;
  const available = state.products.filter(p => normalizeProductAvailability(p).status === 'DISPONIVEL').length;
  const unavailable = total - available;
  const units = state.products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
  const stockValue = state.products.reduce((acc, p) => acc + (productFinalPrice(p) * Number(p.stock || 0)), 0);
  return { total, available, unavailable, units, stockValue };
}

function renderOverview(){
  const activeUsers = state.users.filter(u => u.status === 'ATIVO').length;
  const accessOn = state.users.filter(u => u.access === 'LIBERADO').length;
  const accessOff = state.users.filter(u => u.access === 'BLOQUEADO').length;
  const staffCount = state.staff.filter(s => s.status === 'ATIVO').length;

  document.getElementById('kpiUsersActive').textContent = String(activeUsers);
  document.getElementById('kpiPayments30d').textContent = formatBRL(sumPayments30d());

  const cb = calcCbTotals();
  document.getElementById('kpiCbDistributed').textContent = formatBRL(cb.credited);
  const kpiTokens = document.getElementById('kpiTokens');
  if (kpiTokens) kpiTokens.textContent = String(state.tokensCommercialized);

  document.getElementById('kpiAccessOn').textContent = String(accessOn);
  document.getElementById('kpiAccessOff').textContent = String(accessOff);
  document.getElementById('kpiPresence30d').textContent = String(countPresence30d());
  document.getElementById('kpiStaff').textContent = String(staffCount);

  const products = calcProductTotals();
  document.getElementById('kpiProducts').textContent = String(products.total);
  document.getElementById('kpiProductsAvailable').textContent = String(products.available);
  document.getElementById('kpiProductsUnavailable').textContent = String(products.unavailable);
  document.getElementById('kpiStockValue').textContent = formatBRL(products.stockValue);
}

/* ========================= USERS (CRUD) ========================= */
function openUserModal(userId = null){
  const isEdit = !!userId;
  document.getElementById('userModalTitle').textContent = isEdit ? 'Editar Usuário' : 'Novo Usuário';

  const u = isEdit ? state.users.find(x => x.id === userId) : null;

  document.getElementById('inpUserId').value = u?.id || '';
  document.getElementById('inpUserName').value = u?.name || '';
  document.getElementById('inpUserEmail').value = u?.email || '';
  document.getElementById('inpUserCpf').value = u?.cpf || '';
  document.getElementById('inpUserStatus').value = u?.status || 'ATIVO';
  document.getElementById('inpUserEnrollAt').value = u?.enrollAt || todayISO();
  document.getElementById('inpUserContractEnd').value = u?.contractEnd || todayISO();
  document.getElementById('inpUserAccess').value = u?.access || 'LIBERADO';
  document.getElementById('inpUserCb').value = String(u?.cashback ?? 0);
  document.getElementById('inpUserNote').value = u?.note || '';

  const el = document.getElementById('userModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function saveUser(){
  const idExisting = (document.getElementById('inpUserId').value || '').trim();
  const name = (document.getElementById('inpUserName').value || '').trim();
  const email = (document.getElementById('inpUserEmail').value || '').trim();
  const cpf = (document.getElementById('inpUserCpf').value || '').trim();
  const status = document.getElementById('inpUserStatus').value;
  const enrollAt = document.getElementById('inpUserEnrollAt').value;
  const contractEnd = document.getElementById('inpUserContractEnd').value;
  const access = document.getElementById('inpUserAccess').value;
  const cashback = Number(document.getElementById('inpUserCb').value || 0);
  const note = (document.getElementById('inpUserNote').value || '').trim();

  if (!name || !email || !cpf){
    alert('Preencha nome, e-mail e CPF.');
    return;
  }
  if (!enrollAt || !contractEnd){
    alert('Informe matrícula e data final do contrato.');
    return;
  }

  if (idExisting){
    const u = state.users.find(x => x.id === idExisting);
    if (!u){ alert('Usuário não encontrado para edição.'); return; }
    Object.assign(u, { name, email, cpf, status, enrollAt, contractEnd, access, cashback, note });
  } else {
    const newId = String(Math.max(1000, ...state.users.map(u=>Number(u.id)||1000)) + 1);
    state.users.push({ id:newId, name, email, cpf, status, enrollAt, contractEnd, access, cashback, note });
  }

  closeModal('userModal');
  renderUsers();
  renderOverview();
}

function removeUser(userId){
  const u = state.users.find(x=>x.id===userId);
  if (!u) return;

  if (!confirm(`Remover usuário ${u.name} (ID ${u.id})?`)) return;

  state.users = state.users.filter(x=>x.id!==userId);
  state.payments = state.payments.filter(p=>p.userId!==userId);
  state.cashbackMovements = state.cashbackMovements.filter(m=>m.userId!==userId);
  state.presence = state.presence.filter(pr=>pr.userId!==userId);
  savePresenceStorage();

  renderUsers();
  renderPayments();
  renderCashback();
  renderAccess();
  renderOverview();
}

function toggleUserStatus(userId){
  const u = state.users.find(x=>x.id===userId);
  if (!u) return;
  u.status = (u.status === 'ATIVO') ? 'INATIVO' : 'ATIVO';
  if (u.status !== 'ATIVO') u.access = 'BLOQUEADO';
  renderUsers();
  renderAccess();
  renderOverview();
}

function actionIconsHtml({ onEdit, onDelete, editTitle="Editar", deleteTitle="Remover" }){
  return `
    <div class="actions-cell">
      ${onEdit ? `
      <button class="icon-action icon-edit btn-anim" type="button" title="${escHtml(editTitle)}" onclick="${onEdit}">
        <i class="bi bi-pencil-fill"></i>
      </button>
      ` : ''}
      <button class="icon-action icon-delete btn-anim" type="button" title="${escHtml(deleteTitle)}" onclick="${onDelete}">
        <i class="bi bi-trash-fill"></i>
      </button>
    </div>
  `;
}

function renderUsers(){
  const q = (document.getElementById('usersSearch').value || '').trim().toLowerCase();
  const st = document.getElementById('usersStatusFilter').value;

  let list = [...state.users];
  if (st !== 'ALL') list = list.filter(u => u.status === st);

  if (q){
    list = list.filter(u =>
      (u.id||'').toLowerCase().includes(q) ||
      (u.name||'').toLowerCase().includes(q) ||
      (u.email||'').toLowerCase().includes(q) ||
      (u.cpf||'').toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById('usersTbody');
  tbody.innerHTML = '';

  if (!list.length){
    tbody.innerHTML = `<tr class="users-empty-row"><td colspan="7" class="text-muted">Nenhum usuário encontrado.</td></tr>`;
    return;
  }

  list.forEach(u=>{
    const tr = document.createElement('tr');
    const nameRaw = String(u.name || '');
    const nameLen = Math.max(nameRaw.length, 1);
    const emailRaw = String(u.email || '');
    const emailLen = Math.max(emailRaw.length, 1);
    tr.innerHTML = `
      <td data-label="ID Usuário"><span class="badge-pill">#${escHtml(u.id)}</span></td>
      <td data-label="Nome">
        <div class="users-name-stack">
          <span class="users-name-primary" style="--name-len:${nameLen};">${escHtml(nameRaw)}</span>
          <span class="users-name-cpf">CPF: ${escHtml(u.cpf)}</span>
        </div>
      </td>
      <td data-label="E-mail" class="user-email-cell">
        <span class="user-email" style="--email-len:${emailLen};">${escHtml(emailRaw)}</span>
      </td>
      <td data-label="Status">${badge(u.status)}</td>
      <td data-label="Matrícula"><span class="users-cell-one-line">${escHtml(u.enrollAt)}</span></td>
      <td data-label="Contrato até"><span class="users-cell-one-line">${escHtml(u.contractEnd)}</span></td>
      <td data-label="Ações" class="text-end">
        <div class="actions-cell">
          <button class="icon-action icon-edit btn-anim" type="button" title="Editar" onclick="openUserModal('${escHtml(u.id)}')">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="icon-action btn-anim" type="button" title="${u.status === 'ATIVO' ? 'Inativar' : 'Ativar'}" onclick="toggleUserStatus('${escHtml(u.id)}')">
            <i class="bi ${u.status === 'ATIVO' ? 'bi-person-dash-fill' : 'bi-person-check-fill'}"></i>
          </button>
          <button class="icon-action icon-delete btn-anim" type="button" title="Remover" onclick="removeUser('${escHtml(u.id)}')">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  bindRipple();
}

/* ========================= PAYMENTS ========================= */
function openPaymentModal(payId = null){
  const isEdit = !!payId;
  document.getElementById('paymentModalTitle').textContent = isEdit ? 'Editar Pagamento' : 'Registrar Pagamento';

  const p = isEdit ? state.payments.find(x=>x.id===payId) : null;

  document.getElementById('inpPayId').value = p?.id || '';
  document.getElementById('inpPayDate').value = p?.date || todayISO();
  document.getElementById('inpPayType').value = p?.type || 'PIX';
  document.getElementById('inpPayAmount').value = String(p?.amount ?? 0);
  document.getElementById('inpPayUserId').value = p?.userId || '';
  document.getElementById('inpPayNote').value = p?.note || '';

  const el = document.getElementById('paymentModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function savePayment(){
  const idExisting = (document.getElementById('inpPayId').value || '').trim();
  const date = document.getElementById('inpPayDate').value;
  const type = document.getElementById('inpPayType').value;
  const amount = Number(document.getElementById('inpPayAmount').value || 0);
  const userId = (document.getElementById('inpPayUserId').value || '').trim();
  const note = (document.getElementById('inpPayNote').value || '').trim();

  if (!date || !type || !amount || !userId){
    alert('Preencha data, tipo, valor e ID do usuário.');
    return;
  }

  const u = state.users.find(x=>x.id===userId);
  if (!u){
    alert('ID de usuário não encontrado (cadastre o usuário antes).');
    return;
  }

  if (idExisting){
    const p = state.payments.find(x=>x.id===idExisting);
    if (!p){ alert('Pagamento não encontrado para edição.'); return; }
    Object.assign(p, { date, type, amount, userId, note });
  } else {
    state.payments.unshift({ id: genId('PAY'), date, type, amount, userId, note });
  }

  closeModal('paymentModal');
  renderPayments();
  renderOverview();
}

function removePayment(payId){
  const p = state.payments.find(x=>x.id===payId);
  if (!p) return;
  if (!confirm(`Remover pagamento ${p.id}?`)) return;
  state.payments = state.payments.filter(x=>x.id!==payId);
  renderPayments();
  renderOverview();
}

function renderPayments(){
  const type = document.getElementById('payTypeFilter').value;
  const userId = (document.getElementById('payUserIdFilter').value || '').trim();
  const from = document.getElementById('payDateFrom').value;
  const to = document.getElementById('payDateTo').value;

  const external = readExternalUserPayments();
  let list = [...state.payments, ...external];
  if (type !== 'ALL') list = list.filter(p => p.type === type);
  if (userId) list = list.filter(p => String(p.userId) === String(userId));
  if (from || to) list = list.filter(p => inRangeISO(p.date, from || null, to || null));

  const total = list.reduce((acc,p)=> acc + Number(p.amount||0), 0);
  document.getElementById('payTotalFiltered').textContent = formatBRL(total);
  document.getElementById('payCountFiltered').textContent = String(list.length);

  const tbody = document.getElementById('paymentsAdminTbody');
  tbody.innerHTML = '';

  if (!list.length){
    tbody.innerHTML = `<tr class="payments-empty-row"><td colspan="7" class="text-muted">Nenhum pagamento no filtro atual.</td></tr>`;
    return;
  }

  list.forEach(p=>{
    const tr = document.createElement('tr');
    const typeBadge = `<span class="badge-pill">${escHtml(p.type)}</span>`;
    const isExternal = String(p.id || '').startsWith('EXT-USR-');
    const actionHtml = isExternal
      ? `<span class="text-muted small">Sincronizado</span>`
      : actionIconsHtml({
          onEdit: `openPaymentModal('${escHtml(p.id)}')`,
          onDelete: `removePayment('${escHtml(p.id)}')`
        });

    tr.innerHTML = `
      <td data-label="ID Pagamento"><span class="badge-pill">${escHtml(p.id)}</span></td>
      <td data-label="Data">${escHtml(p.date)}</td>
      <td data-label="Tipo">${typeBadge}</td>
      <td data-label="Valor" style="font-weight:900;color:rgba(var(--gold-glow),.95)">R$ ${formatBRL(p.amount)}</td>
      <td data-label="ID Usuário"><span class="badge-pill">#${escHtml(p.userId)}</span></td>
      <td data-label="Observação" class="text-muted payment-note">${escHtml(p.note || '—')}</td>
      <td data-label="Ações" class="text-end">
        ${actionHtml}
      </td>
    `;
    tbody.appendChild(tr);
  });

  bindRipple();
}

/* ========================= CASHBACK ========================= */
function openCbModal(cbId = null){
  const isEdit = !!cbId;
  document.getElementById('cbModalTitle').textContent = isEdit ? 'Editar Movimento' : 'Lançar Movimento de Cashback';

  const m = isEdit ? state.cashbackMovements.find(x=>x.id===cbId) : null;

  document.getElementById('inpCbId').value = m?.id || '';
  document.getElementById('inpCbDate').value = m?.date || todayISO();
  document.getElementById('inpCbType').value = m?.type || 'CREDITO';
  document.getElementById('inpCbAmount').value = String(m?.amount ?? 0);
  document.getElementById('inpCbUserId').value = m?.userId || '';
  document.getElementById('inpCbReason').value = m?.reason || '';

  const el = document.getElementById('cbModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function openCbMassModal(){
  document.getElementById('inpCbMassDate').value = todayISO();
  document.getElementById('inpCbMassAmount').value = '5.00';
  document.getElementById('inpCbMassTarget').value = 'ATIVOS';
  document.getElementById('inpCbMassReason').value = 'Campanha (massa)';

  const el = document.getElementById('cbMassModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function applyCbToUser(userId, type, amount, date, reason){
  const u = state.users.find(x=>x.id===userId);
  if (!u) return false;

  const v = Math.max(0, Number(amount||0));

  if (type === 'CREDITO') u.cashback = Number(u.cashback||0) + v;
  else u.cashback = Math.max(0, Number(u.cashback||0) - v);

  state.cashbackMovements.unshift({ id: genId('CB'), date, type, amount: v, userId, reason });
  return true;
}

function saveCb(){
  const idExisting = (document.getElementById('inpCbId').value || '').trim();
  const date = document.getElementById('inpCbDate').value;
  const type = document.getElementById('inpCbType').value;
  const amount = Number(document.getElementById('inpCbAmount').value || 0);
  const userId = (document.getElementById('inpCbUserId').value || '').trim();
  const reason = (document.getElementById('inpCbReason').value || '').trim();

  if (!date || !type || !amount || !userId){
    alert('Preencha data, tipo, valor e ID do usuário.');
    return;
  }

  const u = state.users.find(x=>x.id===userId);
  if (!u){
    alert('ID de usuário não encontrado.');
    return;
  }

  if (idExisting){
    const old = state.cashbackMovements.find(x=>x.id===idExisting);
    if (!old){ alert('Movimento não encontrado.'); return; }

    const uu = state.users.find(x=>x.id===old.userId);
    if (uu){
      const vv = Number(old.amount||0);
      if (old.type === 'CREDITO') uu.cashback = Math.max(0, Number(uu.cashback||0) - vv);
      else uu.cashback = Number(uu.cashback||0) + vv;
    }

    state.cashbackMovements = state.cashbackMovements.filter(x=>x.id!==idExisting);
    applyCbToUser(userId, type, amount, date, reason);
  } else {
    applyCbToUser(userId, type, amount, date, reason);
  }

  closeModal('cbModal');
  renderCashback();
  renderUsers();
  renderOverview();
}

function removeCb(cbId){
  const m = state.cashbackMovements.find(x=>x.id===cbId);
  if (!m) return;

  if (!confirm(`Remover movimento ${m.id}? (demo: ajustará saldo)`)) return;

  const u = state.users.find(x=>x.id===m.userId);
  if (u){
    const v = Number(m.amount||0);
    if (m.type === 'CREDITO') u.cashback = Math.max(0, Number(u.cashback||0) - v);
    else u.cashback = Number(u.cashback||0) + v;
  }

  state.cashbackMovements = state.cashbackMovements.filter(x=>x.id!==cbId);

  renderCashback();
  renderUsers();
  renderOverview();
}

function applyCbMass(){
  const date = document.getElementById('inpCbMassDate').value;
  const amount = Number(document.getElementById('inpCbMassAmount').value || 0);
  const target = document.getElementById('inpCbMassTarget').value;
  const reason = (document.getElementById('inpCbMassReason').value || '').trim();

  if (!date || !amount || amount <= 0){
    alert('Informe data e valor por usuário.');
    return;
  }

  let targets = [...state.users];
  if (target === 'ATIVOS') targets = targets.filter(u=>u.status==='ATIVO');
  if (target === 'ACESSO_LIBERADO') targets = targets.filter(u=>u.access==='LIBERADO');

  if (!targets.length){
    alert('Nenhum usuário no alvo selecionado.');
    return;
  }

  if (!confirm(`Aplicar crédito de R$ ${formatBRL(amount)} para ${targets.length} usuário(s)?`)) return;

  targets.forEach(u => applyCbToUser(u.id, 'CREDITO', amount, date, reason || 'Crédito em massa'));

  closeModal('cbMassModal');
  renderCashback();
  renderUsers();
  renderOverview();
}

function creditAllActives(){ openCbMassModal(); }
function debitNegativeGuard(){ alert('OK (demo): saldos já são normalizados para não ficar negativo.'); }

function renderCashback(){
  const userId = (document.getElementById('cbUserIdFilter').value || '').trim();
  const type = document.getElementById('cbTypeFilter').value;

  let list = [...state.cashbackMovements];
  if (userId) list = list.filter(m=>String(m.userId)===String(userId));
  if (type !== 'ALL') list = list.filter(m=>m.type===type);

  const totals = calcCbTotals();
  document.getElementById('kpiCbTotal').textContent = formatBRL(totals.credited);
  document.getElementById('kpiCbDebited').textContent = formatBRL(totals.debited);
  document.getElementById('kpiCbBalanceAgg').textContent = formatBRL(totals.aggBalance);
  const kpiTokens2 = document.getElementById('kpiTokens2');
  if (kpiTokens2) kpiTokens2.textContent = String(state.tokensCommercialized);

  const tbody = document.getElementById('cbTbody');
  tbody.innerHTML = '';

  if (!list.length){
    tbody.innerHTML = `<tr class="cashback-empty-row"><td colspan="7" class="text-muted">Nenhum movimento encontrado.</td></tr>`;
    return;
  }

  list.forEach(m=>{
    const sign = (m.type === 'CREDITO') ? '+' : '-';
    const color = (m.type === 'CREDITO') ? 'rgba(46, 204, 113, .90)' : 'rgba(231, 76, 60, .90)';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="ID Mov."><span class="badge-pill">${escHtml(m.id)}</span></td>
      <td data-label="Data">${escHtml(m.date)}</td>
      <td data-label="Tipo"><span class="badge-pill">${escHtml(m.type)}</span></td>
      <td data-label="Valor" style="font-weight:1000;color:${color}">${sign} R$ ${formatBRL(m.amount)}</td>
      <td data-label="ID Usuário"><span class="badge-pill">#${escHtml(m.userId)}</span></td>
      <td data-label="Motivo" class="text-muted cashback-reason">${escHtml(m.reason || '—')}</td>
      <td data-label="Ações" class="text-end">
        ${actionIconsHtml({
          onDelete: `removeCb('${escHtml(m.id)}')`
        })}
      </td>
    `;
    tbody.appendChild(tr);
  });

  bindRipple();
}

/* ========================= ACCESS + PRESENCE ========================= */
function presenceCount30dForUser(userId){
  const from = daysAgoISO(30);
  const normalizedUserId = normalizeUserId(userId);
  return state.presence.filter((p) =>
    normalizeUserId(p.userId) === normalizedUserId && inRangeISO(p.date, from, todayISO())
  ).length;
}

function openPresenceModal(){
  document.getElementById('inpPresenceDate').value = todayISO();
  document.getElementById('inpPresenceUserId').value = '';
  document.getElementById('inpPresenceNote').value = '';

  const el = document.getElementById('presenceModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function savePresence(){
  const date = document.getElementById('inpPresenceDate').value;
  const rawUserInput = document.getElementById('inpPresenceUserId').value || '';
  const userId = normalizeUserId(rawUserInput);
  const note = (document.getElementById('inpPresenceNote').value || '').trim();

  if (!date || !userId){
    alert('Informe data e ID do usuário.');
    return;
  }

  let u = state.users.find((x) => normalizeUserId(x.id) === userId);
  if (!u){
    u = state.users.find((x) => {
      const n1 = normalizeUserId(x.id);
      const n2 = normalizeUserId(String(x.id).replace(/^#?/, ''));
      return n1 === userId || n2 === userId;
    });
  }
  if (!u){
    alert('ID de usuário não encontrado.');
    return;
  }

  state.presence.unshift({ id: genId('PR'), date, userId: normalizeUserId(u.id), note });
  try {
    savePresenceStorage();
  } catch (_e) {
    state.presence.shift();
    return;
  }

  alert('Presenca registrada com sucesso.');
  closeModal('presenceModal');
  renderAccess();
  renderOverview();
}

function toggleAccess(userId){
  const u = state.users.find(x=>x.id===userId);
  if (!u) return;
  u.access = (u.access === 'LIBERADO') ? 'BLOQUEADO' : 'LIBERADO';
  renderAccess();
  renderOverview();
  renderUsers();
}

function blockExpiredContracts(){
  const now = new Date();
  let n = 0;

  state.users.forEach(u=>{
    const end = parseISODate(u.contractEnd);
    if (end && end < new Date(now.getFullYear(), now.getMonth(), now.getDate())){
      if (u.access !== 'BLOQUEADO'){
        u.access = 'BLOQUEADO';
        n++;
      }
    }
  });

  alert(`Bloqueados ${n} usuário(s) por contrato vencido (demo).`);
  renderAccess();
  renderOverview();
  renderUsers();
}

function liberateAllActive(){
  let n = 0;
  state.users.forEach(u=>{
    if (u.status === 'ATIVO' && u.access !== 'LIBERADO'){
      u.access = 'LIBERADO';
      n++;
    }
  });

  alert(`Liberados ${n} usuário(s) ativos (demo).`);
  renderAccess();
  renderOverview();
  renderUsers();
}

function renderAccess(){
  const q = (document.getElementById('accessSearch').value || '').trim().toLowerCase();
  const f = document.getElementById('accessFilter').value;

  let list = [...state.users];
  if (f !== 'ALL') list = list.filter(u => u.access === f);

  if (q){
    list = list.filter(u =>
      (u.id||'').toLowerCase().includes(q) ||
      (u.name||'').toLowerCase().includes(q) ||
      (u.email||'').toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById('accessTbody');
  tbody.innerHTML = '';

  if (!list.length){
    tbody.innerHTML = `<tr class="access-empty-row"><td colspan="7" class="text-muted">Nenhum registro.</td></tr>`;
    return;
  }

  list.forEach(u=>{
    const pres = presenceCount30dForUser(u.id);
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td data-label="ID Usuário"><span class="badge-pill">#${escHtml(u.id)}</span></td>
      <td data-label="Nome" style="font-weight:900;color:rgba(255,255,255,.95)">${escHtml(u.name)}</td>
      <td data-label="Status">${badge(u.status)}</td>
      <td data-label="Acesso">${badge(u.access)}</td>
      <td data-label="Presenças (30d)" style="font-weight:1000;color:rgba(var(--gold-glow),.95)">${pres}</td>
      <td data-label="Contrato até">${escHtml(u.contractEnd || '—')}</td>
      <td data-label="Ações" class="text-end">
        <div class="actions-cell">
          <button class="icon-action btn-anim" type="button"
            title="${u.access === 'LIBERADO' ? 'Bloquear' : 'Liberar'}"
            onclick="toggleAccess('${escHtml(u.id)}')">
            <i class="bi ${u.access === 'LIBERADO' ? 'bi-lock-fill' : 'bi-unlock-fill'}"></i>
          </button>

          <button class="icon-action icon-edit btn-anim" type="button" title="Editar usuário"
            onclick="openUserModal('${escHtml(u.id)}')">
            <i class="bi bi-pencil-fill"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  bindRipple();
}

/* ========================= PRODUCTS ========================= */
function setProductPreview(imageSrc = ''){
  const img = document.getElementById('productPreviewImage');
  const empty = document.getElementById('productPreviewEmpty');

  if (imageSrc){
    img.src = imageSrc;
    img.style.display = 'block';
    empty.style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    empty.style.display = 'block';
  }
}

function updateProductPricePreview(){
  const price = Number(document.getElementById('inpProductPrice').value || 0);
  const discount = Number(document.getElementById('inpProductDiscount').value || 0);
  const finalValue = Math.max(0, price - (price * discount / 100));
  document.getElementById('productFinalPricePreview').textContent = formatBRL(finalValue);
}

function handleProductImageUrlInput(){
  const url = (document.getElementById('inpProductImageUrl').value || '').trim();
  document.getElementById('inpProductImageBase64').value = '';
  setProductPreview(url);
}

function handleProductImageUpload(event){
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e){
    const base64 = e.target?.result || '';
    document.getElementById('inpProductImageBase64').value = base64;
    document.getElementById('inpProductImageUrl').value = '';
    setProductPreview(base64);
  };
  reader.readAsDataURL(file);
}

function openProductModal(productId = null){
  const isEdit = !!productId;
  document.getElementById('productModalTitle').textContent = isEdit ? 'Editar Produto' : 'Novo Produto';

  const p = isEdit ? getProductById(productId) : null;

  document.getElementById('inpProductId').value = p?.id || '';
  document.getElementById('inpProductName').value = p?.name || '';
  document.getElementById('inpProductCategory').value = p?.category || 'SUPLEMENTOS';
  document.getElementById('inpProductPrice').value = String(p?.price ?? '');
  document.getElementById('inpProductDiscount').value = String(p?.discount ?? 0);
  document.getElementById('inpProductCashback').value = String(p?.cashback ?? 0);
  document.getElementById('inpProductStock').value = String(p?.stock ?? 0);
  document.getElementById('inpProductDescription').value = p?.description || '';
  document.getElementById('inpProductImageBase64').value = p?.image?.startsWith('data:') ? p.image : '';
  document.getElementById('inpProductImageUrl').value = p?.image && !p.image.startsWith('data:') ? p.image : '';
  document.getElementById('inpProductImageFile').value = '';

  setProductPreview(p?.image || '');
  updateProductPricePreview();

  const el = document.getElementById('productModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function saveProduct(){
  const idExisting = (document.getElementById('inpProductId').value || '').trim();
  const name = (document.getElementById('inpProductName').value || '').trim();
  const category = document.getElementById('inpProductCategory').value || 'SUPLEMENTOS';
  const price = Number(document.getElementById('inpProductPrice').value || 0);
  const discount = Number(document.getElementById('inpProductDiscount').value || 0);
  const cashback = Number(document.getElementById('inpProductCashback').value || 0);
  const stock = Math.max(0, Math.floor(Number(document.getElementById('inpProductStock').value || 0)));
  const description = (document.getElementById('inpProductDescription').value || '').trim();
  const imageBase64 = (document.getElementById('inpProductImageBase64').value || '').trim();
  const imageUrl = (document.getElementById('inpProductImageUrl').value || '').trim();
  const image = imageBase64 || imageUrl || '';

  if (!name){
    alert('Informe o nome do produto.');
    return;
  }

  if (price <= 0){
    alert('Informe um preço válido.');
    return;
  }

  if (discount < 0 || discount > 100){
    alert('O desconto deve estar entre 0 e 100%.');
    return;
  }

  if (cashback < 0){
    alert('O cashback não pode ser negativo.');
    return;
  }

  let productData = normalizeProductAvailability({
    id: idExisting || ('PROD' + Math.floor(Math.random()*900000 + 100000)),
    name,
    category,
    price,
    discount,
    cashback,
    stock,
    description,
    image
  });

  if (idExisting){
    const p = getProductById(idExisting);
    if (!p){
      alert('Produto não encontrado para edição.');
      return;
    }
    Object.assign(p, productData);
    normalizeProductAvailability(p);
  } else {
    state.products.unshift(productData);
  }

  syncProductsToMarketplaceStorage();
  closeModal('productModal');
  renderProducts();
  renderOverview();
}

function removeProduct(productId){
  const p = getProductById(productId);
  if (!p) return;

  if (!confirm(`Remover o produto "${p.name}"?`)) return;

  state.products = state.products.filter(x => x.id !== productId);
  syncProductsToMarketplaceStorage();
  renderProducts();
  renderOverview();
}

function toggleProductAvailability(productId){
  const p = getProductById(productId);
  if (!p) return;

  if (Number(p.stock || 0) <= 0){
    normalizeProductAvailability(p);
    alert('Esse produto está sem estoque e permanece indisponível no marketplace.');
  } else {
    p.available = !p.available;
    p.status = p.available ? 'DISPONIVEL' : 'INDISPONIVEL';
    p.finalPrice = productFinalPrice(p);
  }

  syncProductsToMarketplaceStorage();
  renderProducts();
  renderOverview();
}

function renderProducts(){
  state.products = state.products.map(p => normalizeProductAvailability(p));

  const q = (document.getElementById('productsSearch').value || '').trim().toLowerCase();
  const status = document.getElementById('productsStatusFilter').value;

  let list = [...state.products];

  if (status !== 'ALL'){
    list = list.filter(p => p.status === status);
  }

  if (q){
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById('productsTbody');
  tbody.innerHTML = '';

  if (!list.length){
    tbody.innerHTML = `<tr class="products-empty-row"><td colspan="10" class="text-muted">Nenhum produto encontrado.</td></tr>`;
  } else {
    list.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Foto">${productImageHtml(p)}</td>
        <td data-label="ID"><span class="badge-pill">${escHtml(p.id)}</span></td>
        <td data-label="Produto">
          <div style="font-weight:900;color:rgba(255,255,255,.95)">${escHtml(p.name)}</div>
          <div class="text-muted small">${escHtml(p.description || 'Sem descrição')}</div>
        </td>
        <td data-label="Preço">R$ ${formatBRL(p.price)}</td>
        <td data-label="Desconto">${formatBRL(p.discount)}%</td>
        <td data-label="Preço final" style="font-weight:900;color:rgba(var(--gold-glow),.95)">R$ ${formatBRL(productFinalPrice(p))}</td>
        <td data-label="Cashback">R$ ${formatBRL(p.cashback)}</td>
        <td data-label="Estoque" style="font-weight:900;color:${Number(p.stock) > 0 ? 'rgba(46, 204, 113, .90)' : 'rgba(231, 76, 60, .90)'}">${escHtml(p.stock)}</td>
        <td data-label="Status">${badge(p.status)}</td>
        <td data-label="Ações" class="text-end">
          <div class="actions-cell">
            <button class="icon-action ${p.status === 'DISPONIVEL' ? 'icon-pause' : 'icon-ok'} btn-anim"
              type="button"
              title="${p.status === 'DISPONIVEL' ? 'Marcar indisponível' : 'Marcar disponível'}"
              onclick="toggleProductAvailability('${escHtml(p.id)}')">
              <i class="bi ${p.status === 'DISPONIVEL' ? 'bi-pause-fill' : 'bi-check-circle-fill'}"></i>
            </button>

            <button class="icon-action icon-edit btn-anim" type="button" title="Editar" onclick="openProductModal('${escHtml(p.id)}')">
              <i class="bi bi-pencil-fill"></i>
            </button>

            <button class="icon-action icon-delete btn-anim" type="button" title="Remover" onclick="removeProduct('${escHtml(p.id)}')">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const totals = calcProductTotals();
  document.getElementById('kpiProducts2').textContent = String(totals.total);
  document.getElementById('kpiProductsAvailable2').textContent = String(totals.available);
  document.getElementById('kpiProductsUnavailable2').textContent = String(totals.unavailable);
  document.getElementById('kpiProductUnits2').textContent = String(totals.units);

  bindRipple();
}

/* ========================= PLANS ========================= */
function openPlanModal(planId = null){
  const isEdit = !!planId;
  document.getElementById('planModalTitle').textContent = isEdit ? 'Editar Plano' : 'Novo Plano';

  const plan = isEdit ? getPlanById(planId) : null;

  document.getElementById('inpPlanId').value = plan?.key || '';
  document.getElementById('inpPlanName').value = plan?.short || '';
  document.getElementById('inpPlanPrice').value = String(plan?.price ?? '');
  document.getElementById('inpPlanCycleMonths').value = String(plan?.cycleMonths ?? 1);
  document.getElementById('inpPlanStatus').value = plan?.status || 'ATIVO';
  document.getElementById('inpPlanBenefits').value = Array.isArray(plan?.benefits) ? plan.benefits.join('\n') : '';
  document.getElementById('inpPlanCtaText').value = plan?.ctaText || 'Matricule-se';

  const el = document.getElementById('planModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function savePlan(){
  const idExisting = (document.getElementById('inpPlanId').value || '').trim();
  const name = (document.getElementById('inpPlanName').value || '').trim();
  const price = Number(document.getElementById('inpPlanPrice').value || 0);
  const cycleMonths = Math.max(1, parseInt(document.getElementById('inpPlanCycleMonths').value || '1', 10) || 1);
  const status = document.getElementById('inpPlanStatus').value;
  const benefits = publicCatalog
    ? publicCatalog.normalizeBenefits(document.getElementById('inpPlanBenefits').value || '')
    : [];
  const ctaText = (document.getElementById('inpPlanCtaText').value || '').trim() || 'Matricule-se';

  if (!name){
    alert('Informe o nome do plano.');
    return;
  }

  if (price <= 0){
    alert('Informe um preço válido.');
    return;
  }

  if (!benefits.length){
    alert('Informe pelo menos um benefício.');
    return;
  }

  const key = idExisting || (publicCatalog
    ? publicCatalog.uniquePlanKey(name, state.plans, null)
    : name.toUpperCase());

  const planData = publicCatalog
    ? publicCatalog.normalizePlan({
        key,
        name,
        short: name,
        label: `Plano ${name}`,
        price,
        cycleMonths,
        benefits,
        ctaText,
        status
      })
    : { key, name, short: name, label: `Plano ${name}`, price, cycleMonths, benefits, ctaText, status };

  if (idExisting){
    const plan = getPlanById(idExisting);
    if (!plan){
      alert('Plano não encontrado.');
      return;
    }
    Object.assign(plan, planData);
  } else {
    state.plans.unshift(planData);
  }

  savePublicPlansStorage();
  closeModal('planModal');
  renderPlans();
}

function removePlan(planId){
  const plan = getPlanById(planId);
  if (!plan) return;

  if (!confirm(`Remover o plano "${plan.short}"?`)) return;

  state.plans = state.plans.filter(x => x.key !== planId);
  savePublicPlansStorage();
  renderPlans();
}

function togglePlanStatus(planId){
  const plan = getPlanById(planId);
  if (!plan) return;

  plan.status = plan.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
  savePublicPlansStorage();
  renderPlans();
}

function renderPlans(){
  const q = (document.getElementById('plansSearch').value || '').trim().toLowerCase();
  const st = document.getElementById('plansStatusFilter').value;

  let list = [...state.plans];
  if (st !== 'ALL') list = list.filter(plan => plan.status === st);

  if (q){
    list = list.filter(plan =>
      (plan.key || '').toLowerCase().includes(q) ||
      (plan.short || '').toLowerCase().includes(q) ||
      (plan.label || '').toLowerCase().includes(q) ||
      (plan.benefits || []).some(benefit => benefit.toLowerCase().includes(q))
    );
  }

  const tbody = document.getElementById('plansTbody');
  tbody.innerHTML = '';

  if (!list.length){
    tbody.innerHTML = `<tr class="plans-empty-row"><td colspan="7" class="text-muted">Nenhum plano encontrado.</td></tr>`;
    return;
  }

  list.forEach(plan => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Chave"><span class="badge-pill">${escHtml(plan.key)}</span></td>
      <td data-label="Plano">
        <div style="font-weight:900;color:rgba(255,255,255,.95)">${escHtml(plan.short)}</div>
        <div class="text-muted small">${escHtml(plan.label || '')}</div>
      </td>
      <td data-label="Preço" style="font-weight:900;color:rgba(var(--gold-glow),.95)">R$ ${formatBRL(plan.price)}</td>
      <td data-label="Ciclo">${escHtml(`${plan.cycleMonths} mes(es)`)}</td>
      <td data-label="Benefícios" class="text-muted plan-benefits">${escHtml((plan.benefits || []).join(' • ') || '—')}</td>
      <td data-label="Status">${badge(plan.status)}</td>
      <td data-label="Ações" class="text-end">
        <div class="actions-cell">
          <button class="icon-action ${plan.status === 'ATIVO' ? 'icon-pause' : 'icon-ok'} btn-anim"
            type="button"
            title="${plan.status === 'ATIVO' ? 'Inativar plano' : 'Ativar plano'}"
            onclick="togglePlanStatus('${escHtml(plan.key)}')">
            <i class="bi ${plan.status === 'ATIVO' ? 'bi-pause-fill' : 'bi-check-circle-fill'}"></i>
          </button>
          <button class="icon-action icon-edit btn-anim" type="button" title="Editar" onclick="openPlanModal('${escHtml(plan.key)}')">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="icon-action icon-delete btn-anim" type="button" title="Remover" onclick="removePlan('${escHtml(plan.key)}')">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  bindRipple();
}

/* ========================= STAFF ========================= */
function roleLabel(role){
  return publicCatalog ? publicCatalog.roleLabel(role) : String(role || 'Outro');
}

function setStaffPreview(imageSrc = ''){
  const img = document.getElementById('staffPreviewImage');
  const empty = document.getElementById('staffPreviewEmpty');

  if (imageSrc){
    img.src = imageSrc;
    img.style.display = 'block';
    empty.style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    empty.style.display = 'block';
  }
}

function handleStaffImageUrlInput(){
  const url = (document.getElementById('inpStaffImageUrl').value || '').trim();
  document.getElementById('inpStaffImageBase64').value = '';
  setStaffPreview(url);
}

function handleStaffImageUpload(event){
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e){
    const base64 = e.target?.result || '';
    document.getElementById('inpStaffImageBase64').value = base64;
    document.getElementById('inpStaffImageUrl').value = '';
    setStaffPreview(base64);
  };
  reader.readAsDataURL(file);
}

function staffImageHtml(staff){
  if (staff.photo){
    return `<img src="${escHtml(staff.photo)}" class="product-image-thumb" alt="${escHtml(staff.name)}">`;
  }
  return `<div class="product-image-fallback">PRO</div>`;
}

function openStaffModal(staffId = null){
  const isEdit = !!staffId;
  document.getElementById('staffModalTitle').textContent = isEdit ? 'Editar Profissional' : 'Novo Profissional';

  const s = isEdit ? state.staff.find(x=>x.id===staffId) : null;

  document.getElementById('inpStaffId').value = s?.id || '';
  document.getElementById('inpStaffName').value = s?.name || '';
  document.getElementById('inpStaffRole').value = s?.role || 'ED_FISICO';
  document.getElementById('inpStaffDisplayRole').value = s?.displayRole || '';
  document.getElementById('inpStaffDoc').value = s?.doc || '';
  document.getElementById('inpStaffStatus').value = s?.status || 'ATIVO';
  document.getElementById('inpStaffEmail').value = s?.email || '';
  document.getElementById('inpStaffPhone').value = s?.phone || '';
  document.getElementById('inpStaffWhatsapp').value = s?.whatsapp || '';
  document.getElementById('inpStaffSpecialty').value = s?.specialty || '';
  document.getElementById('inpStaffExperience').value = s?.experience || '';
  document.getElementById('inpStaffNote').value = s?.note || '';
  document.getElementById('inpStaffImageBase64').value = s?.photo?.startsWith('data:') ? s.photo : '';
  document.getElementById('inpStaffImageUrl').value = s?.photo && !s.photo.startsWith('data:') ? s.photo : '';
  document.getElementById('inpStaffImageFile').value = '';
  setStaffPreview(s?.photo || '');

  const el = document.getElementById('staffModal');
  (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
}

function saveStaff(){
  const idExisting = (document.getElementById('inpStaffId').value || '').trim();
  const name = (document.getElementById('inpStaffName').value || '').trim();
  const role = document.getElementById('inpStaffRole').value;
  const displayRole = (document.getElementById('inpStaffDisplayRole').value || '').trim();
  const doc = (document.getElementById('inpStaffDoc').value || '').trim();
  const status = document.getElementById('inpStaffStatus').value;
  const email = (document.getElementById('inpStaffEmail').value || '').trim();
  const phone = (document.getElementById('inpStaffPhone').value || '').trim();
  const whatsapp = (document.getElementById('inpStaffWhatsapp').value || '').trim();
  const specialty = (document.getElementById('inpStaffSpecialty').value || '').trim();
  const experience = (document.getElementById('inpStaffExperience').value || '').trim();
  const note = (document.getElementById('inpStaffNote').value || '').trim();
  const imageBase64 = (document.getElementById('inpStaffImageBase64').value || '').trim();
  const imageUrl = (document.getElementById('inpStaffImageUrl').value || '').trim();
  const photo = imageBase64 || imageUrl || '';

  if (!name || !role){
    alert('Preencha nome e função.');
    return;
  }

  const staffData = publicCatalog
    ? publicCatalog.normalizeStaff({
        id: idExisting || ('S-' + Math.floor(Math.random()*9000 + 1000)),
        name,
        role,
        displayRole,
        doc,
        status,
        email,
        phone,
        whatsapp,
        specialty,
        experience,
        note,
        photo
      })
    : { id: idExisting || ('S-' + Math.floor(Math.random()*9000 + 1000)), name, role, displayRole, doc, status, email, phone, whatsapp, specialty, experience, note, photo };

  if (idExisting){
    const s = state.staff.find(x=>x.id===idExisting);
    if (!s){ alert('Profissional não encontrado.'); return; }
    Object.assign(s, staffData);
  } else {
    state.staff.unshift(staffData);
  }

  savePublicStaffStorage();
  closeModal('staffModal');
  renderStaff();
  renderOverview();
}

function removeStaff(staffId){
  const s = state.staff.find(x=>x.id===staffId);
  if (!s) return;

  if (!confirm(`Remover profissional ${s.name}?`)) return;

  state.staff = state.staff.filter(x=>x.id!==staffId);
  savePublicStaffStorage();
  renderStaff();
  renderOverview();
}

function renderStaff(){
  const q = (document.getElementById('staffSearch').value || '').trim().toLowerCase();
  const role = document.getElementById('staffRoleFilter').value;
  const st = document.getElementById('staffStatusFilter').value;

  let list = [...state.staff];
  if (role !== 'ALL') list = list.filter(s=>s.role===role);
  if (st !== 'ALL') list = list.filter(s=>s.status===st);

  if (q){
    list = list.filter(s =>
      (s.id||'').toLowerCase().includes(q) ||
      (s.name||'').toLowerCase().includes(q) ||
      (s.displayRole||'').toLowerCase().includes(q) ||
      (roleLabel(s.role)||'').toLowerCase().includes(q) ||
      (s.doc||'').toLowerCase().includes(q) ||
      (s.specialty||'').toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById('staffTbody');
  tbody.innerHTML = '';

  if (!list.length){
    tbody.innerHTML = `<tr class="staff-empty-row"><td colspan="7" class="text-muted">Nenhum profissional encontrado.</td></tr>`;
    return;
  }

  list.forEach(s=>{
    const tr = document.createElement('tr');
    const staffNameRaw = String(s.name || '');
    const staffNameLen = Math.max(staffNameRaw.length, 1);

    tr.innerHTML = `
      <td data-label="Foto">${staffImageHtml(s)}</td>
      <td data-label="ID"><span class="badge-pill">${escHtml(s.id)}</span></td>
      <td data-label="Nome" class="staff-name-cell">
        <div class="staff-name-inline" title="${escHtml(staffNameRaw)}">
          <span class="staff-name-primary" style="--staff-name-len:${staffNameLen};">${escHtml(staffNameRaw)}</span>
        </div>
      </td>
      <td data-label="Função"><span class="badge-pill">${escHtml(s.displayRole || roleLabel(s.role))}</span></td>
      <td data-label="Documento" class="text-muted"><span class="staff-doc-cell">${escHtml(s.doc || '—')}</span></td>
      <td data-label="Status">${badge(s.status)}</td>
      <td data-label="Ações" class="text-end">
        ${actionIconsHtml({
          onEdit: `openStaffModal('${escHtml(s.id)}')`,
          onDelete: `removeStaff('${escHtml(s.id)}')`
        })}
      </td>
    `;

    tbody.appendChild(tr);
  });

  bindRipple();
}

/* ========================= INIT ========================= */
window.addEventListener('DOMContentLoaded', () => {
  bindNavClicks();
  cloneMenuToMobile();
  bindRipple();

  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString('pt-BR');
  document.getElementById('payDateFrom').value = daysAgoISO(30);
  document.getElementById('payDateTo').value = todayISO();

  const productsInStorage = loadProductsStorage();
  const presenceInStorage = loadPresenceStorage();
  const staffInStorage = loadPublicStaffStorage();
  const plansInStorage = loadPublicPlansStorage();

  seedDemo();

  mergeEnrollmentsFromStorage();
  renderUsers();
  renderPayments();
  renderAccess();
  renderOverview();

  if (productsInStorage.length){
    state.products = productsInStorage.map(p => normalizeProductAvailability({ ...p }));
    syncProductsToMarketplaceStorage();
  }

  if (presenceInStorage !== null){
    state.presence = presenceInStorage;
  } else {
    savePresenceStorage();
  }

  if (staffInStorage.length){
    state.staff = staffInStorage;
  }

  if (plansInStorage.length){
    state.plans = plansInStorage;
  }

  // Re-render após hidratar dados do storage para refletir presenças reais.
  renderOverview();
  renderAccess();

  loadViewFromHash();

  document.querySelectorAll('.js-stagger').forEach((el, i) => {
    setTimeout(() => el.classList.add('in'), 80 * i);
  });
});

window.addEventListener('hashchange', loadViewFromHash);

window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_ENROLLMENTS_KEY) return;
  mergeEnrollmentsFromStorage();
  renderUsers();
  renderPayments();
  renderAccess();
  renderOverview();
});

/* Stub p/ evitar erro caso logout não exista */
function logout(){
  window.location.href = "login.html";
}