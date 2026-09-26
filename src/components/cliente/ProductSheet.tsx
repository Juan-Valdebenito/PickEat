"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/constants";
import type { MenuProduct } from "@/lib/types";
import type { CartLine } from "./cart";
import { ProductImage } from "./ProductImage";
import { QuantityStepper, Sheet } from "@/components/Sheet";

type Props = {
  product: MenuProduct;
  onClose: () => void;
  onAdd: (line: Omit<CartLine, "key">) => void;
};

export function ProductSheet({ product, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [options, setOptions] = useState<Record<string, string>>({});
  const missing = product.options.filter((o) => !options[o.name]);

  return (
    <Sheet onClose={onClose}>
      <div className="overflow-y-auto">
        <ProductImage product={product} className="h-44 w-full" />
        <div className="space-y-5 p-5">
          <div>
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="mt-1 text-stone-600">{product.description}</p>
            <div className="mt-2 text-lg font-semibold text-brand-700">{formatCLP(product.price)}</div>
          </div>

          {product.options.map((option) => (
            <fieldset key={option.name}>
              <legend className="mb-2 flex w-full items-center justify-between font-semibold">
                {option.name}
                <span className="text-xs font-medium text-stone-500">Obligatorio</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {option.choices.map((choice) => {
                  const active = options[option.name] === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setOptions((prev) => ({ ...prev, [option.name]: choice }))}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-stone-200 bg-white text-stone-700"
                      }`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <label className="block">
            <span className="mb-2 block font-semibold">Comentarios para cocina</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Ej: sin cebolla, salsa aparte…"
              className="w-full resize-none rounded-xl border border-stone-200 p-3 text-base outline-none focus:border-brand-500"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-stone-200 p-4">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button
          disabled={missing.length > 0}
          onClick={() => onAdd({ product, quantity, selectedOptions: options, notes })}
          className="flex-1 rounded-2xl bg-brand-500 py-3.5 font-semibold text-white disabled:bg-stone-300"
        >
          {missing.length > 0
            ? `Elige ${missing[0].name.toLowerCase()}`
            : `Agregar · ${formatCLP(product.price * quantity)}`}
        </button>
      </div>
    </Sheet>
  );
}
