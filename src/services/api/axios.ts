import axios from "axios";

const defaultBase = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : "http://127.0.0.1:8000";
const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) || defaultBase;
const baseURL = base.replace(/\/+$/, "") + "/api/";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pending: Array<(t: string) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) return Promise.reject(error);
      if (isRefreshing) {
        return new Promise((resolve) => {
          pending.push((t) => {
            error.config.headers["Authorization"] = `Bearer ${t}`;
            resolve(api.request(error.config));
          });
        });
      }
      isRefreshing = true;
      try {
        const res = await axios.post(baseURL + "auth/refresh/", { refresh });
        const newAccess = res.data?.access;
        if (newAccess) {
          localStorage.setItem("access_token", newAccess);
          error.config.headers["Authorization"] = `Bearer ${newAccess}`;
          pending.forEach((fn) => fn(newAccess));
          pending = [];
          return api.request(error.config);
        }
      } catch (e) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/auth";
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

