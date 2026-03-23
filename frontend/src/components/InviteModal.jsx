import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteMember } from "../api/client";

export default function InviteModal({ tontineId, inviteCode, onClose }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("form"); // "form" | "code"
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => inviteMember(tontineId, data),
    onSuccess: (data) => {
      qc.invalidateQueries(["tontine", tontineId]);
      setSuccess(`${form.name} a été ajouté(e) ! Il peut se connecter avec son numéro.`);
      setForm({ name: "", phone: "" });
    },
    onError: (e) => setError(e.response?.data?.detail || "Erreur lors de l'invitation"),
  });

  function handleInvite() {
    if (!form.name.trim())  { setError("Entre le prénom du membre"); return; }
    if (!form.phone.trim()) { setError("Entre son numéro de téléphone"); return; }
    setError("");
    setSuccess("");
    mutation.mutate(form);
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://kolo.app/join/${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    // Fond sombre
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <h3 className="text-white font-black text-lg">Inviter un membre</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition min-h-0 p-0 bg-transparent border-none text-xl"
          >
            ✕
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-slate-100">
          {[
            { id: "form", label: "➕ Ajouter manuellement" },
            { id: "code", label: "🔗 Partager le code" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(""); setSuccess(""); }}
              className={`flex-1 py-3 text-xs font-bold transition min-h-0 border-none rounded-none ${
                tab === t.id
                  ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50"
                  : "text-slate-400 bg-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* TAB : Formulaire */}
          {tab === "form" && (
            <div className="space-y-4">
              <p className="text-slate-500 text-sm">
                Le gérant ajoute le membre directement — il pourra se connecter avec son numéro.
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Prénom et nom</label>
                <input
                  type="text"
                  placeholder="Ex: Aminata Diallo"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(""); }}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Numéro de téléphone</label>
                <input
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => { setForm({ ...form, phone: e.target.value }); setError(""); }}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">
                  ✅ {success}
                </div>
              )}

              <button
                onClick={handleInvite}
                disabled={mutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition"
              >
                {mutation.isPending ? "Ajout en cours…" : "Ajouter le membre →"}
              </button>
            </div>
          )}

          {/* TAB : Code */}
          {tab === "code" && (
            <div className="space-y-4">
              <p className="text-slate-500 text-sm">
                Partage ce code à tes membres. Ils l'entrent dans l'app pour rejoindre directement.
              </p>

              {/* Code visuel */}
              <div className="bg-slate-50 rounded-2xl p-6 text-center border-2 border-dashed border-slate-200">
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Code d'invitation
                </div>
                <div className="font-mono font-black text-4xl tracking-widest text-slate-800 mb-1">
                  {inviteCode}
                </div>
              </div>

              {/* Boutons de partage */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyCode}
                  className={`py-3 rounded-xl text-sm font-bold transition min-h-0 ${
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {copied ? "✓ Copié !" : "📋 Copier le code"}
                </button>
                <button
                  onClick={copyLink}
                  className="py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition min-h-0"
                >
                  🔗 Copier le lien
                </button>
              </div>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=Rejoins%20notre%20tontine%20sur%20Kolo%20!%20Code%20d'invitation%20:%20${inviteCode}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition"
              >
                <span>💬</span> Envoyer sur WhatsApp
              </a>

              <p className="text-slate-400 text-xs text-center">
                Le membre doit d'abord avoir un compte Kolo pour rejoindre via ce code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}