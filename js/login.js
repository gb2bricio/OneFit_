const usuario = document.getElementById("usuario");
const senha = document.getElementById("senha");
const btnLogin = document.getElementById("btnLogin");
const erroSenha = document.getElementById("erroSenha");
const lembrar = document.getElementById("lembrar");
const togglePasswordBtn = document.getElementById("togglePassword");
const form = document.getElementById("loginForm");

function onlyDigits(str) {
  return (str || "").replace(/\D/g, "");
}

/* =========================
   ACESSO ADMINISTRATIVO (teste)
   ========================= */
const ADMIN_EMAIL = "admin@onefit.com";
const ADMIN_SENHA = "123123";

/* =========================
   ACESSO PROFISSIONAL FIXO
   ========================= */
const PROFISSIONAL_EMAIL = "profissional@onefit.com";
const PROFISSIONAL_SENHA = "prof123";

/* =========================
   ACESSO ALUNO FIXO (teste)
   ========================= */
const USUARIO_EMAIL = "aluno@onefit.com";
const USUARIO_SENHA = "123123";

/* =========================
   HABILITAR BOTÃO
   ========================= */
function validarCampos() {
  if (!usuario || !senha || !btnLogin) return;

  if (usuario.value.trim() !== "" && senha.value.trim() !== "") {
    btnLogin.disabled = false;
    btnLogin.classList.add("ativo");
  } else {
    btnLogin.disabled = true;
    btnLogin.classList.remove("ativo");
  }
}

if (usuario) usuario.addEventListener("input", validarCampos);
if (senha) senha.addEventListener("input", validarCampos);

/* =========================
   CARREGAR DADOS SALVOS
   ========================= */
window.addEventListener("load", function () {
  const usuarioSalvo = localStorage.getItem("usuario");
  const senhaSalva = localStorage.getItem("senha");
  const senhaTemporaria = localStorage.getItem("senhaTemporaria");
  const cadastro = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");

  // prioridade 1: lembrar-me
  if (usuarioSalvo && senhaSalva) {
    usuario.value = usuarioSalvo;
    senha.value = senhaSalva;
    if (lembrar) lembrar.checked = true;
  }
  // prioridade 2: matrícula recém-finalizada ou senha redefinida
  else if (cadastro) {
    usuario.value = cadastro.email || cadastro.cpf || "";
    senha.value = senhaTemporaria || "";
  }

  validarCampos();
});

/* =========================
   MOSTRAR/OCULTAR SENHA
   ========================= */
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    const type = senha.type === "password" ? "text" : "password";
    senha.type = type;

    togglePasswordBtn.innerHTML =
      type === "password"
        ? "<i class='bx bx-show'></i>"
        : "<i class='bx bx-hide'></i>";
  });
}

/* =========================
   LOGIN
   ========================= */
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const usuarioDigitado = usuario.value.trim().toLowerCase();
  const senhaDigitada = senha.value;

  function aplicarLembrarSenha() {
    if (lembrar.checked) {
      localStorage.setItem("usuario", usuario.value);
      localStorage.setItem("senha", senha.value);
    } else {
      localStorage.removeItem("usuario");
      localStorage.removeItem("senha");
    }
    localStorage.removeItem("senhaTemporaria");
  }

  /* =========================
     LOGIN ADMINISTRATIVO
     ========================= */
  if (usuarioDigitado === ADMIN_EMAIL) {
    if (senhaDigitada !== ADMIN_SENHA) {
      erroSenha.textContent = "Usuário ou senha incorretos.";
      return;
    }
    erroSenha.textContent = "";
    aplicarLembrarSenha();
    localStorage.setItem(
      "usuarioLogado",
      JSON.stringify({
        tipo: "administrativo",
        nome: "Administrador",
        email: ADMIN_EMAIL,
        loginEm: new Date().toISOString(),
      })
    );
    window.location.href = "./backoffice.html";
    return;
  }

  /* =========================
     LOGIN DO PROFISSIONAL
     ========================= */
  if (usuarioDigitado === PROFISSIONAL_EMAIL) {
    if (senhaDigitada !== PROFISSIONAL_SENHA) {
      erroSenha.textContent = "Senha do profissional incorreta.";
      return;
    }

    erroSenha.textContent = "";
    aplicarLembrarSenha();
    localStorage.setItem(
      "usuarioLogado",
      JSON.stringify({
        tipo: "profissional",
        nome: "Profissional",
        email: PROFISSIONAL_EMAIL,
        loginEm: new Date().toISOString(),
      })
    );

    window.location.href = "./perfilProfissional.html";
    return;
  }

  /* =========================
     LOGIN ALUNO (credenciais de teste)
     ========================= */
  if (usuarioDigitado === USUARIO_EMAIL && senhaDigitada === USUARIO_SENHA) {
    erroSenha.textContent = "";
    aplicarLembrarSenha();
    const cadastro = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");
    const emailCad = (cadastro?.email || "").toLowerCase();
    const mergeCadastro = cadastro && emailCad === USUARIO_EMAIL;
    localStorage.setItem(
      "usuarioLogado",
      JSON.stringify({
        tipo: "usuario",
        nome: mergeCadastro ? cadastro.nome : "Aluno",
        email: USUARIO_EMAIL,
        cpf: mergeCadastro ? cadastro.cpf || cadastro.cpfNumerico || "" : "",
        celular: mergeCadastro ? cadastro.celular || "" : "",
        loginEm: new Date().toISOString(),
      })
    );
    window.location.href = "./perfilUsuario.html";
    return;
  }

  /* =========================
     LOGIN DO USUÁRIO COMUM
     ========================= */
  const cadastro = JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");

  if (!cadastro) {
    erroSenha.textContent = "Nenhum usuário cadastrado. Faça a matrícula primeiro.";
    return;
  }

  const cpfDigitado = onlyDigits(usuario.value);

  const emailCadastrado = (cadastro.email || "").toLowerCase();
  const cpfCadastrado = onlyDigits(cadastro.cpf || cadastro.cpfNumerico || "");
  const senhaCadastrada = cadastro.senha || "";

  const usuarioValido =
    usuarioDigitado === emailCadastrado || cpfDigitado === cpfCadastrado;

  const senhaValida = senhaDigitada === senhaCadastrada;

  if (!usuarioValido || !senhaValida) {
    erroSenha.textContent = "Usuário ou senha incorretos.";
    return;
  }

  erroSenha.textContent = "";
  aplicarLembrarSenha();

  localStorage.setItem(
    "usuarioLogado",
    JSON.stringify({
      tipo: "usuario",
      nome: cadastro.nome,
      email: cadastro.email,
      cpf: cadastro.cpf,
      celular: cadastro.celular,
      loginEm: new Date().toISOString(),
    })
  );

  window.location.href = "./perfilUsuario.html";
});