const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const errorEl = document.getElementById("login-error");
const inviteStatusEl = document.getElementById("login-invite-status");
const signupModal = document.getElementById("signup-modal");
const signupForm = document.getElementById("signup-form");
const signupStatusEl = document.getElementById("signup-status");
const openSignupBtn = document.getElementById("open-signup-btn");
const closeSignupBtn = document.getElementById("close-signup-btn");
const cancelSignupBtn = document.getElementById("cancel-signup-btn");
const forgotModal = document.getElementById("forgot-modal");
const forgotForm = document.getElementById("forgot-form");
const forgotStatusEl = document.getElementById("forgot-status");
const forgotEmailInput = document.getElementById("forgot-email");
const openForgotBtn = document.getElementById("open-forgot-btn");
const closeForgotBtn = document.getElementById("close-forgot-btn");
const cancelForgotBtn = document.getElementById("cancel-forgot-btn");
const resetModal = document.getElementById("reset-modal");
const resetForm = document.getElementById("reset-form");
const resetStatusEl = document.getElementById("reset-status");
const resetPasswordInput = document.getElementById("reset-password");
const resetConfirmInput = document.getElementById("reset-confirm-password");
const closeResetBtn = document.getElementById("close-reset-btn");
const cancelResetBtn = document.getElementById("cancel-reset-btn");
const signupSuccessModal = document.getElementById("signup-success-modal");
const signupSuccessOkBtn = document.getElementById("signup-success-ok-btn");
const signupDisciplineSelect = document.getElementById("signup-discipline");
const signupDisciplineOtherField = document.getElementById("signup-discipline-other-field");
const signupDisciplineOtherInput = document.getElementById("signup-discipline-other");
const termsModal = document.getElementById("terms-modal");
const openTermsBtn = document.getElementById("open-terms-btn");
const closeTermsBtn = document.getElementById("close-terms-btn");
const acceptTermsBtn = document.getElementById("accept-terms-btn");
const declineTermsBtn = document.getElementById("decline-terms-btn");
const termsCheckbox = document.getElementById("signup-terms-checkbox");

const DISCIPLINES = [
  "Architect",
  "Landscape",
  "Mechanical",
  "Electrical",
  "Structural",
  "Owner/Developer",
  "Interior Design",
  "Civil",
  "Envelope",
  "Energy",
  "Geotechnical",
  "Code",
  "Acoustic",
  "Commissioning",
  "Elevator",
  "Environmental",
  "Rendering",
  "Survey",
  "Sustainability",
  "Traffic",
  "Waste",
  "Wind",
];

function normalizeEmailValue(value) {
  return String(value || "").trim().toLowerCase();
}

function inviteContext() {
  const params = new URLSearchParams(window.location.search);
  return {
    isInvite: params.get("invite") === "1",
    invitedEmail: normalizeEmailValue(params.get("email")),
    projectId: String(params.get("projectId") || "").trim(),
  };
}

async function applyInviteContext() {
  const context = inviteContext();
  if (!context.isInvite || !context.invitedEmail) {
    return;
  }

  emailInput.value = context.invitedEmail;
  const signupEmailInput = document.getElementById("signup-email");
  if (signupEmailInput) {
    signupEmailInput.value = context.invitedEmail;
  }

  if (window.TSData?.initialize) {
    await window.TSData.initialize();
  }

  const existingProfile = window.TSData?.fetchUserProfile
    ? await window.TSData.fetchUserProfile(context.invitedEmail)
    : null;
  const existingAdminAccount = window.TSData?.fetchAdminAccount
    ? await window.TSData.fetchAdminAccount(context.invitedEmail)
    : null;
  const hasExistingAccount = !!(existingProfile?.authUserId || String(existingAdminAccount?.password || "").trim());

  if (hasExistingAccount) {
    setStatus(inviteStatusEl, "You were invited to a PullPath project. Log in with your existing account to continue.", "success");
    passwordInput.focus();
    return;
  }

  setStatus(inviteStatusEl, "You were invited to a PullPath project. Create your account to get started.", "success");
  openSignupModal();
}

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
  updateSignupDisciplineOtherState();
}

function populateSignupDisciplineOptions() {
  if (!signupDisciplineSelect) {
    return;
  }

  signupDisciplineSelect.innerHTML = '<option value="">Select Discipline/Trade</option>';
  const sortedDisciplines = [...DISCIPLINES].sort((a, b) => a.localeCompare(b));

  sortedDisciplines.forEach((discipline) => {
    const option = document.createElement("option");
    option.value = discipline;
    option.textContent = discipline;
    signupDisciplineSelect.appendChild(option);
  });

  const otherOption = document.createElement("option");
  otherOption.value = "other";
  otherOption.textContent = "Other";
  signupDisciplineSelect.appendChild(otherOption);
}

function updateSignupDisciplineOtherState() {
  if (!signupDisciplineSelect || !signupDisciplineOtherField || !signupDisciplineOtherInput) {
    return;
  }

  if (signupDisciplineSelect.value === "other") {
    signupDisciplineOtherField.classList.remove("field-subset-disabled");
    signupDisciplineOtherInput.disabled = false;
    signupDisciplineOtherInput.focus();
    return;
  }

  signupDisciplineOtherField.classList.add("field-subset-disabled");
  signupDisciplineOtherInput.disabled = true;
  signupDisciplineOtherInput.value = "";
}

function openTermsModal() {
  if (!termsModal) {
    return;
  }
  termsModal.hidden = false;
}

function closeTermsModal() {
  if (!termsModal) {
    return;
  }
  termsModal.hidden = true;
}

