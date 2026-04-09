// CARROSSEL DA SEÇÃO PLANOS
let index = 0;
let cardWidth = 320;
let visibleCards = 3;
let gapPlanos = 20;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPlanCycle(cycleMonths) {
  const cycle = Math.max(1, parseInt(cycleMonths || 1, 10) || 1);
  return cycle === 1 ? "/mês" : `/${cycle} meses`;
}

function formatPriceBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function renderPublicPlans() {
  const track = document.getElementById("carrossel-card-planos");
  if (!track) return;

  const publicCatalog = window.ONEFIT_PUBLIC_CATALOG;
  if (!publicCatalog || typeof publicCatalog.getPlans !== "function") return;

  const plans = publicCatalog
    .getPlans()
    .filter((plan) => String(plan?.status || "").toUpperCase() === "ATIVO");

  if (!plans.length) return;

  track.innerHTML = plans
    .map((plan) => {
      const planKey = escapeHtml(plan.key);
      const planName = escapeHtml(plan.short || plan.name || "Plano");
      const planPrice = Number(plan.price || 0);
      const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];
      const ctaText = escapeHtml(plan.ctaText || "Matricule-se");

      const benefitsHtml = benefits
        .map((benefit) => `<li>${escapeHtml(benefit)}</li>`)
        .join("");

      return `
        <div class="plano-card" data-aos="fade-up" data-plan-key="${planKey}" data-plan-name="${planName}" data-plan-price="${planPrice}">
          <h3 class="plano-nome">${planName}</h3>
          <p class="plano-preco">R$ ${formatPriceBRL(planPrice)}<span>${formatPlanCycle(plan.cycleMonths)}</span></p>
          <ul class="plano-beneficios">
            ${benefitsHtml}
          </ul>
          <a href="./matricula.html">
            <button class="plano-btn w-100">${ctaText}</button>
          </a>
        </div>
      `;
    })
    .join("");

  index = 0;
}

function renderPublicStaff() {
  const track = document.getElementById("carrossel-card-profissional");
  if (!track) return;

  const publicCatalog = window.ONEFIT_PUBLIC_CATALOG;
  if (!publicCatalog || typeof publicCatalog.getStaff !== "function") return;

  const staff = publicCatalog
    .getStaff()
    .filter((member) => String(member?.status || "").toUpperCase() === "ATIVO");

  if (!staff.length) return;

  track.innerHTML = staff
    .map((member) => {
      const name = escapeHtml(member.name || "Profissional");
      const displayRole = escapeHtml(
        member.displayRole ||
          (typeof publicCatalog.roleLabel === "function"
            ? publicCatalog.roleLabel(member.role)
            : member.role || "Profissional")
      );
      const specialty = escapeHtml(member.specialty || "Sem especialidade informada");
      const experience = escapeHtml(member.experience || "Sem experiência informada");
      const doc = escapeHtml(member.doc || "Documento não informado");
      const photo = String(member.photo || "").trim();
      const photoHtml = photo
        ? `<img src="${escapeHtml(photo)}" alt="${name}">`
        : `<div class="foto-profissional-vazia">Sem foto</div>`;
      const whatsappLink =
        member.whatsappLink ||
        (typeof publicCatalog.normalizeWhatsappLink === "function"
          ? publicCatalog.normalizeWhatsappLink(member.whatsapp)
          : "");
      const whatsappHtml = whatsappLink
        ? `
              <a href="${escapeHtml(whatsappLink)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                <i class="fa-brands fa-whatsapp"></i> WhatsApp
              </a>
          `
        : "";

      return `
            <div class="card-profissional" data-aos="fade-up">
              <div class="foto-profissional">
                ${photoHtml}
              </div>
              <h3 class="nome-profissional">${name}</h3>
              <p class="funcao-profissional">${displayRole}</p>
              <p class="info-profissional">${specialty}</p>
              <p class="info-profissional">${experience}</p>
              <p class="info-profissional">${doc}</p>
              ${whatsappHtml}
            </div>
        `;
    })
    .join("");

  indexProfissional = 0;
}

function getMaxIndexPlanos(totalCards) {
  return Math.max(0, totalCards - visibleCards);
}

function updateSizes() {
  const track = document.getElementById("carrossel-card-planos");
  const windowPlanos = document.querySelector(".carrossel-window-planos");
  const firstCard = track?.querySelector(".plano-card");

  if (firstCard && track) {
    const styles = window.getComputedStyle(track);
    gapPlanos = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    cardWidth = firstCard.getBoundingClientRect().width + gapPlanos;
  } else {
    cardWidth = 320;
    gapPlanos = 20;
  }

  if (window.innerWidth <= 768 || !windowPlanos) {
    visibleCards = 1;
  } else {
    const windowWidth = windowPlanos.getBoundingClientRect().width;
    const cardsThatFit = Math.floor((windowWidth + gapPlanos) / cardWidth);
    visibleCards = Math.max(1, cardsThatFit);
  }

  if (track) {
    const maxIndexPlanos = getMaxIndexPlanos(track.children.length);
    index = Math.min(index, maxIndexPlanos);
  }
  applyTransformPlanos();
}

