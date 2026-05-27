import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  try {
    const res = await fetch(
      `${apiUrl}/trpc/marketplace.getTemplate?input=${encodeURIComponent(JSON.stringify({ id }))}`,
      { next: { revalidate: 3600 } }, // Cache template metadata for 1 hour
    );

    if (res.ok) {
      const json = await res.json();
      const template = json?.result?.data?.template;

      if (template) {
        return {
          title: `${template.title} Template`,
          description: template.description || `Use the ${template.title} template to build your form in seconds.`,
          openGraph: {
            title: `${template.title} — FormCraft Template`,
            description: template.description || `Start with a ready-made ${template.industry} form template.`,
            type: "website",
            siteName: "FormCraft",
          },
          twitter: {
            card: "summary",
            title: `${template.title} — FormCraft Template`,
            description: template.description,
          },
          robots: { index: true, follow: true },
        };
      }
    }
  } catch {
    // Fallback
  }

  return {
    title: "Form Template",
    description: "Explore and use this form template on FormCraft.",
  };
}

export default function TemplateDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
