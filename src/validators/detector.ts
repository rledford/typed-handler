import type { ValidatorAdapter } from "../types.js";
import { builtInAdapters } from "./adapters.js";
import { getAdapters } from "./registry.js";

// biome-ignore lint/suspicious/noExplicitAny: Return type must accept any validator adapter
export function detectValidator(schema: unknown): ValidatorAdapter<any> | null {
	const registeredAdapters = getAdapters();

	for (const adapter of registeredAdapters) {
		if (adapter.detect?.(schema)) {
			return adapter;
		}
	}

	for (const adapter of builtInAdapters) {
		if (adapter.detect?.(schema)) {
			return adapter;
		}
	}

	return null;
}
