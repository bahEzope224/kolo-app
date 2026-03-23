import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPayment } from "../api/client";

function initials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AddPaymentModal({ tontineId, members, contribution, onClose }) {
  const qc = useQueryClient();
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState(contribution);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => addPayment(tontineId, selectedMember.user_id, amount),
    onSuccess: () => {
      qc.invalidateQueries(["tontine", tontineId]);
      setSuccess(`Versement de ${amount}€ enregistré pour ${selectedMember.name} ✓`);
      setSelectedMember(null);
      setAmount(contribution);
    },
    onError: (e) => setError(e.response?.data?.detail || "Erreur lors de l'enregistrement"),
  });

  function handleSubmit() {
    if (!selectedMember)  { setError("Sélectionne un membre"); return; }
    if (!amount || amount <= 0) { setError("Entre un montant valide"); return; }
    setError("");
    mutation.mutate();
  }

  // Sépare les membres payés et non payés
  const unpaid = members.filter((m) => m.status !== "paid");
  const paid   = members.filter((m) => m.status === "paid");

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-black text-lg">Enregistrer un versement</h3>
            <p className="text-slate-400 text-xs mt-0.5">Marque un paiement comme reçu</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition min-h-0 p-0 bg-transparent border-none text-xl"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">

            {/* Succès */}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">
                ✅ {success}
              </div>
            )}

            {/* Sélection du membre */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Qui a versé ?
              </label>

              {/* Membres en attente */}
              {unpaid.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    En attente ({unpaid.length})
                  </p>
                  {unpaid.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => { setSelectedMember(m); setError(""); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left min-h-0 ${
                        selectedMember?.user_id === m.user_id
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        selectedMember?.user_id === m.user_id
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {initials(m.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                        <div className="text-slate-400 text-xs">{m.phone}</div>
                      </div>
                      {selectedMember?.user_id === m.user_id && (
                        <span className="text-emerald-500 text-lg flex-shrink-0">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Membres déjà payés */}
              {paid.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    Déjà payés ({paid.length}) — mettre à jour
                  </p>
                  {paid.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => { setSelectedMember(m); setError(""); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left min-h-0 opacity-60 hover:opacity-100 ${
                        selectedMember?.user_id === m.user_id
                          ? "border-emerald-400 bg-emerald-50 opacity-100"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                        {initials(m.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                        <div className="text-slate-400 text-xs">{m.phone}</div>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold flex-shrink-0">
                        Payé ✓
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Montant */}
            {selectedMember && (
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                    {initials(selectedMember.name)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{selectedMember.name}</div>
                    <div className="text-slate-400 text-xs">{selectedMember.phone}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Montant reçu (€)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(e) => { setAmount(Number(e.target.value)); setError(""); }}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-xl font-black focus:outline-none focus:border-emerald-400 transition"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">€</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Cotisation habituelle : {contribution}€
                  </p>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

          </div>
        </div>

        {/* Footer fixe */}
        <div className="p-5 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || !selectedMember}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black py-4 rounded-xl text-base transition"
          >
            {mutation.isPending
              ? "Enregistrement…"
              : selectedMember
              ? `✓ Valider ${amount}€ pour ${selectedMember.name}`
              : "Sélectionne un membre"}
          </button>
        </div>
      </div>
    </div>
  );
}