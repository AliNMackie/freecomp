import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "../../packages/ui/src/**/*.{ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                monzo: {
                    blue: "#14233c",
                    teal: "#93d2d9",
                    coral: "#ff5353",
                },
                trust: {
                    50: "#f0f9ff",
                    100: "#e0f2fe",
                    500: "#0ea5e9",
                    600: "#0284c7",
                    900: "#0c4a6e",
                },
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                serif: ["Merriweather", "serif"],
            },
        },
    },
    plugins: [],
};

export default config;
