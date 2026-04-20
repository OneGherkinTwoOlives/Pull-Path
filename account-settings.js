const session = window.TSAuth.requireAuth(["super-admin", "project-admin"]);
if (!session) {
  throw new Error("Unauthorized");
}

const backLink = document.getElementById("account-settings-back-link");
const emailEl = document.getElementById("account-settings-email");
const contactForm = document.getElementById("account-contact-form");
const contactStatusEl = document.getElementById("account-contact-status");
const passwordModal = document.getElementById("password-modal");
const passwordForm = document.getElementById("password-form");
const passwordStatusEl = document.getElementById("password-status");
const openPasswordModalBtn = document.getElementById("open-password-modal-btn");
const closePasswordModalBtn = document.getElementById("close-password-modal-btn");
const cancelPasswordModalBtn = document.getElementById("cancel-password-modal-btn");

function splitTelephoneNumbers(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setStatus(element, message, kind = "") {
  if (!element) {
    return;
  }
  element.className = kind ? `csv-status ${kind}` : "csv-status";
  element.textContent = message;
}

function populateContactForm(account) {
  document.getElementById("account-company").value = account?.company || "";
  document.getElementById("account-position").value = account?.position || "";
  document.getElementById("account-telephone-numbers").value = Array.isArray(account?.telephoneNumbers)
    ? account.telephoneNumbers.join("\n")
    : "";
  document.getElementById("account-address").value = account?.address || "";
}

async function loadAccountSettings() {
  const account = await window.TSAuth.resolveAdminAccount(session.email);
  populateContactForm(account);
  return account;
}

function openPasswordModal() {
  passwordModal.hidden = false;
  setStatus(passwordStatusEl, "");
  passwordForm.reset();
  document.getElementById("account-current-password").focus();
}

function closePasswordModal() {
  passwordModal.hidden = true;
  setStatus(passwordStatusEl, "");
  passwordForm.reset();
}

async function handleContactSubmit(event) {
  event.preventDefault();
  const existing = await window.TSAuth.resolveAdminAccount(session.email);

  await window.TSData.saveAdminAccount({
    email: session.email,
    password: existing?.password || window.TSAuth.DEFAULT_PASSWORD,
    company: document.getElementById("account-company").value.trim(),
    position: document.getElementById("account-position").value.trim(),
    telephoneNumbers: splitTelephoneNumbers(document.getElementById("account-telephone-numbers").value),
    address: document.getElementById("account-address").value.trim(),
    createdAt: existing?.createdAt || null,
  });

  setStatus(contactStatusEl, "Contact details saved.", "success");
}

async function handlePasswordSubmit(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("account-current-password").value;
  const newPassword = document.getElementById("account-new-password").value;
  const confirmPassword = document.getElementById("account-confirm-password").value;
  const existing = await window.TSAuth.resolveAdminAccount(session.email);
  const expectedPassword = existing?.password || window.TSAuth.DEFAULT_PASSWORD;

  if (currentPassword !== expectedPassword) {
    setStatus(passwordStatusEl, "Current password is incorrect.", "error");
    return;
  }

  if (!newPassword || newPassword.length < 3) {
    setStatus(passwordStatusEl, "New password must be at least 3 characters.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus(passwordStatusEl, "New password and confirmation do not match.", "error");
    return;
  }

  await window.TSData.saveAdminAccount({
    email: session.email,
    password: newPassword,
    company: existing?.company || "",
    position: existing?.position || "",
    telephoneNumbers: Array.isArray(existing?.telephoneNumbers) ? existing.telephoneNumbers : [],
    address: existing?.address || "",
    createdAt: existing?.createdAt || null,
  });

  closePasswordModal();
  setStatus(contactStatusEl, "Password updated.", "success");
}

document.getElementById("account-settings-logout-btn").addEventListener("click", () => {
  window.TSAuth.logout();
  window.location.href = "login.html";
});

contactForm.addEventListener("submit", async (event) => {
  try {
    await handleContactSubmit(event);
  } catch (error) {
    console.error("Failed to save contact details:", error);
    setStatus(contactStatusEl, "Unable to save contact details.", "error");
  }
});

passwordForm.addEventListener("submit", async (event) => {
  try {
    await handlePasswordSubmit(event);
  } catch (error) {
    console.error("Failed to save password:", error);
    setStatus(passwordStatusEl, "Unable to update password.", "error");
  }
});

openPasswordModalBtn.addEventListener("click", openPasswordModal);
closePasswordModalBtn.addEventListener("click", closePasswordModal);
cancelPasswordModalBtn.addEventListener("click", closePasswordModal);
passwordModal.addEventListener("click", (event) => {
  if (event.target === passwordModal) {
    closePasswordModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !passwordModal.hidden) {
    closePasswordModal();
  }
});

async function initializePage() {
  if (window.TSData?.initialize) {
    await window.TSData.initialize();
  }

  backLink.href = window.TSAuth.routeForRole(session.role);
  emailEl.textContent = `Signed in as ${session.email}`;
  await loadAccountSettings();
}

initializePage();