import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

// Server-side metadata for public form share pages
// Fetches the form title/description directly from the API for OG tags
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slugOrId: string }>;
}): Promise<Metadata> {
  const { slugOrId } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  try {
    // Call the REST endpoint to get public form info for metadata
    const res = await fetch(`${apiUrl}/trpc/forms.getPublicFormMeta?input=${encodeURIComponent(JSON.stringify({ idOrSlug: slugOrId }))}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (res.ok) {
      const json = await res.json();
      const form = json?.result?.data?.form;

      if (form) {
        return {
          title: form.title,
          description: form.description || `Fill out: ${form.title}`,
          openGraph: {
            title: form.title,
            description: form.description || `Fill out ${form.title} on FormCraft`,
            type: "website",
            siteName: "FormCraft",
          },
          twitter: {
            card: "summary",
            title: form.title,
            description: form.description || `Fill out ${form.title} on FormCraft`,
          },
          // Prevent dashboard/private form pages from being indexed
          // Public forms ARE indexable since they're intended to be shared
          robots: {
            index: !form.visibility || form.visibility === "public",
            follow: true,
          },
        };
      }
    }
  } catch {
    // Fallback — form not found or API error
  }

  return {
    title: "Form",
    description: "Fill out this form on FormCraft.",
    robots: { index: false, follow: false },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
