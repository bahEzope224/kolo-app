import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login       from "./pages/Login";
import Dashboard   from "./pages/Dashboard";
import TontineDetail from "./pages/TontineDetail";
import Profile     from "./pages/Profile";
import Landing     from "./pages/Landing";
import JoinPage    from "./pages/JoinPage";
import AdminPage   from "./pages/AdminPage";
import BottomNav   from "./components/BottomNav";
import SideNav     from "./components/SideNav";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Protected({ children }) {
  const token = localStorage.getItem("kolo_token") ||
                sessionStorage.getItem("kolo_token");
  return token ? children : <Navigate to="/login" replace />;
}

function AppShell() {
  const location  = useLocation();
  const isAuth    = !!(localStorage.getItem("kolo_token") || sessionStorage.getItem("kolo_token"));
  const hideNav   = ["/login", "/accueil"].includes(location.pathname) ||
                    location.pathname.startsWith("/join/");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Layout desktop : sidebar gauche + contenu droite */}
      <div className="flex min-h-screen">
        {isAuth && !hideNav && <SideNav />}

        {/* Contenu — prend tout l'espace restant */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Routes>
            <Route path="/login"        element={<Login />} />
            <Route path="/accueil"      element={<Landing />} />
            <Route path="/join/:code"   element={<JoinPage />} />
            <Route path="/"             element={<Protected><Dashboard /></Protected>} />
            <Route path="/tontine/:id"  element={<Protected><TontineDetail /></Protected>} />
            <Route path="/profile"      element={<Protected><Profile /></Protected>} />
            <Route path="/admin"        element={<Protected><AdminPage /></Protected>} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      {/* Bottom nav mobile — en dehors du flex pour rester fixe */}
      {isAuth && !hideNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}