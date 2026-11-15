import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://xtrememobiletire.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/services", "/fleet-solutions", "/booking"],
        disallow: ["/signin", "/signup", "/api/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/about", "/services", "/fleet-solutions", "/booking"],
        disallow: ["/signin", "/signup", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
