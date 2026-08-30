import type { ProductsResult } from "@/lib/tools";

export default function ProductGrid({ data }: { data: ProductsResult }) {
  if (data.items.length === 0) {
    return (
      <div className="text-sm text-ink/50 font-mono border border-line rounded-2xl px-4 py-3 bg-white">
        No products matched &ldquo;{data.query}&rdquo;.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            className="group bg-white border border-line rounded-2xl overflow-hidden
                       hover:border-moss transition-colors flex flex-col"
          >
            <div className="aspect-square bg-line/30 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                {item.brand}
              </span>
              <span className="text-sm leading-snug">{item.name}</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-display italic text-lg">₹{item.price}</span>
                <span className="font-mono text-[10px] text-ink/50">★ {item.rating}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
      <p className="font-mono text-[10px] text-ink/30 mt-2">
        sample catalog — swap searchProducts() in lib/tools.ts for a live API
      </p>
    </div>
  );
}
