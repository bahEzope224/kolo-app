import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMemberTontines } from "../api/client";
import NotificationBell from "../components/NotificationBell";
import api from "../api/client";
import AppHeader from "../components/AppHeader";
import { getPendingTransfers, respondTransfer } from "../api/client";

const getManagerTontines = (managerId) =>
  api.get(`/tontines/manager/${managerId}`).then((r) => r.data);

// ── Statut paiement ───────────────────────────────────────
const STATUS = {
  paid: { label: "Payé ✓", bg: "bg-emerald-100", text: "text-emerald-800" },
  pending: { label: "En attente", bg: "bg-amber-100", text: "text-amber-800" },
  missing: { label: "Non défini", bg: "bg-slate-100", text: "text-slate-500" },
};

// ── Carte tontine ─────────────────────────────────────────
function TontineCard({ tontine, onClick }) {
  const MODE_LABELS = { random: "🎲 Tirage", fixed: "📅 Tour fixe", manual: "✋ Manuel" };
  const s = STATUS[tontine.my_payment_status] || STATUS.missing;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 p-5 hover:border-emerald-300 hover:shadow-md transition group"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-emerald-200 transition">
          🌿
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 text-base truncate">{tontine.name}</span>
            {tontine.is_manager && (
              <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                👑 Gérant
              </span>
            )}
          </div>
          <div className="text-slate-500 text-sm mt-0.5">
            {tontine.is_manager
              ? `${tontine.member_count} membre${tontine.member_count > 1 ? "s" : ""} · ${tontine.contribution_amount}€/mois`
              : `Gérant : ${tontine.manager_name} · ${tontine.contribution_amount}€/mois`
            }
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Cycle <span className="font-bold text-slate-600">{tontine.current_cycle}</span>
          </span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">
            {MODE_LABELS[tontine.mode]}
          </span>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </div>
    </button>
  );
}

