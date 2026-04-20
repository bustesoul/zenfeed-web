import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { COOKIE_NAME, COOKIE_MAX_AGE } from '$lib/server/auth';
import { env } from '$env/dynamic/public';

const backendUrl = env.PUBLIC_DEFAULT_API_URL || 'http://localhost:1300';

export const load: PageServerLoad = async ({ cookies }) => {
	if (cookies.get(COOKIE_NAME)) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';

		const res = await fetch(`${backendUrl}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});

		if (!res.ok) {
			return fail(401, { error: true, username });
		}

		const setCookieHeader = res.headers.get('set-cookie');
		if (setCookieHeader) {
			const match = setCookieHeader.match(/zenfeed_session=([^;]+)/);
			if (match) {
				cookies.set(COOKIE_NAME, match[1], {
					path: '/',
					maxAge: COOKIE_MAX_AGE,
					httpOnly: true,
					sameSite: 'lax'
				});
			}
		}

		const redirectTo = url.searchParams.get('redirectTo') || '/';
		throw redirect(302, redirectTo);
	}
};
