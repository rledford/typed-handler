import type { ValidatorAdapter } from '../types.js';
import { getAdapters } from './registry.js';
import { builtInAdapters } from './adapters.js';

export function detectValidator(schema: unknown): ValidatorAdapter<any> | null {
	const registeredAdapters = getAdapters();

	for (const adapter of registeredAdapters) {
		if (adapter.detect && adapter.detect(schema)) {
			return adapter;
		}
	}

	for (const adapter of builtInAdapters) {
		if (adapter.detect && adapter.detect(schema)) {
			return adapter;
		}
	}

	return null;
}
