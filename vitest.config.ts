import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/tests/**",
				"**/examples/**",
				"**/*.config.*",
				"**/.changeset/**",
				"**/*.test-d.ts",
			],
			thresholds: {
				lines: 90,
				functions: 90,
				branches: 90,
				statements: 90,
			},
		},
		include: ["tests/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/examples/**"],
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
