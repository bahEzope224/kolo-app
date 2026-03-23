import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell";

export default function AppHeader({ title, subtitle, back, tontineName, userId, right }) {
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-40">
      {back && (
        <button
          onClick={() => navigate(back)}
          className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none flex-shrink-0"
        >←</button>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        {!back && <span className="text-xl">🌿</span>}
        <div>
          <div className="font-black text-sm leading-tight">{title || "Kolo"}</div>
          {subtitle && <div className="text-[10px] text-emerald-400 leading-tight">{subtitle}</div>}
        </div>
      </div>

      {tontineName && (
        <div className="flex-1 text-center font-bold text-emerald-400 text-xs truncate px-2">
          {tontineName}
        </div>
      )}
    </header>
  );
}