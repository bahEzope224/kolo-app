import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAllRead } from "../api/client";

const ICONS = {
  payment_validated: "✅",
  late_reminder:     "⏰",
  new_member:        "👥",
};

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86400)}j`;
}

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifs", userId],
    queryFn: () => getNotifications(userId),
    refetchInterval: 15000, // rafraîchit toutes les 15s
    enabled: !!userId,
  });

  const markMutation = useMutation({
    mutationFn: () => markAllRead(userId),
    onSuccess: () => qc.invalidateQueries(["notifs", userId]),
  });

  const unread = notifs.filter((n) => !n.is_read).length;

  // Ferme en cliquant ailleurs
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    setOpen(!open);
    if (!open && unread > 0) {
      setTimeout(() => markMutation.mutate(), 1500);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bouton cloche */}
      <button
        onClick={handleOpen}
        className="relative min-h-0 p-2 bg-transparent border-none text-slate-300 hover:text-white transition"
      >
        <span style={{ fontSize: 20 }}>🔔</span>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
          style={{ maxHeight: 420 }}
        >
          {/* Header panel */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-black text-slate-800 text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markMutation.mutate()}
                className="text-xs text-emerald-600 font-semibold bg-transparent border-none min-h-0 p-0"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div style={{ overflowY: "auto", maxHeight: 340 }}>
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                <div className="text-3xl mb-2">🔕</div>
                Aucune notification
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-slate-50 transition ${
                    !n.is_read ? "bg-emerald-50" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                    {ICONS[n.type] || "📣"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-xs">{n.title}</div>
                    <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{n.body}</div>
                    <div className="text-slate-300 text-xs mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}