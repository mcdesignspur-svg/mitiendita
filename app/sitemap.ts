import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/db";

const BASE = "https://mitienditapr.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts({ activeOnly: true });

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/productos/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/productos`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/para-negocios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/negocios/registro`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...productUrls,
  ];
}
