<script lang="ts">
    import { enhance } from '$app/forms';
    import { _ } from 'svelte-i18n';
    import type { ActionData } from './$types';

    let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="card w-full max-w-sm shadow-xl bg-base-100">
        <div class="card-body">
            <h2 class="card-title text-2xl font-bold justify-center mb-4">
                {$_('login.title')}
            </h2>

            {#if form?.error}
                <div role="alert" class="alert alert-error mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{$_('login.error')}</span>
                </div>
            {/if}

            <form method="POST" use:enhance>
                <div class="form-control mb-4">
                    <label class="label" for="username">
                        <span class="label-text">{$_('login.username')}</span>
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        class="input input-bordered w-full"
                        value={form?.username ?? ''}
                        autocomplete="username"
                        required
                    />
                </div>

                <div class="form-control mb-6">
                    <label class="label" for="password">
                        <span class="label-text">{$_('login.password')}</span>
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        class="input input-bordered w-full"
                        autocomplete="current-password"
                        required
                    />
                </div>

                <div class="card-actions">
                    <button type="submit" class="btn btn-primary w-full">
                        {$_('login.submit')}
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
