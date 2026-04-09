const PLAN_STORAGE_KEY = "ONEFIT_SELECTED_PLAN";
const STORAGE_ENROLLMENTS_KEY = "ONEFIT_ENROLLMENTS_V1";
const PAYMENTS_STORAGE_GLOBAL = "ONEFIT_USER_PAYMENTS_V1";
const publicCatalog = window.ONEFIT_PUBLIC_CATALOG;
const DEFAULT_PLAN_KEY = publicCatalog?.getDefaultPlanKey?.() || "GOLD";

let selectedPlan = publicCatalog?.getPlanByKey?.(DEFAULT_PLAN_KEY) || {
  key: DEFAULT_PLAN_KEY,
  label: `Plano ${DEFAULT_PLAN_KEY}`,
  short: DEFAULT_PLAN_KEY,
  price: 0,
};

function getPlanCatalog() {
  const plans = publicCatalog?.getPlans?.() || [];
  const map = {};
  plans.forEach((plan) => {
    map[String(plan.key || "").toUpperCase()] = plan;
  });
  return map;
}

function formatBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function resolveSelectedPlan() {
  const catalog = getPlanCatalog();
  const fromQuery = new URLSearchParams(window.location.search).get("plan");
  const queryKey = String(fromQuery || "").toUpperCase();
  if (queryKey && catalog[queryKey]) return catalog[queryKey];

  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    const parsed = JSON.parse(raw || "null");
    const storageKey = String(parsed?.key || "").toUpperCase();
    if (storageKey && catalog[storageKey]) return catalog[storageKey];
  } catch (e) {}

  return catalog[DEFAULT_PLAN_KEY] || Object.values(catalog)[0] || selectedPlan;
}

function applySelectedPlanUI() {
  const title = document.getElementById("selectedPlanTitle");
  const subtitle = document.getElementById("selectedPlanSubtitle");
  const total = document.getElementById("total");

  if (title) title.textContent = selectedPlan.label;
  if (subtitle) subtitle.textContent = `${selectedPlan.short} • Acesso completo`;
  if (total) total.textContent = formatBRL(selectedPlan.price);
}

