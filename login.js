const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const errorEl = document.getElementById("login-error");
const signupModal = document.getElementById("signup-modal");
const signupForm = document.getElementById("signup-form");
const signupStatusEl = document.getElementById("signup-status");
const openSignupBtn = document.getElementById("open-signup-btn");
const closeSignupBtn = document.getElementById("close-signup-btn");
const cancelSignupBtn = document.getElementById("cancel-signup-btn");

function setStatus(element, message, kind = "") {
  if (!element) {
    return;
  }
  element.className = kind ? `csv-status ${kind}` : "csv-status";
  element.textContent = message;
}

function openSignupModal() {
  if (!signupModal) {
    return;
  }
  signupModal.hidden = false;
  setStatus(signupStatusEl, "");
  document.getElementById("signup-company")?.focus();
}

function closeSignupModal() {
  if (!signupModal) {
    return;
  }
  signupModal.hidden = true;
  signupForm?.reset();
  setStatus(signupStatusEl, "");
}

const existingSession = window.TSAuth.getSession();
if (existingSession) {
  window.location.href = window.TSAuth.routeForRole(existingSession.role);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";

  const result = await window.TSAuth.authenticate(emailInput.value, passwordInput.value);
  if (!result.ok) {
    errorEl.textContent = result.message || "Login failed.";
    return;
  }

  window.TSAuth.setSession(result.session);
  window.location.href = window.TSAuth.routeForRole(result.session.role);
});

openSignupBtn?.addEventListener("click", openSignupModal);
closeSignupBtn?.addEventListener("click", closeSignupModal);
cancelSignupBtn?.addEventListener("click", closeSignupModal);

signupModal?.addEventListener("click", (event) => {
  if (event.target === signupModal) {
    closeSignupModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && signupModal && !signupModal.hidden) {
    closeSignupModal();
  }
});

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(signupStatusEl, "");

  const company = document.getElementById("signup-company").value.trim();
  const disciplineTrade = document.getElementById("signup-discipline").value.trim();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const phoneNumber = document.getElementById("signup-phone").value.trim();
  const address = document.getElementById("signup-address").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("signup-confirm-password").value;

  if (!company || !disciplineTrade || !name || !email || !password || !confirmPassword) {
    setStatus(signupStatusEl, "Complete all required fields.", "error");
    return;
  }

  if (!window.TSAuth.passwordMeetsRequirements(password)) {
    setStatus(signupStatusEl, "Password must be at least 6 characters and include one capital letter and one symbol.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setStatus(signupStatusEl, "Password and confirmation do not match.", "error");
    return;
  }

  try {
    const result = await window.TSAuth.signUpAccount({
      company,
      disciplineTrade,
      name,
      email,
      phoneNumber,
      address,
      password,
    });
    setStatus(signupStatusEl, result.message || "Check your email to confirm your account.", "success");
    signupForm.reset();
  } catch (error) {
    console.error("Failed to create account:", error);
    setStatus(signupStatusEl, error.message || "Unable to create account.", "error");
  }
});
