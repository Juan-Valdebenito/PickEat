import type { MenuProduct } from "@/lib/types";

const GRADIENTS = [
  "from-orange-200 to-amber-100",
  "from-rose-200 to-orange-100",
  "from-lime-200 to-emerald-100",
  "from-sky-200 to-indigo-100",
  "from-amber-200 to-yellow-100",
];

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Si el producto no tiene foto se muestra un placeholder con su inicial.
export function ProductImage({ product, className = "" }: { product: MenuProduct; className?: string }) {
  if (product.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imageUrl} alt={product.name} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center bg-gradient-to-br text-3xl font-bold text-stone-700/40 ${
        GRADIENTS[hash(product.id) % GRADIENTS.length]
      } ${className}`}
    >
      {product.name.charAt(0)}
    </div>
  );
}
