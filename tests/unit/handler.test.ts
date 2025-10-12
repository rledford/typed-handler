import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { configure, handler, resetConfig } from "../../src/index.js";

describe("Handler Factory", () => {
	beforeEach(() => {
		resetConfig();
	});

	it("handler() should create new Handler instance", () => {
		const h = handler();
		expect(h).toBeDefined();
		expect(typeof h.input).toBe("function");
		expect(typeof h.use).toBe("function");
		expect(typeof h.handle).toBe("function");
		expect(typeof h.output).toBe("function");
		expect(typeof h.execute).toBe("function");
	});

	it("handler() should merge per-handler config with global config", async () => {
		configure({ validateInput: false });
		const schema = z.object({ value: z.number() });
		const h = handler({ validateInput: true })
			.input(schema)
			.handle(async (input) => input);

		await expect(h.execute({ value: "invalid" })).rejects.toThrow();
	});
});

describe("Handler Builder Methods", () => {
	beforeEach(() => {
		resetConfig();
	});

	it("input() should store schema", () => {
		const schema = z.object({ name: z.string() });
		const h = handler().input(schema);
		expect(h).toBeDefined();
	});

	it("input() should detect multi-input schemas", async () => {
		const schema = {
			body: z.object({ name: z.string() }),
			query: z.object({ page: z.string() }),
		};
		const h = handler()
			.input(schema)
			.handle(async (input) => input);

		expect(h.expectsMultiInput()).toBe(true);

		const result = await h.execute({
			body: { name: "test" },
			query: { page: "1" },
		});
		expect(result).toEqual({
			body: { name: "test" },
			query: { page: "1" },
		});
	});

	it("input() with no schema should enable type-only mode", async () => {
		const h = handler<{ req: unknown }>()
			.input<{ id: string }>()
			.handle(async (input) => input);

		const result = await h.execute({ id: "123" });
		expect(result).toEqual({ id: "123" });
	});

	it("use() should append middleware to chain", async () => {
		const order: number[] = [];
		const h = handler()
			.input(z.object({ value: z.number() }))
			.use(async () => {
				order.push(1);
				return { first: true };
			})
			.use(async () => {
				order.push(2);
				return { second: true };
			})
			.handle(async (input, ctx) => ({ input, ctx }));

		const result = await h.execute({ value: 42 });
		expect(order).toEqual([1, 2]);
		expect(result.ctx).toEqual({ first: true, second: true });
	});

	it("use() should not mutate original handler (immutability)", () => {
		const h1 = handler();
		const h2 = h1.use(async () => ({ test: true }));
		expect(h1).not.toBe(h2);
	});

	it("handle() should store handler function", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async (input) => ({ result: input.value * 2 }));

		const result = await h.execute({ value: 21 });
		expect(result).toEqual({ result: 42 });
	});

	it("output() should store output schema", async () => {
		configure({ validateOutput: true });
		const inputSchema = z.object({ value: z.number() });
		const outputSchema = z.object({ result: z.number() });

		const h = handler()
			.input(inputSchema)
			.handle(async (input) => ({ result: input.value * 2 }))
			.output(outputSchema);

		const result = await h.execute({ value: 21 });
		expect(result).toEqual({ result: 42 });
	});
});

describe("Handler Execution", () => {
	beforeEach(() => {
		resetConfig();
	});

	it("execute() should validate input when enabled", async () => {
		const schema = z.object({ name: z.string() });
		const h = handler()
			.input(schema)
			.handle(async (input) => input);

		await expect(h.execute({ name: 123 })).rejects.toThrow();
	});

	it("execute() should skip input validation when disabled", async () => {
		configure({ validateInput: false });
		const schema = z.object({ name: z.string() });
		const h = handler()
			.input(schema)
			.handle(async (input) => input);

		const result = await h.execute({ name: 123 });
		expect(result).toEqual({ name: 123 });
	});

	it("execute() should run middleware chain in order", async () => {
		const order: string[] = [];
		const h = handler()
			.input(z.object({ value: z.number() }))
			.use(async () => {
				order.push("first");
				return {};
			})
			.use(async () => {
				order.push("second");
				return {};
			})
			.use(async () => {
				order.push("third");
				return {};
			})
			.handle(async () => order);

		await h.execute({ value: 1 });
		expect(order).toEqual(["first", "second", "third"]);
	});

	it("execute() should build context from middleware results", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.use(async () => ({ user: "alice" }))
			.use(async () => ({ role: "admin" }))
			.handle(async (input, ctx) => ctx);

		const result = await h.execute({ value: 1 });
		expect(result).toEqual({ user: "alice", role: "admin" });
	});

	it("execute() should execute handler function with input and context", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.use(async () => ({ multiplier: 3 }))
			.handle(async (input, ctx) => ({
				original: input.value,
				multiplied: input.value * ctx.multiplier,
			}));

		const result = await h.execute({ value: 7 });
		expect(result).toEqual({ original: 7, multiplied: 21 });
	});

	it("execute() should validate output when enabled", async () => {
		configure({ validateOutput: true });
		const outputSchema = z.object({ result: z.number() });

		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async () => ({ result: "invalid" }))
			.output(outputSchema);

		await expect(h.execute({ value: 1 })).rejects.toThrow();
	});

	it("execute() should skip output validation when disabled", async () => {
		configure({ validateOutput: false });
		const outputSchema = z.object({ result: z.number() });

		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async () => ({ result: "invalid" }))
			.output(outputSchema);

		const result = await h.execute({ value: 1 });
		expect(result).toEqual({ result: "invalid" });
	});

	it("execute() should throw if handler function not defined", async () => {
		const h = handler().input(z.object({ value: z.number() }));

		await expect(h.execute({ value: 1 })).rejects.toThrow("Handler function not defined");
	});

	it("expectsMultiInput() should return true for multi-input schemas", () => {
		const h = handler().input({
			body: z.object({ name: z.string() }),
			query: z.object({ page: z.string() }),
		});

		expect(h.expectsMultiInput()).toBe(true);
	});

	it("expectsMultiInput() should return false for single input", () => {
		const h = handler().input(z.object({ name: z.string() }));
		expect(h.expectsMultiInput()).toBe(false);
	});

	it("execute() should handle unknown validator schema gracefully", async () => {
		const unknownSchema = { customValidator: true };
		const h = handler()
			.input(unknownSchema)
			.handle(async (input) => input);

		const result = await h.execute({ value: 123 });
		expect(result).toEqual({ value: 123 });
	});

	it("execute() should handle output validation with unknown schema gracefully", async () => {
		configure({ validateOutput: true });
		const unknownSchema = { customValidator: true };
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async (input) => ({ result: input.value }))
			.output(unknownSchema);

		const result = await h.execute({ value: 123 });
		expect(result).toEqual({ result: 123 });
	});

	it("input() with no schema should allow type-only validation", async () => {
		const h = handler()
			.input<{ id: number }>()
			.handle(async (input) => input);

		const result = await h.execute({ id: 42 });
		expect(result).toEqual({ id: 42 });
	});

	it("output() with no schema should allow type-only output", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async (input) => ({ result: input.value }))
			.output<{ result: number }>();

		const result = await h.execute({ value: 42 });
		expect(result).toEqual({ result: 42 });
	});
});
