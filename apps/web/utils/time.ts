export function getHoursSince(timestamp: string | Date | null): string {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Unknown";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // If it's in the future (shouldn't happen, but just in case)
    if (diffMs < 0) return "Just now";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
        if (diffMins <= 1) return "Just now";
        return `${diffMins}m ago`;
    }

    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    if (diffDays === 1) {
        return "1d ago";
    }

    return `${diffDays}d ago`;
}
