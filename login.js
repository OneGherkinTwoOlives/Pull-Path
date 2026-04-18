const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const errorEl = document.getElementById("login-error");

const existingSession = window.TSAuth.getSession();
if (existingSession) {
  window.location.href = window.TSAuth.routeForRole(existingSession.role);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorEl.textContent = "";

  const result = window.TSAuth.authenticate(emailInput.value, passwordInput.value);
  if (!result.ok) {
    errorEl.textContent = result.message || "Login failed.";
    return;
  }

  window.TSAuth.setSession(result.session);
  window.location.href = window.TSAuth.routeForRole(result.session.role);
});
