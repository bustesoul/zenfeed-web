import { writable, derived } from 'svelte/store';
import { calculateTodayReadCount } from '$lib/utils/dateUtils';
import type { ReadItemsMap } from '$lib/utils/dateUtils'; // Import type if needed elsewhere
import { listReads, markFeedsRead, type ReadIndexEntry } from '$lib/utils/personalizationApi';

const READ_ITEMS_STORAGE_KEY = 'zenfeed_read_feeds';

// --- Private State ---
let markAsReadSound: HTMLAudioElement | null = null;

// Function to initialize the store and load data
function createReadItemsStore() {
    const initialMap: ReadItemsMap = new Map();
    // Create a writable store for the read items map
    const { subscribe, set, update } = writable<ReadItemsMap>(initialMap);
    let syncFromServerPromise: Promise<void> | null = null;

    const persistMap = (map: ReadItemsMap) => {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return;
        }
        try {
            const storableArray = Array.from(map.entries());
            localStorage.setItem(READ_ITEMS_STORAGE_KEY, JSON.stringify(storableArray));
        } catch (e) {
            console.error('Failed to save read items to localStorage:', e);
        }
    };

    const mergeReadEntries = (currentMap: ReadItemsMap, entries: ReadIndexEntry[]): ReadItemsMap => {
        const nextMap = new Map(currentMap);
        let changed = false;

        for (const entry of entries) {
            const timestamp = Date.parse(entry.read_at);
            if (!entry.feed_id || Number.isNaN(timestamp)) {
                continue;
            }

            const previous = nextMap.get(entry.feed_id);
            if (previous === undefined || previous < timestamp) {
                nextMap.set(entry.feed_id, timestamp);
                changed = true;
            }
        }

        return changed ? nextMap : currentMap;
    };

    // Load from localStorage on initialization (client-side only)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
            const storedData = localStorage.getItem(READ_ITEMS_STORAGE_KEY);
            if (storedData) {
                const parsedArray = JSON.parse(storedData);
                // Validate the loaded data structure
                if (Array.isArray(parsedArray) && parsedArray.every(pair => Array.isArray(pair) && pair.length === 2)) {
                    set(new Map(parsedArray)); // Initialize store with loaded data
                } else {
                    console.warn('Invalid read items format in localStorage. Clearing.');
                    localStorage.removeItem(READ_ITEMS_STORAGE_KEY); // Clear invalid data
                }
            }
        } catch (e) {
            console.error('Failed to load/parse read items from localStorage:', e);
            localStorage.removeItem(READ_ITEMS_STORAGE_KEY); // Clear potentially corrupted data
        }

        // Preload audio effect for marking as read
        markAsReadSound = new Audio('/sounds/woodfish.mp3');
        markAsReadSound.volume = 0.5;
        markAsReadSound.load();

        syncFromServerPromise = listReads()
            .then((entries) => {
                update((currentMap) => {
                    const merged = mergeReadEntries(currentMap, entries);
                    if (merged !== currentMap) {
                        persistMap(merged);
                    }
                    return merged;
                });
            })
            .catch((error) => {
                console.warn('Failed to hydrate read items from backend:', error);
            })
            .finally(() => {
                syncFromServerPromise = null;
            });
    }

    // --- Public API for the store ---
    return {
        subscribe, // Expose the Svelte store subscription method
        // Function to mark an item as read
        markRead: (itemId: string) => update(currentMap => {
            // Only update if the item is not already marked as read
            if (!currentMap.has(itemId)) {
                // Play sound effect if available
                if (markAsReadSound) {
                    markAsReadSound.currentTime = 0; // Reset playback position
                    markAsReadSound.play().catch(error => console.warn('Audio playback failed:', error));
                }
                // Create a new map to ensure reactivity
                const newMap = new Map(currentMap);
                newMap.set(itemId, Date.now()); // Add item with current timestamp

                // Save the updated map to localStorage (client-side only)
                persistMap(newMap);
                // Sync to backend (fire-and-forget)
                markFeedsRead([itemId]).catch(() => { /* backend sync best-effort */ });
                return newMap; // Return the updated map for the store
            }
            return currentMap; // Return the unchanged map if item was already read
        }),
        hydrateFromServer: async () => {
            if (syncFromServerPromise) {
                return syncFromServerPromise;
            }

            syncFromServerPromise = listReads()
                .then((entries) => {
                    update((currentMap) => {
                        const merged = mergeReadEntries(currentMap, entries);
                        if (merged !== currentMap) {
                            persistMap(merged);
                        }
                        return merged;
                    });
                })
                .catch((error) => {
                    console.warn('Failed to hydrate read items from backend:', error);
                })
                .finally(() => {
                    syncFromServerPromise = null;
                });

            return syncFromServerPromise;
        },
        // Utility function to check read status (can be used outside reactive contexts)
        isRead: (itemId: string, currentMap: ReadItemsMap): boolean => {
            return currentMap.has(itemId);
        },
        // Function to reset the store and clear localStorage (e.g., for debugging)
        reset: () => {
            set(new Map()); // Reset store to empty map
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                localStorage.removeItem(READ_ITEMS_STORAGE_KEY); // Clear storage
            }
        }
        // Note: `set` and `update` are not directly exposed to prevent bypassing `markRead` logic
    };
}

// Create the store instance
export const readItemsStore = createReadItemsStore();

// Derived store that calculates the count of items read today
export const todayReadCountStore = derived(
    readItemsStore, // Depends on the main read items store
    ($readItems) => calculateTodayReadCount($readItems) // Use utility function for calculation
);

// Derived store helper for reactive read status checking in components
// Usage: `$: isCurrentFeedRead = $isReadStore(feedId)`
export const isReadStore = derived(
    readItemsStore, // Depends on the main read items store
    ($readItems) => (itemId: string) => $readItems.has(itemId) // Returns a function that checks the map
); 
