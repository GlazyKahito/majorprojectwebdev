import api from "./api";

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));

export const authService = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (payload) => api.post("/auth/register", payload),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.post("/auth/reset-password", { token, password }),
  updateProfile: (payload) => api.put("/auth/profile", payload),
  changePassword: (payload) => api.put("/auth/password", payload),
  updatePreferences: (payload) => api.put("/auth/preferences", payload),
};

export const dashboardService = {
  get: () => api.get("/dashboard"),
};

export const customerService = {
  list: (params) => api.get("/customers", { params: clean(params) }),
  get: (id) => api.get(`/customers/${id}`),
  create: (payload) => api.post("/customers", payload),
  update: (id, payload) => api.put(`/customers/${id}`, payload),
  remove: (id) => api.delete(`/customers/${id}`),
  activities: (id, params) => api.get(`/customers/${id}/activities`, { params: clean(params) }),
  addInteraction: (id, payload) => api.post(`/customers/${id}/activities`, payload),
  removeInteraction: (id, activityId) => api.delete(`/customers/${id}/activities/${activityId}`),
};

export const leadService = {
  list: (params) => api.get("/leads", { params: clean(params) }),
  pipeline: (params) => api.get("/leads", { params: clean({ ...params, view: "pipeline" }) }),
  get: (id) => api.get(`/leads/${id}`),
  create: (payload) => api.post("/leads", payload),
  update: (id, payload) => api.put(`/leads/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`/leads/${id}/status`, payload),
  remove: (id) => api.delete(`/leads/${id}`),
  convert: (id, payload) => api.post(`/leads/${id}/convert`, payload),
  addNote: (id, body) => api.post(`/leads/${id}/notes`, { body }),
  removeNote: (id, noteId) => api.delete(`/leads/${id}/notes/${noteId}`),
  activities: (id) => api.get(`/leads/${id}/activities`),
  addInteraction: (id, payload) => api.post(`/leads/${id}/activities`, payload),
};

export const taskService = {
  list: (params) => api.get("/tasks", { params: clean(params) }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (payload) => api.post("/tasks", payload),
  update: (id, payload) => api.put(`/tasks/${id}`, payload),
  remove: (id) => api.delete(`/tasks/${id}`),
};

export const userService = {
  team: () => api.get("/users/team"),
  list: (params) => api.get("/users", { params: clean(params) }),
  create: (payload) => api.post("/users", payload),
  update: (id, payload) => api.put(`/users/${id}`, payload),
  remove: (id, reassignTo) => api.delete(`/users/${id}`, { data: reassignTo ? { reassignTo } : {} }),
};

export const notificationService = {
  list: (params) => api.get("/notifications", { params: clean(params) }),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markUnread: (id) => api.put(`/notifications/${id}/unread`),
  markAllRead: () => api.put("/notifications/read-all"),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const searchService = {
  search: (q) => api.get("/search", { params: { q } }),
};
