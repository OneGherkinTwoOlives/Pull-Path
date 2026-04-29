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

const session = window.TSAuth.requireAuth(["super-admin", "project-admin", "consultant"]);
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
const disciplineSelect = document.getElementById("account-discipline");
const disciplineOtherField = document.getElementById("discipline-other-field");
const disciplineOtherInput = document.getElementById("account-discipline-other");

function setStatus(element, message, kind = "") {
  if (!element) {
    return;
  }
  element.className = kind ? `csv-status ${kind}` : "csv-status";
  element.textContent = message;
}

function populateDisciplineDropdown() {
  disciplineSelect.innerHTML = '<option value="">Select Discipline/Trade</option>';
  const sortedDisciplines = [...DISCIPLINES].sort((a, b) => a.localeCompare(b));
  sortedDisciplines.forEach((discipline) => {
    const option = document.createElement("option");
    option.value = discipline;
    option.textContent = discipline;
    disciplineSelect.appendChild(option);
  });
  const otherOption = document.createElement("option");
  otherOption.value = "other";
  otherOption.textContent = "Other";
  disciplineSelect.appendChild(otherOption);
}

function handleDisciplineChange() {
  if (disciplineSelect.value === "other") {
    disciplineOtherField.classList.remove("field-subset-disabled");
    disciplineOtherInput.disabled = false;
    disciplineOtherInput.focus();
  } else {
    disciplineOtherField.classList.add("field-subset-disabled");
    disciplineOtherInput.disabled = true;
    disciplineOtherInput.value = "";
  }
}

disciplineSelect.addEventListener("change", handleDisciplineChange);

function populateProfileForm(profile) {
  document.getElementById("account-company").value = profile?.company || "";
  document.getElementById("account-name").value = profile?.name || "";
  document.getElementById("account-email").value = profile?.email || "";
  document.getElementById("account-phone").value = profile?.phone || "";
  document.getElementById("account-address").value = profile?.address || "";
  
  const discipline = profile?.discipline || "";
  if (DISCIPLINES.includes(discipline)) {
    disciplineSelect.value = discipline;
    disciplineOtherField.classList.add("field-subset-disabled");
    disciplineOtherInput.disabled = true;
    disciplineOtherInput.value = "";
  } else if (discipline) {
    disciplineSelect.value = "other";
    disciplineOtherInput.value = discipline;
    disciplineOtherField.classList.remove("field-subset-disabled");
    disciplineOtherInput.disabled = false;
  } else {
    disciplineSelect.value = "";
    disciplineOtherField.classList.add("field-subset-disabled");
    disciplineOtherInput.disabled = true;
    disciplineOtherInput.value = "";
  }
}

async function loadAccountSettings() {
  const profile = await window.TSData.fetchUserProfile(session.email);
  populateProfileForm(profile);
  return profile;
}

function openPasswordModal() {
  passwordModal.hidden = false;
  setStatus(passwordStatusEl, "");
  passwordForm.reset();
  document.getElementById("account-new-password").focus();
}

function closePasswordModal() {
  passwordModal.hidden = true;
  setStatus(passwordStatusEl, "");
  passwordForm.reset();
}

async function handleContactSubmit(event) {
  event.preventDefault();
  
  const discipline = disciplineSelect.value === "other" 
    ? (disciplineOtherInput.value.trim() || "")
    : disciplineSelect.value;

  const profile = {
    email: session.email,
    company: document.getElementById("account-company").value.trim(),
    name: document.getElementById("account-name").value.trim(),
    phoneNumber: document.getElementById("account-phone").value.trim(),
    address: document.getElementById("account-address").value.trim(),
    disciplineTrade: discipline,
  };

  try {
    await window.TSData.saveUserProfile(profile);
    setStatus(contactStatusEl, "Profile updated successfully.", "success");
  } catch (error) {
    console.error("Failed to save profile:", error);
    setStatus(contactStatusEl, "Unable to save profile.", "error");
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();

  const newPassword = document.getElementById("account-new-password").value;
  const confirmPassword = document.getElementById("account-confirm-password").value;

  if (!newPassword || newPassword.length < 6) {
    setStatus(passwordStatusEl, "Password must be at least 6 characters.", "error");
    return;
  }

  if (!window.TSAuth.passwordMeetsRequirements(newPassword)) {
    setStatus(passwordStatusEl, "Password must include one capital letter and one symbol.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus(passwordStatusEl, "New password and confirmation do not match.", "error");
    return;
  }

  try {
    await window.TSAuth.completePasswordReset(newPassword);
    closePasswordModal();
    setStatus(contactStatusEl, "Password updated successfully.", "success");
  } catch (error) {
    console.error("Failed to update password:", error);
    setStatus(passwordStatusEl, "Unable to update password.", "error");
  }
}

document.getElementById("account-settings-logout-btn").addEventListener("click", () => {
  window.TSAuth.logout();
  window.location.href = "login.html";
});

contactForm.addEventListener("submit", handleContactSubmit);
passwordForm.addEventListener("submit", handlePasswordSubmit);

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
  populateDisciplineDropdown();
  await loadAccountSettings();
}

initializePage();