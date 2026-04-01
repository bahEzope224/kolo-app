import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignedIn, SignedOut, RedirectToSignIn, useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import api, { syncUser, setAuthTokenGetter } from "./api/client";
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
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  );
}

function AppShell() {
  const location  = useLocation();
  const { isSignedIn } = useAuth();
  const isAuth    = isSignedIn;
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

function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Utilisateur Kolo";
      const email = user.primaryEmailAddress?.emailAddress;
      syncUser(fullName, email).catch(() => {});
    }
  }, [isLoaded, isSignedIn, user]);
  
  return null;
}

export default function App() {
  const { getToken, isSignedIn, isLoaded: authLoaded } = useAuth();
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (authLoaded) {
      // Register the token getter once Clerk is loaded
      setAuthTokenGetter(getToken);
      setApiReady(true);
    }
  }, [authLoaded, getToken]);

  if (!authLoaded || !apiReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm animate-pulse font-medium">Initialisation...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UserSync />
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}