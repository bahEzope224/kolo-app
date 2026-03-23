import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { drawBeneficiary, closeCycle } from "../api/client";

export default function DrawModal({ tontineId, members, currentBeneficiary, cycleNumber, onClose }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState(
    currentBeneficiary ? "result" : "idle"
  ); // idle | spinning | result
  const [winner, setWinner] = useState(currentBeneficiary || null);
  const [displayName, setDisplayName] = useState("?");
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);

  const drawMutation = useMutation({
    mutationFn: () => drawBeneficiary(tontineId),
    onMutate: () => {
      // Animation de roulement des noms
      setPhase("spinning");
      let count = 0;
      const names = members.map((m) => m.name);
      const interval = setInterval(() => {
        setDisplayName(names[Math.floor(Math.random() * names.length)]);
        count++;
        if (count > 20) clearInterval(interval);
      }, 100);
    },
    onSuccess: (data) => {
      setTimeout(() => {
        setWinner(data);
        setDisplayName(data.beneficiary_name);
        setPhase("result");
        qc.invalidateQueries(["tontine", tontineId]);
      }, 2200); // laisse l'animation tourner
    },
    onError: (e) => {
      setPhase("idle");
      alert(e.response?.data?.detail || "Erreur lors du tirage");
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeCycle(tontineId),
    onSuccess: () => {
      qc.invalidateQueries(["tontine", tontineId]);
      setClosed(true);
    },
    onError: (e) => alert(e.response?.data?.detail || "Erreur lors de la clôture"),
  });

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={() => phase !== "spinning" && onClose()}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-lg">Tirage au sort</h3>
            <p className="text-slate-400 text-xs">Cycle {cycleNumber}</p>
          </div>
          {phase !== "spinning" && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition min-h-0 p-0 bg-transparent border-none text-xl"
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-6 text-center">

          {/* Zone d'animation */}
          <div className={`w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center transition-all duration-500 ${
            phase === "spinning" ? "bg-amber-100 border-4 border-amber-400" :
            phase === "result"   ? "bg-emerald-100 border-4 border-emerald-400" :
                                   "bg-slate-100 border-4 border-slate-200"
          }`}>
            {phase === "idle" && (
              <span className="text-5xl">🎲</span>
            )}
            {phase === "spinning" && (
              <span className="font-black text-amber-700 text-sm px-2 text-center leading-tight animate-pulse">
                {displayName}
              </span>
            )}
            {phase === "result" && (
              <span className="font-black text-emerald-700 text-sm px-2 text-center leading-tight">
                {winner?.beneficiary_name || winner?.name}
              </span>
            )}
          </div>

          {/* Texte selon la phase */}
          {phase === "idle" && (
            <>
              <p className="text-slate-600 text-sm mb-2 font-medium">
                {members.length} membre{members.length > 1 ? "s" : ""} éligible{members.length > 1 ? "s" : ""}
              </p>
              <p className="text-slate-400 text-xs mb-6">
                Le bénéficiaire sera tiré aléatoirement parmi les membres.
              </p>
              <button
                onClick={() => drawMutation.mutate()}
                className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-black py-4 rounded-xl text-lg transition"
              >
                🎲 Lancer le tirage
              </button>
            </>
          )}

          {phase === "spinning" && (
            <>
              <p className="text-amber-600 font-bold text-base mb-2">Tirage en cours…</p>
              <p className="text-slate-400 text-xs">Ne ferme pas cette fenêtre</p>
            </>
          )}

          {phase === "result" && !closed && (
            <>
              <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold mb-1">
                Bénéficiaire désigné
              </p>
              <p className="font-black text-slate-800 text-2xl mb-1">
                {winner?.beneficiary_name || winner?.name}
              </p>
              <p className="text-emerald-600 font-black text-3xl mb-1">
                {winner?.total_amount}€
              </p>
              <p className="text-slate-400 text-xs mb-6">
                {winner?.beneficiary_phone || winner?.phone}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition"
                >
                  {closeMutation.isPending ? "Clôture en cours…" : "✓ Confirmer et clôturer le cycle"}
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition min-h-0"
                >
                  Fermer sans clôturer
                </button>
              </div>
            </>
          )}

          {closed && (
            <>
              <p className="text-emerald-600 font-black text-xl mb-2">🎉 Cycle clôturé !</p>
              <p className="text-slate-500 text-sm mb-6">
                Le cycle suivant a démarré automatiquement.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white font-black py-4 rounded-xl text-base transition"
              >
                Retour au tableau de bord
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}