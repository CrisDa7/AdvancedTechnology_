export default function ProductCard({ product }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 text-white transition hover:translate-y-[-2px] hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.img}
          alt={product.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {product.badge && (
          <span className="absolute right-2 top-2 rounded-md bg-violet-600 px-2 py-1 text-xs font-semibold">
            {product.badge}
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="text-xs text-red-400 font-semibold">AIRE ACONDICIONADO</div>
        <h4 className="mt-1 line-clamp-2 text-sm font-bold">
          {product.title.toUpperCase()}
        </h4>
        <div className="mt-1 text-white/80">{product.brand}</div>
        <div className="mt-1 text-lg font-bold">${product.price}</div>

        <button className="mt-3 w-full rounded-full bg-red-600 px-4 py-2 font-semibold hover:brightness-110 active:translate-y-px">
          Agregar
        </button>
      </div>
    </article>
  );
}
