import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp, verifyOtp } from "../api/client";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const sendCode = async (phone) => {
    setLoading(true);
    setError("");
    try {
      await requestOtp(phone);
      return true;
    } catch (e) {
      setError(e.response?.data?.detail || "Numéro non reconnu. Contacte ton gérant.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (phone, code) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await verifyOtp(phone, code);
      // Sauvegarde dans localStorage ET sessionStorage (fallback PWA)
      const token = data.access_token;
      const user = JSON.stringify({ id: data.user_id, name: data.name });
      try {
        localStorage.setItem("kolo_token", token);
        localStorage.setItem("kolo_user", user);
      } catch (e) {
        sessionStorage.setItem("kolo_token", token);
        sessionStorage.setItem("kolo_user", user);
      }
      // Force navigation + reload pour PWA
      window.location.href = "/";
      return true;
    } catch (e) {
      setError("Code incorrect ou expiré. Réessaie.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("kolo_token");
    localStorage.removeItem("kolo_user");
    sessionStorage.removeItem("kolo_token");
    sessionStorage.removeItem("kolo_user");
    window.location.href = "/login";
  };

  const getUser = () => {
    try {
      const raw = localStorage.getItem("kolo_user") ||
                  sessionStorage.getItem("kolo_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const getToken = () => {
    return localStorage.getItem("kolo_token") ||
           sessionStorage.getItem("kolo_token");
  };

  return { sendCode, verifyCode, logout, getUser, getToken, loading, error, setError };
}