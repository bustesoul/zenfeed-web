// Define shared types here
export interface FeedLabels {
    [key: string]: string;
}

export interface FeedVO {
    labels: FeedLabels;
    time: string;
    id?: string; // Optional pre-calculated ID
    score?: number; // Semantic similarity score (when SemanticFilter is set)
    matched_preferences?: string[]; // Boost tags that matched this feed
}
