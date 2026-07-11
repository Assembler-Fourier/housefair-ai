import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://housemates-sand.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/admin/", "/api/", "/onboarding", "/auth/callback"],
    },
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}

