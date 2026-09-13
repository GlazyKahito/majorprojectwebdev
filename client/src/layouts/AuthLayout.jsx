import { Link } from "react-router-dom";
import Brand from "../components/layout/Brand";
import { LEAD_STAGES } from "../utils/constants";

const PREVIEW_ROWS = [
  { name: "Clearwater Utilities", stage: "proposal", value: "$132,000" },
  { name: "Tidewater Insurance", stage: "qualified", value: "$105,000" },
  { name: "Helix Biosciences", stage: "qualified", value: "$88,000" },
  { name: "Monsoon Beverages", stage: "won", value: "$41,000" },
];

function ProductPreview() {
  return (
    <div className="auth__preview" aria-hidden="true">
      <div className="auth__preview-head">
        <span style={{ fontWeight: 500, color: "var(--text)" }}>Pipeline this quarter</span>
        <span>Updated just now</span>
      </div>
      <div className="auth__preview-stats">
        <div className="auth__preview-stat">
          <span>Open pipeline</span>
          <strong className="num">$885.8k</strong>
        </div>
        <div className="auth__preview-stat">
          <span>Win rate</span>
          <strong className="num">75%</strong>
        </div>
        <div className="auth__preview-stat">
          <span>Closed deals</span>
          <strong className="num">9</strong>
        </div>
      </div>
      <div className="auth__preview-rows">
        {PREVIEW_ROWS.map((row) => {
          const stage = LEAD_STAGES.find((s) => s.value === row.stage);
          return (
            <div className="auth__preview-row" key={row.name}>
              <span className="truncate">{row.name}</span>
              <span className="status" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                <span className="status__dot" style={{ background: stage.color }} />
                {stage.label}
              </span>
              <span className="num" style={{ fontWeight: 500, minWidth: 72, textAlign: "right" }}>
                {row.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthLayout({ children, aside }) {
  return (
    <div className="auth">
      <div className="auth__form-side">
        <Link to="/login" style={{ alignSelf: "flex-start" }}>
          <Brand />
        </Link>
        <div className="auth__form-wrap">
          <div className="auth__form">{children}</div>
        </div>
        <div className="auth__legal">
          <span>© {new Date().getFullYear()} CRM360</span>
          <span>Customer relationship management for growing teams</span>
        </div>
      </div>
      <div className="auth__visual">
        <div className="auth__visual-inner">
          <div className="auth__eyebrow">Sales workspace</div>
          <h2 className="auth__headline">Every customer, lead and follow-up in one place.</h2>
          <p className="auth__lede">Track deals through your pipeline, assign work across the team, and see what needs attention today.</p>
          <ProductPreview />
          {aside}
        </div>
      </div>
    </div>
  );
}
