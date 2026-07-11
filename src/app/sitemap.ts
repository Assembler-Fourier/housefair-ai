import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://housemates-sand.vercel.app").replace(/\/$/, "");
  return ["", "/features", "/pricing", "/security", "/privacy", "/terms", "/refund-policy", "/contact", "/demo"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
    priority: path === "" ? 1 : path === "/features" || path === "/pricing" ? 0.8 : 0.5,
  }));
}

