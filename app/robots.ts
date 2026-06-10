import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/negocios/cuenta"],
      },
    ],
    sitemap: "https://mitienditapr.com/sitemap.xml",
  };
}