function buildPixPayload() {
  const amount = Number(selectedPlan?.price || 0).toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136chave-pix-exemplo@onefit.com5204000053039865405${amount}5802BR5920ONE FIT ACADEMIA LTDA6009SAO PAULO62070503***6304ABCD`;
}

function ensurePixQr() {
  const qrEl = document.getElementById("pixQr");
  if (!qrEl) return;
  qrEl.innerHTML = "";
  new QRCode(qrEl, {
    text: buildPixPayload(),
    width: 160,
    height: 160,
    correctLevel: QRCode.CorrectLevel.M,
  });

  const pixCodeEl = document.getElementById("pixCode");
  if (pixCodeEl) {
    pixCodeEl.value = buildPixPayload();
  }
}

function selectPayment(type) {
  document.querySelectorAll(".payment-option").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-pay") === type);
  });

  const cardFields = document.getElementById("cardFields");
  const pixFields = document.getElementById("pixFields");

  const showCard = type === "card" || type === "subscription";
  if (cardFields) cardFields.classList.toggle("d-none", !showCard);
  if (pixFields) pixFields.classList.toggle("d-none", type !== "pix");

  if (type === "pix") ensurePixQr();
}

async function copyPixCode() {
  const codeEl = document.getElementById("pixCode");
  const feedback = document.getElementById("copyFeedback");
  const btn = document.getElementById("copyPixBtn");
  const proofWrap = document.getElementById("pixProofWrap");

  if (!codeEl || !feedback || !btn) return;

  const code = codeEl.value;

  try {
    await navigator.clipboard.writeText(code);
  } catch (e) {
    codeEl.focus();
    codeEl.select();
    document.execCommand("copy");
  }

  feedback.style.display = "block";
  if (proofWrap) proofWrap.style.display = "block";
  window.__ONEFIT_PIX_COPIED__ = true;

  setTimeout(() => {
    feedback.style.display = "none";
    btn.textContent = "COPIAR CÓDIGO";
  }, 1800);
}

/* =========================
   HELPERS
   ========================= */
function onlyDigits(str) {
  return (str || "").replace(/\D/g, "");
}

function formatCPF(digits) {
  const d = onlyDigits(digits).slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);

  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

// (11) 91234-5678  ou (11) 1234-5678
function formatBRPhone(digits) {
  const d = onlyDigits(digits).slice(0, 11);
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);

  if (!ddd) return "";
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  if (rest.length > 8 && rest.length < 9) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

function attachMaskHandlers() {
  const cpfEl = document.getElementById("cpf");
  const celEl = document.getElementById("celular");

  if (cpfEl) {
    cpfEl.addEventListener("input", () => {
      cpfEl.value = formatCPF(cpfEl.value);
    });

    cpfEl.addEventListener("paste", () => {
      setTimeout(() => {
        cpfEl.value = formatCPF(cpfEl.value);
      }, 0);
    });
  }

  if (celEl) {
    celEl.addEventListener("input", () => {
      celEl.value = formatBRPhone(celEl.value);
    });

    celEl.addEventListener("paste", () => {
      setTimeout(() => {
        celEl.value = formatBRPhone(celEl.value);
      }, 0);
    });
  }

  function blockLetters(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];

    if (allowedKeys.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  }

  if (cpfEl) cpfEl.addEventListener("keydown", blockLetters);
  if (celEl) celEl.addEventListener("keydown", blockLetters);
}

/* =========================
   VALIDAÇÃO CPF
   ========================= */
function isValidCPF(cpf) {
  const c = onlyDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i], 10) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i], 10) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;

  return d1 === parseInt(c[9], 10) && d2 === parseInt(c[10], 10);
}

function isValidPhoneBR(phone) {
  const d = onlyDigits(phone);
  if (d.length !== 10 && d.length !== 11) return false;
  if (d[0] === "0") return false;
  return true;
}

/* =========================
   UI: ERROS
   ========================= */
function showFieldError(fieldId, show) {
  const field = document.getElementById(fieldId);
  const err = document.querySelector(`[data-error-for="${fieldId}"]`);

  if (!field) return;

  field.classList.toggle("is-invalidish", !!show);
  if (err) err.style.display = show ? "block" : "none";
}

function validateForm() {
  const feedback = document.getElementById("formFeedback");
  const passwordMismatch = document.getElementById("passwordMismatch");

  if (feedback) feedback.style.display = "none";
  if (passwordMismatch) passwordMismatch.style.display = "none";

  const fields = [
    "nome",
    "nacionalidade",
    "nascimento",
    "genero",
    "cpf",
    "endereco",
    "cidadeEstado",
    "email",
    "celular",
    "senha",
    "confirmarSenha",
  ];

  let ok = true;

  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const valid = el.checkValidity();
    showFieldError(id, !valid);
    if (!valid) ok = false;
  });

  const cpfEl = document.getElementById("cpf");
  if (cpfEl && cpfEl.value && !isValidCPF(cpfEl.value)) {
    ok = false;
    showFieldError("cpf", true);
  }

  const celEl = document.getElementById("celular");
  if (celEl && celEl.value && !isValidPhoneBR(celEl.value)) {
    ok = false;
    showFieldError("celular", true);
  }

  const senhaEl = document.getElementById("senha");
  const confirmarEl = document.getElementById("confirmarSenha");

  const senha = senhaEl ? senhaEl.value : "";
  const confirmar = confirmarEl ? confirmarEl.value : "";

  if (senha !== confirmar) {
    ok = false;
    if (passwordMismatch) passwordMismatch.style.display = "block";
    showFieldError("senha", true);
    showFieldError("confirmarSenha", true);
  }

  if (!ok) {
    if (feedback) feedback.style.display = "block";

    const firstInvalid = fields
      .map((id) => document.getElementById(id))
      .find((el) => el && !el.checkValidity());

    if (firstInvalid) firstInvalid.focus();
    return false;
  }

  return true;
}

/* =========================
   PASSWORD TOGGLE
   ========================= */
function setEyeIcon(btn, isVisible) {
  btn.innerHTML = isVisible
    ? `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M4 4l16 16"></path>
      </svg>
    `
    : `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;

  btn.setAttribute("aria-label", isVisible ? "Ocultar senha" : "Exibir senha");
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  setEyeIcon(btn, willShow);
}

