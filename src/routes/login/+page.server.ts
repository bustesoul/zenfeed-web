import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AUTH_USERNAME, AUTH_PASSWORD, COOKIE_NAME, COOKIE_MAX_AGE, validToken } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	if (AUTH_USERNAME && AUTH_PASSWORD && cookies.get(COOKIE_NAME) === validToken) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';

		if (
			!AUTH_USERNAME ||
			!AUTH_PASSWORD ||
			username !== AUTH_USERNAME ||
			password !== AUTH_PASSWORD
		) {
			return fail(401, { error: true, username });
		}

		cookies.set(COOKIE_NAME, validToken, {
			path: '/',
			maxAge: COOKIE_MAX_AGE,
			httpOnly: true,
			sameSite: 'lax'
		});

		const redirectTo = url.searchParams.get('redirectTo') || '/';
		throw redirect(302, redirectTo);
	}
};
