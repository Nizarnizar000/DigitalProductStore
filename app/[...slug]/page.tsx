import { Storefront } from "../storefront";

export default async function CatchAll({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <Storefront route={slug.join("/")} />;
}
