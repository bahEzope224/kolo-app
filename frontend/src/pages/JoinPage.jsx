
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTontineByCode, onboarding, requestOtp, verifyOtp } from "../api/client";

export default function JoinPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [tontine, setTontine]   = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep]         = useState("info");   // info | code | done
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Charge les infos de la tontine
  useEffect(() => {
    getTontineByCode(code)
      .then(setTontine)
      .catch(() => setNotFound(true));
  }, [code]);

  async function handleJoin() {
    if (!name.trim())     { setError("Entre ton prénom et nom"); return; }
    if (phone.length < 8) { setError("Entre ton numéro de téléphone"); return; }
    setLoading(true);
    setError("");
    try {
      await onboarding({ name, phone, invite_code: code });
      await requestOtp(phone);        // ← phone directement, pas un objet
      setStep("code");
    } catch (e) {
      setError(e.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) { setError("Le code fait 6 chiffres"); return; }
    setLoading(true);
    setError("");
    try {
      const { data } = await verifyOtp(phone, otp);   // ← deux params séparés
      localStorage.setItem("kolo_token", data.access_token);
      localStorage.setItem("kolo_user", JSON.stringify({
        id: data.user_id,
        name: data.name,
      }));
      setStep("done");
      setTimeout(() => navigate("/"), 2000);
    } catch (e) {
      setError("Code incorrect ou expiré. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  // Tontine introuvable
  if (notFound) return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="font-black text-xl text-slate-800 mb-2">Lien invalide</h2>
        <p className="text-slate-500 text-sm mb-6">Ce code d'invitation n'existe pas ou a expiré.</p>
        <button onClick={() => navigate("/login")}
          className="w-full bg-emerald-500 text-white font-black py-3 rounded-xl border-none">
          Aller à la connexion
        </button>
      </div>
    </div>
  );

  // Chargement
  if (!tontine) return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
      <div className="text-white font-bold">Chargement…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Header tontine */}
        <div className="bg-emerald-600 px-6 py-8 text-center">
          <div className="text-4xl mb-3">🌿</div>
          <div className="text-white font-black text-2xl mb-1">{tontine.name}</div>
          <div className="text-emerald-100 text-sm">
            {tontine.member_count} membre{tontine.member_count > 1 ? "s" : ""} ·{" "}
            {tontine.contribution_amount}€/mois
          </div>
          <div className="text-emerald-200 text-xs mt-1">
            Géré par {tontine.manager_name}
          </div>
        </div>

        <div className="p-6">

          {/* ÉTAPE 1 — Infos */}
          {step === "info" && (
            <>
              <h2 className="font-black text-slate-800 text-lg mb-1">Rejoins la tontine</h2>
              <p className="text-slate-500 text-sm mb-5">Entre tes infos pour créer ton compte.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Ton prénom et nom
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Aminata Diallo"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(""); }}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Ton numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    inputMode="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(""); }}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition border-none"
                >
                  {loading ? "Création du compte…" : "Rejoindre la tontine →"}
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 mt-4">
                Tu as déjà un compte ?{" "}
                <button onClick={() => navigate("/login")}
                  className="text-emerald-600 font-bold underline bg-transparent border-none">
                  Connexion
                </button>
              </p>
            </>
          )}

          {/* ÉTAPE 2 — Code OTP */}
          {step === "code" && (
            <>
              <h2 className="font-black text-slate-800 text-lg mb-1">Vérifie ton numéro</h2>
              <p className="text-slate-500 text-sm mb-5">
                Code envoyé au <strong>{phone}</strong>
              </p>

              <input
                type="number"
                placeholder="123456"
                inputMode="numeric"
                value={otp}
                onChange={e => { setOtp(e.target.value.slice(0, 6)); setError(""); }}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-4 text-4xl font-black text-center tracking-widest focus:outline-none focus:border-emerald-400 mb-2"
              />
              <p className="text-center text-xs text-slate-400 mb-4">
                💡 En mode test : utilise le code <strong>123456</strong>
              </p>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition border-none"
              >
                {loading ? "Vérification…" : "Confirmer →"}
              </button>
            </>
          )}

          {/* ÉTAPE 3 — Succès */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="font-black text-slate-800 text-xl mb-2">
                Bienvenue dans {tontine.name} !
              </h2>
              <p className="text-slate-500 text-sm mb-4">
                Ton compte est créé. Redirection vers ton dashboard…
              </p>
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}