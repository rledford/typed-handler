import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/adapters/index.ts"],
	format: ["cjs", "esm"],
	dts: true,
	splitting: false,
	sourcemap: true,
	clean: true,
	treeshake: true,
	minify: false, // Keep readable for library debugging
	outDir: "dist",
	target: "es2022",
	tsconfig: "./tsconfig.json",
});
