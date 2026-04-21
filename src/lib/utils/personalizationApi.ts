import { getTargetApiUrl } from "./apiUtils";

export interface UserTag {
    tag: string;
    action: "boost" | "demote" | "block" | "flag";
}

export interface FeedbackPayload {
    feed_id: string;
    score?: number;
    score_reason?: string;
    tags?: UserTag[];
    archive?: boolean;
}

export interface FeedbackResult {
    message: string;
    matched_preferences?: string[];
}

export interface TagControl {
    tag: string;
    action: "boost" | "demote" | "block" | "flag";
    weight: number;
}

export interface ProfileGlobal {
    tag_controls: TagControl[];
    feedback_count: number;
    last_updated: string;
    weekly_snapshot?: TagControl[];
    weekly_snapshot_at?: string;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
    const resp = await fetch(getTargetApiUrl("/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => resp.statusText);
        throw new Error(text);
    }
    return resp.json();
}

export async function archiveFeed(feedId: string, note?: string): Promise<void> {
    const resp = await fetch(getTargetApiUrl("/archive"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feed_id: feedId, note }),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => resp.statusText);
        throw new Error(text);
    }
}

export async function markFeedsRead(feedIds: string[]): Promise<void> {
    if (feedIds.length === 0) return;
    const resp = await fetch(getTargetApiUrl("/mark_read"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feed_ids: feedIds }),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => resp.statusText);
        throw new Error(text);
    }
}

export async function getProfile(): Promise<ProfileGlobal | null> {
    const resp = await fetch(getTargetApiUrl("/get_profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
    });
    if (!resp.ok) return null;
    return resp.json();
}
