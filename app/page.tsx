import { listProducts } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { toPublicProduct } from "@/lib/public-product";
import { HomeHero } from "@/components/home-hero";
import { HomeSegments } from "@/components/home-segments";
import { HomeFeatured } from "@/components/home-featured";
import { HomeB2bCta } from "@/components/home-b2b-cta";

export default async function HomePage() {
  const business = await getSessionBusiness();
  const verified = business?.status === "verified";
  const products = await listProducts({ activeOnly: true });
  const featured = products
    .filter((p) => p.badges.includes("viral"))
    .slice(0, 6)
    .map((p) => toPublicProduct(p, verified));

  return (
    <>
      <HomeHero />
      <HomeFeatured products={featured} wholesale={verified} />
      <HomeSegments />
      <HomeB2bCta />
    </>
  );
}
