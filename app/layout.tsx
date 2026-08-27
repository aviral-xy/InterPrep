import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  //display: "swap", // ⬅️  improves font performance
});



export const metadata: Metadata = {
  title: "InterPrep - Precision in Recruitment",
  description: "InterPrep is an AI-driven interview platform with real-time voice integration and automated feedback, helping users prepare faster and smarter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${monaSans.className} antialiased relative overflow-x-hidden min-h-screen bg-dark-100`}
      >
        {/* Background Cosmic Nebula Ambient Blobs */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Cyan/Blue Blob */}
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[120px] animate-nebula-left" />
          
          {/* Violet/Purple Blob */}
          <div className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/10 blur-[130px] animate-nebula-right" />

          {/* Soft Center Pink Blob */}
          <div className="absolute top-[30%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-pink-500/5 blur-[120px]" />
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
