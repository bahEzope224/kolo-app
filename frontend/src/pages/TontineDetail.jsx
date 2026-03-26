import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTontineDashboard, validatePayment, remindLateMembers, removeMember } from "../api/client";
import InviteModal from "../components/InviteModal";
import DrawModal from "../components/DrawModal";
import AddPaymentModal from "../components/AddPaymentModal";
import NotificationBell from "../components/NotificationBell";
import TontineSettingsModal from "../components/TontineSettingsModal";

function initials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const STATUS = {
  paid: { label: "Payé ✓", bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  pending: { label: "En attente", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" },
  missing: { label: "Non inscrit", bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-300" },
};

function Badge({ status }) {
  const s = STATUS[status] || STATUS.missing;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Avatar({ name, status }) {
  const colors = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    missing: "bg-slate-100 text-slate-500",
  };
  return (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${colors[status] || colors.missing}`}>
      {initials(name)}
    </div>
  );
}

function ProgressBar({ paid, total }) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-2">
        <span className="text-slate-500">Versements du mois</span>
        <span className="text-emerald-700">{paid}/{total} membres · {pct}%</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function TontineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState("membres");
  const [copiedCode, setCopiedCode] = useState(false);
  const [toast, setToast] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showDraw, setShowDraw] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState("");

  const user = JSON.parse(
    localStorage.getItem("kolo_user") ||
    sessionStorage.getItem("kolo_user") || "{}"
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["tontine", id],
    queryFn: () => getTontineDashboard(id),
    refetchInterval: 10000,
  });

  const validateMutation = useMutation({
    mutationFn: (paymentId) => validatePayment(paymentId),
    onSuccess: () => { qc.invalidateQueries(["tontine", id]); showToast("Versement validé ✓"); },
    onError: () => showToast("Erreur lors de la validation"),
  });

  const remindMutation = useMutation({
    mutationFn: () => remindLateMembers(id),
    onSuccess: (data) => { showToast(data.message); qc.invalidateQueries(["notifs"]); },
    onError: () => showToast("Erreur lors de l'envoi des rappels"),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId) => removeMember(id, memberId),
    onSuccess: () => { qc.invalidateQueries(["tontine", id]); showToast("Membre retiré"); },
    onError: (e) => showToast(e.response?.data?.detail || "Erreur"),
  });

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function copyCode() {
    navigator.clipboard.writeText(data.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const isGerant = data?.manager_id === user?.id;

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Chargement…</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-red-500 text-sm">Impossible de charger la tontine</div>
    </div>
  );

  const filteredMembers = data.members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ── */}
      <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none flex-shrink-0 transition">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm leading-tight truncate">{data.name}</div>
          <div className="text-emerald-400 text-[10px] leading-tight">Cycle {data.current_cycle}</div>
        </div>
        {isGerant && (
          <span className="hidden sm:block text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-lg font-bold flex-shrink-0">
            👑 Gérant
          </span>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell userId={user?.id} />
          <button onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center font-black text-white text-xs border-none min-h-0 transition">
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
          </button>
        </div>
      </header>

      {/* ── CONTENU ── */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">

        {/* Banner bénéficiaire */}
        <div className="bg-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-emerald-200 text-xs font-semibold uppercase tracking-wide mb-1">
                {data.beneficiary ? "Bénéficiaire du cycle" : "Bénéficiaire non désigné"}
              </div>
              <div className="font-black text-2xl">
                {data.beneficiary ? data.beneficiary.name : "—"}
              </div>
              {data.beneficiary && (
                <div className="text-emerald-200 text-sm mt-0.5">{data.beneficiary.phone}</div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-black text-3xl">{data.total_amount}€</div>
              <div className="text-emerald-200 text-xs mt-0.5">
                {data.member_count} × {data.contribution_amount}€
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-500">
            <ProgressBar paid={data.paid_count} total={data.member_count} />
          </div>
        </div>

        {/* Message de bienvenue */}
        {data.welcome_message && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">💬</span>
            <p className="text-amber-800 text-sm leading-relaxed">{data.welcome_message}</p>
          </div>
        )}

        {/* Date de versement + code */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="text-xs text-slate-500 font-semibold mb-1">Code d'invitation</div>
            <div className="font-mono font-black text-xl tracking-widest text-slate-800 mb-2">
              {data.invite_code}
            </div>
            <button onClick={copyCode}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition min-h-0 ${copiedCode ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}>
              {copiedCode ? "✓ Copié !" : "📋 Copier"}
            </button>
          </div>

          {data.payment_day ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-500 font-semibold mb-1">📅 Versement</div>
              <div className="font-black text-slate-800 text-sm">Avant le</div>
              <div className="font-black text-emerald-600 text-3xl leading-none">{data.payment_day}</div>
              <div className="text-xs text-slate-400">de chaque mois</div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-500 font-semibold mb-1">👥 Membres</div>
              <div className="font-black text-3xl text-slate-800">{data.member_count}</div>
              <div className="text-xs text-slate-400">participants</div>
            </div>
          )}
        </div>

        {/* Prochain bénéficiaire public */}
        {data.show_next_beneficiary && data.beneficiary && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-xl">🎲</span>
            <div>
              <div className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Prochain bénéficiaire</div>
              <div className="font-black text-emerald-800">{data.beneficiary.name}</div>
            </div>
          </div>
        )}

        {/* Actions gérant */}
        {isGerant && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDraw(true)}
                className="bg-amber-400 hover:bg-amber-500 text-amber-900 font-black py-3.5 rounded-2xl text-sm transition border-none">
                🎲 {data.beneficiary ? "Voir tirage" : "Tirage au sort"}
              </button>
              <button onClick={() => setShowInvite(true)}
                className="bg-slate-900 hover:bg-slate-700 text-white font-black py-3.5 rounded-2xl text-sm transition border-none">
                👥 Inviter
              </button>
            </div>
            <button onClick={() => setShowAddPayment(true)}
              className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-300 text-slate-700 font-black py-3.5 rounded-2xl text-sm transition">
              💳 Enregistrer un versement
            </button>
            {data.paid_count < data.member_count && (
              <button onClick={() => remindMutation.mutate()} disabled={remindMutation.isPending}
                className="w-full bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-amber-800 font-black py-3.5 rounded-2xl text-sm transition disabled:opacity-60">
                {remindMutation.isPending ? "Envoi…" : `⏰ Rappeler les retardataires (${data.member_count - data.paid_count})`}
              </button>
            )}
            <button onClick={() => setShowSettings(true)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl text-sm transition border-none">
              ⚙️ Paramètres de la tontine
            </button>
          </div>
        )}

        {/* Onglets membres / historique */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {["membres", "historique"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-bold transition capitalize min-h-0 border-none rounded-none ${tab === t ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-slate-600 bg-white"
                  }`}>
                {t === "membres" ? `👥 Membres (${data.member_count})` : "📋 Historique"}
              </button>
            ))}
          </div>

          {tab === "membres" && (
            <div>
              <div className="px-4 py-3 border-b border-slate-50">
                <input type="text" placeholder="Rechercher un membre…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 transition" />
              </div>
              <div className="divide-y divide-slate-50">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Aucun membre trouvé</div>
                ) : filteredMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition">
                    <Avatar name={m.name} status={m.status} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{m.name}</div>
                      <div className="text-slate-400 text-xs">{m.phone}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {m.status === "paid" ? (
                        <Badge status="paid" />
                      ) : isGerant && m.payment_id ? (
                        <button onClick={() => validateMutation.mutate(m.payment_id)}
                          disabled={validateMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition min-h-0 disabled:opacity-60">
                          ✓ Valider
                        </button>
                      ) : (
                        <Badge status={m.status} />
                      )}
                      {isGerant && m.user_id !== data.manager_id && (
                        <button onClick={() => { if (confirm(`Retirer ${m.name} ?`)) removeMutation.mutate(m.user_id); }}
                          className="text-slate-300 hover:text-red-500 transition min-h-0 p-1 bg-transparent border-none text-base">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "historique" && (
            <div className="divide-y divide-slate-50">
              {data.history.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Aucun cycle terminé</div>
              ) : data.history.map((h) => (
                <div key={h.cycle_number} className="flex items-center gap-3 px-4 py-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-black text-lg leading-none">{h.cycle_number}</span>
                    <span className="text-emerald-400 text-[9px] font-bold uppercase">cycle</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm">{h.beneficiary_name}</div>
                    <div className="text-slate-400 text-xs">
                      {new Date(h.completed_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-emerald-600 text-base">{h.total_amount}€</div>
                    <div className="text-slate-400 text-xs">reçus ✓</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {showInvite && <InviteModal tontineId={id} inviteCode={data.invite_code} onClose={() => setShowInvite(false)} />}
      {showDraw && (
        <DrawModal
          tontineId={id}
          members={data.members}
          currentBeneficiary={data.beneficiary ? {
            beneficiary_name: data.beneficiary.name,
            beneficiary_phone: data.beneficiary.phone,
            total_amount: data.total_amount,
          } : null}
          cycleNumber={data.current_cycle}
          mode={data.mode}
          onClose={() => setShowDraw(false)}
        />
      )}
      {showAddPayment && (
        <AddPaymentModal tontineId={id} members={data.members}
          contribution={data.contribution_amount} onClose={() => setShowAddPayment(false)} />
      )}
      {showSettings && (
        <TontineSettingsModal tontineId={id} tontine={data} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}