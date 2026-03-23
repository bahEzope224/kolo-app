import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import History from "./pages/History";
import TontineDetail from "./pages/TontineDetail";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Protected({ children }) {
  return localStorage.getItem("kolo_token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/accueil" element={<Landing />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/payments" element={<Protected><Payments /></Protected>} />
          <Route path="/history"  element={<Protected><History /></Protected>} />
          <Route path="/tontine/:id" element={<Protected><TontineDetail /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
