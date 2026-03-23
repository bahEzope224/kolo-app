import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const LINKS = [
  { path: "/",        icon: "📊", label: "Dashboard"  },
  { path: "/profile", icon: "👤", label: "Mon profil" },
];

export default function SideNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout, getUser } = useAuth();
  const user = getUser();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-slate-900 min-h-screen sticky top-0 shrink-0">

      {/* User pill */}
      <div className="mx-3 mt-4 mb-2 bg-slate-800 rounded-xl px-3 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-black text-white text-xs flex-shrink-0">
          {user?.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() || "??"}
        </div>
        <div className="min-w-0">
          <div className="text-white font-bold text-xs truncate">{user?.name || "Utilisateur"}</div>
          <div className="text-slate-400 text-[10px]">Connecté</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {LINKS.map(l => (
          <button
            key={l.path}
            onClick={() => navigate(l.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition min-h-0 text-left border-none ${
              location.pathname === l.path
                ? "bg-emerald-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="text-base">{l.icon}</span>
            {l.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition min-h-0 border-none"
        >
          <span className="text-base">🚪</span> Déconnexion
        </button>
      </div>
    </aside>
  );
}