// ── Formulaire création ───────────────────────────────────
function CreateTontineForm({ managerId, onSuccess }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", contribution_amount: "", start_date: "", mode: "random",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data) =>
      api.post(`/tontines/?manager_id=${managerId}`, data).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries(["tontines", managerId]);
      onSuccess(data);
    },
    onError: (e) => setError(e.response?.data?.detail || "Erreur lors de la création"),
  });

  const MODES = [
    { value: "random", label: "🎲 Tirage au sort", desc: "Bénéficiaire tiré aléatoirement" },
    { value: "fixed", label: "📅 Tour fixe", desc: "Ordre d'inscription" },
    { value: "manual", label: "✋ Manuel", desc: "Le gérant choisit" },
  ];

  function handleSubmit() {
    if (!form.name.trim()) { setError("Donne un nom"); return; }
    if (!form.contribution_amount || Number(form.contribution_amount) <= 0) { setError("Entre un montant"); return; }
    if (!form.start_date) { setError("Choisis une date"); return; }
    setError("");
    mutation.mutate({ ...form, contribution_amount: Number(form.contribution_amount) });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-emerald-600 px-6 py-5">
        <h2 className="text-white font-black text-xl">Créer une tontine</h2>
        <p className="text-emerald-100 text-sm mt-1">Configure ta nouvelle tontine en 30 secondes</p>
      </div>
      <div className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Nom</label>
          <input type="text" placeholder="Ex: Tontine Famille Diallo" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Cotisation</label>
            <div className="relative">
              <input type="number" placeholder="150" min="1" value={form.contribution_amount}
                onChange={(e) => setForm({ ...form, contribution_amount: e.target.value })}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-base focus:outline-none focus:border-emerald-400 transition" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Démarrage</label>
            <input type="date" value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">Mode de distribution</label>
          <div className="space-y-2">
            {MODES.map((m) => (
              <label key={m.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${form.mode === m.value ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" name="mode" value={m.value} checked={form.mode === m.value}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  className="accent-emerald-500 w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-sm">{m.label}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>}
        <button onClick={handleSubmit} disabled={mutation.isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-lg transition">
          {mutation.isPending ? "Création…" : "Créer la tontine →"}
        </button>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────
export default function Dashboard() {
  const { getUser, logout } = useAuth();
  const user = getUser();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState(null);

  // Charge TOUTES les tontines du user (gérant + membre)
  const { data: tontines = [], isLoading } = useQuery({
    queryKey: ["tontines", user?.id],
    queryFn: () => getMemberTontines(user.id),
    enabled: !!user?.id,
  });

  const myTontines = tontines.filter((t) => t.is_manager);
  const joinedTontines = tontines.filter((t) => !t.is_manager);

  function handleCreated(tontine) {
    setCreated(tontine);
    setShowForm(false);
  }
{/* Demandes de transfert reçues */}
<PendingTransfers userId={user?.id} />
function PendingTransfers({ userId }) {
  const qc = useQueryClient();
  const { data: transfers = [] } = useQuery({
    queryKey: ["pending-transfers", userId],
    queryFn:  () => getPendingTransfers(userId),
    enabled:  !!userId,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }) => respondTransfer(id, accept),
    onSuccess: () => {
      qc.invalidateQueries(["pending-transfers", userId]);
      qc.invalidateQueries(["tontines", userId]);
    },
  });

  if (transfers.length === 0) return null;

  return (
    <div className="space-y-3">
      {transfers.map(t => (
        <div key={t.id} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">👑</span>
            <div>
              <div className="font-black text-amber-800 text-base">Demande de gérance</div>
              <div className="text-amber-700 text-sm mt-0.5">
                <strong>{t.from_user_name}</strong> te propose de gérer la tontine{" "}
                <strong>"{t.tontine_name}"</strong>.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => respondMutation.mutate({ id: t.id, accept: false })}
              disabled={respondMutation.isPending}
              className="bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition border-solid min-h-0 disabled:opacity-60"
            >
              ✕ Refuser
            </button>
            <button
              onClick={() => respondMutation.mutate({ id: t.id, accept: true })}
              disabled={respondMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition border-none min-h-0 disabled:opacity-60"
            >
              ✓ Accepter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
  return (
    
    <div className="min-h-screen bg-slate-50">
              {/* Header création */}

      <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl">🌿</span>
          <span className="font-black text-base tracking-tight">Kolo</span>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="hidden sm:block text-sm text-slate-300 hover:text-white font-semibold transition min-h-0 p-0 bg-transparent border-none"
        >
          {user?.name}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell userId={user?.id} />
          <button
            onClick={() => navigate("/profile")}
            className="sm:hidden w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-black text-white text-xs border-none min-h-0"
          >
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
          </button>
          <button
            onClick={logout}
            className="hidden sm:block text-xs text-slate-400 hover:text-white underline min-h-0 py-1 px-0 bg-transparent border-none ml-1 transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Succès création */}
        {created && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-black text-emerald-800 text-lg">{created.name} créée !</div>
            <div className="text-emerald-700 text-sm mt-1">
              Code :{" "}
              <span className="font-mono font-black text-lg tracking-widest bg-white px-3 py-1 rounded-lg border border-emerald-200">
                {created.invite_code}
              </span>
            </div>
            <p className="text-emerald-600 text-xs mt-2">Partage ce code à tes membres.</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Chargement…</div>
        ) : (
          <>
            {/* ── Section : Mes tontines (gérant) ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-slate-800 text-xl">Mes tontines</h2>
                <button
                  onClick={() => { setShowForm(!showForm); setCreated(null); }}
                  className={`text-sm font-bold px-4 py-2 rounded-xl transition min-h-0 ${showForm ? "bg-slate-200 text-slate-700" : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    }`}
                >
                  {showForm ? "✕ Annuler" : "+ Nouvelle"}
                </button>
              </div>

              {showForm && (
                <div className="mb-6">
                  <CreateTontineForm managerId={user?.id} onSuccess={handleCreated} />
                </div>
              )}

              {myTontines.length === 0 && !showForm ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="text-slate-500 font-medium text-sm">Aucune tontine créée</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-3 text-emerald-600 text-sm font-bold underline bg-transparent border-none min-h-0"
                  >
                    Créer ma première tontine
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTontines.map((t) => (
                    <TontineCard key={t.id} tontine={t} onClick={() => navigate(`/tontine/${t.id}`)} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Section : Tontines rejointes (membre) ── */}
            {joinedTontines.length > 0 && (
              <div>
                <h2 className="font-black text-slate-800 text-xl mb-4">Tontines rejointes</h2>
                <div className="space-y-3">
                  {joinedTontines.map((t) => (
                    <TontineCard key={t.id} tontine={t} onClick={() => navigate(`/tontine/${t.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* État vide total */}
            {tontines.length === 0 && !showForm && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🌿</div>
                <p className="text-slate-600 font-bold text-lg">Bienvenue sur Kolo !</p>
                <p className="text-slate-400 text-sm mt-2 mb-6">
                  Crée une tontine ou rejoins-en une avec un code d'invitation.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-4 rounded-xl text-base transition"
                >
                  + Créer une tontine
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}