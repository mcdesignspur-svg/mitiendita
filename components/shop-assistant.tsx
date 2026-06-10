"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-context";
import { money } from "@/lib/format";
import { safeImageUrl } from "@/lib/url-safe";

interface RecProduct {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  gradient: string;
  unitPrice: number;
  shippingPrice: number;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  products?: RecProduct[];
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "¡Hola! 👋 Soy tu asistente de Mi Tiendita PR. Dime qué buscas (para el carro, la casa, tecnología, un regalo…) y te recomiendo algo del catálogo.",
};

const DIALOG_ID = "asistente-dialog";
const MESSAGES_ID = "asistente-mensajes";

export function ShopAssistant({ showDemo: _showDemo }: { showDemo?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const cart = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Mover foco al input al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll al fondo cuando llegan mensajes
  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    const history = msgs
      .filter((m) => m !== GREETING)
      .map((m) => ({ role: m.role, content: m.content }));
    setMsgs((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "error");
      setMsgs((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, products: data.products ?? [] },
      ]);
    } catch {
      setMsgs((prev) => [
        ...prev,
        { role: "assistant", content: "Ups, no pude responder ahora mismo. Intenta de nuevo. 🙏" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 rounded-full shadow-lg flex items-center gap-2 font-semibold"
        style={{
          background: "var(--color-coral)",
          color: "#fff",
          padding: open ? "12px 16px" : "14px 18px",
          border: "2px solid var(--color-ink)",
        }}
        aria-label={open ? "Cerrar asistente de compras" : "Abrir asistente de compras"}
        aria-expanded={open}
        aria-controls={DIALOG_ID}
      >
        {open ? "✕ Cerrar" : "💬 Asistente"}
      </button>

      {/* Panel */}
      {open && (
        <div
          id={DIALOG_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Asistente de compras Mi Tiendita PR"
          className="fixed bottom-24 right-5 z-50 w-[min(92vw,380px)] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "var(--color-cream)",
            border: "2px solid var(--color-ink)",
            boxShadow: "0 20px 60px rgba(0,0,0,.25)",
            maxHeight: "min(70vh, 560px)",
          }}
        >
          <div className="px-4 py-3" style={{ background: "var(--color-ink)", color: "#fff" }}>
            <div className="font-display text-lg leading-none">Asistente Mi Tiendita 🇵🇷</div>
            <div className="text-xs opacity-80 mt-0.5">Te ayudo a encontrar lo que buscas</div>
          </div>

          <div
            ref={scrollRef}
            id={MESSAGES_ID}
            role="log"
            aria-live="polite"
            aria-label="Mensajes del asistente"
            className="flex-1 overflow-y-auto p-3 space-y-3"
          >
            {msgs.map((m, i) => (
              <div key={i}>
                <div
                  className="text-sm rounded-2xl px-3 py-2 max-w-[88%]"
                  style={
                    m.role === "user"
                      ? { background: "var(--color-grape)", color: "#fff", marginLeft: "auto" }
                      : { background: "#fff", border: "1px solid var(--color-line)" }
                  }
                >
                  {m.content}
                </div>
                {m.products && m.products.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.products.map((p) => {
                      const imgSrc = safeImageUrl(p.imageUrl ?? undefined);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 rounded-xl p-2"
                          style={{ background: "#fff", border: "1px solid var(--color-line)" }}
                        >
                          <Link href={`/productos/${p.slug}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                            {imgSrc ? (
                              <Image
                                src={imgSrc}
                                alt={p.name}
                                width={48}
                                height={48}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-lg grid place-items-center text-2xl"
                                style={{ background: p.gradient }}
                              >
                                {p.emoji}
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/productos/${p.slug}`}
                              className="text-sm font-semibold leading-tight line-clamp-2 hover:underline"
                              aria-label={`Ver ${p.name}`}
                            >
                              {p.name}
                            </Link>
                            <div className="text-sm font-display">{money(p.unitPrice)}</div>
                          </div>
                          <button
                            onClick={() => cart.add(p.id, 1)}
                            className="btn btn-primary btn-sm shrink-0"
                            aria-label={`Agregar ${p.name} al carrito`}
                          >
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div
                className="text-sm rounded-2xl px-3 py-2 max-w-[88%]"
                style={{ background: "#fff", border: "1px solid var(--color-line)" }}
              >
                Pensando… 💭
              </div>
            )}
          </div>

          <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--color-line)" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="¿Qué buscas?"
              className="field flex-1"
              disabled={busy}
              aria-label="Escribe tu pregunta al asistente"
            />
            <button
              onClick={send}
              disabled={busy}
              className="btn btn-primary"
              aria-label="Enviar mensaje"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
