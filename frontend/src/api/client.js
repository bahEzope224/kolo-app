import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kolo_token") ||
                sessionStorage.getItem("kolo_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("kolo_token");
      sessionStorage.removeItem("kolo_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────
export const requestOtp = (phone) =>
  api.post("/auth/request-otp", { phone });

export const verifyOtp = (phone, code) =>
  api.post("/auth/verify-otp", { phone, code });

// ── Tontines ──────────────────────────────────────────────
export const getTontine = (id) => api.get(`/tontines/${id}`);
export const createTontine = (data, managerId) =>
  api.post(`/tontines/?manager_id=${managerId}`, data);

// ── Membres ───────────────────────────────────────────────
export const getMembers = (tontineId) => api.get(`/members/${tontineId}`);

// ── Versements ────────────────────────────────────────────
export const getCyclePayments = (cycleId) =>
  api.get(`/payments/cycle/${cycleId}`);


export const getTontineDashboard = (tontineId) =>
  api.get(`/tontines/${tontineId}/dashboard`).then((r) => r.data);


export const drawBeneficiary = (tontineId, memberId = null) => {
  const url = memberId
    ? `/payments/tontine/${tontineId}/draw?member_id=${memberId}`
    : `/payments/tontine/${tontineId}/draw`;
  return api.post(url).then(r => r.data);
};

export const closeCycle = (tontineId) =>
  api.post(`/payments/tontine/${tontineId}/close-cycle`).then((r) => r.data);

export const inviteMember = (tontineId, data) =>
  api.post(`/members/${tontineId}/invite`, data).then((r) => r.data);


export const validatePayment = (paymentId) =>
  api.post(`/payments/${paymentId}/validate`).then((r) => r.data);


export const addPayment = (tontineId, memberId, amount) =>
  api.post(`/payments/tontine/${tontineId}/add?member_id=${memberId}&amount=${amount}`)
    .then((r) => r.data);

export const getNotifications = (userId) =>
  api.get(`/notifications/${userId}`).then((r) => r.data);

export const markAllRead = (userId) =>
  api.post(`/notifications/${userId}/read-all`).then((r) => r.data);


export const remindLateMembers = (tontineId) =>
  api.post(`/payments/tontine/${tontineId}/remind-late`).then((r) => r.data);

export const getMemberTontines = (userId) =>
  api.get(`/tontines/member/${userId}`).then((r) => r.data);

export const createAccount   = (data)            => api.post("/users/", data).then(r => r.data);
export const getProfile      = (userId)           => api.get(`/users/${userId}`).then(r => r.data);
export const updateProfile   = (userId, data)     => api.put(`/users/${userId}`, data).then(r => r.data);
export const getFinancials   = (userId)           => api.get(`/users/${userId}/summary`).then(r => r.data);
export const removeMember    = (tontineId, memberId) => api.delete(`/members/${tontineId}/${memberId}`).then(r => r.data);
export const joinByCode      = (code, userId)     => api.post(`/members/join/${code}?user_id=${userId}`).then(r => r.data);

export const getTontineByCode = (code) =>
  api.get(`/tontines/join/${code}`).then(r => r.data);

export const onboarding = (data) =>
  api.post("/users/onboarding", data).then(r => r.data);

export const updateAvatar       = (userId, avatar) =>
  api.put(`/users/${userId}/avatar?avatar=${encodeURIComponent(avatar)}`).then(r => r.data);

export const deleteAccount      = (userId) =>
  api.delete(`/users/${userId}`).then(r => r.data);

export const updateTontineSettings = (tontineId, data) =>
  api.put(`/tontines/${tontineId}/settings`, data).then(r => r.data);

export const getAdminStats = () =>
  api.get("/admin/stats").then(r => r.data);