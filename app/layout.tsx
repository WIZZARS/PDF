import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PDF Personalizer — Add your name & roll number to lab records",
  description:
    "Instantly add your name, roll number, and batch to college lab record PDFs. 100% private — your files never leave your device.",
  keywords: ["PDF", "header", "footer", "personalize", "lab record", "college"],
  openGraph: {
    title: "PDF Personalizer",
    description: "Personalize lab record PDFs in under a minute. No sign-up. No uploads.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d18",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
