import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login    from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TontineDetail from "./pages/TontineDetail";
import Profile  from "./pages/Profile";
import Landing  from "./pages/Landing";
import BottomNav from "./components/BottomNav";
import SideNav   from "./components/SideNav";
import JoinPage from "./pages/JoinPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Protected({ children }) {
  return localStorage.getItem("kolo_token") ? children : <Navigate to="/login" replace />;
}

function AppShell() {
  const location = useLocation();
  const isAuth = !!localStorage.getItem("kolo_token");
  const hideNav = ["/login", "/accueil"].includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      {isAuth && !hideNav && <SideNav />}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/login"          element={<Login />} />
          <Route path="/accueil"        element={<Landing />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/"               element={<Protected><Dashboard /></Protected>} />
          <Route path="/tontine/:id"    element={<Protected><TontineDetail /></Protected>} />
          <Route path="/profile"        element={<Protected><Profile /></Protected>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Bottom nav mobile */}
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