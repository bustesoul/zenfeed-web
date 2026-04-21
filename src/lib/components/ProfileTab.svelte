<script lang="ts">
    import { onMount } from "svelte";
    import { _ } from "svelte-i18n";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import { getTargetApiUrl } from "$lib/utils/apiUtils";
    import { getProfile, type ProfileGlobal, type TagControl } from "$lib/utils/personalizationApi";

    const COLD_START_THRESHOLD = 5;
    const MILESTONE_KEY = "zenfeed_milestone_toasts";

    let profile: ProfileGlobal | null = null;
    let loading = true;
    let resetting = false;
    let resetDone = false;

    async function loadProfile() {
        loading = true;
        profile = await getProfile();
        loading = false;
    }

    async function handleReset() {
        if (!confirm($_("profile.resetConfirm"))) return;
        resetting = true;
        try {
            const resp = await fetch(getTargetApiUrl("/reset_profile"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({}),
            });
            if (resp.ok) {
                resetDone = true;
                profile = null;
                setTimeout(() => { resetDone = false; loadProfile(); }, 1500);
            }
        } finally {
            resetting = false;
        }
    }

    function actionColor(action: TagControl["action"]) {
        if (action === "boost") return "badge-success";
        if (action === "demote") return "badge-warning";
        if (action === "block") return "badge-error";
        return "badge-ghost";
    }

    function actionIcon(action: TagControl["action"]) {
        if (action === "boost") return "↑";
        if (action === "demote") return "↓";
        if (action === "block") return "✕";
        return "·";
    }

    function weeklyDiff(current: TagControl[], snapshot: TagControl[]): { tag: string; delta: string }[] {
        const snapMap = new Map(snapshot.map((t) => [t.tag, t.weight]));
        return current
            .map((t) => {
                const prev = snapMap.get(t.tag) ?? 0;
                const delta = t.weight - prev;
                if (Math.abs(delta) < 0.01) return null;
                return { tag: t.tag, delta: (delta > 0 ? "+" : "") + delta.toFixed(2) };
            })
            .filter(Boolean) as { tag: string; delta: string }[];
    }

    onMount(() => {
        loadProfile();
    });
</script>

<div class="max-w-2xl mx-auto space-y-6 pb-12">
    {#if loading}
        <div class="flex justify-center py-16">
            <span class="loading loading-spinner loading-md text-primary"></span>
        </div>
    {:else if !profile || profile.feedback_count === 0}
        <!-- Empty state -->
        <div class="card bg-base-100 border border-base-300 shadow-sm">
            <div class="card-body items-center text-center py-12">
                <div class="text-4xl mb-3">🌱</div>
                <h2 class="card-title">{$_("profile.emptyTitle")}</h2>
                <p class="text-base-content/60 text-sm max-w-sm">{$_("profile.emptyHint")}</p>
                <!-- Cold start progress bar -->
                <div class="w-full max-w-xs mt-6">
                    <div class="flex justify-between text-xs text-base-content/50 mb-1">
                        <span>{$_("profile.coldStartProgress")}</span>
                        <span>0 / {COLD_START_THRESHOLD}</span>
                    </div>
                    <progress class="progress progress-primary w-full" value={0} max={COLD_START_THRESHOLD}></progress>
                </div>
            </div>
        </div>
    {:else}
        <!-- Cold start progress bar (if not yet threshold) -->
        {#if profile.feedback_count < COLD_START_THRESHOLD}
            <div class="card bg-base-100 border border-base-300 shadow-sm">
                <div class="card-body py-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium">{$_("profile.coldStartProgress")}</span>
                        <span class="text-base-content/60">{profile.feedback_count} / {COLD_START_THRESHOLD}</span>
                    </div>
                    <progress
                        class="progress progress-primary w-full"
                        value={profile.feedback_count}
                        max={COLD_START_THRESHOLD}
                    ></progress>
                    <p class="text-xs text-base-content/50 mt-1">{$_("profile.coldStartHint")}</p>
                </div>
            </div>
        {/if}

        <!-- Stats -->
        <div class="stats shadow w-full border border-base-300">
            <div class="stat">
                <div class="stat-title">{$_("profile.feedbackCount")}</div>
                <div class="stat-value text-primary">{profile.feedback_count}</div>
            </div>
            <div class="stat">
                <div class="stat-title">{$_("profile.boostedTags")}</div>
                <div class="stat-value text-success">
                    {profile.tag_controls?.filter((t) => t.action === "boost").length ?? 0}
                </div>
            </div>
            <div class="stat">
                <div class="stat-title">{$_("profile.demotedTags")}</div>
                <div class="stat-value text-warning">
                    {profile.tag_controls?.filter((t) => t.action === "demote").length ?? 0}
                </div>
            </div>
        </div>

        <!-- Weekly diff -->
        {#if profile.weekly_snapshot && profile.weekly_snapshot.length > 0}
            {@const diffs = weeklyDiff(profile.tag_controls ?? [], profile.weekly_snapshot)}
            {#if diffs.length > 0}
                <div class="card bg-base-100 border border-base-300 shadow-sm">
                    <div class="card-body py-4">
                        <h3 class="font-semibold text-sm mb-2">📈 {$_("profile.weeklyDiff")}</h3>
                        <div class="flex flex-wrap gap-2">
                            {#each diffs as d}
                                <span class="badge badge-ghost text-xs">
                                    {d.tag}
                                    <span class="ml-1 {d.delta.startsWith('+') ? 'text-success' : 'text-warning'} font-bold">{d.delta}</span>
                                </span>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}
        {/if}

        <!-- Tag controls -->
        {#if profile.tag_controls && profile.tag_controls.length > 0}
            <div class="card bg-base-100 border border-base-300 shadow-sm">
                <div class="card-body py-4">
                    <h3 class="font-semibold text-sm mb-3">{$_("profile.tagControls")}</h3>
                    <div class="flex flex-wrap gap-2">
                        {#each [...profile.tag_controls].sort((a, b) => b.weight - a.weight) as tc}
                            <span class="badge {actionColor(tc.action)} gap-1 text-xs">
                                <span>{actionIcon(tc.action)}</span>
                                {tc.tag}
                                <span class="opacity-60 text-[10px]">×{tc.weight.toFixed(1)}</span>
                            </span>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        <!-- Reset -->
        <div class="flex justify-end">
            {#if resetDone}
                <span
                    class="text-success text-sm"
                    in:fly={{ y: -10, duration: 300, easing: cubicOut }}
                >✓ {$_("profile.resetDone")}</span>
            {:else}
                <button
                    class="btn btn-outline btn-error btn-sm"
                    on:click={handleReset}
                    disabled={resetting}
                >
                    {#if resetting}<span class="loading loading-spinner loading-xs"></span>{/if}
                    {$_("profile.resetButton")}
                </button>
            {/if}
        </div>
    {/if}
</div>
