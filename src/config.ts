/**
 * Global configuration management for typed-handler
 */

import type { HandlerConfig, Logger } from "./types.js";

// No-op logger (default)
const noopLogger: Logger = {
	error: () => {},
	warn: () => {},
	info: () => {},
	debug: () => {},
};

// Default configuration
const defaultConfig: HandlerConfig = {
	validateInput: true,
	validateOutput: process.env.NODE_ENV !== "production",
	logger: noopLogger,
};

// Global config state
let globalConfig: HandlerConfig = { ...defaultConfig };

/**
 * Configure global handler defaults
 */
export function configure(config: Partial<HandlerConfig>): void {
	globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current global configuration
 */
export function getConfig(): HandlerConfig {
	return { ...globalConfig };
}

/**
 * Reset configuration to defaults (useful for testing)
 */
export function resetConfig(): void {
	globalConfig = { ...defaultConfig };
}