function openForgotModal() {
  if (!forgotModal) {
    return;
  }
  forgotModal.hidden = false;
  setStatus(forgotStatusEl, "");
  forgotEmailInput.value = emailInput.value.trim();
  forgotEmailInput.focus();
}

function closeForgotModal() {
  if (!forgotModal) {
    return;
  }
  forgotModal.hidden = true;
  forgotForm?.reset();
  setStatus(forgotStatusEl, "");
}

function openResetModal() {
  if (!resetModal) {
    return;
  }
  resetModal.hidden = false;
  setStatus(resetStatusEl, "");
  resetPasswordInput?.focus();
}

function closeResetModal() {
  if (!resetModal) {
    return;
  }
  resetModal.hidden = true;
  resetForm?.reset();
  setStatus(resetStatusEl, "");
}

function openSignupSuccessModal() {
  if (!signupSuccessModal) {
    return;
  }
  signupSuccessModal.hidden = false;
}

function closeSignupSuccessModal() {
  if (!signupSuccessModal) {
    return;
  }
  signupSuccessModal.hidden = true;
}

const isRecoveryLink = !!window.TSAuth.isRecoveryLink?.();

const existingSession = window.TSAuth.getSession();
if (existingSession && !isRecoveryLink) {
  window.location.href = window.TSAuth.routeForRole(existingSession.role);
}

if (isRecoveryLink) {
  openResetModal();
  setStatus(resetStatusEl, "Recovery link verified. Set your new password.");
}

applyInviteContext().catch((error) => {
  console.error("Failed to apply invite context:", error);
});

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
openTermsBtn?.addEventListener("click", openTermsModal);
closeTermsBtn?.addEventListener("click", closeTermsModal);
declineTermsBtn?.addEventListener("click", closeTermsModal);
acceptTermsBtn?.addEventListener("click", () => {
  if (termsCheckbox) {
    termsCheckbox.checked = true;
  }
  closeTermsModal();
});
termsModal?.addEventListener("click", (event) => {
  if (event.target === termsModal) {
    closeTermsModal();
  }
});
openForgotBtn?.addEventListener("click", openForgotModal);
closeForgotBtn?.addEventListener("click", closeForgotModal);
cancelForgotBtn?.addEventListener("click", closeForgotModal);
closeResetBtn?.addEventListener("click", closeResetModal);
cancelResetBtn?.addEventListener("click", closeResetModal);
signupSuccessOkBtn?.addEventListener("click", closeSignupSuccessModal);
signupDisciplineSelect?.addEventListener("change", updateSignupDisciplineOtherState);

forgotModal?.addEventListener("click", (event) => {
  if (event.target === forgotModal) {
    closeForgotModal();
  }
});

resetModal?.addEventListener("click", (event) => {
  if (event.target === resetModal) {
    closeResetModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (termsModal && !termsModal.hidden) {
    closeTermsModal();
    return;
  }

  if (signupSuccessModal && !signupSuccessModal.hidden) {
    closeSignupSuccessModal();
    return;
  }

  if (signupModal && !signupModal.hidden) {
    closeSignupModal();
    return;
  }

  if (forgotModal && !forgotModal.hidden) {
    closeForgotModal();
    return;
  }

  if (resetModal && !resetModal.hidden) {
    closeResetModal();
  }
});

forgotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(forgotStatusEl, "");

  const email = forgotEmailInput.value.trim();
  if (!email) {
    setStatus(forgotStatusEl, "Enter your email address.", "error");
    return;
  }

  try {
    const result = await window.TSAuth.requestPasswordReset(email);
    setStatus(forgotStatusEl, result.message || "If an account exists for this email, a recovery email has been sent.", "success");
  } catch (error) {
    console.error("Failed to request password reset:", error);
    setStatus(forgotStatusEl, error.message || "Unable to send recovery email.", "error");
  }
});

resetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(resetStatusEl, "");

  const password = resetPasswordInput.value;
  const confirmPassword = resetConfirmInput.value;

  if (!window.TSAuth.passwordMeetsRequirements(password)) {
    setStatus(resetStatusEl, "Password must be at least 6 characters and include one capital letter and one symbol.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setStatus(resetStatusEl, "Password and confirmation do not match.", "error");
    return;
  }

  try {
    const result = await window.TSAuth.completePasswordReset(password);
    setStatus(resetStatusEl, result.message || "Password updated. Please log in.", "success");
    setStatus(errorEl, "Password updated. Please log in with your new password.", "success");
    resetForm.reset();
    closeResetModal();
  } catch (error) {
    console.error("Failed to update password:", error);
    setStatus(resetStatusEl, error.message || "Unable to update password.", "error");
  }
});

populateSignupDisciplineOptions();
updateSignupDisciplineOtherState();

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(signupStatusEl, "");

  const company = document.getElementById("signup-company").value.trim();
  const disciplineSelection = signupDisciplineSelect?.value || "";
  const disciplineOther = signupDisciplineOtherInput?.value.trim() || "";
  const disciplineTrade = disciplineSelection === "other" ? disciplineOther : disciplineSelection;
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

  if (!termsCheckbox?.checked) {
    setStatus(signupStatusEl, "You must agree to the Terms and Conditions to create an account.", "error");
    return;
  }

  try {
    await window.TSAuth.signUpAccount({
      company,
      disciplineTrade,
      name,
      email,
      phoneNumber,
      address,
      password,
    });
    closeSignupModal();
    openSignupSuccessModal();
  } catch (error) {
    console.error("Failed to create account:", error);
    setStatus(signupStatusEl, error.message || "Unable to create account.", "error");
  }
});