updateSizes();

function applyTransformPlanos() {
  const track = document.getElementById("carrossel-card-planos");
  if (!track) return;
  track.style.transform = `translateX(-${index * cardWidth}px)`;
}

function moveRightPlanos() {
  const track = document.getElementById("carrossel-card-planos");
  if (!track) return;
  const totalCards = track.children.length;
  const maxIndexPlanos = getMaxIndexPlanos(totalCards);

  if (index < maxIndexPlanos) index++;
  applyTransformPlanos();
}

function moveLeftPlanos() {
  const track = document.getElementById("carrossel-card-planos");
  if (!track) return;
  if (index > 0) index--;
  applyTransformPlanos();
}

// CARROSSEL DA SEÇÃO PROFISSIONAL
let indexProfissional = 0;
let cardWidthProfissional = 270;
let visibleCardsProfissional = 3;
let gapProfissional = 40;

function updateSizesProfissional() {
  const track = document.getElementById("carrossel-card-profissional");
  const firstCard = track?.querySelector(".card-profissional");

  if (firstCard && track) {
    const styles = window.getComputedStyle(track);
    gapProfissional = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    cardWidthProfissional = firstCard.getBoundingClientRect().width + gapProfissional;
  } else {
    cardWidthProfissional = 270;
    gapProfissional = 40;
  }

  visibleCardsProfissional = window.innerWidth <= 768 ? 1 : 3;
  const maxIndexProfissional = Math.max(0, (track?.children.length || 0) - visibleCardsProfissional);
  indexProfissional = Math.min(indexProfissional, maxIndexProfissional);
  applyTransformProfissional();
}

updateSizesProfissional();

function applyTransformProfissional() {
  const track = document.getElementById("carrossel-card-profissional");
  if (!track) return;
  track.style.transform = `translateX(-${indexProfissional * cardWidthProfissional}px)`;
}

function moveRightProfissional() {
  const track = document.getElementById("carrossel-card-profissional");
  if (!track) return;

  const totalCards = track.children.length;
  if (indexProfissional < totalCards - visibleCardsProfissional) {
    indexProfissional++;
  }

  applyTransformProfissional();
}

function moveLeftProfissional() {
  if (indexProfissional > 0) {
    indexProfissional--;
  }
  applyTransformProfissional();
}

// CARDS
const cards = document.querySelectorAll(".card-container");
const hasHoverCard = window.matchMedia("(hover: hover) and (pointer: fine)");
const isTouchCardViewport = () => window.innerWidth <= 1024 || !hasHoverCard.matches;

cards.forEach(card => {
  card.tabIndex = 0;

  if (hasHoverCard.matches) {
    card.addEventListener("mouseenter", () => {
      card.classList.add("hover");
    });

    card.addEventListener("mouseleave", () => {
      card.classList.remove("hover");
    });
  }

  card.addEventListener("click", () => {
    if (!isTouchCardViewport()) return;
    card.classList.toggle("is-flipped");
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    card.classList.toggle("is-flipped");
  });

});

// PLANOS -> MATRÍCULA
function bindPlanSelection() {
  const cardsPlanos = document.querySelectorAll(".plano-card");
  if (!cardsPlanos.length) return;

  cardsPlanos.forEach((card) => {
    const planKey = card.dataset.planKey || "";
    const planName = card.dataset.planName || "";
    const planPrice = card.dataset.planPrice || "";
    if (!planKey || !planName || !planPrice) return;

    const goToMatricula = (event) => {
      event.preventDefault();
      const payload = { key: planKey, name: planName, price: Number(planPrice) };
      localStorage.setItem("ONEFIT_SELECTED_PLAN", JSON.stringify(payload));
      window.location.href = `./matricula.html?plan=${encodeURIComponent(planKey)}`;
    };

    card.style.cursor = "pointer";
    card.addEventListener("click", (event) => {
      const target = event.target;
      if (target && target.closest("a")) return;
      goToMatricula(event);
    });

    const actionLink = card.querySelector("a");
    if (actionLink) {
      actionLink.addEventListener("click", goToMatricula);
    }
  });
}

function bindMobileMenuAutoClose() {
  const navMenu = document.getElementById("navMenu");
  if (!navMenu || !window.bootstrap?.Collapse) return;

  const navLinks = navMenu.querySelectorAll(".nav-link");
  const navToggler = document.querySelector('.navbar-toggler[data-bs-target="#navMenu"]');
  if (!navLinks.length) return;

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const isOpen = navMenu.classList.contains("show");
      const isMobile = navToggler
        ? window.getComputedStyle(navToggler).display !== "none"
        : window.innerWidth < 992;

      if (isOpen && isMobile) {
        window.bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
      }
    });
  });
}

window.addEventListener("resize", () => {
  updateSizes();
  updateSizesProfissional();
});

window.addEventListener("DOMContentLoaded", () => {
  renderPublicPlans();
  renderPublicStaff();
  bindPlanSelection();
  bindMobileMenuAutoClose();
  updateSizes();
  updateSizesProfissional();
});