/* =========================
   SALVAR USUÁRIO DA MATRÍCULA
   ========================= */
function getFormData() {
  return {
    nome: document.getElementById("nome")?.value.trim() || "",
    nacionalidade: document.getElementById("nacionalidade")?.value.trim() || "",
    nascimento: document.getElementById("nascimento")?.value || "",
    genero: document.getElementById("genero")?.value || "",
    cpf: document.getElementById("cpf")?.value.trim() || "",
    cpfNumerico: onlyDigits(document.getElementById("cpf")?.value || ""),
    endereco: document.getElementById("endereco")?.value.trim() || "",
    cidadeEstado: document.getElementById("cidadeEstado")?.value.trim() || "",
    email: document.getElementById("email")?.value.trim().toLowerCase() || "",
    celular: document.getElementById("celular")?.value.trim() || "",
    senha: document.getElementById("senha")?.value || "",
  };
}

function saveRegisteredUser() {
  const formData = getFormData();

  const usuarioMatriculado = {
    nome: formData.nome,
    nacionalidade: formData.nacionalidade,
    nascimento: formData.nascimento,
    genero: formData.genero,
    cpf: formData.cpf,
    cpfNumerico: formData.cpfNumerico,
    endereco: formData.endereco,
    cidadeEstado: formData.cidadeEstado,
    email: formData.email,
    celular: formData.celular,
    senha: formData.senha,
    plano: {
      key: selectedPlan.key,
      nome: selectedPlan.short,
      label: selectedPlan.label,
      valor: selectedPlan.price,
      cycleMonths: Math.max(1, Number(selectedPlan.cycleMonths || 1)),
    },
    criadoEm: new Date().toISOString(),
  };

  localStorage.setItem("usuarioCadastrado", JSON.stringify(usuarioMatriculado));

  // opcional: já deixar preenchido no login
  localStorage.setItem("usuario", usuarioMatriculado.email || usuarioMatriculado.cpf);
  localStorage.setItem("senhaTemporaria", usuarioMatriculado.senha);
}

/* =========================
   PAGAMENTO (SIMULADO)
   ========================= */
function getSelectedPaymentType() {
  const active = document.querySelector(".payment-option.active");
  return active ? active.getAttribute("data-pay") : "pix";
}

function onlyDigitsMax(str, max) {
  return onlyDigits(str).slice(0, max);
}

function normalizeExp(str) {
  const d = onlyDigitsMax(str, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + "/" + d.slice(2, 4);
}

function fillFakeCard() {
  const n = document.getElementById("cardNumber");
  const e = document.getElementById("cardExp");
  const c = document.getElementById("cardCvv");
  if (n) n.value = "4111 1111 1111 1111";
  if (e) e.value = "12/30";
  if (c) c.value = "123";
}

function validateCardFields() {
  const feedback = document.getElementById("cardFeedback");
  if (feedback) feedback.style.display = "none";

  const n = document.getElementById("cardNumber")?.value || "";
  const e = document.getElementById("cardExp")?.value || "";
  const c = document.getElementById("cardCvv")?.value || "";

  const digits = onlyDigits(n);
  const expNorm = normalizeExp(e);
  const cvvDigits = onlyDigits(c);

  const okNumber = digits.length >= 13 && digits.length <= 19;
  const okExp = /^\d{2}\/\d{2}$/.test(expNorm);
  const okCvv = cvvDigits.length >= 3 && cvvDigits.length <= 4;

  if (!okNumber || !okExp || !okCvv) {
    if (feedback) feedback.style.display = "block";
    return { ok: false, numberMasked: "", exp: "", cvvMasked: "" };
  }

  const masked = digits.slice(0, 2) + "••••••••••" + digits.slice(-2);
  return { ok: true, numberMasked: masked, exp: expNorm, cvvMasked: "•••" };
}

function validatePixProof() {
  const copied = !!window.__ONEFIT_PIX_COPIED__;
  const proof = document.getElementById("pixProof");
  const file = proof?.files?.[0];
  return { ok: copied && !!file, fileName: file ? file.name : "" };
}

function persistPaymentInfo(paymentInfo) {
  const raw = localStorage.getItem("usuarioCadastrado");
  let cadastro = null;
  try {
    cadastro = JSON.parse(raw || "null");
  } catch (e) {
    cadastro = null;
  }
  if (!cadastro || typeof cadastro !== "object") return;

  cadastro.pagamento = {
    status: "PAGO",
    ...paymentInfo,
    pagoEm: new Date().toISOString(),
  };

  localStorage.setItem("usuarioCadastrado", JSON.stringify(cadastro));
}

function appendEnrollmentSnapshot() {
  let rec = null;
  try {
    rec = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");
  } catch (e) {
    rec = null;
  }
  if (!rec || !rec.email) return;

  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(STORAGE_ENROLLMENTS_KEY) || "[]");
  } catch (e) {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  list.push(JSON.parse(JSON.stringify(rec)));
  localStorage.setItem(STORAGE_ENROLLMENTS_KEY, JSON.stringify(list));
}

