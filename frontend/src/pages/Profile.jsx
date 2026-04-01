import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/clerk-react";
import { getProfile, updateProfile, getFinancials, joinByCode, updateAvatar, deleteAccount } from "../api/client";
import NotificationBell from "../components/NotificationBell";

const AVATARS = ["🌿","🌱","🌳","🦁","🐘","🦊","🌺","⭐","🎯","💎","🔥","🌙","☀️","🎵","🏆"];

export default function Profile() {
  const navigate  = useNavigate();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const qc  = useQueryClient();

  const [editMode, setEditMode]         = useState(false);
  const [showAvatars, setShowAvatars]   = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [form, setForm]                 = useState({ name: "", phone: "" });
  const [joinCode, setJoinCode]         = useState("");
  const [joinMsg, setJoinMsg]           = useState("");
  const [joinError, setJoinError]       = useState("");
  const [toast, setToast]               = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const { data: profile } = useQuery({
    queryKey: ["profile", clerkUser?.id],
    queryFn:  () => getProfile(),
    enabled:  !!clerkUser,
    onSuccess: (d) => setForm({ name: d.name, phone: d.phone }),
  });

  const { data: summary } = useQuery({
    queryKey: ["summary", clerkUser?.id],
    queryFn:  () => getFinancials(),
    enabled:  !!clerkUser,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateProfile(data),
    onSuccess: (data) => {
      qc.invalidateQueries(["profile"]);
      setEditMode(false);
      showToast("Profil mis à jour ✓");
    },
    onError: (e) => showToast(e.response?.data?.detail || "Erreur"),
  });

  const avatarMutation = useMutation({
    mutationFn: (avatar) => updateAvatar(avatar),
    onSuccess: () => {
      qc.invalidateQueries(["profile"]);
      setShowAvatars(false);
      showToast("Avatar mis à jour ✓");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(user.id),
    onSuccess: () => {
      logout();
    },
    onError: (e) => {
      setShowDelete(false);
      showToast(e.response?.data?.detail || "Erreur lors de la suppression");
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => joinByCode(joinCode.trim().toUpperCase(), user.id),
    onSuccess: (data) => {
      setJoinMsg(data.message);
      setJoinCode("");
      setJoinError("");
      qc.invalidateQueries(["tontines"]);
      showToast(data.message);
    },
    onError: (e) => setJoinError(e.response?.data?.detail || "Code invalide"),
  });

  const balance = summary ? summary.balance : 0;
  const avatar  = profile?.avatar || "🌿";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none flex-shrink-0">←</button>
        <span className="font-black text-base flex-1">Mon profil</span>
        <NotificationBell />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">

        {/* Avatar + infos */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 px-5 py-6 text-center relative">
            {/* Avatar cliquable */}
            <button
              onClick={() => setShowAvatars(!showAvatars)}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-4xl border-4 border-white/30 min-h-0 hover:bg-white/30 transition"
            >
              {avatar}
            </button>
            <div style={{fontSize:10}} className="text-emerald-200 mb-2">Appuie pour changer</div>
            <div className="text-white font-black text-xl">{profile?.name}</div>
            <div className="text-emerald-100 text-sm mt-0.5">{profile?.phone}</div>

            {/* Sélecteur d'avatars */}
            {showAvatars && (
              <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-2xl p-4 shadow-2xl z-10 border border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-3">Choisis ton avatar</div>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => avatarMutation.mutate(a)}
                      className={`text-2xl p-2 rounded-xl min-h-0 border-2 transition ${
                        avatar === a ? "border-emerald-400 bg-emerald-50" : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modifier profil */}
          <div className="p-5">
            {!editMode ? (
              <button onClick={() => setEditMode(true)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition border-none">
                ✏️ Modifier mon profil
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Prénom et nom</label>
                  <input type="text" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Téléphone</label>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm border-none min-h-0">Annuler</button>
                  <button onClick={() => updateMutation.mutate(form)}
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm border-none min-h-0 disabled:opacity-60">
                    {updateMutation.isPending ? "…" : "Sauvegarder"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rejoindre une tontine */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-black text-slate-800 text-sm mb-2">🔗 Rejoindre une tontine</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="ABC123" value={joinCode} maxLength={6}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); setJoinMsg(""); }}
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-lg font-black text-center tracking-widest uppercase focus:outline-none focus:border-emerald-400"/>
            <button onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending || joinCode.length < 4}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 rounded-xl border-none min-h-0 disabled:opacity-40 text-sm">
              {joinMutation.isPending ? "…" : "OK"}
            </button>
          </div>
          {joinError && <p className="text-red-500 text-xs mt-2">{joinError}</p>}
          {joinMsg   && <p className="text-emerald-600 text-xs font-semibold mt-2">✅ {joinMsg}</p>}
        </div>

        {/* Résumé financier */}
        {/* {summary && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 font-black text-sm">📊 Résumé financier</div>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                { label: "Total versé",  value: `${summary.total_paid}€`,     color: "text-slate-800" },
                { label: "Total reçu",   value: `${summary.total_received}€`,  color: "text-emerald-600" },
                { label: "Balance",      value: `${balance >= 0 ? "+" : ""}${balance}€`,
                  color: balance >= 0 ? "text-emerald-600" : "text-red-500" },
              ].map(s => (
                <div key={s.label} className="text-center py-4 px-2">
                  <div className={`font-black text-lg ${s.color}`}>{s.value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {summary.tontines.map(t => (
              <div key={t.tontine_id} onClick={() => navigate(`/tontine/${t.tontine_id}`)}
                className="flex items-center gap-3 px-5 py-3 border-t border-slate-50 hover:bg-slate-50 cursor-pointer">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-sm flex-shrink-0">🌿</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-xs truncate">{t.tontine_name}</div>
                  <div className="text-slate-400 text-xs">{t.is_manager ? "👑 Gérant" : "👥 Membre"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">versé : <strong>{t.total_paid}€</strong></div>
                  <div className="text-xs text-emerald-600">reçu : <strong>{t.total_received}€</strong></div>
                </div>
              </div>
            ))}
          </div>
        )} */}

        {/* Supprimer le compte */}
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-3 rounded-2xl text-sm transition border-none">
            🗑️ Supprimer mon compte
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700 font-bold text-sm mb-1">⚠️ Cette action est irréversible</p>
            <p className="text-red-600 text-xs mb-4">Toutes tes données seront supprimées définitivement.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm border-solid min-h-0">
                Annuler
              </button>
              <button onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm border-none min-h-0 disabled:opacity-60">
                {deleteMutation.isPending ? "…" : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        )}

        {/* Déconnexion */}
        <button onClick={() => signOut(() => navigate("/login"))}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl text-sm transition border-none">
          🚪 Se déconnecter
        </button>
      </main>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}