import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

interface ReviewPatch {
    manual_verified?: boolean;
    flagged?: boolean;
    flag_reason?: string;
}

function requireAdminKey(request: NextRequest): boolean {
    const adminKey = process.env.ADMIN_REVIEW_KEY;
    if (!adminKey) return false; // env not set → deny all

    // Accept via query param or Authorization: Bearer <key>
    const { searchParams } = new URL(request.url);
    if (searchParams.get("key") === adminKey) return true;

    const auth = request.headers.get("authorization") ?? "";
    if (auth === `Bearer ${adminKey}`) return true;

    return false;
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    if (!requireAdminKey(request)) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
        return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    let body: ReviewPatch;
    try {
        body = (await request.json()) as ReviewPatch;
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    // Build a safe SET clause from only the allowed fields.
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (typeof body.manual_verified === "boolean") {
        values.push(body.manual_verified);
        setClauses.push(`manual_verified = $${values.length}`);
    }
    if (typeof body.flagged === "boolean") {
        values.push(body.flagged);
        setClauses.push(`flagged = $${values.length}`);
    }
    if (body.flag_reason !== undefined) {
        values.push(body.flag_reason ?? null);
        setClauses.push(`flag_reason = $${values.length}`);
    }

    if (setClauses.length === 0) {
        return NextResponse.json({ error: "NO_FIELDS" }, { status: 400 });
    }

    values.push(id);
    const sql = `
    UPDATE competitions
    SET ${setClauses.join(", ")}
    WHERE id = $${values.length}
    RETURNING id, manual_verified, flagged, flag_reason
  `;

    try {
        const result = await pool.query(sql, values);
        if (result.rowCount === 0) {
            return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        }
        return NextResponse.json(result.rows[0]);
    } catch (err) {
        console.error(`[api/admin/review] DB error for id=${id}:`, err);
        return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }
}
