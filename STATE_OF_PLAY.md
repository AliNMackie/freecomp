# State of Play: UKFreeComps Platform Architecture

This document serves as a high-level architectural summary of the UKFreeComps platform, detailing the AI agent swarm, the user-facing web frontend, our automated monetization strategies, and the native analytics pipeline.

## 1. The Autonomous AI Agent Swarm (Data Pipeline)
The core engine of UKFreeComps is a suite of AI agents running periodically via Google Cloud Run and communicating via Google Cloud Pub/Sub.

*   **Scout Agent:** An advanced web scraper utilizing Cheerio and Chromium. It targets predefined seed sites (forums, directories, brand pages), intelligently navigates pagination, resolves direct redirects (skipping aggregator interstitial pages), and extracts raw HTML excerpts.
*   **Converter Agent:** A Gemini 2.5 Flash-powered agent that takes unstructured HTML excerpts and uses LLM extraction to identify actual free competitions. It normalizes unstructured text into structured JSON, verifying that a prize is present and pulling core details (Title, Closes At, Entry Time Estimate).
*   **Validator Agent:** The compliance engine. Also powered by Gemini 2.5, it rigorously analyzes the extracted competition rules against the UK Gambling Act 2005. It determines the legal classification (`free_draw` vs `prize_competition`), identifies if a skill/knowledge test is required, explicitly verifies a "free entry route", and scans for subscription risks or premium rate phone numbers.
*   **Sink Agent:** The durable storage connector. It ingests the fully validated and enriched competition JSON and performs a robust UPSERT into the primary PostgreSQL database (`analytics_events` and `competitions` tables), ensuring no duplicate entries are created.

## 2. The Next.js Web Frontend & UI
The user-facing application is a highly optimized Next.js App Router project deployed on Vercel/Netlify.

*   **Smart vs. Classic Modes:** The main feed offers a curated algorithmic "Smart" view relying on calculated "Hype Scores," as well as a dense HTML table "Classic Mode" preferred by power-compers.
*   **UK Compliance UI:** Every competition card prominently displays color-coded badges indicating legal compliance: "Free Draw" (emerald), "Prize Comp" (blue), "Skill Question Required" (amber), and "Verified Free Route".
*   **Guest Tracking:** Heavy use of local storage allows unregistered users to "Mark as Entered", greying out completed cards across sessions without requiring a database account.
*   **SEO and Discovery:** The site utilizes robust Next.js Server Components, dynamic JSON-LD structured data for Google, and an aggressive `robots.txt` strategy to encourage both traditional and GenAI crawlers. An AI-powered semantic search assistant (`/api/competitions`) helps users find specific niches.

## 3. Monetization & Automated Growth
The platform supports autonomous and passive revenue generation without compromising user trust.

*   **Affiliate Routing (`/api/go/[id]`):** All outbound traffic goes through a secure server-side redirect handler. This ensures Skimlinks tracking IDs are properly appended to destination URLs, turning organic traffic into affiliate commission.
*   **Upstash Rate Limiting:** The routing endpoints are protected by Redis-backed Upstash rate limiters to prevent bot abuse and ensure clean affiliate click data.
*   **Autonomous Beehiiv Publisher Agent:** A Node.js script hooked up to GitHub Actions runs every Thursday at 8:00 AM UTC. It automatically queries the PostgreSQL database for the week's highest-hype competitions, generates a mobile-responsive HTML newsletter, and posts it as a draft directly to the Beehiiv v2 API.

## 4. Native PostgreSQL Analytics
To ensure maximum GDPR compliance and performance, the platform relies on a zero-cookie native tracking solution rather than third-party scripts.

*   **Zero-Cookie Tracking:** A silent `<NativeTracker />` component rests in the root layout, sending a non-blocking POST request to `/api/analytics` on every page load.
*   **Direct Database Logging:** The endpoint logs the path, referrer, and device type into the `analytics_events` table without recording IP addresses or setting cookies.
*   **Secure Admin Dashboard:** Located at `/admin/traffic`, this server-side dashboard is protected by HTTP Basic Authentication via Next.js middleware. It visualizes Real-Time Total Views, Top Referrers, and Top Pages using lightning-fast native PostgreSQL queries (bypassing heavy React charting libraries).
