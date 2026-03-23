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
      localStorage.setItem("kolo_token", data.access_token);
      localStorage.setItem("kolo_user", JSON.stringify({ id: data.user_id, name: data.name }));
      navigate("/");
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
    navigate("/login");
  };

  const getUser = () => {
    const raw = localStorage.getItem("kolo_user");
    return raw ? JSON.parse(raw) : null;
  };

  return { sendCode, verifyCode, logout, getUser, loading, error, setError };
}
