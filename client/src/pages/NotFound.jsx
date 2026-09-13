import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import Brand from "../components/layout/Brand";
import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="not-found">
      <Link to="/" className="not-found__brand">
        <Brand />
      </Link>
      <div className="not-found__body">
        <span className="not-found__code mono">404</span>
        <h1 className="not-found__title">This page doesn't exist</h1>
        <p className="muted">The link may be broken, or the page may have moved. Check the address or head back to familiar ground.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button variant="primary" to={isAuthenticated ? "/dashboard" : "/login"}>
            {isAuthenticated ? "Go to dashboard" : "Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
