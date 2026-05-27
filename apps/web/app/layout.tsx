import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { GlobalProviders } from "~/providers/global";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceMono = Space_Mono({ 
  subsets: ["latin"], 
  weight: ["400", "700"],
  variable: "--font-space-mono" 
});

export const metadata: Metadata = {
  title: {
    default: "FormCraft — Modern Form Builder",
    template: "%s | FormCraft",
  },
  description: "Create beautiful, smart forms with conditional logic, analytics, and integrations. Free to start.",
  keywords: ["form builder", "survey", "quiz", "feedback", "FormCraft"],
  openGraph: {
    title: "FormCraft — Modern Form Builder",
    description: "Create beautiful, smart forms with conditional logic, analytics, and integrations.",
    type: "website",
    siteName: "FormCraft",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body className={`${inter.variable} ${spaceMono.variable} font-sans antialiased bg-background text-foreground`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:underline"
        >
          Skip to main content
        </a>
        <GlobalProviders>
          <main id="main-content">{children}</main>
        </GlobalProviders>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
