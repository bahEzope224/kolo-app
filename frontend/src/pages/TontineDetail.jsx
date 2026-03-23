import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTontineDashboard, validatePayment } from "../api/client";
import InviteModal from "../components/InviteModal";
import DrawModal from "../components/DrawModal";
import AddPaymentModal from "../components/AddPaymentModal";
import NotificationBell from "../components/NotificationBell";
import { remindLateMembers } from "../api/client";
import { removeMember } from "../api/client";
// ── Helpers ───────────────────────────────────────────────
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

// ── Barre de progression ──────────────────────────────────
function ProgressBar({ paid, total }) {
    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-500">Versements du mois</span>
                <span className="text-emerald-700">{paid}/{total} membres · {pct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────
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
    const [remindResult, setRemindResult] = useState("");
    const [search, setSearch] = useState("");

    const removeMutation = useMutation({
        mutationFn: (memberId) => removeMember(id, memberId),
        onSuccess: () => {
            qc.invalidateQueries(["tontine", id]);
            showToast("Membre retiré");
        },
        onError: (e) => showToast(e.response?.data?.detail || "Erreur"),
    });

    const remindMutation = useMutation({
        mutationFn: () => remindLateMembers(id),
        onSuccess: (data) => {
            showToast(data.message);
            setRemindResult(data.message);
            qc.invalidateQueries(["notifs"]);
        },
        onError: () => showToast("Erreur lors de l'envoi des rappels"),
    });

    const user = JSON.parse(localStorage.getItem("kolo_user") || "{}");

    const { data, isLoading, error } = useQuery({
        queryKey: ["tontine", id],
        queryFn: () => getTontineDashboard(id),
        refetchInterval: 10000, // rafraîchit toutes les 10s
    });

    const validateMutation = useMutation({
        mutationFn: (paymentId) => validatePayment(paymentId),
        onSuccess: () => {
            qc.invalidateQueries(["tontine", id]);
            showToast("Versement validé ✓");
        },
        onError: () => showToast("Erreur lors de la validation"),
    });

    function showToast(msg) {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    }

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

    return (
        <div className="min-h-screen bg-slate-50">

            {/* Header */}
            <header className="bg-slate-900 text-white px-5 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button
                    onClick={() => navigate("/")}
                    className="text-slate-400 hover:text-white transition min-h-0 p-0 bg-transparent border-none text-xl"
                >
                    ←
                </button>
                <div className="flex-1 min-w-0">
                    <div className="font-black text-base truncate">{data.name}</div>
                    <div className="text-emerald-400 text-xs">Cycle {data.current_cycle}</div>
                </div>
                <NotificationBell userId={user?.id} />
                {isGerant && (
                    <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg font-bold flex-shrink-0">
                        👑 Gérant
                    </span>
                )}
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

                {/* Banner bénéficiaire + montant */}
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

                {/* Code d'invitation */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-4">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold mb-1">Code d'invitation</div>
                        <div className="font-mono font-black text-2xl tracking-widest text-slate-800">
                            {data.invite_code}
                        </div>
                    </div>
                    <button
                        onClick={copyCode}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition min-h-0 ${copiedCode
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                    >
                        {copiedCode ? "✓ Copié !" : "📋 Copier"}
                    </button>

                    {isGerant && (
                        <button
                            onClick={() => setShowDraw(true)}
                            className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-black py-4 rounded-2xl text-base transition"
                        >
                            🎲 {data.beneficiary ? "Voir le tirage" : "Lancer le tirage au sort"}
                        </button>
                    )}
                </div>

                {isGerant && (
                    <button
                        onClick={() => setShowInvite(true)}
                        className="w-full bg-slate-900 hover:bg-slate-700 text-white font-black py-4 rounded-2xl text-base transition"
                    >
                        👥 Inviter un membre
                    </button>
                )}
                {isGerant && (
                    <button
                        onClick={() => setShowAddPayment(true)}
                        className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-300 text-slate-700 font-black py-4 rounded-2xl text-base transition"
                    >
                        💳 Enregistrer un versement
                    </button>
                )}
                {isGerant && data.paid_count < data.member_count && (
                    <button
                        onClick={() => remindMutation.mutate()}
                        disabled={remindMutation.isPending}
                        className="w-full bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 text-amber-800 font-black py-4 rounded-2xl text-base transition disabled:opacity-60"
                    >
                        {remindMutation.isPending
                            ? "Envoi en cours…"
                            : `⏰ Rappeler les retardataires (${data.member_count - data.paid_count})`}
                    </button>
                )}
                {/* Onglets */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="flex border-b border-slate-100">
                        {["membres", "historique"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-3 text-sm font-bold transition capitalize min-h-0 border-none rounded-none ${tab === t
                                    ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50"
                                    : "text-slate-400 hover:text-slate-600 bg-white"
                                    }`}
                            >
                                {t === "membres" ? `👥 Membres (${data.member_count})` : "📋 Historique"}
                            </button>
                        ))}
                    </div>

                    {/* Onglet membres */}
                    {tab === "membres" && (
                        <div className="divide-y divide-slate-50">
                            {data.members.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm">
                                    Aucun membre pour l'instant
                                </div>
                            ) : (
                                data.members.map((m) => (
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
                                                <button
                                                    onClick={() => validateMutation.mutate(m.payment_id)}
                                                    disabled={validateMutation.isPending}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition min-h-0 disabled:opacity-60"
                                                >
                                                    ✓ Valider
                                                </button>
                                            ) : (
                                                <Badge status={m.status} />
                                            )}
                                            {isGerant && m.user_id !== data.manager_id && (
                                                <button
                                                    onClick={() => { if (confirm(`Retirer ${m.name} ?`)) removeMutation.mutate(m.user_id); }}
                                                    className="text-slate-300 hover:text-red-500 transition min-h-0 p-1 bg-transparent border-none text-base"
                                                    title="Retirer ce membre"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Onglet historique */}
                    {tab === "historique" && (
                        <div className="divide-y divide-slate-50">
                            {data.history.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm">
                                    Aucun cycle terminé pour l'instant
                                </div>
                            ) : (
                                data.history.map((h) => (
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
                                ))
                            )}
                        </div>
                    )}
                </div>

            </main>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl z-50">
                    {toast}
                </div>
            )}
            {showInvite && (
                <InviteModal
                    tontineId={id}
                    inviteCode={data.invite_code}
                    onClose={() => setShowInvite(false)}
                />
            )}
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
                    onClose={() => setShowDraw(false)}
                />
            )}
            {showAddPayment && (
                <AddPaymentModal
                    tontineId={id}
                    members={data.members}
                    contribution={data.contribution_amount}
                    onClose={() => setShowAddPayment(false)}
                />
            )}
        </div>
    );
}