function brDateFromISO(iso) {
  if (!iso || String(iso).length < 10) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function monthYearLabelFromISO(iso) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const [y, m] = String(iso).slice(0, 10).split("-").map(Number);
  if (!m || !y) return "";
  return `${months[m - 1]}/${y}`;
}

function seedScopedPaymentsForNewStudent(cadastro) {
  const email = String(cadastro?.email || "").trim().toLowerCase();
  if (!email) return;

  const scopeKey = `${PAYMENTS_STORAGE_GLOBAL}:${email}`;
  const paidISO = String(
    cadastro.pagamento?.pagoEm || cadastro.criadoEm || new Date().toISOString()
  ).slice(0, 10);
  const paidBR = brDateFromISO(paidISO);
  const amount = Number(cadastro.plano?.valor || 0);
  const planName = cadastro.plano?.label || cadastro.plano?.nome || "ONE FIT";
  const metodo = String(cadastro.pagamento?.metodo || "PIX");

  const entry = {
    month: monthYearLabelFromISO(paidISO),
    plan: planName,
    amount,
    due: paidBR,
    paidOn: paidBR,
    status: "PAGA",
    metodo,
  };

  let existing = [];
  try {
    existing = JSON.parse(localStorage.getItem(scopeKey) || "[]");
  } catch (e) {
    existing = [];
  }
  if (!Array.isArray(existing)) existing = [];

  const dup = existing.some(
    (p) =>
      p.month === entry.month &&
      Number(p.amount) === amount &&
      String(p.status || "").toUpperCase() === "PAGA"
  );
  if (dup) return;

  existing.unshift(entry);
  localStorage.setItem(scopeKey, JSON.stringify(existing.slice(0, 120)));
}

/* =========================
   SUBMIT
   ========================= */
