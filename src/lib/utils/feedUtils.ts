import { simpleHash } from "./hashUtils";
import type { FeedVO } from "$lib/types/feed"; // Import the type

export interface ArticleAnalysis {
  base_quality_score?: number;
  primary_topic?: string;
  format?: string;
  topics_json?: string[];
}

/**
 * Generates a unique ID for a feed item based on its labels.
 * Uses a pre-calculated ID if available.
 * @param feed Feed object
 * @returns Unique string ID for the feed
 */
export function getFeedItemId(feed: FeedVO): string {
  // Use pre-calculated ID if available
  if (feed.id) return feed.id;

  // Calculate otherwise
  const labels = feed.labels;
  // Sort keys for consistent hash input
  const sortedKeys = Object.keys(labels).sort();
  const combinedString = sortedKeys
    .map((key) => `${key}=${labels[key]}`)
    .join("&");
  const hashValue = simpleHash(combinedString);
  return hashValue.toString();
}

export function parseArticleAnalysis(
  feed: FeedVO | null | undefined,
): ArticleAnalysis | null {
  if (!feed?.labels?.article_analysis) return null;
  try {
    return JSON.parse(feed.labels.article_analysis) as ArticleAnalysis;
  } catch (error) {
    console.warn("Failed to parse article_analysis label:", error);
    return null;
  }
}

export function getFeedCandidateTags(
  feed: FeedVO | null | undefined,
): string[] {
  if (!feed) return [];

  const seen = new Set<string>();
  const tags: string[] = [];
  const pushTag = (value: string | null | undefined) => {
    const tag = value?.trim();
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  };

  const analysis = parseArticleAnalysis(feed);
  pushTag(analysis?.primary_topic);
  pushTag(analysis?.format);
  analysis?.topics_json?.forEach(pushTag);

  const fallbackTags =
    feed.labels.tags
      ?.split(/[,\uFF0C;\uFF1B|\n\t]/)
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  fallbackTags.forEach(pushTag);
  pushTag(feed.labels.source);

  return tags;
}

export function getDefaultFeedbackTags(
  feed: FeedVO | null | undefined,
): string[] {
  if (!feed) return [];

  const analysis = parseArticleAnalysis(feed);
  const defaults = [analysis?.primary_topic, analysis?.format]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));
  if (defaults.length > 0) return Array.from(new Set(defaults));

  return getFeedCandidateTags(feed).slice(0, 2);
}

/**
 * Compares two feed items for sorting.
 * Sorts primarily by time (descending), then by title (ascending).
 * Handles potential date parsing errors gracefully.
 * @param a First FeedVO object
 * @param b Second FeedVO object
 * @returns -1 if a < b, 1 if a > b, 0 if equal (for sorting)
 */
export function compareFeeds(a: FeedVO, b: FeedVO): number {
  try {
    // Compare time first (most recent first)
    const timeA = new Date(a.time);
    const timeB = new Date(b.time);
    if (timeA > timeB) return -1;
    if (timeA < timeB) return 1;

    // If times are equal, compare by title (alphabetical)
    const titleA = a.labels.title || "";
    const titleB = b.labels.title || "";
    return titleA.localeCompare(titleB);
  } catch (e) {
    // Fallback to title sort if date parsing fails
    console.error("Error parsing date during sort:", e, a.time, b.time);
    const titleA = a.labels.title || "";
    const titleB = b.labels.title || "";
    return titleA.localeCompare(titleB);
  }
}
