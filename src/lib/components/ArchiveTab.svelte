<script lang="ts">
    import { onMount } from "svelte";
    import { _ } from "svelte-i18n";
    import { getTargetApiUrl } from "$lib/utils/apiUtils";

    interface ArchiveIndexEntry {
        feed_id: string;
        title?: string;
        source?: string;
        archived_at: string;
    }

    let archives: ArchiveIndexEntry[] = [];
    let loading = true;
    let error = "";

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
        <ul class="space-y-2">
            {#each archives as entry (entry.feed_id)}
                <li class="card bg-base-100 border border-base-300 shadow-sm hover:border-primary/40 transition-colors">
                    <div class="card-body py-3 px-4 flex flex-row items-start gap-3">
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-sm truncate">
                                {entry.title || $_("archive.untitled")}
                            </p>
                            <div class="flex items-center gap-3 mt-1">
                                {#if entry.source}
                                    <span class="text-xs text-base-content/50">{entry.source}</span>
                                {/if}
                                <span class="text-xs text-base-content/40">{formatDate(entry.archived_at)}</span>
                            </div>
                        </div>
                        <span class="badge badge-ghost badge-sm shrink-0">📌</span>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>
