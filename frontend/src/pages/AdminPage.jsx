import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { getAdminStats, getAdminUsers, getAdminTontines, deleteAdminTontine } from "../api/client";
import UserAvatar from "../components/UserAvatar";

export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: clerkUser, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState("users"); // "users" | "tontines"
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 1. Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn:  getAdminStats,
    enabled:  !!clerkUser && clerkUser.primaryEmailAddress?.emailAddress === "contact@ibrahima-bah.com",
  });

  // 2. Users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch],
    queryFn:  () => getAdminUsers(debouncedSearch),
    enabled:  activeTab === "users" && !!clerkUser && clerkUser.primaryEmailAddress?.emailAddress === "contact@ibrahima-bah.com",
  });

  // 3. Tontines
  const { data: tontines, isLoading: tontinesLoading } = useQuery({
    queryKey: ["admin-tontines", debouncedSearch],
    queryFn:  () => getAdminTontines(debouncedSearch),
    enabled:  activeTab === "tontines" && !!clerkUser && clerkUser.primaryEmailAddress?.emailAddress === "contact@ibrahima-bah.com",
  });

  // 4. Mutation suppression
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAdminTontine(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-tontines"]);
      queryClient.invalidateQueries(["admin-stats"]);
      setDeletingId(null);
    },
    onError: (err) => {
      alert("Erreur lors de la suppression : " + (err.response?.data?.detail || err.message));
      setDeletingId(null);
    }
  });

  const isAdmin = clerkUser?.primaryEmailAddress?.emailAddress === "contact@ibrahima-bah.com";

  if (!isLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium animate-pulse">Vérification…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Accès refusé</h1>
        <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
          Cette zone est réservée à l'administrateur de Kolo.
        </p>
        <button onClick={() => navigate("/")}
          className="bg-slate-900 text-white font-bold px-8 py-3 rounded-2xl hover:bg-slate-800 transition border-none shadow-lg">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const handleDeleteTontine = (id) => {
    if (window.confirm("Es-tu certain de vouloir supprimer cette tontine ? Cette action est irréversible et le gérant sera notifié.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-slate-900 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <button onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white text-xl min-h-0 p-0 bg-transparent border-none transition">←</button>
        <span className="font-black text-base flex-1">Administration</span>
        <span className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold">Admin</span>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* STATS SECTION */}
        <section>
          <h2 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
            <span>📊</span> Statistiques globales
          </h2>
          {statsLoading ? (
             <div className="grid grid-cols-2 gap-3">
               {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
             </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Utilisateurs",   value: stats?.total_users,    icon: "👤", color: "border-purple-100 bg-purple-50/50" },
                { label: "Tontines",       value: stats?.total_tontines, icon: "🌿", color: "border-emerald-100 bg-emerald-50/50" },
                { label: "Membres actifs", value: stats?.total_members,  icon: "👥", color: "border-blue-100 bg-blue-50/50" },
                { label: "Versements",     value: stats?.total_payments, icon: "💳", color: "border-amber-100 bg-amber-50/50" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border p-4 ${s.color} transition hover:shadow-sm`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="font-black text-2xl text-slate-800 leading-none">{s.value ?? "0"}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          
          {!statsLoading && stats && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mt-3 text-center shadow-sm">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                Total collecté sur la plateforme
              </div>
              <div className="font-black text-4xl text-emerald-600">
                {stats?.total_amount?.toLocaleString("fr-FR")}€
              </div>
            </div>
          )}
        </section>

        {/* TABS SWITCHER */}
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          <button 
            onClick={() => { setActiveTab("users"); setSearch(""); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition ${activeTab === "users" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Utilisateurs
          </button>
          <button 
            onClick={() => { setActiveTab("tontines"); setSearch(""); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition ${activeTab === "tontines" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Tontines
          </button>
        </div>

        {/* SEARCH & LIST SECTION */}
        <section>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder={activeTab === "users" ? "Rechercher un utilisateur..." : "Rechercher une tontine..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition shadow-sm"
            />
          </div>

          <div className="space-y-2">
            {activeTab === "users" ? (
              usersLoading ? (
                [1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)
              ) : users?.length > 0 ? (
                users.map(u => (
                  <div key={u.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 transition hover:shadow-md hover:border-slate-200">
                    <UserAvatar user={u} size="md" className="rounded-2xl" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 truncate">{u.name}</span>
                        {u.is_admin && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.5 rounded uppercase">Admin</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{u.email || "Pas d'email"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-400">{u.phone || "—"}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <div className="text-3xl mb-2">🤷‍♂️</div>
                  <div className="text-sm font-bold text-slate-400">Aucun utilisateur trouvé</div>
                </div>
              )
            ) : (
              // TONTINES LIST
              tontinesLoading ? (
                [1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)
              ) : tontines?.length > 0 ? (
                tontines.map(t => (
                  <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 transition hover:shadow-md hover:border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl flex-shrink-0">
                      🌿
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-800 truncate">{t.name}</div>
                      <div className="text-xs text-slate-400">Gérant: <span className="font-bold text-slate-600">{t.manager_name}</span></div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                          {t.members_count} membres
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                          {t.contribution}€ / mois
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTontine(t.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition border-none bg-transparent cursor-pointer"
                      title="Supprimer la tontine"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === t.id ? (
                        <div className="w-5 h-5 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <div className="text-3xl mb-2">🌵</div>
                  <div className="text-sm font-bold text-slate-400">Aucune tontine trouvée</div>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}