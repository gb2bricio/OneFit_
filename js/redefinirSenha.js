const EMAIL_VALIDO = "onefit@gmail.com";

const email = document.getElementById("email");
const erroEmail = document.getElementById("erroEmail");
const btnEnviar = document.getElementById("btnEnviar");
const msgEnviado = document.getElementById("msgEnviado");
const irNovaSenha = document.getElementById("irNovaSenha");

const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");

const erroSenha = document.getElementById("erroSenha");
const btnSalvar = document.getElementById("btnSalvar");
const msgSucesso = document.getElementById("msgSucesso");

const screenRequest = document.getElementById("screen-request");
const screenNewPass = document.getElementById("screen-newpass");

function validarEmailFormato(emailValor) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(emailValor);
}

function getCadastro() {
  return JSON.parse(localStorage.getItem("usuarioCadastrado") || "null");
}

function getEmailValidoParaRedefinicao() {
  const cadastro = getCadastro();

  // prioridade para o e-mail do usuário cadastrado
  if (cadastro && cadastro.email) {
    return cadastro.email.trim().toLowerCase();
  }

  // fallback para o e-mail fixo antigo
  return EMAIL_VALIDO.toLowerCase();
}

email.addEventListener("input", () => {
  const valor = email.value.trim().toLowerCase();
  const emailValido = getEmailValidoParaRedefinicao();

  erroEmail.innerText = "";
  msgEnviado.innerText = "";
  btnEnviar.disabled = true;
  btnEnviar.classList.remove("ativo");
  irNovaSenha.style.display = "none";

  if (valor === "") return;

  if (!validarEmailFormato(valor)) {
    erroEmail.innerText = "Formato de e-mail inválido.";
    return;
  }

  if (valor !== emailValido) {
    erroEmail.innerText = "Este e-mail não existe, digite um e-mail válido.";
    return;
  }

  btnEnviar.disabled = false;
  btnEnviar.classList.add("ativo");
});

btnEnviar.addEventListener("click", () => {
  msgEnviado.innerText = "Link de redefinição enviado para o e-mail cadastrado.";
  irNovaSenha.style.display = "block";
});

irNovaSenha.addEventListener("click", (e) => {
  e.preventDefault();

  screenRequest.classList.remove("active");
  screenNewPass.classList.add("active");
});

function validarSenha() {
  const s1 = senha.value;
  const s2 = confirmarSenha.value;

  erroSenha.innerText = "";
  btnSalvar.disabled = true;
  btnSalvar.classList.remove("ativo");

  if (s1 === "" || s2 === "") return;

  if (s1 !== s2) {
    erroSenha.innerText = "As senhas não coincidem.";
    return;
  }

  btnSalvar.disabled = false;
  btnSalvar.classList.add("ativo");
}

senha.addEventListener("input", validarSenha);
confirmarSenha.addEventListener("input", validarSenha);

btnSalvar.addEventListener("click", (e) => {
  e.preventDefault();

  const novaSenha = senha.value;
  const emailDigitado = email.value.trim().toLowerCase();
  const cadastro = getCadastro();

  if (novaSenha === "" || confirmarSenha.value === "") {
    erroSenha.innerText = "Preencha os dois campos de senha.";
    return;
  }

  if (novaSenha !== confirmarSenha.value) {
    erroSenha.innerText = "As senhas não coincidem.";
    return;
  }

  if (!cadastro) {
    msgSucesso.innerHTML = `
Senha redefinida com sucesso!<br>
Redirecionando para o login...
`;

    // fallback: guarda uma senha temporária para o login, caso não exista cadastro
    localStorage.setItem("senhaTemporaria", novaSenha);

    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);

    return;
  }

  // atualiza a senha do usuário cadastrado
  cadastro.senha = novaSenha;

  localStorage.setItem("usuarioCadastrado", JSON.stringify(cadastro));

  // já deixa usuário/senha preparados para a tela de login
  localStorage.setItem("usuario", cadastro.email || emailDigitado || "");
  localStorage.setItem("senha", novaSenha);
  localStorage.setItem("senhaTemporaria", novaSenha);

  msgSucesso.innerHTML = `
Senha redefinida com sucesso!<br>
Redirecionando para o login...
`;

  setTimeout(() => {
    window.location.href = "login.html";
  }, 2000);
});

function toggle(input) {
  input.type = input.type === "password" ? "text" : "password";
}

document.getElementById("toggleSenha").onclick = () => toggle(senha);
document.getElementById("toggleConfirmar").onclick = () => toggle(confirmarSenha);