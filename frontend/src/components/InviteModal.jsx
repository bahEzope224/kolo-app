import { useState } from "react";

export default function InviteModal({ tontineId, inviteCode, onClose }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    // On utilise l'URL absolue pour le partage
    const joinUrl = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareText = encodeURIComponent(
    `Rejoins ma tontine sur Kolo ! 🌿\n\nLien : ${window.location.origin}/join/${inviteCode}\nCode : ${inviteCode}`
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-6 text-center relative border-none">
          <div className="text-4xl mb-2">🌿</div>
          <h3 className="text-white font-black text-xl">Partager l'invitation</h3>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-100 hover:text-white transition min-h-0 p-1 bg-white/10 rounded-full border-none text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-500 text-sm text-center leading-relaxed">
            Partage ce code ou ce lien avec tes membres pour qu'ils rejoignent directement ta tontine.
          </p>

          {/* Code visuel */}
          <div className="bg-slate-50 rounded-2xl p-6 text-center border-2 border-dashed border-slate-200">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
              Code d'invitation
            </div>
            <div className="font-mono font-black text-4xl tracking-widest text-slate-800">
              {inviteCode}
            </div>
          </div>

          {/* Boutons de partage */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={copyCode}
              className={`py-4 rounded-2xl text-xs font-bold transition min-h-0 border-none ${
                copied && !window.location.href.includes("join")
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              }`}
            >
              📋 Copier le code
            </button>
            <button
              onClick={copyLink}
              className="py-4 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition min-h-0 border-none"
            >
              🔗 Copier le lien
            </button>
          </div>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm transition no-underline"
          >
            <span className="text-lg">💬</span> Partager sur WhatsApp
          </a>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-amber-800 text-[10px] text-center font-bold leading-tight">
              ⚠️ Chaque membre doit se connecter avec son propre compte sur Kolo pour participer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}