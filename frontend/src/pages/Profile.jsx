import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, getFinancials, joinByCode } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "../components/NotificationBell";
import AppHeader from "../components/AppHeader";

export default function Profile() {
  const navigate = useNavigate();
  const { getUser, logout } = useAuth();
  const user = getUser();
  const qc = useQueryClient();

  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState({ name: "", phone: "" });
  const [joinCode, setJoinCode]   = useState("");
  const [joinMsg, setJoinMsg]     = useState("");
  const [joinError, setJoinError] = useState("");
  const [toast, setToast]         = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(user.id),
    enabled: !!user?.id,
    onSuccess: (d) => setForm({ name: d.name, phone: d.phone }),
  });

  const { data: summary } = useQuery({
    queryKey: ["summary", user?.id],
    queryFn: () => getFinancials(user.id),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateProfile(user.id, data),
    onSuccess: (data) => {
      // Met à jour le localStorage
      localStorage.setItem("kolo_user", JSON.stringify({ ...user, name: data.name }));
      qc.invalidateQueries(["profile", user.id]);
      setEditMode(false);
      showToast("Profil mis à jour ✓");
    },
    onError: (e) => showToast(e.response?.data?.detail || "Erreur"),
  });

  const joinMutation = useMutation({
    mutationFn: () => joinByCode(joinCode.trim().toUpperCase(), user.id),
    onSuccess: (data) => {
      setJoinMsg(data.message);
      setJoinCode("");
      setJoinError("");
      qc.invalidateQueries(["tontines", user.id]);
      showToast(data.message);
    },
    onError: (e) => setJoinError(e.response?.data?.detail || "Code invalide"),
  });

  const balance = summary ? summary.balance : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-5 py-4 flex items-center gap-4 sticky top-0 z-10">
      <AppHeader title="Mon profil" back="/" userId={user?.id} />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Profil */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 px-5 py-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 font-black text-white text-xl">
              {profile?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </div>
            <div className="text-white font-black text-xl">{profile?.name}</div>
            <div className="text-emerald-100 text-sm mt-0.5">{profile?.phone}</div>
          </div>

          <div className="p-5">
            {!editMode ? (
              <button onClick={() => setEditMode(true)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition">
                ✏️ Modifier mon profil
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Prénom et nom</label>
                  <input type="text" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Téléphone</label>
                  <input type="tel" value={form.phone} inputMode="tel"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditMode(false)}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm transition min-h-0">
                    Annuler
                  </button>
                  <button onClick={() => updateMutation.mutate(form)}
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition min-h-0">
                    {updateMutation.isPending ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rejoindre via code */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-black text-slate-800 text-base mb-3">🔗 Rejoindre une tontine</h3>
          <p className="text-slate-500 text-sm mb-4">Entre le code partagé par ton gérant.</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ex: ABC123"
              value={joinCode}
              maxLength={6}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); setJoinMsg(""); }}
              className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-black text-center tracking-widest uppercase focus:outline-none focus:border-emerald-400 transition"
            />
            <button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending || joinCode.length < 4}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black px-5 py-3 rounded-xl transition min-h-0"
            >
              {joinMutation.isPending ? "…" : "Rejoindre"}
            </button>
          </div>
          {joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
          {joinMsg   && <p className="text-emerald-600 text-sm font-semibold mt-2">✅ {joinMsg}</p>}
        </div>

        {/* Résumé financier */}
        {summary && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base">📊 Résumé financier</h3>
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                { label: "Total versé",  value: `${summary.total_paid}€`,     color: "text-slate-800" },
                { label: "Total reçu",   value: `${summary.total_received}€`,  color: "text-emerald-600" },
                { label: "Balance",      value: `${balance >= 0 ? "+" : ""}${balance}€`, color: balance >= 0 ? "text-emerald-600" : "text-red-500" },
              ].map((s) => (
                <div key={s.label} className="text-center py-4 px-2">
                  <div className={`font-black text-xl ${s.color}`}>{s.value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Détail par tontine */}
            {summary.tontines.length > 0 && (
              <div className="border-t border-slate-100">
                {summary.tontines.map((t) => (
                  <div key={t.tontine_id}
                    onClick={() => navigate(`/tontine/${t.tontine_id}`)}
                    className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition last:border-0">
                    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                      🌿
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{t.tontine_name}</div>
                      <div className="text-slate-400 text-xs">
                        {t.is_manager ? "👑 Gérant" : "👥 Membre"} · {t.cycles_count} cycle{t.cycles_count > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-500">versé : <span className="font-bold">{t.total_paid}€</span></div>
                      <div className="text-xs text-emerald-600">reçu : <span className="font-bold">{t.total_received}€</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Déconnexion */}
        <button onClick={logout}
          className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-4 rounded-2xl text-sm transition">
          Se déconnecter
        </button>

      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}