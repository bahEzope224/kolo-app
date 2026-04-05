import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser, useAuth, useClerk } from "@clerk/clerk-react";
import { getTontineByCode, joinByCode } from "../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function JoinPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user: clerkUser, isSignedIn, isLoaded: userLoaded } = useUser();
  const { openSignUp, openSignIn } = useClerk();
  const queryClient = useQueryClient();

  const [tontine, setTontine] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // 1. Charger les infos de la tontine dès l'arrivée
  useEffect(() => {
    if (code) {
      getTontineByCode(code.toUpperCase())
        .then(setTontine)
        .catch(() => setNotFound(true));
    }
  }, [code]);

  // 2. Logique d'adhésion
  const joinMutation = useMutation({
    mutationFn: (c) => joinByCode(c),
    onSuccess: (data) => {
      setSuccess(true);
      queryClient.invalidateQueries(["my-tontines"]);
      setTimeout(() => {
        navigate(`/tontine/${data.tontine_id}`);
      }, 2500);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || "Une erreur est survenue lors de l'adhésion.");
      setIsJoining(false);
    }
  });

  const handleConfirmJoin = () => {
    setIsJoining(true);
    joinMutation.mutate(code);
  };

  const handleLoginToJoin = () => {
    // On peut passer un paramètre redirect_url à Clerk
    openSignIn({ 
      afterSignInUrl: window.location.href,
      afterSignUpUrl: window.location.href 
    });
  };

  const handleSignUpToJoin = () => {
    openSignUp({ 
      afterSignUpUrl: window.location.href,
      afterSignInUrl: window.location.href
    });
  };

  // État de chargement initial des données
  if (!userLoaded || (!tontine && !notFound)) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
        <div className="text-white font-bold animate-pulse">Chargement de l'invitation…</div>
      </div>
    );
  }

  // Tontine introuvable
  if (notFound) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="font-black text-xl text-slate-800 mb-2">Lien invalide</h2>
          <p className="text-slate-500 text-sm mb-6">Ce code d'invitation n'existe pas ou a expiré.</p>
          <button onClick={() => navigate("/")}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl border-none transition hover:bg-slate-800">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl relative">
        
        {/* En-tête avec info Tontine */}
        <div className="bg-emerald-600 px-8 py-10 text-center relative overflow-hidden">
          {/* Décoration asbtraite */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl" />
          
          <div className="text-5xl mb-4 drop-shadow-lg">🌿</div>
          <h1 className="text-white font-black text-3xl mb-1 leading-tight">{tontine.name}</h1>
          <p className="text-emerald-100 text-sm font-medium opacity-90">Invitation à rejoindre la tontine</p>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="font-black text-emerald-600 text-2xl mb-2">Bienvenue !</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Tu es maintenant membre de <strong>{tontine.name}</strong>.<br/>
                Redirection vers ton dashboard…
              </p>
              <div className="mt-8 flex justify-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <>
              {/* Détails de la tontine */}
              <div className="bg-slate-50 rounded-3xl p-5 mb-8 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Versement mensuel</span>
                  <span className="bg-emerald-100 text-emerald-700 font-black px-3 py-1 rounded-full text-sm">
                    {tontine.contribution_amount}€ / mois
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Membres actuels</span>
                  <span className="text-slate-700 font-bold text-sm">
                    👤 {tontine.member_count} membres
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white font-bold">
                    {tontine.manager_name?.charAt(0) || "G"}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    Gérée par <span className="font-bold text-slate-800">{tontine.manager_name}</span>
                  </div>
                </div>
              </div>

              {isSignedIn ? (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-slate-600 text-sm">
                      Salut <strong>{clerkUser.firstName || "à toi"}</strong> ! 👋<br/>
                      Confirme ton adhésion ci-dessous.
                    </p>
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-bold border border-red-100 mb-4 animate-in shake-2">
                       ⚠️ {error}
                    </div>
                  )}

                  <button
                    onClick={handleConfirmJoin}
                    disabled={isJoining}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-lg shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] border-none flex items-center justify-center gap-2"
                  >
                    {isJoining ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Confirmer l'adhésion 🤝"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Tu dois avoir un compte Kolo pour participer à cette tontine.
                    </p>
                  </div>

                  <button
                    onClick={handleSignUpToJoin}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-lg shadow-lg shadow-emerald-500/20 transition active:scale-[0.98] border-none mb-3"
                  >
                    Créer mon compte
                  </button>
                  
                  <button
                    onClick={handleLoginToJoin}
                    className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 text-sm transition border-none rounded-xl"
                  >
                    J'ai déjà un compte (Connexion)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer simple */}
        <div className="px-8 pb-8 text-center">
          <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">
            Sécurisé par Clerk & Kolo
          </p>
        </div>
      </div>
    </div>
  );
}