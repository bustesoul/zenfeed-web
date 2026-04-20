import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { COOKIE_NAME, validToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	if (path.startsWith('/login') || path.startsWith('/logout')) {
		return resolve(event);
	}

	const session = event.cookies.get(COOKIE_NAME);
	if (session !== validToken) {
		const redirectTo = path !== '/' ? `?redirectTo=${encodeURIComponent(path)}` : '';
		throw redirect(302, `/login${redirectTo}`);
	}

	return resolve(event);
};
