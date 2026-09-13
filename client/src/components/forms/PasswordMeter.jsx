import { passwordStrength } from "../../utils/password";

export default function PasswordMeter({ password }) {
  if (!password) return null;
  const { score, label, color } = passwordStrength(password);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="password-meter" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} style={{ background: score >= step ? color : undefined }} />
        ))}
      </div>
      <span className="field__hint">{label} · Use 8+ characters with letters and numbers</span>
    </div>
  );
}
