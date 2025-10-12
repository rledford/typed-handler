import { beforeEach, describe, expect, it } from "vitest";
import { configure, resetConfig } from "../../src/config.js";
import { Handler, handler } from "../../src/handler.js";

describe("Handler Class", () => {
	beforeEach(() => {
		resetConfig();
	});

	describe("handler factory", () => {
		it("should create a new Handler instance", () => {
			const h = handler();
			expect(h).toBeInstanceOf(Handler);
		});

		it("should create Handler with default config", () => {
			const h = handler();
			expect(h).toBeDefined();
		});

		it("should create Handler with custom config", () => {
			const customLogger = {
				error: () => {},
				warn: () => {},
				info: () => {},
				debug: () => {},
			};
			const h = handler({ logger: customLogger });
			expect(h).toBeInstanceOf(Handler);
		});

		it("should create Handler with partial config", () => {
			const h = handler({ validateInput: false });
			expect(h).toBeInstanceOf(Handler);
		});
	});

	describe("Handler constructor", () => {
		it("should create instance without config", () => {
			const h = new Handler();
			expect(h).toBeInstanceOf(Handler);
		});

		it("should create instance with config", () => {
			const h = new Handler({ validateOutput: true });
			expect(h).toBeInstanceOf(Handler);
		});

		it("should merge global config with instance config", () => {
			configure({ validateInput: false });
			const h = new Handler({ validateOutput: true });
			expect(h).toBeInstanceOf(Handler);
		});
	});

	describe("input method", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			expect(() => h.input({})).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with schema', () => {
			const h = handler();
			const schema = { type: "object" };
			expect(() => h.input(schema)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with adapter', () => {
			const h = handler();
			const adapter = {
				name: "test",
				detect: () => true,
				parse: async () => ({}),
			};
			expect(() => h.input({}, adapter)).toThrow("Not implemented");
		});
	});

	describe("use method", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			const middleware = async () => ({ test: true });
			expect(() => h.use(middleware)).toThrow("Not implemented");
		});
	});

	describe("handle method", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			const handlerFn = async () => ({ result: true });
			expect(() => h.handle(handlerFn)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with typed handler', () => {
			const h = handler();
			const handlerFn = async (input: unknown, ctx: object) => ({ result: true });
			expect(() => h.handle(handlerFn)).toThrow("Not implemented");
		});
	});

	describe("output method", () => {
		it('should throw "Not implemented" error', () => {
			const h = handler();
			expect(() => h.output({})).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with schema', () => {
			const h = handler();
			const schema = { type: "object" };
			expect(() => h.output(schema)).toThrow("Not implemented");
		});

		it('should throw "Not implemented" with adapter', () => {
			const h = handler();
			const adapter = {
				name: "test",
				detect: () => true,
				parse: async () => ({}),
			};
			expect(() => h.output({}, adapter)).toThrow("Not implemented");
		});
	});

	describe("execute method", () => {
		it('should throw "Not implemented" error', async () => {
			const h = handler();
			await expect(h.execute({})).rejects.toThrow("Not implemented");
		});

		it('should throw "Not implemented" with input', async () => {
			const h = handler();
			await expect(h.execute({ data: "test" })).rejects.toThrow("Not implemented");
		});

		it('should throw "Not implemented" with context', async () => {
			const h = handler();
			await expect(h.execute({}, { req: {} })).rejects.toThrow("Not implemented");
		});

		it('should throw "Not implemented" with input and context', async () => {
			const h = handler();
			await expect(h.execute({ data: "test" }, { req: {} })).rejects.toThrow("Not implemented");
		});
	});

	describe("multiple handler instances", () => {
		it("should create independent handler instances", () => {
			const h1 = handler();
			const h2 = handler();
			expect(h1).not.toBe(h2);
		});

		it("should create independent handlers with different configs", () => {
			const h1 = handler({ validateInput: false });
			const h2 = handler({ validateOutput: true });
			expect(h1).not.toBe(h2);
		});
	});
});
