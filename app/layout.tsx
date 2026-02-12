import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Launchpad Attendance | Sahyadri",
  description: "Attendance tracking system for Launchpad at Sahyadri College of Engineering and Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}
      >
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </main>
        <footer
          style={{
            textAlign: "center",
            padding: "1.5rem 1rem",
            fontSize: "0.8rem",
            color: "#9ca3af",
            letterSpacing: "0.02em",
          }}
        >
          Made with <span style={{ color: "#3ddc84", fontSize: "1.5em" }}>♥</span> by{" "}
          <a
            href="https://sosc.org.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#6b7280", textDecoration: "none", fontWeight: 600 }}
          >
            SOSC
          </a>
        </footer>
      </body>
    </html>
  );
}
