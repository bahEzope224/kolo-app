import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { createAccount } from "../api/client";

export default function Login() {
  const [mode, setMode]   = useState("login");
  const [step, setStep]   = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode]   = useState("");
  const [name, setName]   = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regDone, setRegDone]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showRegisterSuggestion, setShowRegisterSuggestion] = useState(false);

  const { sendCode, verifyCode } = useAuth();

  
  async function handleSendCode() {
    if (phone.length < 8) { setError("Entre ton numéro de téléphone"); return; }
    setShowRegisterSuggestion(false);
    setError("");
  
    const result = await sendCode(phone);
  
    if (result.success) {
      setStep("code");
    } else {
      setError(result.message);           // ← affiche le message
      if (result.status === 404) {
        setShowRegisterSuggestion(true);  // ← montre le bouton
      }
    }
  }
  
  async function handleVerifyCode() {
    if (code.length !== 6) { setError("Le code fait 6 chiffres"); return; }
    setError("");
    await verifyCode(phone, code);
  }

  async function handleRegister() {
    if (!name.trim())        { setError("Entre ton prénom et nom"); return; }
    if (regPhone.length < 8) { setError("Entre ton numéro de téléphone"); return; }
    setLoading(true);
    setError("");
    try {
      await createAccount({ name: name.trim(), phone: regPhone.trim() });
      setRegDone(true);
    } catch (e) {
      setError(e.response?.data?.detail || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="bg-emerald-600 px-8 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">🌿</div>
          <h1 className="text-white font-black text-2xl">Kolo</h1>
          <p className="text-emerald-100 text-sm mt-1">Tontine collective simplifiée</p>
        </div>

        <div className="flex border-b border-slate-100">
          {[["login", "Connexion"], ["register", "Créer un compte"]].map(([m, label]) => (
            <button key={m}
              onClick={() => { setMode(m); setError(""); setRegDone(false); setStep("phone"); setShowRegisterSuggestion(false); }}
              className={`flex-1 py-3 text-sm font-bold transition min-h-0 border-none rounded-none ${
                mode === m ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50" : "text-slate-400 bg-white"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-7 space-y-4">

          {/* ── CONNEXION ── */}
          {mode === "login" && step === "phone" && (
            <>
              <p className="text-slate-700 font-semibold text-lg">Ton numéro de téléphone</p>
              <input type="tel" value={phone} inputMode="tel"
                onChange={(e) => { setPhone(e.target.value); setError(""); setShowRegisterSuggestion(false); }}
                placeholder="+33 6 12 34 56 78"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-emerald-400"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm font-semibold">❌ {error}</p>
                  {showRegisterSuggestion && (
                    <div className="mt-3 pt-3 border-t border-red-100">
                      <p className="text-red-500 text-xs mb-3">
                        Ce numéro n'a pas encore de compte Kolo.
                      </p>
                      <button
                        onClick={() => {
                          setMode("register");
                          setRegPhone(phone);
                          setError("");
                          setShowRegisterSuggestion(false);
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl text-sm transition border-none min-h-0"
                      >
                        ✨ Créer un compte avec ce numéro
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleSendCode}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-lg transition border-none">
                Recevoir mon code →
              </button>
            </>
          )}

          {mode === "login" && step === "code" && (
            <>
              <p className="text-slate-700 font-semibold text-lg">Code reçu par SMS</p>
              <p className="text-slate-400 text-sm">Envoyé au {phone}</p>
              <input type="number" value={code} inputMode="numeric"
                onChange={(e) => { setCode(e.target.value.slice(0, 6)); setError(""); }}
                placeholder="123456"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-4 text-4xl font-black text-center tracking-widest focus:outline-none focus:border-emerald-400"
              />
              <p className="text-center text-xs text-slate-400">
                💡 En mode test : utilise le code <strong>123456</strong>
              </p>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={handleVerifyCode}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-lg transition border-none">
                Connexion →
              </button>
              <button onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                className="w-full text-slate-400 text-sm underline bg-transparent border-none min-h-0 py-2">
                ← Changer de numéro
              </button>
            </>
          )}

          {/* ── CRÉER UN COMPTE ── */}
          {mode === "register" && !regDone && (
            <>
              <p className="text-slate-500 text-sm">Crée ton compte, puis connecte-toi avec le code SMS.</p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Prénom et nom</label>
                <input type="text" placeholder="Ex: Aminata Diallo" value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Numéro de téléphone</label>
                <input type="tel" placeholder="+33 6 12 34 56 78" value={regPhone}
                  inputMode="tel"
                  onChange={(e) => { setRegPhone(e.target.value); setError(""); }}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 transition"/>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={handleRegister} disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-4 rounded-xl text-base transition border-none">
                {loading ? "Création…" : "Créer mon compte →"}
              </button>
            </>
          )}

          {mode === "register" && regDone && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-black text-slate-800 text-lg">Compte créé !</p>
              <p className="text-slate-500 text-sm mt-2 mb-6">Tu peux maintenant te connecter.</p>
              <button
                onClick={() => { setMode("login"); setPhone(regPhone); setStep("phone"); setRegDone(false); }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-base transition border-none">
                Se connecter →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}