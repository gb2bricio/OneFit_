(function () {
  const STORAGE_PLANS_KEY = "ONEFIT_PUBLIC_PLANS_V1";
  const STORAGE_STAFF_KEY = "ONEFIT_PUBLIC_STAFF_V1";

  const ROLE_LABELS = {
    ED_FISICO: "Educador físico",
    MEDICO: "Médico",
    FISIO: "Fisioterapeuta",
    NUTRI: "Nutricionista",
    OUTRO: "Outro",
  };

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function slugifyPlanKey(value) {
    const normalized = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || "PLANO";
  }

  function uniquePlanKey(baseKey, plans, currentKey) {
    const usedKeys = new Set(
      (plans || [])
        .map((plan) => String(plan?.key || "").trim().toUpperCase())
        .filter((key) => key && key !== String(currentKey || "").trim().toUpperCase())
    );

    let candidate = slugifyPlanKey(baseKey);
    let suffix = 2;
    while (usedKeys.has(candidate)) {
      candidate = `${slugifyPlanKey(baseKey)}_${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function normalizeBenefits(value) {
    const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
    return source
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  function normalizeWhatsappLink(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;

    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}`;
  }

  function roleLabel(role) {
    return ROLE_LABELS[String(role || "").toUpperCase()] || String(role || "Outro");
  }

  const DEFAULT_PLANS = [
    {
      key: "BRONZE",
      name: "Bronze",
      label: "Plano Bronze",
      short: "Bronze",
      price: 79,
      cycleMonths: 1,
      benefits: ["Musculação livre", "Avaliação física", "Acesso horário normal"],
      ctaText: "Matricule-se",
      status: "ATIVO",
    },
    {
      key: "PRATA",
      name: "Prata",
      label: "Plano Prata",
      short: "Prata",
      price: 99,
      cycleMonths: 1,
      benefits: ["Musculação", "Aeróbico", "Avaliação física", "Treino personalizado"],
      ctaText: "Matricule-se",
      status: "ATIVO",
    },
    {
      key: "GOLD",
      name: "Gold",
      label: "Plano Gold",
      short: "Gold",
      price: 129,
      cycleMonths: 1,
      benefits: ["Musculação", "Aeróbico", "Aulas em grupo", "Avaliação física"],
      ctaText: "Matricule-se",
      status: "ATIVO",
    },
    {
      key: "PREMIUM",
      name: "Premium",
      label: "Plano Premium",
      short: "Premium",
      price: 159,
      cycleMonths: 3,
      benefits: ["Tudo liberado", "Personal incluso", "Acesso total", "Aulas VIP"],
      ctaText: "Matricule-se",
      status: "ATIVO",
    },
    {
      key: "BLACK",
      name: "Black",
      label: "Plano Black",
      short: "Black",
      price: 199,
      cycleMonths: 12,
      benefits: ["Tudo liberado", "Personal premium", "24h acesso", "Área exclusiva"],
      ctaText: "Matricule-se",
      status: "ATIVO",
    },
  ];

  const DEFAULT_STAFF = [
    {
      id: "S-1001",
      name: "Carlos Silva",
      role: "ED_FISICO",
      displayRole: "Personal Trainer",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CREF: 123456-G/SP",
      photo: "img/personal-trainer.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
    {
      id: "S-1002",
      name: "Juliana Rocha",
      role: "ED_FISICO",
      displayRole: "Instrutora de Musculação",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CREF: 123456-G/SP",
      photo: "img/instrutura-de-musculacao.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
    {
      id: "S-1003",
      name: "Fernanda Alves",
      role: "OUTRO",
      displayRole: "Professora de Dança",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CREF: 123456-G/SP",
      photo: "img/professora_dança.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
    {
      id: "S-1004",
      name: "Ricardo Souza",
      role: "NUTRI",
      displayRole: "Nutricionista",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CRN: 123456",
      photo: "img/nutricionista.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
    {
      id: "S-1005",
      name: "Bruno Martins",
      role: "ED_FISICO",
      displayRole: "Professor de Funcional",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CREF: 123456-G/SP",
      photo: "img/professor-funcional.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
    {
      id: "S-1006",
      name: "Marcos Lima",
      role: "ED_FISICO",
      displayRole: "Professor de Cross Training",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CREF: 123456-G/SP",
      photo: "img/professor-cross-training.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
    {
      id: "S-1007",
      name: "Patricia Gomes",
      role: "ED_FISICO",
      displayRole: "Instrutora de Pilates",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CREF: 123456-G/SP",
      photo: "img/professora-pilates.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
    {
      id: "S-1008",
      name: "André Carvalho",
      role: "FISIO",
      displayRole: "Fisioterapeuta Esportivo",
      specialty: "Especialista em hipertrofia e emagrecimento",
      experience: "8 anos de experiência",
      doc: "CREFITO: 123456",
      photo: "img/fisioterapeuta-esportivo.png",
      whatsapp: "5512991111111",
      status: "ATIVO",
      email: "",
      phone: "(12) 99111-1111",
      note: "",
    },
  ];

  function normalizePlan(plan, index) {
    const name = String(plan?.name || plan?.short || `Plano ${index + 1}`).trim();
    const short = String(plan?.short || name).trim();
    const key = slugifyPlanKey(plan?.key || short || name);
    const price = Number(plan?.price || 0);
    const cycleMonths = Math.max(1, parseInt(plan?.cycleMonths || "1", 10) || 1);
    const status = String(plan?.status || "ATIVO").toUpperCase() === "INATIVO" ? "INATIVO" : "ATIVO";

    return {
      key,
      name,
      short,
      label: String(plan?.label || `Plano ${short}`).trim(),
      price,
      cycleMonths,
      benefits: normalizeBenefits(plan?.benefits),
      ctaText: String(plan?.ctaText || "Matricule-se").trim() || "Matricule-se",
      status,
    };
  }

  function normalizeStaff(staff, index) {
    const status = String(staff?.status || "ATIVO").toUpperCase() === "INATIVO" ? "INATIVO" : "ATIVO";
    const role = String(staff?.role || "OUTRO").toUpperCase();

    return {
      id: String(staff?.id || `S-${String(index + 1).padStart(4, "0")}`).trim(),
      name: String(staff?.name || "").trim(),
      role,
      displayRole: String(staff?.displayRole || roleLabel(role)).trim() || roleLabel(role),
      specialty: String(staff?.specialty || staff?.note || "").trim(),
      experience: String(staff?.experience || "").trim(),
      doc: String(staff?.doc || "").trim(),
      photo: String(staff?.photo || "").trim(),
      whatsapp: String(staff?.whatsapp || "").trim(),
      whatsappLink: normalizeWhatsappLink(staff?.whatsappLink || staff?.whatsapp),
      status,
      email: String(staff?.email || "").trim(),
      phone: String(staff?.phone || "").trim(),
      note: String(staff?.note || "").trim(),
    };
  }

  function normalizePlanList(plans) {
    return (Array.isArray(plans) ? plans : []).map(normalizePlan);
  }

  function normalizeStaffList(staff) {
    return (Array.isArray(staff) ? staff : []).map(normalizeStaff);
  }

  function getDefaultPlans() {
    return normalizePlanList(DEFAULT_PLANS).map((plan) => ({ ...plan }));
  }

  function getDefaultStaff() {
    return normalizeStaffList(DEFAULT_STAFF).map((staff) => ({ ...staff }));
  }

  function getPlans() {
    const stored = safeParse(localStorage.getItem(STORAGE_PLANS_KEY) || "[]", []);
    const normalized = normalizePlanList(stored);
    return normalized.length ? normalized : getDefaultPlans();
  }

  function getStaff() {
    const stored = safeParse(localStorage.getItem(STORAGE_STAFF_KEY) || "[]", []);
    const normalized = normalizeStaffList(stored);
    return normalized.length ? normalized : getDefaultStaff();
  }

  function savePlans(plans) {
    const normalized = normalizePlanList(plans);
    localStorage.setItem(STORAGE_PLANS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function saveStaff(staff) {
    const normalized = normalizeStaffList(staff);
    localStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function getPlanByKey(planKey) {
    const key = String(planKey || "").trim().toUpperCase();
    return getPlans().find((plan) => String(plan.key || "").toUpperCase() === key) || null;
  }

  function getDefaultPlanKey() {
    const active = getPlans().find((plan) => plan.status === "ATIVO");
    return active?.key || getDefaultPlans()[0]?.key || "GOLD";
  }

  window.ONEFIT_PUBLIC_CATALOG = {
    STORAGE_PLANS_KEY,
    STORAGE_STAFF_KEY,
    ROLE_LABELS,
    roleLabel,
    slugifyPlanKey,
    uniquePlanKey,
    normalizeBenefits,
    normalizePlan,
    normalizePlanList,
    normalizeStaff,
    normalizeStaffList,
    normalizeWhatsappLink,
    getDefaultPlans,
    getDefaultStaff,
    getDefaultPlanKey,
    getPlans,
    getStaff,
    savePlans,
    saveStaff,
    getPlanByKey,
  };
})();
