import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services";
import { onUnauthorized, tokenStore } from "../services/api";
import { setCurrency } from "../utils/format";

const AuthContext = createContext(null);
const THEME_KEY = "crm360.theme";

const applyTheme = (preference = "system") => {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0c0c0e" : "#fbfbfa");
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    return;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(tokenStore.get() ? "loading" : "guest");
  const [sessionMessage, setSessionMessage] = useState("");

  const acceptUser = useCallback((nextUser) => {
    setUser(nextUser);
    setCurrency(nextUser?.preferences?.currency);
    applyTheme(nextUser?.preferences?.theme);
  }, []);

  const clearSession = useCallback((message = "") => {
    tokenStore.clear();
    setUser(null);
    setStatus("guest");
    setSessionMessage(message);
  }, []);

  useEffect(() => {
    onUnauthorized((message) => clearSession(message));
  }, [clearSession]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    authService
      .me()
      .then((res) => {
        acceptUser(res.user);
        setStatus("authenticated");
      })
      .catch(() => clearSession());
  }, [acceptUser, clearSession]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let preference = "system";
      try {
        preference = localStorage.getItem(THEME_KEY) || "system";
      } catch {
        preference = "system";
      }
      if (preference === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const startSession = useCallback(
    ({ token, user: nextUser }) => {
      tokenStore.set(token);
      acceptUser(nextUser);
      setStatus("authenticated");
      setSessionMessage("");
    },
    [acceptUser]
  );

  const login = useCallback(async (credentials) => startSession(await authService.login(credentials)), [startSession]);
  const register = useCallback(async (payload) => startSession(await authService.register(payload)), [startSession]);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => null);
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      sessionMessage,
      isAuthenticated: status === "authenticated",
      login,
      register,
      logout,
      startSession,
      setUser: acceptUser,
      previewTheme: applyTheme,
    }),
    [user, status, sessionMessage, login, register, logout, startSession, acceptUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
