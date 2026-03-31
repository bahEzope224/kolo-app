import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTontineDashboard, validatePayment, remindLateMembers, removeMember } from "../api/client";
import InviteModal from "../components/InviteModal";
import DrawModal from "../components/DrawModal";
import AddPaymentModal from "../components/AddPaymentModal";
import NotificationBell from "../components/NotificationBell";
import TontineSettingsModal from "../components/TontineSettingsModal";
import TransferModal from "../components/TransferModal";

function initials(name) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const STATUS = {
  paid:    { label: "Payé ✓",     bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  pending: { label: "En attente", bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-400"   },
  missing: { label: "Non inscrit",bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-300"   },
};

function Badge({ status }) {
  const s = STATUS[status] || STATUS.missing;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Avatar({ name, status }) {
  const colors = {
    paid:    "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    missing: "bg-slate-100 text-slate-500",
  };
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${colors[status] || colors.missing}`}>
      {initials(name)}
    </div>
  );
}

function ActionRow({ icon, label, sublabel, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition border-none bg-transparent text-left min-h-0 disabled:opacity-40 ${danger ? "text-red-600" : ""}`}
    >
      <span className="text-xl flex-shrink-0 w-7 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${danger ? "text-red-600" : "text-slate-800"}`}>{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
      <span className="text-slate-300 text-sm flex-shrink-0">›</span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1 mb-2">{title}</div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {children}
      </div>
    </div>
  );
}

export default function TontineDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [showInvite,     setShowInvite]     = useState(false);
  const [showDraw,       setShowDraw]       = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showTransfer,   setShowTransfer]   = useState(false);
  const [showMembers,    setShowMembers]    = useState(false);
  const [showHistory,    setShowHistory]    = useState(false);
  const [toast,          setToast]          = useState("");
  const [search,         setSearch]         = useState("");

  const user = JSON.parse(
    localStorage.getItem("kolo_user") ||
    sessionStorage.getItem("kolo_user") || "{}"
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["tontine", id],
    queryFn:  () => getTontineDashboard(id),
    refetchInterval: 10000,
  });

  const validateMutation = useMutation({
    mutationFn: (paymentId) => validatePayment(paymentId),
    onSuccess:  () => { qc.invalidateQueries(["tontine", id]); showToast("Versement validé ✓"); },
    onError:    () => showToast("Erreur lors de la validation"),
  });

  const remindMutation = useMutation({
    mutationFn: () => remindLateMembers(id),
    onSuccess:  (d) => { showToast(d.message); qc.invalidateQueries(["notifs"]); },
    onError:    () => showToast("Erreur"),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId) => removeMember(id, memberId),
    onSuccess:  () => { qc.invalidateQueries(["tontine", id]); showToast("Membre retiré"); },
    onError:    (e) => showToast(e.response?.data?.detail || "Erreur"),
  });

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const isGerant = data?.manager_id === user?.id;
  const lateCount = data ? data.member_count - data.paid_count : 0;

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
    m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none flex-shrink-0">←</button>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm leading-tight truncate">{data.name}</div>
          <div className="text-emerald-400 text-[10px]">Cycle {data.current_cycle}</div>
        </div>
        {isGerant && (
          <span className="hidden sm:block text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-lg font-bold flex-shrink-0">
            👑 Gérant
          </span>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell userId={user?.id} />
          <button onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center font-black text-white text-xs border-none min-h-0">
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-24">

        {/* BANNER PRINCIPAL */}
        <div className="bg-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-black">
                <span>💰</span>
                <span>{data.total_amount}€ total</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-100 mt-1">
                <span>👥</span>
                <span>{data.member_count} participants</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-emerald-200 mb-1">Cotisation</div>
              <div className="font-black text-xl">{data.contribution_amount}€</div>
              <div className="text-xs text-emerald-300">/ mois</div>
            </div>
          </div>

          {/* Barre versements */}
          <div className="bg-emerald-700/50 rounded-xl p-3">
            <div className="flex justify-between text-xs font-semibold mb-2 text-emerald-100">
              <span>Paiements du mois</span>
              <span>{data.paid_count} / {data.member_count} effectués</span>
            </div>
            <div className="h-2.5 bg-emerald-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${data.member_count > 0 ? Math.round((data.paid_count / data.member_count) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Bénéficiaire */}
          <div className={`mt-3 rounded-xl p-3 flex items-center justify-between gap-3 ${
            data.beneficiary ? "bg-white/15" : "bg-amber-500/30 border border-amber-400/40"
          }`}>
            {data.beneficiary ? (
              <>
                <div>
                  <div className="text-xs text-emerald-200 font-semibold">Bénéficiaire du cycle</div>
                  <div className="font-black text-base">{data.beneficiary.name}</div>
                </div>
                <div className="text-2xl">🏆</div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span className="text-sm font-semibold text-amber-100">Aucun bénéficiaire sélectionné</span>
                </div>
                {isGerant && (
                  <button onClick={() => setShowDraw(true)}
                    className="bg-amber-400 hover:bg-amber-300 text-amber-900 font-black px-4 py-2 rounded-xl text-sm border-none min-h-0 flex-shrink-0 transition">
                    {data.mode === "manual" ? "Choisir" : data.mode === "fixed" ? "Désigner" : "Tirer au sort"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message de bienvenue */}
        {data.welcome_message && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <span className="text-lg flex-shrink-0">💬</span>
            <p className="text-amber-800 text-sm leading-relaxed">{data.welcome_message}</p>
          </div>
        )}

        {/* Prochain bénéficiaire public */}
        {data.show_next_beneficiary && data.beneficiary && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-lg">🎲</span>
            <div>
              <div className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Prochain bénéficiaire</div>
              <div className="font-black text-emerald-800">{data.beneficiary.name}</div>
            </div>
          </div>
        )}

        {/* ── SECTION ACTIONS (gérant) ── */}
        {isGerant && (
          <Section title="Actions">
            <ActionRow icon="💳" label="Enregistrer un versement"
              sublabel={`${data.paid_count}/${data.member_count} reçus ce mois`}
              onClick={() => setShowAddPayment(true)} />
            {lateCount > 0 && (
              <ActionRow icon="⏰"
                label={`${lateCount} paiement${lateCount > 1 ? "s" : ""} en retard`}
                sublabel="Envoyer un rappel aux membres"
                onClick={() => remindMutation.mutate()}
                disabled={remindMutation.isPending} />
            )}
            {data.beneficiary && (
              <ActionRow icon="🏆" label="Voir le bénéficiaire"
                sublabel={`${data.beneficiary.name} — ${data.total_amount}€`}
                onClick={() => setShowDraw(true)} />
            )}
          </Section>
        )}

        {/* ── SECTION GROUPE ── */}
        <Section title="Groupe">
          {isGerant && (
            <ActionRow icon="👥" label="Inviter des membres"
              sublabel={`${data.member_count}/${data.max_members || "∞"} membres`}
              onClick={() => setShowInvite(true)} />
          )}
          <ActionRow icon="👤" label="Voir les participants"
            sublabel={`${data.member_count} membres`}
            onClick={() => setShowMembers(!showMembers)} />
          {(isGerant || data.show_payments) && (
            <ActionRow icon="📋" label="Historique des cycles"
              sublabel={`${data.history?.length || 0} cycle${data.history?.length > 1 ? "s" : ""} terminé${data.history?.length > 1 ? "s" : ""}`}
              onClick={() => setShowHistory(!showHistory)} />
          )}
        </Section>

        {/* ── LISTE MEMBRES (dépliable) ── */}
        {showMembers && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <input type="text" placeholder="Rechercher…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 transition"/>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                  <Avatar name={m.name} status={isGerant || data.show_payments ? m.status : "missing"} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{m.name}</div>
                    <div className="text-slate-400 text-xs">{m.phone}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(isGerant || data.show_payments) && (
                      m.status === "paid" ? (
                        <Badge status="paid" />
                      ) : isGerant && m.payment_id ? (
                        <button onClick={() => validateMutation.mutate(m.payment_id)}
                          disabled={validateMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl border-none min-h-0 disabled:opacity-60">
                          ✓ Valider
                        </button>
                      ) : (
                        <Badge status={m.status} />
                      )
                    )}
                    {isGerant && m.user_id !== data.manager_id && (
                      <button
                        onClick={() => { if (confirm(`Retirer ${m.name} ?`)) removeMutation.mutate(m.user_id); }}
                        className="text-slate-300 hover:text-red-500 transition min-h-0 p-1 bg-transparent border-none text-sm">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORIQUE (dépliable) ── */}
        {showHistory && (isGerant || data.show_payments) && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {data.history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Aucun cycle terminé</div>
            ) : data.history.map(h => (
              <div key={h.cycle_number} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-emerald-600 font-black text-base leading-none">{h.cycle_number}</span>
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

        {/* ── SECTION GESTION (gérant) ── */}
        {isGerant && (
          <Section title="Gestion">
            <ActionRow icon="⚙️" label="Paramètres"
              sublabel="Mode, dates, confidentialité"
              onClick={() => setShowSettings(true)} />
            <ActionRow icon="👑" label="Transférer la gérance"
              sublabel="Passer la main à un autre membre"
              onClick={() => setShowTransfer(true)} />
          </Section>
        )}

        {/* Infos code + date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="text-xs text-slate-400 font-semibold mb-1">Code d'invitation</div>
            <div className="font-mono font-black text-lg tracking-widest text-slate-800 mb-2">{data.invite_code}</div>
            <button onClick={() => { navigator.clipboard.writeText(data.invite_code); showToast("Code copié !"); }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs border-none min-h-0 transition">
              📋 Copier
            </button>
          </div>
          {data.payment_day ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-400 font-semibold mb-1">📅 Versement</div>
              <div className="font-black text-slate-800 text-xs">Avant le</div>
              <div className="font-black text-emerald-600 text-3xl leading-none">{data.payment_day}</div>
              <div className="text-xs text-slate-400">de chaque mois</div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-400 font-semibold mb-1">👥 Membres</div>
              <div className="font-black text-3xl text-slate-800">{data.member_count}</div>
              <div className="text-xs text-slate-400">participants</div>
            </div>
          )}
        </div>

      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {showInvite     && <InviteModal tontineId={id} inviteCode={data.invite_code} onClose={() => setShowInvite(false)} />}
      {showDraw       && <DrawModal tontineId={id} members={data.members} mode={data.mode}
          currentBeneficiary={data.beneficiary ? { beneficiary_name: data.beneficiary.name, beneficiary_phone: data.beneficiary.phone, total_amount: data.total_amount } : null}
          cycleNumber={data.current_cycle} onClose={() => setShowDraw(false)} />}
      {showAddPayment && <AddPaymentModal tontineId={id} members={data.members} contribution={data.contribution_amount} onClose={() => setShowAddPayment(false)} />}
      {showSettings   && <TontineSettingsModal tontineId={id} tontine={data} onClose={() => setShowSettings(false)} />}
      {showTransfer   && <TransferModal tontineId={id} fromUserId={user?.id} managerId={data.manager_id} members={data.members} onClose={() => setShowTransfer(false)} />}
    </div>
  );
}