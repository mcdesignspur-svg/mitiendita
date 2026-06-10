import type { NextConfig } from "next";

// A-5: Headers de seguridad + remotePatterns para next/image.
//
// CSP NOTE (para verificación manual):
// ------------------------------------
// La CSP está en modo REPORT-ONLY para no romper pagos en producción hasta
// verificar que ATH Móvil y Stripe no necesiten directivas adicionales.
// Cuando se confirme que no rompe nada, cambiar el nombre del header a
// "Content-Security-Policy".
//
// ATH Móvil: El script de checkout de ATH Móvil (athmovil.com) está incluido
// en script-src. Si ATH Móvil carga scripts desde subdominios adicionales o
// CDNs propios que no sean athmovil.com, habrá que añadirlos.
//
// Stripe: js.stripe.com (script) y api.stripe.com (connect) están incluidos.
// Stripe también usa hooks.stripe.com para webhooks del SDK; se incluye en
// connect-src por si acaso. Si en el futuro se añade Stripe Elements con iframes
// necesitará frame-src https://js.stripe.com https://hooks.stripe.com.
//
// Vercel Analytics / Speed Insights: vitals.vercel-insights.com en connect-src.
// Vercel Live (preview toolbar): vercel.live en frame-src/script-src; solo aplica
// en preview deployments así que se incluye.

const CSP = [
  "default-src 'self'",
  // Scripts propios + inline mínimos para Next.js hydration + pagos
  "script-src 'self' 'unsafe-inline' https://athmovil.com https://*.athmovil.com https://js.stripe.com",
  // Estilos (Next.js inyecta estilos inline en hydration)
  "style-src 'self' 'unsafe-inline'",
  // Imágenes: self, data URIs, Vercel Blob, CDN de Alibaba
  "img-src 'self' data: https://*.public.blob.vercel-storage.com https://*.alicdn.com",
  // Fuentes
  "font-src 'self' data:",
  // Fetch/XHR: self + AI gateway + Resend + Stripe + Vercel Analytics
  "connect-src 'self' https://api.resend.com https://gateway.ai.cloudflare.com https://api.stripe.com https://hooks.stripe.com https://vitals.vercel-insights.com",
  // Frames: Stripe (Elements) + Vercel preview toolbar
  "frame-src https://js.stripe.com https://vercel.live",
  // Workers propios solamente
  "worker-src 'self' blob:",
  // Bloquear objetos (Flash etc.)
  "object-src 'none'",
  // Bloquear base tag
  "base-uri 'self'",
  // Solo HTTPS en producción
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are enabled by default in Next 16; kept explicit for clarity.
  },

  // Imágenes remotas permitidas (Vercel Blob + CDN Alibaba).
  // Agente D migrará componentes a next/image — estos patterns los necesita.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.alicdn.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // CSP en modo report-only hasta verificar que no rompe ATH Móvil/Stripe.
          // Cambiar a "Content-Security-Policy" cuando se confirme.
          {
            key: "Content-Security-Policy-Report-Only",
            value: CSP,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
