import { env } from '$env/dynamic/private';
import { createHash, randomBytes } from 'crypto';

export const COOKIE_NAME = 'zenfeed_session';
export const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function deriveToken(): string {
	const username = env.AUTH_USERNAME || '';
	const password = env.AUTH_PASSWORD || '';
	if (!username || !password) {
		return randomBytes(32).toString('hex');
	}
	return createHash('sha256').update(`${username}:${password}`).digest('hex');
}

export const AUTH_USERNAME = env.AUTH_USERNAME || '';
export const AUTH_PASSWORD = env.AUTH_PASSWORD || '';
export const validToken = deriveToken();
