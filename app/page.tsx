import { listProducts } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { HomeHero } from "@/components/home-hero";
import { HomeSegments } from "@/components/home-segments";
import { HomeFeatured } from "@/components/home-featured";
import { HomeWhy } from "@/components/home-why";
import { HomeB2bCta } from "@/components/home-b2b-cta";

export default async function HomePage() {
  const business = await getSessionBusiness();
  const wholesale = business?.status === "verified";
  const products = await listProducts({ activeOnly: true });
  const featured = products.filter((p) => p.badges.includes("viral")).slice(0, 6);

  return (
    <>
      <HomeHero />
      <HomeSegments />
      <HomeFeatured products={featured} wholesale={wholesale} />
      <HomeWhy />
      <HomeB2bCta />
    </>
  );
}
