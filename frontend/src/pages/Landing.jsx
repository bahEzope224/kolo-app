import { useNavigate } from "react-router-dom";

const FEATURES = [
  { icon: "🌿", title: "Simple à utiliser",       desc: "Connexion par SMS, aucun mot de passe à retenir. Accessible à tous." },
  { icon: "👁",  title: "100% transparent",        desc: "Tous les membres voient les versements en temps réel. Fini les disputes." },
  { icon: "🎲", title: "Tirage au sort équitable", desc: "Chaque membre reçoit une fois avant qu'un second tour commence." },
  { icon: "🔔", title: "Notifications in-app",    desc: "Alertes instantanées pour chaque versement, rappels pour les retardataires." },
  { icon: "📊", title: "Suivi financier",          desc: "Historique complet, résumé de ce que tu as versé et reçu." },
  { icon: "🔗", title: "Invitation facile",        desc: "Partage un code ou un lien WhatsApp pour inviter tes membres en 2 secondes." },
];

const STEPS = [
  { num: "1", title: "Crée ton compte",        desc: "Entre ton nom et ton numéro. C'est tout." },
  { num: "2", title: "Lance ta tontine",        desc: "Donne un nom, fixe la cotisation, choisis le mode." },
  { num: "3", title: "Invite tes membres",      desc: "Partage le code d'invitation sur WhatsApp." },
  { num: "4", title: "Gère en toute sérénité", desc: "Valide les versements, lance le tirage, tout le monde est notifié." },
];

export default function Landing() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("kolo_token");

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-black text-xl text-slate-900">Kolo</span>
        </div>
        <button
          onClick={() => navigate(isLoggedIn ? "/" : "/login")}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-5 py-2.5 rounded-xl text-sm transition min-h-0"
        >
          {isLoggedIn ? "Mon dashboard →" : "Commencer →"}
        </button>
      </nav>

      {/* HERO */}
      <section className="bg-emerald-950 text-white px-5 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-800 text-emerald-200 text-xs font-bold px-4 py-2 rounded-full mb-8">
            🌍 Tontine collective numérique
          </div>
          <h1 className="font-black text-4xl sm:text-5xl leading-tight mb-6">
            Gère ta tontine<br />
            <span className="text-emerald-400">sans stress</span>
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed mb-10 max-w-md mx-auto">
            Kolo digitalise ta tontine — versements, tirage au sort, notifications. Tout le monde voit tout, en temps réel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/login")}
              className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black px-8 py-4 rounded-xl text-lg transition min-h-0"
            >
              Créer ma tontine gratuitement →
            </button>
          </div>
          <p className="text-emerald-600 text-sm mt-6">Gratuit · Aucune carte bancaire · Prêt en 2 minutes</p>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="px-5 py-20 max-w-3xl mx-auto">
        <h2 className="font-black text-3xl text-slate-900 text-center mb-3">Tout ce dont tu as besoin</h2>
        <p className="text-slate-500 text-center mb-12">Conçu pour les gérants et les membres, même peu à l'aise avec la technologie.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-black text-slate-800 text-base mb-1">{f.title}</div>
              <div className="text-slate-500 text-sm leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="bg-slate-50 px-5 py-20">
        <div className="max-w-xl mx-auto">
          <h2 className="font-black text-3xl text-slate-900 text-center mb-3">Comment ça marche ?</h2>
          <p className="text-slate-500 text-center mb-12">En 4 étapes, ta tontine est lancée.</p>
          <div className="space-y-5">
            {STEPS.map((s) => (
              <div key={s.num} className="flex items-start gap-5 bg-white rounded-2xl p-5 border border-slate-100">
                <div className="w-10 h-10 bg-emerald-500 text-white font-black text-lg rounded-xl flex items-center justify-center flex-shrink-0">
                  {s.num}
                </div>
                <div>
                  <div className="font-black text-slate-800 text-base">{s.title}</div>
                  <div className="text-slate-500 text-sm mt-1">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-emerald-600 px-5 py-20 text-center text-white">
        <div className="max-w-md mx-auto">
          <div className="text-5xl mb-6">🌿</div>
          <h2 className="font-black text-3xl mb-4">Prêt à lancer ta tontine ?</h2>
          <p className="text-emerald-100 mb-8">Rejoint des centaines de familles qui gèrent leur tontine avec Kolo.</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-black px-10 py-4 rounded-xl text-lg transition min-h-0"
          >
            Commencer gratuitement →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 px-5 py-8 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg">🌿</span>
          <span className="font-black text-white">Kolo</span>
        </div>
        <p>Tontine collective simplifiée · <a href="https://nomad-developer.me/" target="_blank" >Nomade Developer</a></p>
      </footer>

    </div>
  );
}