/**
 * Validator adapter registration system
 */

import type { ValidatorAdapter } from "../types.js";

// biome-ignore lint/suspicious/noExplicitAny: Registry needs flexibility
const registeredAdapters: ValidatorAdapter<any>[] = [];

/**
 * Register a custom validator adapter
 */
// biome-ignore lint/suspicious/noExplicitAny: Registry needs flexibility
export function registerAdapter(adapter: ValidatorAdapter<any>): void {
	registeredAdapters.push(adapter);
}

/**
 * Get all registered adapters
 */
// biome-ignore lint/suspicious/noExplicitAny: Registry needs flexibility
export function getAdapters(): ValidatorAdapter<any>[] {
	return [...registeredAdapters];
}

/**
 * Clear all registered adapters (useful for testing)
 */
export function clearAdapters(): void {
	registeredAdapters.length = 0;
}
