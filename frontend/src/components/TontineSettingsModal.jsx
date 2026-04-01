import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { updateTontineSettings, deleteTontine } from "../api/client";

const MODES = [
  { value: "random", label: "🎲 Tirage au sort", desc: "Bénéficiaire tiré aléatoirement" },
  { value: "fixed",  label: "📅 Tour fixe",      desc: "Ordre d'inscription respecté" },
  { value: "manual", label: "✋ Manuel",          desc: "Le gérant choisit à chaque cycle" },
];

export default function TontineSettingsModal({ tontineId, tontine, onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  
  // States from your snippet + new features
  const [name,         setName]         = useState(tontine.name || "");
  const [amount,       setAmount]       = useState(tontine.contribution_amount || 0);
  const [welcomeMsg,   setWelcomeMsg]   = useState(tontine.welcome_message || "");
  const [showBenef,    setShowBenef]    = useState(tontine.show_next_beneficiary || false);
  const [showPayments, setShowPayments] = useState(tontine.show_payments !== false);
  const [paymentDay,   setPaymentDay]   = useState(tontine.payment_day || 1);
  const [mode,         setMode]         = useState(tontine.mode || "random");
  const [toast,        setToast]        = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const mutation = useMutation({
    mutationFn: () => updateTontineSettings(tontineId, {
      name:                   name,
      contribution_amount:    Number(amount),
      welcome_message:        welcomeMsg || null,
      show_next_beneficiary:  showBenef,
      show_payments:          showPayments,
      payment_day:            paymentDay,
      mode:                   mode,
    }),
    onSuccess: () => {
      qc.invalidateQueries(["tontine", tontineId]);
      qc.invalidateQueries(["tontines"]);
      showToast("Paramètres sauvegardés ✓");
      setTimeout(onClose, 1500);
    },
    onError: (e) => showToast(e.response?.data?.detail || "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTontine(tontineId),
    onSuccess: () => {
      qc.invalidateQueries(["tontines"]);
      navigate("/");
    },
    onError: (e) => showToast(e.response?.data?.detail || "Erreur lors de la suppression"),
  });

  const Toggle = ({ checked, onChange, label, desc }) => (
    <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
      <label className="relative inline-flex items-center cursor-pointer mt-0.5 flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer"/>
        <div className="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:bg-emerald-500 transition-colors"/>
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"/>
      </label>
      <div>
        <div className="font-bold text-slate-800 text-sm">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="font-black text-white text-base">⚙️ Paramètres de la tontine</div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none">✕</button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">

          {/* Identification (Identité) */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Nom de la tontine</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-400"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Montant de cotisation (€)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-400"/>
            </div>
          </div>

          {/* Mode de distribution */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-3">
              🎯 Mode de désignation du bénéficiaire
            </label>
            <div className="space-y-2">
              {MODES.map(m => (
                <label key={m.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    mode === m.value ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <input type="radio" name="mode" value={m.value} checked={mode === m.value}
                    onChange={() => setMode(m.value)}
                    className="accent-emerald-500 w-4 h-4 flex-shrink-0"/>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{m.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Jour de versement */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              📅 Jour de versement mensuel
            </label>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="28" value={paymentDay}
                onChange={e => setPaymentDay(Number(e.target.value))}
                className="w-20 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-lg font-black text-center focus:outline-none focus:border-emerald-400"/>
              <span className="text-slate-500 text-sm">de chaque mois</span>
            </div>
          </div>

          {/* Message de bienvenue */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              💬 Message de bienvenue
            </label>
            <textarea value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)}
              placeholder="Ex: Bienvenue ! Les versements sont dus avant le 5 de chaque mois."
              rows={3} maxLength={300}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 resize-none"/>
            <div className="text-xs text-slate-400 text-right mt-1">{welcomeMsg.length}/300</div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <Toggle
              checked={showBenef}
              onChange={setShowBenef}
              label="🎲 Afficher le prochain bénéficiaire"
              desc="Tous les membres voient qui recevra le prochain versement."
            />

            <Toggle
              checked={showPayments}
              onChange={setShowPayments}
              label="💳 Afficher les versements à tous les membres"
              desc="Si désactivé, seul le gérant voit qui a payé ou non."
            />
          </div>

          {toast && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-emerald-700 text-sm font-semibold text-center">
              {toast}
            </div>
          )}

          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-sm transition border-none shadow-lg shadow-emerald-200">
            {mutation.isPending ? "Sauvegarde…" : "Sauvegarder les paramètres"}
          </button>

          {/* DANGER ZONE (Suppression) */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            {showConfirmDelete ? (
              <div className="bg-red-50 rounded-2xl p-4 border-2 border-red-200">
                <div className="text-red-700 font-bold text-sm text-center mb-3">⚠️ Supprimer définitivement ?</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowConfirmDelete(false)}
                    className="bg-white border border-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs">Annuler</button>
                  <button onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 text-white font-bold py-2 rounded-xl text-xs border-none">
                    {deleteMutation.isPending ? "..." : "Oui, supprimer"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowConfirmDelete(true)}
                className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl text-xs hover:bg-red-600 hover:text-white transition border-none">
                🗑️ Supprimer cette tontine
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}