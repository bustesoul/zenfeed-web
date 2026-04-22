<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { _ } from "svelte-i18n";
  import type { FeedVO } from "$lib/types/feed";
  import {
    getDefaultFeedbackTags,
    getFeedCandidateTags,
    getFeedItemId,
  } from "$lib/utils/feedUtils";
  import {
    submitFeedback,
    archiveFeed,
    type UserTag,
  } from "$lib/utils/personalizationApi";
  import { profileStateStore } from "$lib/stores/profileStateStore";

  const MILESTONE_KEY = "zenfeed_milestone_toasts";
  const MILESTONES = [1, 5, 20];

  function checkMilestone(
    feedbackCount: number,
    preferredTags: string[],
  ): string | null {
    if (typeof localStorage === "undefined") return null;
    let shown: number[] = [];
    try {
      shown = JSON.parse(localStorage.getItem(MILESTONE_KEY) || "[]");
    } catch {
      shown = [];
    }
    for (const milestone of MILESTONES) {
      if (feedbackCount < milestone || shown.includes(milestone)) continue;
      shown.push(milestone);
      localStorage.setItem(MILESTONE_KEY, JSON.stringify(shown));

      if (milestone === 1) {
        return "🎉 偏好学习已启动，再给 4 篇反馈可激活个性化排序";
      }
      if (milestone === 5) {
        const summary = preferredTags.slice(0, 2).join(" · ");
        return summary
          ? `✨ 个性化排序已激活！已发现你偏好「${summary}」`
          : "✨ 个性化排序已激活！推荐结果会开始响应你的反馈";
      }
      return "📈 偏好画像已成熟，推荐准确度持续提升中";
    }
    return null;
  }

  export let feed: FeedVO | null = null;
  export let open = false;

  const dispatch = createEventDispatcher<{
    close: void;
    markRead: { feedId: string };
    feedbackSubmitted: { feedId: string; message: string };
  }>();

  let currentFeedId = "";
  let candidateTags: string[] = [];
  let selectedCandidateTags: string[] = [];
  let score = 6;
  let scoreReason = "";
  let action: UserTag["action"] | null = null;
  let customTag = "";
  let submitting = false;
  let archiving = false;
  let error = "";

  $: {
    const nextFeedId = feed ? getFeedItemId(feed) : "";
    if (nextFeedId && nextFeedId !== currentFeedId) {
      currentFeedId = nextFeedId;
      candidateTags = getFeedCandidateTags(feed);
      selectedCandidateTags = getDefaultFeedbackTags(feed);
      score = 6;
      scoreReason = "";
      action = null;
      customTag = "";
      submitting = false;
      archiving = false;
      error = "";
    }
    if (!nextFeedId) {
      currentFeedId = "";
      candidateTags = [];
      selectedCandidateTags = [];
    }
  }

  function close() {
    dispatch("close");
  }

  function handleQuickMarkRead() {
    if (!feed) return;
    dispatch("markRead", { feedId: getFeedItemId(feed) });
    close();
  }

  async function handleQuickArchive() {
    if (!feed) return;
    archiving = true;
    error = "";
    const feedId = getFeedItemId(feed);
    try {
      await archiveFeed(feedId);
      dispatch("markRead", { feedId });
      dispatch("feedbackSubmitted", { feedId, message: $_("feedback.archived") });
      close();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
      archiving = false;
    }
  }

  function toggleCandidateTag(tag: string) {
    if (selectedCandidateTags.includes(tag)) {
      selectedCandidateTags = selectedCandidateTags.filter(
        (item) => item !== tag,
      );
      return;
    }
    selectedCandidateTags = [...selectedCandidateTags, tag];
  }

  async function handleSubmit() {
    if (!feed) return;
    submitting = true;
    error = "";

    const feedId = getFeedItemId(feed);
    const tags: UserTag[] = [];
    if (action !== null) {
      selectedCandidateTags.forEach((tag) => tags.push({ tag, action: action! }));
      if (customTag.trim()) {
        const custom = customTag.trim();
        if (!tags.some((item) => item.tag === custom)) {
          tags.push({ tag: custom, action: action! });
        }
      }
    }

    try {
      const result = await submitFeedback({
        feed_id: feedId,
        score,
        score_reason: scoreReason.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      const profile = await profileStateStore.refresh().catch(() => null);
      const milestone = profile
        ? checkMilestone(
            profile.feedback_count,
            result.matched_preferences ?? selectedCandidateTags,
          )
        : null;
      dispatch("markRead", { feedId });
      dispatch("feedbackSubmitted", {
        feedId,
        message: milestone || result.message || $_("feedback.submitted"),
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
  <button
    class="fixed inset-0 z-40 bg-black/30"
    type="button"
    tabindex="-1"
    on:click={close}
    aria-label={$_("feedback.close")}
  ></button>

  <div
    class="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:right-0 md:left-auto md:bottom-0 md:w-96 bg-base-100 shadow-2xl flex flex-col"
    in:fly={{ y: 200, duration: 300, easing: cubicOut }}
    out:fly={{ y: 200, duration: 200, easing: cubicOut }}
    role="dialog"
    aria-modal="true"
    aria-label={$_("feedback.panelTitle")}
  >
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-base-300"
    >
      <span class="font-semibold text-sm">{$_("feedback.panelTitle")}</span>
      <button
        class="btn btn-ghost btn-xs btn-circle"
        on:click={close}
        aria-label={$_("feedback.close")}>✕</button
      >
    </div>

    <div class="px-4 py-2 border-b border-base-300">
      <p class="text-xs text-base-content/60 line-clamp-2">
        {feed.labels.title || $_("past24h.untitledFeed")}
      </p>
    </div>

    <div class="px-4 pt-3 flex gap-2">
      <button
        class="btn btn-sm btn-outline btn-primary flex-1"
        on:click={handleQuickMarkRead}
      >
        ✓ {$_("feedback.quickMarkRead")}
      </button>
      <button
        class="btn btn-sm btn-outline flex-1"
        on:click={handleQuickArchive}
        disabled={archiving}
      >
        {#if archiving}
          <span class="loading loading-spinner loading-xs"></span>
        {:else}
          📌 {$_("feedback.archiveNow")}
        {/if}
      </button>
    </div>

    <div class="divider my-2 px-4 text-xs text-base-content/40">
      {$_("feedback.orLeaveDetail")}
    </div>

    <div class="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
      <div>
        <div class="label pb-1">
          <span class="label-text font-medium text-sm"
            >{$_("feedback.score")}</span
          >
          <span class="label-text-alt text-lg">{scoreLabels[score]}</span>
        </div>
        <div class="flex gap-1 flex-wrap">
          {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as s}
            <button
              class="btn btn-xs"
              class:btn-primary={score === s}
              class:btn-ghost={score !== s}
              on:click={() => (score = s)}>{s}</button
            >
          {/each}
        </div>
      </div>

      <div>
        <label class="label pb-1" for="feedback-reason">
          <span class="label-text font-medium text-sm"
            >{$_("feedback.reason")}</span
          >
          <span class="label-text-alt text-base-content/50"
            >{$_("feedback.optional")}</span
          >
        </label>
        <input
          id="feedback-reason"
          type="text"
          class="input input-bordered input-sm w-full"
          placeholder={$_("feedback.reasonPlaceholder")}
          bind:value={scoreReason}
          maxlength={80}
        />
      </div>

      <div>
        <div class="label pb-1">
          <span class="label-text font-medium text-sm"
            >{$_("feedback.action")}</span
          >
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            class="btn btn-sm"
            class:btn-success={action === "boost"}
            class:btn-ghost={action !== "boost"}
            on:click={() => (action = action === "boost" ? null : "boost")}
            >{$_("feedback.boostAction")}</button
          >
          <button
            class="btn btn-sm"
            class:btn-warning={action === "demote"}
            class:btn-ghost={action !== "demote"}
            on:click={() => (action = action === "demote" ? null : "demote")}
            >{$_("feedback.demoteAction")}</button
          >
          <button
            class="btn btn-sm"
            class:btn-error={action === "block"}
            class:btn-ghost={action !== "block"}
            on:click={() => (action = action === "block" ? null : "block")}
            >{$_("feedback.blockAction")}</button
          >
        </div>
      </div>

      <div>
        <div class="label pb-1">
          <span class="label-text font-medium text-sm"
            >{$_("feedback.candidateTags")}</span
          >
        </div>
        {#if candidateTags.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each candidateTags as tag}
              <button
                class="badge badge-lg h-auto py-2 px-3 border"
                class:badge-primary={selectedCandidateTags.includes(tag)}
                class:badge-outline={!selectedCandidateTags.includes(tag)}
                on:click={() => toggleCandidateTag(tag)}>{tag}</button
              >
            {/each}
          </div>
        {:else}
          <p class="text-xs text-base-content/50">
            {$_("feedback.noCandidateTags")}
          </p>
        {/if}
      </div>

      <div>
        <label class="label pb-1" for="feedback-tag">
          <span class="label-text font-medium text-sm"
            >{$_("feedback.customTag")}</span
          >
          <span class="label-text-alt text-base-content/50"
            >{$_("feedback.optional")}</span
          >
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

      {#if error}
        <p class="text-error text-xs">{error}</p>
      {/if}
    </div>

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
