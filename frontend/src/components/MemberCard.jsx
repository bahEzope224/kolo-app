const STATUS = {
  paid:    { label: "Payé ✓",       cls: "bg-emerald-100 text-emerald-800" },
  pending: { label: "En attente",   cls: "bg-amber-100 text-amber-800" },
  late:    { label: "En retard ⚠",  cls: "bg-red-100 text-red-800" },
};

export default function MemberCard({ name, phone, status, onValidate, isGerant }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
        {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 truncate">{name}</p>
        <p className="text-slate-400 text-sm">{phone}</p>
      </div>
      {status === "paid" || !isGerant ? (
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.cls}`}>{s.label}</span>
      ) : (
        <button
          onClick={onValidate}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition min-h-0"
        >
          Valider
        </button>
      )}
    </div>
  );
}
