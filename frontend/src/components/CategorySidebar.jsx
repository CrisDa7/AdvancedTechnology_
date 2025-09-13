const CATEGORIES = [
  { name: "Climatización", count: 11 },
  { name: "Cocinas", count: 43 },
  { name: "Línea empotrable", count: 29 },
  { name: "Refrigeradoras", count: 63 },
  { name: "Computación", count: 78 },
  { name: "Televisores", count: 71 },
  { name: "Audio", count: 13 },
  { name: "Electrodomésticos", count: 113 },
];

export default function CategorySidebar() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
      <h3 className="mb-3 text-lg font-bold">Categorías</h3>
      <ul className="space-y-2">
        {CATEGORIES.map((c) => (
          <li key={c.name}>
            <button className="flex w-full items-center justify-between rounded-lg bg-white/0 px-3 py-2 hover:bg-white/10">
              <span className="text-left">{c.name.toUpperCase()}</span>
              <span className="rounded-md bg-red-600 px-2 py-0.5 text-sm font-semibold">
                {c.count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
