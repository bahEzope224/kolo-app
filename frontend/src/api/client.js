import axios from "axios";

// Axios instance definition without manual header syncing
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 10000,
});

let tokenGetter = null;

export const setAuthTokenGetter = (fn) => {
  tokenGetter = fn;
};

api.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Logic for 403 or 401 can go here
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
export const createTontine = (data) =>
  api.post(`/tontines/`, data);

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


export const addPayment         = (tontineId, userId, amount) =>
  api.post(`/payments/tontine/${tontineId}/add?member_id=${userId}&amount=${amount}`).then(r => r.data);
export const addBulkPayments    = (tontineId, data) =>
  api.post(`/payments/tontine/${tontineId}/add-bulk`, data).then(r => r.data);

export const getNotifications = () =>
  api.get(`/notifications/me`).then((r) => r.data);

export const markAllRead = () =>
  api.post(`/notifications/me/read-all`).then((r) => r.data);


export const remindLateMembers = (tontineId) =>
  api.post(`/payments/tontine/${tontineId}/remind-late`).then((r) => r.data);

export const getMemberTontines = () =>
  api.get(`/tontines/my-tontines`).then((r) => r.data);

export const createAccount   = (data)            => api.post("/users/", data).then(r => r.data);
export const getProfile      = ()           => api.get(`/users/me`).then(r => r.data);
export const updateProfile   = (data)     => api.put(`/users/me`, data).then(r => r.data);
export const getFinancials   = ()           => api.get(`/users/me/summary`).then(r => r.data);
export const removeMember    = (tontineId, memberId) => api.delete(`/members/${tontineId}/${memberId}`).then(r => r.data);
export const joinByCode      = (code)     => api.post(`/members/join/${code}`).then(r => r.data);

export const getTontineByCode = (code) =>
  api.get(`/tontines/join/${code}`).then(r => r.data);

export const onboarding = (data) =>
  api.post("/users/onboarding", data).then(r => r.data);

export const updateAvatar       = (avatar) =>
  api.put(`/users/me/avatar?avatar=${encodeURIComponent(avatar)}`).then(r => r.data);

export const deleteAccount      = () =>
  api.delete(`/users/me`).then(r => r.data);
export const syncUser = (name, email) => 
  api.post("/users/sync", { name, email }).then(r => r.data);

export const updateTontineSettings = (tontineId, data) =>
  api.put(`/tontines/${tontineId}/settings`, data).then(r => r.data);
export const deleteTontine = (tontineId) =>
  api.delete(`/tontines/${tontineId}`).then(r => r.data);

export const getAdminStats = () =>
  api.get("/users/admin/stats").then(r => r.data);
export const getAdminUsers = (search) =>
  api.get("/users/admin/users", { params: { search } }).then(r => r.data);

export const requestTransfer  = (data)               => api.post("/transfer/request", data).then(r => r.data);
export const respondTransfer  = (transferId, accept)  => api.post(`/transfer/${transferId}/respond?accept=${accept}`).then(r => r.data);
export const getPendingTransfers = ()           => api.get(`/transfer/my-pending`).then(r => r.data);
export const getTontinePendingTransfer = (tontineId)  => api.get(`/transfer/tontine/${tontineId}/pending`).then(r => r.data);