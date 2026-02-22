export interface Competition {
    /** UUID — primary key */
    id: string;

    /** Canonical URL of the competition listing */
    sourceUrl: string;

    /** Domain the listing was scraped from, e.g. "example.com" */
    sourceSite: string;

    /** Competition title as scraped */
    title: string;

    /** Short human-readable summary of the prize, or null if unknown */
    prizeSummary: string | null;

    /** Estimated prize value in GBP, or null if not determinable */
    prizeValueEstimate: number | null;

    /** ISO 8601 datetime when the competition closes, or null if unknown */
    closesAt: string | null;

    /** True if the competition has no purchase-necessary requirement */
    isFree: boolean;

    /** True if entry requires answering a skill/knowledge question */
    hasSkillQuestion: boolean;

    /**
     * Human-readable estimate of time to enter.
     * Examples: "30 seconds", "2 minutes"
     */
    entryTimeEstimate: string;

    /**
     * Hype score from 1 (low interest) to 10 (viral / very popular).
     * Derived from prize value, ease of entry, and community signals.
     */
    hypeScore: number;

    /**
     * 1–2 curated, human-sounding sentences summarising the competition
     * for display on the web app.
     */
    curatedSummary: string;

    /** ISO 8601 datetime when the competition was first discovered by the scout agent */
    discoveredAt: string;

    /** ISO 8601 datetime when a human or validator agent last verified the listing, or null */
    verifiedAt: string | null;
}
