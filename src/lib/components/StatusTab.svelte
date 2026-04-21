<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { _ } from "svelte-i18n";
    import { getTargetApiUrl } from "$lib/utils/apiUtils";

    interface SourceStat {
        name: string;
        url: string;
        scraping: boolean;
        last_scrape_at: string;
        last_scrape_ok: boolean;
        last_scrape_error: string;
        last_scrape_fetched: number;
        total_fetched: number;
        total_errors: number;
    }

    interface LLMStat {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }

    interface StatsSnapshot {
        sources: SourceStat[];
        llm: LLMStat;
    }

    let snapshot: StatsSnapshot | null = null;
    let loading = true;
    let error = "";
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function fetchStats() {
        try {
            const resp = await fetch(getTargetApiUrl("/get_stats"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({}),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            snapshot = await resp.json();
            error = "";
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        fetchStats();
        intervalId = setInterval(fetchStats, 10_000);
    });

    onDestroy(() => {
        if (intervalId !== null) clearInterval(intervalId);
    });

    function relativeTime(iso: string): string {
        if (!iso || iso.startsWith("0001")) return $_("status.never");
        const diff = Date.now() - new Date(iso).getTime();
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return `${sec}s ago`;
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr}h ago`;
        return `${Math.floor(hr / 24)}d ago`;
    }

    function statusLabel(src: SourceStat): string {
        if (src.scraping) return $_("status.statusScraping");
        if (!src.last_scrape_at || src.last_scrape_at.startsWith("0001")) return $_("status.statusPending");
        if (!src.last_scrape_ok) return $_("status.statusError");
        return $_("status.statusOK");
    }

    function statusClass(src: SourceStat): string {
        if (src.scraping) return "text-info";
        if (!src.last_scrape_at || src.last_scrape_at.startsWith("0001")) return "text-base-content/50";
        if (!src.last_scrape_ok) return "text-error";
        return "text-success";
    }
</script>

<div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-xl font-bold mb-6">{$_("status.title")}</h2>

    {#if loading}
        <div class="flex items-center gap-2 text-base-content/60">
            <span class="loading loading-spinner loading-sm"></span>
            {$_("status.loading")}
        </div>
    {:else if error}
        <div class="alert alert-error mb-4">
            <span>{$_("status.loadError")}: {error}</span>
            <button class="btn btn-sm btn-ghost" onclick={fetchStats}>{$_("status.retry")}</button>
        </div>
    {:else if snapshot}
        <!-- Sources table -->
        <section class="mb-8">
            <h3 class="text-lg font-semibold mb-3">{$_("status.sources")}</h3>
            {#if !snapshot.sources || snapshot.sources.length === 0}
                <p class="text-base-content/50">{$_("status.noSources")}</p>
            {:else}
                <div class="overflow-x-auto rounded-box border border-base-300">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>{$_("status.colName")}</th>
                                <th>{$_("status.colStatus")}</th>
                                <th>{$_("status.colLastScrape")}</th>
                                <th>{$_("status.colLastFetched")}</th>
                                <th>{$_("status.colTotalFetched")}</th>
                                <th>{$_("status.colError")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each snapshot.sources as src}
                                <tr class="hover">
                                    <td class="font-medium max-w-32 truncate" title={src.url}>{src.name}</td>
                                    <td class={statusClass(src)}>
                                        {#if src.scraping}
                                            <span class="loading loading-dots loading-xs mr-1"></span>
                                        {/if}
                                        {statusLabel(src)}
                                    </td>
                                    <td class="text-sm text-base-content/70">{relativeTime(src.last_scrape_at)}</td>
                                    <td class="text-sm">{src.last_scrape_fetched ?? 0}</td>
                                    <td class="text-sm">{src.total_fetched ?? 0}</td>
                                    <td class="text-sm text-error max-w-48 truncate" title={src.last_scrape_error}>
                                        {src.last_scrape_error ?? ""}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </section>

        <!-- LLM stats -->
        <section>
            <h3 class="text-lg font-semibold mb-3">
                {$_("status.llm")}
                <span class="text-sm font-normal text-base-content/50 ml-1">{$_("status.sinceRestart")}</span>
            </h3>
            <div class="grid grid-cols-3 gap-4">
                <div class="stat bg-base-200 rounded-box p-4">
                    <div class="stat-title">{$_("status.promptTokens")}</div>
                    <div class="stat-value text-2xl">{(snapshot.llm?.prompt_tokens ?? 0).toLocaleString()}</div>
                </div>
                <div class="stat bg-base-200 rounded-box p-4">
                    <div class="stat-title">{$_("status.completionTokens")}</div>
                    <div class="stat-value text-2xl">{(snapshot.llm?.completion_tokens ?? 0).toLocaleString()}</div>
                </div>
                <div class="stat bg-base-200 rounded-box p-4">
                    <div class="stat-title">{$_("status.totalTokens")}</div>
                    <div class="stat-value text-2xl">{(snapshot.llm?.total_tokens ?? 0).toLocaleString()}</div>
                </div>
            </div>
        </section>
    {/if}
</div>
