<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import { _ } from "svelte-i18n";
    import type { FeedVO } from "$lib/types/feed";
    import { getFeedItemId } from "$lib/utils/feedUtils";
    import {
        submitFeedback,
        type UserTag,
    } from "$lib/utils/personalizationApi";

    export let feed: FeedVO | null = null;
    export let open = false;

    const dispatch = createEventDispatcher<{
        close: void;
        markRead: { feedId: string };
        feedbackSubmitted: { feedId: string; message: string };
    }>();

    // Form state — reset when feed changes
    let score: number | null = null;
    let interest: "boost" | "demote" | null = null; // null = neutral
    let archive = false;
    let customTag = "";
    let submitting = false;
    let error = "";

    $: if (feed) {
        score = null;
        interest = null;
        archive = false;
        customTag = "";
        submitting = false;
        error = "";
    }

    function close() {
        dispatch("close");
    }

    function handleQuickMarkRead() {
        if (!feed) return;
        dispatch("markRead", { feedId: getFeedItemId(feed) });
        close();
    }

    async function handleSubmit() {
        if (!feed) return;
        submitting = true;
        error = "";

        const feedId = getFeedItemId(feed);
        const tags: UserTag[] = [];

        // Interest tag uses the article's source label as the tag topic
        if (interest) {
            const topic = feed.labels.source || feed.labels.title?.slice(0, 20) || "article";
            tags.push({ tag: topic, action: interest });
        }

        // Custom tag (boost)
        if (customTag.trim()) {
            tags.push({ tag: customTag.trim(), action: "boost" });
        }

        try {
            const result = await submitFeedback({
                feed_id: feedId,
                score: score ?? undefined,
                tags: tags.length > 0 ? tags : undefined,
                archive: archive || undefined,
            });
            dispatch("markRead", { feedId });
            dispatch("feedbackSubmitted", {
                feedId,
                message: result.message || $_("feedback.submitted"),
            });
            close();
        } catch (e: unknown) {
            error = e instanceof Error ? e.message : String(e);
        } finally {
            submitting = false;
        }
    }

    const scoreLabels: Record<number, string> = {
        1: "😞",
        2: "😕",
        3: "😐",
        4: "🙂",
        5: "😊",
        6: "👍",
        7: "🤩",
        8: "💎",
        9: "🌟",
        10: "🏆",
    };
</script>

{#if open && feed}
    <!-- Backdrop -->
    <button
        class="fixed inset-0 z-40 bg-black/30"
        type="button"
        tabindex="-1"
        on:click={close}
        aria-label={$_("feedback.close")}
    ></button>

    <!-- Panel -->
    <div
        class="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:right-0 md:left-auto md:bottom-0 md:w-80 bg-base-100 shadow-2xl flex flex-col"
        in:fly={{ y: 200, duration: 300, easing: cubicOut }}
        out:fly={{ y: 200, duration: 200, easing: cubicOut }}
        role="dialog"
        aria-modal="true"
        aria-label={$_("feedback.panelTitle")}
    >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-base-300">
            <span class="font-semibold text-sm">{$_("feedback.panelTitle")}</span>
            <button class="btn btn-ghost btn-xs btn-circle" on:click={close} aria-label={$_("feedback.close")}>✕</button>
        </div>

        <!-- Article title -->
        <div class="px-4 py-2 border-b border-base-300">
            <p class="text-xs text-base-content/60 line-clamp-2">{feed.labels.title || $_("past24h.untitledFeed")}</p>
        </div>

        <!-- Quick mark read -->
        <div class="px-4 pt-3">
            <button
                class="btn btn-sm btn-outline btn-primary w-full"
                on:click={handleQuickMarkRead}
            >
                ✓ {$_("feedback.quickMarkRead")}
            </button>
        </div>

        <div class="divider my-2 px-4 text-xs text-base-content/40">{$_("feedback.orLeaveDetail")}</div>

        <!-- Form body -->
        <div class="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
            <!-- Score -->
            <div>
                <label class="label pb-1">
                    <span class="label-text font-medium text-sm">{$_("feedback.score")}</span>
                    {#if score !== null}
                        <span class="label-text-alt text-lg">{scoreLabels[score]}</span>
                    {/if}
                </label>
                <div class="flex gap-1 flex-wrap">
                    {#each [1,2,3,4,5,6,7,8,9,10] as s}
                        <button
                            class="btn btn-xs"
                            class:btn-primary={score === s}
                            class:btn-ghost={score !== s}
                            on:click={() => score = score === s ? null : s}
                        >{s}</button>
                    {/each}
                </div>
            </div>

            <!-- Interest -->
            <div>
                <label class="label pb-1">
                    <span class="label-text font-medium text-sm">{$_("feedback.interest")}</span>
                </label>
                <div class="flex gap-2">
                    <button
                        class="btn btn-sm flex-1"
                        class:btn-success={interest === "boost"}
                        class:btn-ghost={interest !== "boost"}
                        on:click={() => interest = interest === "boost" ? null : "boost"}
                    >👍 {$_("feedback.interested")}</button>
                    <button
                        class="btn btn-sm flex-1"
                        class:btn-error={interest === "demote"}
                        class:btn-ghost={interest !== "demote"}
                        on:click={() => interest = interest === "demote" ? null : "demote"}
                    >👎 {$_("feedback.notInterested")}</button>
                </div>
            </div>

            <!-- Custom tag -->
            <div>
                <label class="label pb-1" for="feedback-tag">
                    <span class="label-text font-medium text-sm">{$_("feedback.customTag")}</span>
                    <span class="label-text-alt text-base-content/50">{$_("feedback.optional")}</span>
                </label>
                <input
                    id="feedback-tag"
                    type="text"
                    class="input input-bordered input-sm w-full"
                    placeholder={$_("feedback.customTagPlaceholder")}
                    bind:value={customTag}
                    maxlength={30}
                />
            </div>

            <!-- Archive -->
            <div class="form-control">
                <label class="label cursor-pointer">
                    <span class="label-text font-medium text-sm">{$_("feedback.archive")}</span>
                    <input type="checkbox" class="checkbox checkbox-sm" bind:checked={archive} />
                </label>
            </div>

            {#if error}
                <p class="text-error text-xs">{error}</p>
            {/if}
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-base-300">
            <button
                class="btn btn-primary btn-sm w-full"
                on:click={handleSubmit}
                disabled={submitting}
            >
                {#if submitting}
                    <span class="loading loading-spinner loading-xs"></span>
                {:else}
                    {$_("feedback.submit")}
                {/if}
            </button>
        </div>
    </div>
{/if}
