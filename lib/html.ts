// Escape de HTML para interpolación segura en plantillas de email/HTML donde
// el contenido proviene del cliente o de un agente externo (nombres de items,
// nombre del cliente, etc.). Evita inyección de markup en correos transaccionales.

export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
