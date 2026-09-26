import type { MenuProduct } from "@/lib/types";

const GRADIENTS = [
  "from-orange-200 to-amber-100",
  "from-rose-200 to-orange-100",
  "from-lime-200 to-emerald-100",
  "from-sky-200 to-indigo-100",
  "from-amber-200 to-yellow-100",
];

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
        GRADIENTS[product.id % GRADIENTS.length]
      } ${className}`}
    >
      {product.name.charAt(0)}
    </div>
  );
}
