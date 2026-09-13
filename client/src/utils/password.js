export const passwordStrength = (password = "") => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) score += 1;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["var(--border)", "var(--danger)", "var(--warning)", "var(--accent)", "var(--success)"];
  return { score, label: labels[score], color: colors[score] };
};

export const validatePassword = (password) => {
  if (!password) return "Enter a password";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(password)) return "Password must include a letter";
  if (!/\d/.test(password)) return "Password must include a number";
  return "";
};
