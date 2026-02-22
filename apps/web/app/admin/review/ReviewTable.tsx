"use client";

import { useState } from "react";

interface ReviewRow {
    id: string;
    title: string;
    sourceSite: string;
    sourceUrl: string;
    isFree: boolean;
    hasSkillQuestion: boolean;
    entryTimeEstimate: string | null;
    hypeScore: number;
    closesAt: string | null;
    manualVerified: boolean;
    flagged: boolean;
    flagReason: string | null;
}

interface Props {
    rows: ReviewRow[];
    adminKey: string;
}

type RowState = "idle" | "loading" | "approved" | "flagged" | "error";

export default function ReviewTable({ rows, adminKey }: Props) {
    const [states, setStates] = useState<Record<string, RowState>>(() =>
        Object.fromEntries(
            rows.map((r) => [
                r.id,
                r.manualVerified ? "approved" : r.flagged ? "flagged" : "idle",
            ])
        )
    );
    const [flagReasons, setFlagReasons] = useState<Record<string, string>>({});

    async function patch(
        id: string,
        body: Record<string, unknown>
    ): Promise<boolean> {
        const res = await fetch(
            `/api/admin/competition/${id}/review?key=${encodeURIComponent(adminKey)}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }
        );
        return res.ok;
    }

    async function approve(id: string) {
        setStates((s) => ({ ...s, [id]: "loading" }));
        const ok = await patch(id, { manual_verified: true, flagged: false });
        setStates((s) => ({ ...s, [id]: ok ? "approved" : "error" }));
    }

    async function flag(id: string) {
        setStates((s) => ({ ...s, [id]: "loading" }));
        const ok = await patch(id, {
            flagged: true,
            manual_verified: false,
            flag_reason: flagReasons[id] ?? null,
        });
        setStates((s) => ({ ...s, [id]: ok ? "flagged" : "error" }));
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.875rem",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                <thead>
                    <tr style={{ background: "#1e293b", color: "#f1f5f9" }}>
                        {[
                            "Title",
                            "Site",
                            "Free?",
                            "Skill Q?",
                            "Time",
                            "Hype",
                            "Closes",
                            "Actions",
                        ].map((h) => (
                            <th
                                key={h}
                                style={{
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const state = states[row.id] ?? "idle";
                        const rowBg =
                            state === "approved"
                                ? "#dcfce7"
                                : state === "flagged"
                                    ? "#fef2f2"
                                    : state === "error"
                                        ? "#fef9c3"
                                        : i % 2 === 0
                                            ? "#f8fafc"
                                            : "#ffffff";

                        return (
                            <tr key={row.id} style={{ background: rowBg }}>
                                <td style={{ padding: "8px 12px", maxWidth: 280 }}>
                                    <a
                                        href={row.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
                                    >
                                        {row.title}
                                    </a>
                                </td>
                                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                    {row.sourceSite}
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                    {row.isFree ? "✅" : "❌"}
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                    {row.hasSkillQuestion ? "⚠️" : "—"}
                                </td>
                                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                    {row.entryTimeEstimate ?? "—"}
                                </td>
                                <td
                                    style={{
                                        padding: "8px 12px",
                                        textAlign: "center",
                                        fontWeight: 700,
                                        color:
                                            row.hypeScore >= 8
                                                ? "#dc2626"
                                                : row.hypeScore >= 6
                                                    ? "#d97706"
                                                    : "#64748b",
                                    }}
                                >
                                    {row.hypeScore}
                                </td>
                                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                    {row.closesAt
                                        ? new Date(row.closesAt).toLocaleDateString("en-GB")
                                        : "—"}
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                    {state === "approved" && (
                                        <span style={{ color: "#16a34a", fontWeight: 600 }}>
                                            ✓ Approved
                                        </span>
                                    )}
                                    {state === "flagged" && (
                                        <span style={{ color: "#dc2626", fontWeight: 600 }}>
                                            ⚑ Flagged
                                        </span>
                                    )}
                                    {state === "error" && (
                                        <span style={{ color: "#b45309", fontWeight: 600 }}>
                                            ⚠ Error
                                        </span>
                                    )}
                                    {(state === "idle" || state === "loading") && (
                                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                            <button
                                                disabled={state === "loading"}
                                                onClick={() => approve(row.id)}
                                                style={{
                                                    padding: "4px 10px",
                                                    background: "#16a34a",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: state === "loading" ? "wait" : "pointer",
                                                    fontWeight: 600,
                                                    fontSize: "0.8rem",
                                                }}
                                            >
                                                Approve
                                            </button>
                                            <input
                                                type="text"
                                                placeholder="Reason (optional)"
                                                value={flagReasons[row.id] ?? ""}
                                                onChange={(e) =>
                                                    setFlagReasons((r) => ({
                                                        ...r,
                                                        [row.id]: e.target.value,
                                                    }))
                                                }
                                                style={{
                                                    padding: "4px 8px",
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 4,
                                                    fontSize: "0.8rem",
                                                    width: 140,
                                                }}
                                            />
                                            <button
                                                disabled={state === "loading"}
                                                onClick={() => flag(row.id)}
                                                style={{
                                                    padding: "4px 10px",
                                                    background: "#dc2626",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: state === "loading" ? "wait" : "pointer",
                                                    fontWeight: 600,
                                                    fontSize: "0.8rem",
                                                }}
                                            >
                                                Flag
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {rows.length === 0 && (
                <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
                    No competitions pending review.
                </p>
            )}
        </div>
    );
}
