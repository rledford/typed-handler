import { describe, expect, it } from "vitest";
import { toExpress } from "../../src/adapters/express.js";
import { toFastify } from "../../src/adapters/fastify.js";
import { toHono } from "../../src/adapters/hono.js";
import { toRaw } from "../../src/adapters/raw.js";
import { handler } from "../../src/handler.js";

describe("Framework Adapters", () => {
	describe("Express Adapter", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			expect(() => toExpress(h)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with typed handler', () => {
			const h = handler<{ user: string }>();
			expect(() => toExpress(h)).toThrow("Not implemented");
		});
	});

	describe("Fastify Adapter", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			expect(() => toFastify(h)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with typed handler', () => {
			const h = handler<{ user: string }>();
			expect(() => toFastify(h)).toThrow("Not implemented");
		});
	});

	describe("Hono Adapter", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			expect(() => toHono(h)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with typed handler', () => {
			const h = handler<{ user: string }>();
			expect(() => toHono(h)).toThrow("Not implemented");
		});
	});

	describe("Raw Adapter", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			expect(() => toRaw(h)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with typed handler', () => {
			const h = handler<{ user: string }>();
			expect(() => toRaw(h)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" when creating raw handler', () => {
			const h = handler();
			expect(() => {
				const raw = toRaw(h);
				return raw;
			}).toThrow("Not implemented");
		});
	});

	describe("Adapter type compatibility", () => {
		it("should accept handler with various type parameters", () => {
			const h1 = handler<{ userId: number }>();
			const h2 = handler<object>();
			const h3 = handler();

			expect(() => toExpress(h1)).toThrow("Not implemented");
			expect(() => toExpress(h2)).toThrow("Not implemented");
			expect(() => toExpress(h3)).toThrow("Not implemented");
		});

		it("should work with all adapters on same handler", () => {
			const h = handler();

			expect(() => toExpress(h)).toThrow("Not implemented");
			expect(() => toFastify(h)).toThrow("Not implemented");
			expect(() => toHono(h)).toThrow("Not implemented");
			expect(() => toRaw(h)).toThrow("Not implemented");
		});
	});
});
