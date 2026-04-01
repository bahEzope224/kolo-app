import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMemberTontines, getFinancials, getPendingTransfers, respondTransfer, joinByCode } from "../api/client";
import NotificationBell from "../components/NotificationBell";
import api from "../api/client";

// ── API ───────────────────────────────────────────────────
const createTontineApi = (managerId, data) =>
  api.post(`/tontines/?manager_id=${managerId}`, data).then(r => r.data);

// ── Statut paiement ───────────────────────────────────────
const STATUS = {
  paid:    { label: "Payé ✓",     bg: "bg-emerald-100", text: "text-emerald-800" },
  pending: { label: "En attente", bg: "bg-amber-100",   text: "text-amber-800"   },
  missing: { label: "Non défini", bg: "bg-slate-100",   text: "text-slate-500"   },
};

// ── Carte tontine ─────────────────────────────────────────
function TontineCard({ tontine, onClick }) {
  const MODE_LABELS = { random: "🎲", fixed: "📅", manual: "✋" };
  const s = STATUS[tontine.my_payment_status] || STATUS.missing;

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 hover:border-emerald-300 hover:shadow-sm transition group">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-emerald-200 transition">
          🌿
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 text-sm truncate">{tontine.name}</span>
            {tontine.is_manager && (
              <span className="text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                👑
              </span>
            )}
          </div>
          <div className="text-slate-500 text-xs mt-0.5">
            {tontine.is_manager
              ? `${tontine.member_count} membres · ${tontine.contribution_amount}€/mois`
              : `${tontine.manager_name} · ${tontine.contribution_amount}€/mois`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
            {s.label}
          </span>
          <span className="text-xs text-slate-400">
            {MODE_LABELS[tontine.mode]} Cycle {tontine.current_cycle}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Demandes de transfert ─────────────────────────────────
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

  if (!transfers.length) return null;

  return (
    <div className="space-y-3">
      {transfers.map(t => (
        <div key={t.id} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xl flex-shrink-0">👑</span>
            <div>
              <div className="font-black text-amber-800 text-sm">Demande de gérance</div>
              <div className="text-amber-700 text-xs mt-0.5">
                <strong>{t.from_user_name}</strong> te propose de gérer <strong>"{t.tontine_name}"</strong>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => respondMutation.mutate({ id: t.id, accept: false })}
              disabled={respondMutation.isPending}
              className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition border-solid min-h-0 disabled:opacity-60">
              ✕ Refuser
            </button>
            <button onClick={() => respondMutation.mutate({ id: t.id, accept: true })}
              disabled={respondMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition border-none min-h-0 disabled:opacity-60">
              ✓ Accepter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Formulaire création tontine ───────────────────────────
function CreateTontineForm({ managerId, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", contribution_amount: "", start_date: "", mode: "random",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data) => createTontineApi(managerId, data),
    onSuccess: (data) => { qc.invalidateQueries(["tontines", managerId]); onSuccess(data); },
    onError: (e) => setError(e.response?.data?.detail || "Erreur"),
  });

  const MODES = [
    { value: "random", label: "🎲 Tirage au sort", desc: "Aléatoire" },
    { value: "fixed",  label: "📅 Tour fixe",      desc: "Ordre d'inscription" },
    { value: "manual", label: "✋ Manuel",          desc: "Gérant choisit" },
  ];

  function handleSubmit() {
    if (!form.name.trim())  { setError("Donne un nom"); return; }
    if (!form.contribution_amount || Number(form.contribution_amount) <= 0) { setError("Entre un montant"); return; }
    if (!form.start_date)   { setError("Choisis une date"); return; }
    setError("");
    mutation.mutate({ ...form, contribution_amount: Number(form.contribution_amount) });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-emerald-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-base">Créer une tontine</h2>
          <p className="text-emerald-100 text-xs mt-0.5">En 30 secondes</p>
        </div>
        <button onClick={onCancel}
          className="text-emerald-200 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none">✕</button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Nom</label>
          <input type="text" placeholder="Ex: Tontine Famille Diallo" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 transition"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Cotisation (€)</label>
            <input type="number" placeholder="150" min="1" value={form.contribution_amount}
              onChange={e => setForm({ ...form, contribution_amount: e.target.value })}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-emerald-400 transition"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Démarrage</label>
            <input type="date" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-emerald-400 transition"/>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => (
              <label key={m.value}
                className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition text-center ${
                  form.mode === m.value ? "border-emerald-400 bg-emerald-50" : "border-slate-200"
                }`}>
                <input type="radio" name="mode" value={m.value} checked={form.mode === m.value}
                  onChange={e => setForm({ ...form, mode: e.target.value })}
                  className="sr-only"/>
                <div className="font-bold text-slate-800 text-xs">{m.label}</div>
                <div className="text-slate-400 text-[10px] mt-0.5">{m.desc}</div>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button onClick={handleSubmit} disabled={mutation.isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition border-none">
          {mutation.isPending ? "Création…" : "Créer →"}
        </button>
      </div>
    </div>
  );
}

// ── Rejoindre via code ────────────────────────────────────
function JoinTontineCard({ userId, onSuccess }) {
  const qc = useQueryClient();
  const [code, setCode]   = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => joinByCode(code.trim().toUpperCase(), userId),
    onSuccess: (data) => {
      qc.invalidateQueries(["tontines", userId]);
      setCode("");
      setError("");
      onSuccess(data.tontine_name);
    },
    onError: (e) => setError(e.response?.data?.detail || "Code invalide"),
  });

  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔗</span>
        <span className="font-bold text-slate-700 text-sm">Rejoindre avec un code</span>
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="ABC123" value={code} maxLength={6}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
          className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-base font-black text-center tracking-widest uppercase focus:outline-none focus:border-emerald-400 transition"/>
        <button onClick={() => mutation.mutate()}
          disabled={mutation.isPending || code.length < 4}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black px-4 rounded-xl border-none min-h-0 transition text-sm">
          {mutation.isPending ? "…" : "OK"}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}

// ── Résumé financier ──────────────────────────────────────
function FinancialSummary({ userId }) {
  const { data: summary } = useQuery({
    queryKey: ["summary", userId],
    queryFn:  () => getFinancials(userId),
    enabled:  !!userId,
  });
  const navigate = useNavigate();

  if (!summary) return null;

  const balance = summary.balance;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
        <span className="font-black text-slate-700 text-sm">📊 Résumé financier</span>
      </div>

      {/* 3 stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        {[
          { label: "Versé",   value: `${summary.total_paid}€`,     color: "text-slate-800" },
          { label: "Reçu",    value: `${summary.total_received}€`,  color: "text-emerald-600" },
          { label: "Balance", value: `${balance >= 0 ? "+" : ""}${balance}€`,
            color: balance >= 0 ? "text-emerald-600" : "text-red-500" },
        ].map(s => (
          <div key={s.label} className="text-center py-4 px-2">
            <div className={`font-black text-lg leading-none ${s.color}`}>{s.value}</div>
            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Détail par tontine */}
      {summary.tontines.length > 0 && (
        <div className="border-t border-slate-50">
          {summary.tontines.map(t => (
            <button key={t.tontine_id}
              onClick={() => navigate(`/tontine/${t.tontine_id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition min-h-0 bg-transparent text-left">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🌿</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-xs truncate">{t.tontine_name}</div>
                <div className="text-slate-400 text-[10px]">{t.is_manager ? "👑 Gérant" : "👥 Membre"}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-slate-500">versé <span className="font-bold text-slate-700">{t.total_paid}€</span></div>
                <div className="text-xs text-emerald-600">reçu <span className="font-bold">{t.total_received}€</span></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────
export default function Dashboard() {
  const { getUser, logout } = useAuth();
  const user    = getUser();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated]   = useState(null);
  const [joinMsg, setJoinMsg]   = useState("");

  const { data: tontines = [], isLoading } = useQuery({
    queryKey: ["tontines", user?.id],
    queryFn:  () => getMemberTontines(user.id),
    enabled:  !!user?.id,
  });

  const myTontines     = tontines.filter(t => t.is_manager);
  const joinedTontines = tontines.filter(t => !t.is_manager);

  function handleCreated(tontine) {
    setCreated(tontine);
    setShowForm(false);
    setTimeout(() => setCreated(null), 6000);
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl">🌿</span>
          <span className="font-black text-base tracking-tight">Kolo</span>
        </div>
        <button onClick={() => navigate("/profile")}
          className="hidden sm:block text-sm text-slate-300 hover:text-white font-semibold transition min-h-0 p-0 bg-transparent border-none">
          {user?.name}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell userId={user?.id} />
          <button onClick={() => navigate("/profile")}
            className="sm:hidden w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-black text-white text-xs border-none min-h-0">
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
          </button>
          <button onClick={logout}
            className="hidden sm:block text-xs text-slate-400 hover:text-white underline min-h-0 py-1 px-0 bg-transparent border-none ml-1 transition">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5 pb-24">

        {/* Bonjour */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-800 text-lg">Bonjour, {user?.name?.split(" ")[0]} 👋</h1>
            <p className="text-slate-400 text-xs mt-0.5">Voici l'état de tes tontines</p>
          </div>
        </div>

        {/* Demandes de transfert */}
        <PendingTransfers userId={user?.id} />

        {/* Succès création */}
        {created && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
            <div className="font-black text-emerald-800">🎉 {created.name} créée !</div>
            <div className="text-emerald-700 text-sm mt-1">
              Code : <span className="font-mono font-black tracking-widest bg-white px-2 py-0.5 rounded-lg border border-emerald-200">{created.invite_code}</span>
            </div>
          </div>
        )}

        {/* Succès rejoindre */}
        {joinMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
            <div className="font-black text-emerald-800">🎉 Tu as rejoint {joinMsg} !</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Chargement…</div>
        ) : (
          <>
            {/* ── MES TONTINES ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-black text-slate-800 text-base">Mes tontines</h2>
                <button
                  onClick={() => { setShowForm(!showForm); setCreated(null); }}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition min-h-0 border-none ${
                    showForm ? "bg-slate-200 text-slate-700" : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}>
                  {showForm ? "✕ Annuler" : "+ Créer"}
                </button>
              </div>

              {showForm && (
                <div className="mb-4">
                  <CreateTontineForm managerId={user?.id} onSuccess={handleCreated} onCancel={() => setShowForm(false)} />
                </div>
              )}

              {myTontines.length === 0 && !showForm ? (
                <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                  <div className="text-3xl mb-2">🌱</div>
                  <p className="text-slate-500 text-sm font-medium">Aucune tontine créée</p>
                  <button onClick={() => setShowForm(true)}
                    className="mt-2 text-emerald-600 text-xs font-bold underline bg-transparent border-none min-h-0">
                    Créer ma première tontine
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {myTontines.map(t => (
                    <TontineCard key={t.id} tontine={t} onClick={() => navigate(`/tontine/${t.id}`)} />
                  ))}
                </div>
              )}
            </div>

            {/* ── TONTINES REJOINTES ── */}
            {joinedTontines.length > 0 && (
              <div>
                <h2 className="font-black text-slate-800 text-base mb-3">Tontines rejointes</h2>
                <div className="space-y-2">
                  {joinedTontines.map(t => (
                    <TontineCard key={t.id} tontine={t} onClick={() => navigate(`/tontine/${t.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── REJOINDRE VIA CODE ── */}
            <JoinTontineCard
              userId={user?.id}
              onSuccess={(name) => { setJoinMsg(name); setTimeout(() => setJoinMsg(""), 5000); }}
            />

            {/* ── RÉSUMÉ FINANCIER ── */}
            <FinancialSummary userId={user?.id} />

            {/* État vide total */}
            {tontines.length === 0 && !showForm && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🌿</div>
                <p className="text-slate-600 font-bold">Bienvenue sur Kolo !</p>
                <p className="text-slate-400 text-sm mt-2 mb-5">Crée ou rejoins une tontine.</p>
                <button onClick={() => setShowForm(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-3 rounded-xl text-sm transition border-none">
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