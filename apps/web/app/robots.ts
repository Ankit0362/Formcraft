import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://formcraft.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/templates", "/templates/*", "/pricing", "/share/*"],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/settings",
          "/settings/*",
          "/forms",
          "/forms/*",
          "/auth",
          "/theme-showcase",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
