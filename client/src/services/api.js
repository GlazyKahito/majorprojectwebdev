import axios from "axios";

const TOKEN_KEY = "crm360.token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      return;
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      return;
    }
  },
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

let unauthorizedHandler = null;

export const onUnauthorized = (handler) => {
  unauthorizedHandler = handler;
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    let message = data?.message;
    if (!message) {
      if (error.code === "ECONNABORTED") message = "The request timed out. Check your connection and try again.";
      else if (!error.response) message = "Unable to reach the server. Check your connection.";
      else message = "Something went wrong. Please try again.";
    }

    const normalized = new Error(message);
    normalized.status = status;
    normalized.details = data?.details;
    normalized.fieldErrors = Object.fromEntries((data?.details || []).map((d) => [d.field, d.message]));

    if (status === 401 && tokenStore.get() && !error.config?.url?.startsWith("/auth/login")) {
      unauthorizedHandler?.(message);
    }

    return Promise.reject(normalized);
  }
);

export default api;
