import { useNavigate, useLocation } from "react-router-dom";

const TABS = [
  { path: "/",        icon: "📊", label: "Dashboard" },
  { path: "/profile", icon: "👤", label: "Profil"    },
  { path: "/accueil", icon: "🌍", label: "Landing"   },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50"
         style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {TABS.map(t => {
        const active = location.pathname === t.path ||
          (t.path !== "/" && location.pathname.startsWith(t.path));
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 border-none min-h-0 transition ${
              active ? "text-emerald-500" : "text-slate-400"
            }`}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px] font-bold">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}