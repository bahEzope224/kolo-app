import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { drawBeneficiary, closeCycle } from "../api/client";

export default function DrawModal({ tontineId, members, currentBeneficiary, cycleNumber, mode, onClose }) {
  const qc = useQueryClient();
  const [phase, setPhase]           = useState(currentBeneficiary ? "result" : "idle");
  const [winner, setWinner]         = useState(currentBeneficiary || null);
  const [displayName, setDisplayName] = useState("?");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [closing, setClosing]       = useState(false);
  const [closed, setClosed]         = useState(false);

  const drawMutation = useMutation({
    mutationFn: () => drawBeneficiary(tontineId, mode === "manual" ? selectedMemberId : null),
    onMutate: () => {
      if (mode === "random") {
        setPhase("spinning");
        let count = 0;
        const names = members.map(m => m.name);
        const interval = setInterval(() => {
          setDisplayName(names[Math.floor(Math.random() * names.length)]);
          count++;
          if (count > 20) clearInterval(interval);
        }, 100);
      }
    },
    onSuccess: (data) => {
      setTimeout(() => {
        setWinner(data);
        setDisplayName(data.beneficiary_name);
        setPhase("result");
        qc.invalidateQueries(["tontine", tontineId]);
      }, mode === "random" ? 2200 : 0);
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

  const MODE_LABELS = {
    random: "🎲 Tirage aléatoire",
    fixed:  "📅 Tour fixe",
    manual: "✋ Choix du gérant",
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={() => phase !== "spinning" && onClose()}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-lg">Désigner un bénéficiaire</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {MODE_LABELS[mode] || "🎲 Tirage"} · Cycle {cycleNumber}
            </p>
          </div>
          {phase !== "spinning" && (
            <button onClick={onClose}
              className="text-slate-400 hover:text-white min-h-0 p-0 bg-transparent border-none text-xl">✕</button>
          )}
        </div>

        <div className="p-6 text-center">

          {/* ── IDLE ── */}
          {phase === "idle" && (
            <>
              {/* Cercle animé pour random */}
              {mode === "random" && (
                <div className="w-24 h-24 rounded-full mx-auto mb-5 bg-slate-100 border-4 border-slate-200 flex items-center justify-center text-4xl">
                  🎲
                </div>
              )}

              {/* Sélecteur de membre pour manual */}
              {mode === "manual" && (
                <div className="mb-5 text-left">
                  <label className="block text-sm font-bold text-slate-600 mb-3">
                    Choisis le bénéficiaire
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {members.map(m => (
                      <label key={m.user_id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                          selectedMemberId === m.user_id
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}>
                        <input type="radio" name="member" value={m.user_id}
                          checked={selectedMemberId === m.user_id}
                          onChange={() => setSelectedMemberId(m.user_id)}
                          className="accent-emerald-500 w-4 h-4 flex-shrink-0"/>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                          <div className="text-slate-400 text-xs">{m.phone}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Info pour fixed */}
              {mode === "fixed" && (
                <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                  <p className="text-blue-700 text-sm font-semibold mb-1">📅 Tour fixe</p>
                  <p className="text-blue-600 text-xs">
                    Le bénéficiaire sera le prochain membre dans l'ordre d'inscription qui n'a pas encore reçu.
                  </p>
                </div>
              )}

              <p className="text-slate-500 text-sm mb-5">
                {members.length} membre{members.length > 1 ? "s" : ""} dans la tontine
              </p>

              <button
                onClick={() => drawMutation.mutate()}
                disabled={drawMutation.isPending || (mode === "manual" && !selectedMemberId)}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-black py-4 rounded-xl text-base transition border-none mb-3"
              >
                {drawMutation.isPending ? "En cours…" :
                  mode === "random" ? "🎲 Lancer le tirage" :
                  mode === "fixed"  ? "📅 Désigner le suivant" :
                  "✋ Confirmer le choix"}
              </button>

              <button onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm border-none min-h-0">
                Annuler
              </button>
            </>
          )}

          {/* ── SPINNING (random seulement) ── */}
          {phase === "spinning" && (
            <>
              <div className="w-24 h-24 rounded-full mx-auto mb-5 bg-amber-100 border-4 border-amber-400 flex items-center justify-center font-black text-amber-700 text-sm px-2 animate-pulse">
                {displayName}
              </div>
              <p className="text-amber-600 font-bold text-base mb-2">Tirage en cours…</p>
              <p className="text-slate-400 text-xs">Ne ferme pas cette fenêtre</p>
            </>
          )}

          {/* ── RESULT ── */}
          {phase === "result" && !closed && (
            <>
              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center font-black text-emerald-700 text-sm px-2">
                {winner?.beneficiary_name || winner?.name}
              </div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-1">
                Bénéficiaire désigné
              </p>
              <p className="font-black text-slate-800 text-2xl mb-1">
                {winner?.beneficiary_name || winner?.name}
              </p>
              <p className="font-black text-emerald-600 text-3xl mb-1">
                {winner?.total_amount}€
              </p>
              <p className="text-slate-400 text-xs mb-6">
                {winner?.beneficiary_phone || winner?.phone}
              </p>

              <button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition border-none mb-3">
                {closeMutation.isPending ? "Clôture…" : "✓ Confirmer et clôturer le cycle"}
              </button>
              <button onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm border-none min-h-0">
                Fermer sans clôturer
              </button>
            </>
          )}

          {/* ── CLOSED ── */}
          {closed && (
            <>
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-emerald-600 font-black text-xl mb-2">Cycle clôturé !</p>
              <p className="text-slate-500 text-sm mb-6">Le cycle suivant a démarré automatiquement.</p>
              <button onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white font-black py-4 rounded-xl text-base border-none">
                Retour au tableau de bord
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}