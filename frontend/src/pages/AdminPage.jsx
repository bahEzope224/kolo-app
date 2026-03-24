import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getAdminStats } from "../api/client";

export default function AdminPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn:  getAdminStats,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none">←</button>
        <span className="font-black text-base flex-1">Administration</span>
        <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg font-bold">Admin</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Chargement…</div>
        ) : (
          <>
            <h2 className="font-black text-slate-800 text-xl mb-4">Statistiques globales</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Utilisateurs",   value: stats?.total_users,    icon: "👤", color: "border-purple-300 bg-purple-50" },
                { label: "Tontines",       value: stats?.total_tontines, icon: "🌿", color: "border-emerald-300 bg-emerald-50" },
                { label: "Membres actifs", value: stats?.total_members,  icon: "👥", color: "border-blue-300 bg-blue-50" },
                { label: "Versements",     value: stats?.total_payments, icon: "💳", color: "border-amber-300 bg-amber-50" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="font-black text-2xl text-slate-800">{s.value ?? "—"}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">
                Total collecté sur la plateforme
              </div>
              <div className="font-black text-4xl text-emerald-600">
                {stats?.total_amount?.toLocaleString("fr-FR")}€
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}