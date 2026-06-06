"use client";

import { deleteProductAction } from "@/lib/actions";

export function DeleteProductButton({
  id,
  name,
  className,
  label = "🗑",
}: {
  id: string;
  name: string;
  className?: string;
  label?: string;
}) {
  return (
    <form
      action={deleteProductAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={
          className ??
          "btn btn-sm"
        }
        style={
          className
            ? undefined
            : { background: "#fdecea", color: "var(--color-coral-deep)", borderColor: "var(--color-coral)" }
        }
        aria-label={`Eliminar ${name}`}
      >
        {label}
      </button>
    </form>
  );
}
