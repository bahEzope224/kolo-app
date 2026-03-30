import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestTransfer } from "../api/client";

export default function TransferModal({ tontineId, fromUserId, members, managerId, onClose }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");

  // Exclut le gérant actuel
  const eligible = members.filter(m => m.user_id !== managerId);

  const mutation = useMutation({
    mutationFn: () => requestTransfer({
      tontine_id:   tontineId,
      from_user_id: fromUserId,
      to_user_id:   selectedId,
    }),
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.response?.data?.detail || "Erreur lors de la demande"),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-black text-white text-base">👑 Transférer la gérance</div>
            <div className="text-slate-400 text-xs mt-0.5">Le membre devra accepter</div>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none">✕</button>
        </div>

        <div className="p-5">
          {!done ? (
            <>
              <p className="text-slate-500 text-sm mb-4">
                Choisis le membre à qui tu veux transférer la gestion de la tontine.
                Il recevra une notification et devra accepter.
              </p>

              <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
                {eligible.map(m => (
                  <label key={m.user_id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      selectedId === m.user_id
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}>
                    <input type="radio" name="transfer_member" value={m.user_id}
                      checked={selectedId === m.user_id}
                      onChange={() => { setSelectedId(m.user_id); setError(""); }}
                      className="accent-emerald-500 w-4 h-4 flex-shrink-0"/>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                      <div className="text-slate-400 text-xs">{m.phone}</div>
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={() => {
                  if (!selectedId) { setError("Choisis un membre"); return; }
                  mutation.mutate();
                }}
                disabled={mutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition border-none"
              >
                {mutation.isPending ? "Envoi…" : "Envoyer la demande →"}
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">📨</div>
              <p className="font-black text-slate-800 text-lg mb-2">Demande envoyée !</p>
              <p className="text-slate-500 text-sm mb-6">
                Le membre recevra une notification et pourra accepter ou refuser.
              </p>
              <button onClick={onClose}
                className="w-full bg-slate-900 text-white font-black py-3 rounded-xl border-none">
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}