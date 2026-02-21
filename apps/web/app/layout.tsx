import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Web App",
    description: "Next.js 14 app in the monorepo",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
