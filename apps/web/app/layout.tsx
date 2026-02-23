import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: {
        default: "UKFreeComps | The UK's Independent Free Prize Checker",
        template: "%s | UKFreeComps"
    },
    description: "We find and check genuinely free UK prize draws and add our own notes so you can see what’s worth your time. The safe, independent comp checker for UK hobby compers.",
    keywords: ["free competitions uk", "prize draws", "win cash", "hobby comping", "uk giveaways", "safe competitions"],
    authors: [{ name: "UKFreeComps" }],
    creator: "UKFreeComps",
    publisher: "UKFreeComps",
    metadataBase: new URL("https://iaifreecomp.netlify.app"), // Replace with actual production URL later
    openGraph: {
        type: "website",
        locale: "en_GB",
        url: "https://iaifreecomp.netlify.app",
        siteName: "UKFreeComps",
        title: "UKFreeComps | The UK's Independent Free Prize Checker",
        description: "We find and check genuinely free UK prize draws and add our own notes so you can see what’s worth your time.",
    },
    twitter: {
        card: "summary_large_image",
        title: "UKFreeComps | Free UK Prize Draws",
        description: "The safe, independent comp checker for UK hobby compers.",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
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
