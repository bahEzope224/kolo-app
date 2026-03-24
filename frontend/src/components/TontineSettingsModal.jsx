import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTontineSettings } from "../api/client";

export default function TontineSettingsModal({ tontineId, tontine, onClose }) {
  const qc = useQueryClient();
  const [welcomeMsg, setWelcomeMsg]       = useState(tontine.welcome_message || "");
  const [showBenef, setShowBenef]         = useState(tontine.show_next_beneficiary || false);
  const [paymentDay, setPaymentDay]       = useState(tontine.payment_day || 1);
  const [toast, setToast]                 = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const mutation = useMutation({
    mutationFn: () => updateTontineSettings(tontineId, {
      welcome_message:       welcomeMsg || null,
      show_next_beneficiary: showBenef,
      payment_day:           paymentDay,
    }),
    onSuccess: () => {
      qc.invalidateQueries(["tontine", tontineId]);
      showToast("Paramètres sauvegardés ✓");
      setTimeout(onClose, 1500);
    },
    onError: (e) => showToast(e.response?.data?.detail || "Erreur"),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div className="font-black text-white text-base">⚙️ Paramètres de la tontine</div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none">✕</button>
        </div>

        <div className="p-5 space-y-5">

          {/* Message de bienvenue */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              💬 Message de bienvenue pour les nouveaux membres
            </label>
            <textarea
              value={welcomeMsg}
              onChange={e => setWelcomeMsg(e.target.value)}
              placeholder="Ex: Bienvenue dans notre tontine ! Les versements sont dus avant le 5 de chaque mois."
              rows={3}
              maxLength={300}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 resize-none"
            />
            <div className="text-xs text-slate-400 text-right mt-1">{welcomeMsg.length}/300</div>
          </div>

          {/* Jour de versement */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              📅 Jour de versement mensuel
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min="1" max="28"
                value={paymentDay}
                onChange={e => setPaymentDay(Number(e.target.value))}
                className="w-20 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-lg font-black text-center focus:outline-none focus:border-emerald-400"
              />
              <span className="text-slate-500 text-sm">de chaque mois</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Les membres verront la date limite dans leur dashboard.
            </p>
          </div>

          {/* Afficher le prochain bénéficiaire */}
          <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
            <label className="relative inline-flex items-center cursor-pointer mt-0.5 flex-shrink-0">
              <input type="checkbox" checked={showBenef}
                onChange={e => setShowBenef(e.target.checked)}
                className="sr-only peer"/>
              <div className="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:bg-emerald-500 transition-colors"/>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"/>
            </label>
            <div>
              <div className="font-bold text-slate-800 text-sm">
                🎲 Afficher le prochain bénéficiaire publiquement
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Tous les membres voient qui recevra le prochain versement avant le tirage.
              </div>
            </div>
          </div>

          {toast && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-emerald-700 text-sm font-semibold text-center">
              {toast}
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition border-none"
          >
            {mutation.isPending ? "Sauvegarde…" : "Sauvegarder les paramètres"}
          </button>
        </div>
      </div>
    </div>
  );
}