async function submitForm() {
  if (!validateForm()) return;

  const payType = getSelectedPaymentType();

  // Regras de pagamento:
  // - Cartão/Assinatura: aceitar com dados fake/validados
  // - Pix: após copiar, exigir comprovante (arquivo)
  if (payType === "pix") {
    const pix = validatePixProof();
    if (!pix.ok) {
      alert("Para finalizar no Pix: copie o código e anexe o comprovante.");
      document.getElementById("copyPixBtn")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  } else {
    const card = validateCardFields();
    if (!card.ok) {
      alert("Preencha os dados do cartão (ou clique em “Usar cartão teste”).");
      document.getElementById("cardNumber")?.focus();
      return;
    }
  }

  const btn = document.getElementById("finishBtn");
  const text = document.getElementById("finishBtnText");

  if (!btn || !text || btn.disabled) return;

  btn.disabled = true;
  text.innerHTML = `<span class="btn-spinner"></span> Processando`;

  await new Promise((res) => setTimeout(res, 1200));

  saveRegisteredUser();

  if (payType === "pix") {
    const pix = validatePixProof();
    persistPaymentInfo({ metodo: "PIX", comprovanteArquivo: pix.fileName || "comprovante" });
  } else if (payType === "subscription") {
    const card = validateCardFields();
    persistPaymentInfo({ metodo: "ASSINATURA", cartao: { numero: card.numberMasked, exp: card.exp } });
  } else {
    const card = validateCardFields();
    persistPaymentInfo({ metodo: "CREDITO", cartao: { numero: card.numberMasked, exp: card.exp } });
  }

  appendEnrollmentSnapshot();
  try {
    const cad = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");
    if (cad) seedScopedPaymentsForNewStudent(cad);
  } catch (e) {}

  text.textContent = "Finalizado! ✅";
  btn.style.filter = "brightness(1.02)";
  btn.style.boxShadow =
    "0 16px 36px rgba(0,0,0,.45), 0 0 0 1px rgba(245,180,0,.14), 0 18px 40px rgba(245,180,0,.12)";

  setTimeout(() => {
    window.location.href = "./login.html";
  }, 800);
}

/* =========================
   INIT
   ========================= */
window.addEventListener("DOMContentLoaded", () => {
  selectedPlan = resolveSelectedPlan();
  applySelectedPlanUI();
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(selectedPlan));

  // animação stagger
  document.querySelectorAll(".js-stagger").forEach((el, i) => {
    setTimeout(() => el.classList.add("in"), 90 * i);
  });

  // pagamento
  ensurePixQr();

  const pixFields = document.getElementById("pixFields");
  const cardFields = document.getElementById("cardFields");

  if (pixFields) pixFields.classList.remove("d-none");
  if (cardFields) cardFields.classList.add("d-none");

  document.querySelectorAll(".payment-option").forEach((el) => {
    el.addEventListener("click", () => {
      selectPayment(el.getAttribute("data-pay"));
    });
  });

  // copiar pix
  const copyPixBtn = document.getElementById("copyPixBtn");
  if (copyPixBtn) {
    copyPixBtn.addEventListener("click", copyPixCode);
  }

  // cartão fake
  const fakeBtn = document.getElementById("fillFakeCardBtn");
  if (fakeBtn) fakeBtn.addEventListener("click", fillFakeCard);

  // máscaras simples do cartão
  const cardExp = document.getElementById("cardExp");
  if (cardExp) {
    cardExp.addEventListener("input", () => {
      cardExp.value = normalizeExp(cardExp.value);
    });
  }
  const cardNumber = document.getElementById("cardNumber");
  if (cardNumber) {
    cardNumber.addEventListener("input", () => {
      // manter espaços apenas para visual
      const d = onlyDigitsMax(cardNumber.value, 19);
      cardNumber.value = d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    });
  }
  const cardCvv = document.getElementById("cardCvv");
  if (cardCvv) {
    cardCvv.addEventListener("input", () => {
      cardCvv.value = onlyDigitsMax(cardCvv.value, 4);
    });
  }

  // botão finalizar
  const finishBtn = document.getElementById("finishBtn");
  if (finishBtn) {
    finishBtn.addEventListener("click", submitForm);
  }

  // máscaras
  attachMaskHandlers();

  // validação on-blur
  const liveValidateIds = [
    "nome",
    "nacionalidade",
    "nascimento",
    "genero",
    "cpf",
    "endereco",
    "cidadeEstado",
    "email",
    "celular",
    "senha",
    "confirmarSenha",
  ];

  liveValidateIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("blur", () => {
      showFieldError(id, !el.checkValidity());

      if (id === "cpf" && el.value) {
        showFieldError("cpf", !isValidCPF(el.value));
      }

      if (id === "celular" && el.value) {
        showFieldError("celular", !isValidPhoneBR(el.value));
      }
    });

    el.addEventListener("input", () => {
      if (id === "senha" || id === "confirmarSenha") {
        const passwordMismatch = document.getElementById("passwordMismatch");
        if (passwordMismatch) passwordMismatch.style.display = "none";
      }
    });
  });

  // toggle senha
  document.querySelectorAll(".toggle-pass").forEach((btn) => {
    const inputId = btn.getAttribute("data-toggle-for");
    btn.addEventListener("click", () => togglePassword(inputId, btn));
  });
});