import { get } from "svelte/store";
import { apiUrl } from "$lib/stores/apiUrl";

/**
 * Determines the appropriate API URL to use for a fetch request.
 *
 * Always routes through the SvelteKit proxy so auth cookies and backend access
 * behave consistently across localhost, Docker, and deployed environments.
 *
 * @param endpointPath The specific API endpoint path (e.g., '/query_config'). MUST start with a slash '/'.
 * @returns The proxy URL to use for the fetch request.
 */
export function getTargetApiUrl(endpointPath: string): string {
    const actualBackendUrl = get(apiUrl); // Get the current configured backend URL
    const cleanEndpointPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

    return `/api${cleanEndpointPath}?backendUrl=${encodeURIComponent(actualBackendUrl)}`;
}
