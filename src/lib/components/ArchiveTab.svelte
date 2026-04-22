<script lang="ts">
    import { onMount } from "svelte";
    import { _ } from "svelte-i18n";
    import { goto } from "$app/navigation";
    import { getTargetApiUrl } from "$lib/utils/apiUtils";
    import { getArchive, type ArchiveEntryDetail } from "$lib/utils/personalizationApi";
    import type { FeedVO } from "$lib/types/feed";
    import FeedbackPanel from "$lib/components/FeedbackPanel.svelte";
    import { selectedFeedStore } from "$lib/stores/feedStore";

    interface ArchiveIndexEntry {
        feed_id: string;
        title?: string;
        source?: string;
        url?: string;
        archived_at: string;
    }

    let archives: ArchiveIndexEntry[] = [];
    let loading = true;
    let error = "";

    let correctionFeed: FeedVO | null = null;
    let correctionOpen = false;
    let correctionLoading: string | null = null;
    let correctionError = "";
    let viewLoading: string | null = null;

    async function openDetail(feedId: string) {
        viewLoading = feedId;
        try {
            const entry: ArchiveEntryDetail = await getArchive(feedId);
            const feedDetailData = {
                id: entry.feed_id,
                title: entry.labels.title || "",
                tags: entry.labels.tags || "",
                summaryHtmlSnippet: entry.labels.summary_html_snippet || "",
                link: entry.labels.link || "",
            };
            selectedFeedStore.set(feedDetailData);
            try {
                sessionStorage.setItem("selectedFeedDetail", JSON.stringify(feedDetailData));
            } catch (_) { /* ignore */ }
            goto("/feed-detail");
        } catch (e: unknown) {
            correctionError = e instanceof Error ? e.message : String(e);
        } finally {
            viewLoading = null;
        }
    }

    async function loadArchives() {
        loading = true;
        error = "";
        try {
            const resp = await fetch(getTargetApiUrl("/list_archives"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({}),
            });
            if (!resp.ok) {
                error = `HTTP ${resp.status}`;
                return;
            }
            const data = await resp.json();
            archives = (data.archives ?? []).slice().reverse(); // newest first
        } catch (e: unknown) {
            error = e instanceof Error ? e.message : String(e);
        } finally {
            loading = false;
        }
    }

    async function openCorrection(feedId: string) {
        correctionLoading = feedId;
        correctionError = "";
        try {
            const entry: ArchiveEntryDetail = await getArchive(feedId);
            correctionFeed = { labels: entry.labels as any, time: entry.feed_time, id: entry.feed_id };
            correctionOpen = true;
        } catch (e: unknown) {
            correctionError = e instanceof Error ? e.message : String(e);
        } finally {
            correctionLoading = null;
        }
    }

    function formatDate(iso: string) {
        try {
            return new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(iso));
        } catch {
            return iso;
        }
    }

    onMount(() => {
        loadArchives();
    });
</script>

<div class="max-w-2xl mx-auto pb-12">
    {#if loading}
        <div class="flex justify-center py-16">
            <span class="loading loading-spinner loading-md text-primary"></span>
        </div>
    {:else if error}
        <div class="alert alert-error">
            <span>{error}</span>
            <button class="btn btn-ghost btn-sm" on:click={loadArchives}>{$_("archive.retry")}</button>
        </div>
    {:else if archives.length === 0}
        <div class="card bg-base-100 border border-base-300 shadow-sm">
            <div class="card-body items-center text-center py-12">
                <div class="text-4xl mb-3">📚</div>
                <h2 class="card-title">{$_("archive.emptyTitle")}</h2>
                <p class="text-base-content/60 text-sm max-w-sm">{$_("archive.emptyHint")}</p>
            </div>
        </div>
    {:else}
        <div class="mb-4 flex items-center justify-between">
            <h2 class="font-semibold text-base">{$_("archive.title")} ({archives.length})</h2>
            <button class="btn btn-ghost btn-xs" on:click={loadArchives}>↻</button>
        </div>
        {#if correctionError}
            <div class="alert alert-error mb-3 text-sm py-2">{correctionError}</div>
        {/if}
        <ul class="space-y-2">
            {#each archives as entry (entry.feed_id)}
                <li class="card bg-base-100 border border-base-300 shadow-sm hover:border-primary/40 transition-colors">
                    <div class="card-body py-3 px-4 flex flex-row items-start gap-3">
                        <button
                            class="flex-1 min-w-0 text-left"
                            on:click={() => openDetail(entry.feed_id)}
                            disabled={viewLoading === entry.feed_id}
                        >
                            <p class="font-medium text-sm truncate hover:text-primary transition-colors">
                                {#if viewLoading === entry.feed_id}
                                    <span class="loading loading-spinner loading-xs mr-1"></span>
                                {/if}
                                {entry.title || $_("archive.untitled")}
                            </p>
                            <div class="flex items-center gap-3 mt-1 flex-wrap">
                                {#if entry.source}
                                    <span class="text-xs text-base-content/50">{entry.source}</span>
                                {/if}
                                <span class="text-xs text-base-content/40">{formatDate(entry.archived_at)}</span>
                                {#if entry.url}
                                    <span class="text-xs text-primary/60">{$_("archive.openArticle")}</span>
                                {/if}
                            </div>
                        </button>
                        <div class="flex items-center gap-2 shrink-0">
                            <button
                                class="btn btn-ghost btn-xs"
                                on:click={() => openCorrection(entry.feed_id)}
                                disabled={correctionLoading === entry.feed_id}
                            >
                                {#if correctionLoading === entry.feed_id}
                                    <span class="loading loading-spinner loading-xs"></span>
                                {:else}
                                    {$_("archive.correctFeedback")}
                                {/if}
                            </button>
                            <span class="badge badge-ghost badge-sm">📌</span>
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<FeedbackPanel
    feed={correctionFeed}
    open={correctionOpen}
    on:close={() => { correctionOpen = false; correctionFeed = null; }}
    on:markRead={() => {}}
    on:feedbackSubmitted={() => { correctionOpen = false; correctionFeed = null; }}
/>
