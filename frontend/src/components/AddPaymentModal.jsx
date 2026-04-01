import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addBulkPayments } from "../api/client";

function initials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AddPaymentModal({ tontineId, members, contribution, onClose }) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [amount, setAmount] = useState(contribution);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const unpaid = members.filter((m) => m.status !== "paid");
  const paid   = members.filter((m) => m.status === "paid");

  const mutation = useMutation({
    mutationFn: () => addBulkPayments(tontineId, {
      member_ids: selectedIds,
      amount: amount,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries(["tontine", tontineId]);
      setSuccess(`${data.count} versement(s) de ${amount}€ enregistré(s) avec succès ✓`);
      setSelectedIds([]);
    },
    onError: (e) => setError(e.response?.data?.detail || "Erreur lors de l'enregistrement"),
  });

  const toggleMember = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setError("");
  };

  const selectAllUnpaid = () => {
    const ids = unpaid.map(m => m.user_id);
    setSelectedIds(ids);
  };

  function handleSubmit() {
    if (selectedIds.length === 0) {
      setError("Sélectionne au moins un membre");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Entre un montant valide");
      return;
    }
    setError("");
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-black text-lg">Enregistrer des versements</h3>
            <p className="text-slate-400 text-xs mt-0.5">Sélectionne un ou plusieurs membres</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-0 bg-transparent border-none text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">
                ✅ {success}
              </div>
            )}

            {/* Barre d'action rapide */}
            {unpaid.length > 0 && (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{unpaid.length} membres en attente</span>
                <button 
                  onClick={selectAllUnpaid}
                  className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:border-emerald-300 hover:text-emerald-600 transition"
                >
                  Tout sélectionner
                </button>
              </div>
            )}

            {/* Listes des membres */}
            <div className="space-y-4">
              {/* En attente */}
              {unpaid.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => toggleMember(m.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                    selectedIds.includes(m.user_id) ? "border-emerald-400 bg-emerald-50" : "border-slate-100 bg-white"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                    selectedIds.includes(m.user_id) ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                  }`}>
                    {selectedIds.includes(m.user_id) && <span className="text-xs">✓</span>}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm">
                    {initials(m.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                    <div className="text-slate-400 text-xs">{m.phone}</div>
                  </div>
                </button>
              ))}

              {/* Déjà payés (optionnel, pour mise à jour) */}
              {paid.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Déjà validés ({paid.length})</p>
                   {paid.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => toggleMember(m.user_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left opacity-60 hover:opacity-100 ${
                        selectedIds.includes(m.user_id) ? "border-emerald-400 bg-emerald-50 opacity-100" : "border-transparent bg-slate-50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedIds.includes(m.user_id) ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                      }`}>
                        {selectedIds.includes(m.user_id) && <span className="text-xs">✓</span>}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                        {initials(m.name)}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Payé ✓</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Montant global */}
            {selectedIds.length > 0 && (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <label className="block text-sm font-bold text-emerald-800 mb-2">Montant reçu par personne (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full border-2 border-emerald-200 rounded-xl px-4 py-3 text-xl font-black focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-emerald-400 text-lg">€</span>
                </div>
                <div className="flex justify-between items-center mt-3 text-emerald-700 font-bold text-sm">
                   <span>Total à enregistrer :</span>
                   <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-lg">{(selectedIds.length * amount).toLocaleString()}€</span>
                </div>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || selectedIds.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 shadow-lg shadow-emerald-100 text-white font-black py-4 rounded-xl text-base transition border-none"
          >
            {mutation.isPending ? "Traitement…" : `✓ Valider pour ${selectedIds.length} membres`}
          </button>
        </div>
      </div>
    </div>
  );
}