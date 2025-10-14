import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toRaw } from "../../src/adapters/raw.js";
import { handler } from "../../src/index.js";

describe("Raw Adapter", () => {
	it("toRaw should return RawHandler interface", () => {
		const h = handler()
			.input(z.object({ name: z.string() }))
			.handle(async (input) => ({ message: `Hello ${input.name}` }));

		const rawHandler = toRaw(h);

		expect(rawHandler).toHaveProperty("execute");
		expect(typeof rawHandler.execute).toBe("function");
	});

	it("toRaw execute should call handler.execute with input and context", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.use(async () => ({ multiplier: 3 }))
			.handle(async (input, ctx) => ({
				result: input.value * ctx.multiplier,
			}));

		const rawHandler = toRaw(h);

		const result = await rawHandler.execute({ value: 7 }, {});

		expect(result).toEqual({ result: 21 });
	});

	it("toRaw should work with type-only mode (no validation)", async () => {
		const h = handler()
			.input<{ name: string }>()
			.handle(async (input) => ({ message: `Hello ${input.name}` }));

		const rawHandler = toRaw(h);

		const result = await rawHandler.execute({ name: "Alice" }, {});

		expect(result).toEqual({ message: "Hello Alice" });
	});

	it("toRaw should propagate errors from handler", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async () => {
				throw new Error("Handler error");
			});

		const rawHandler = toRaw(h);

		await expect(rawHandler.execute({ value: 42 }, {})).rejects.toThrow("Handler error");
	});

	it("toRaw should propagate validation errors", async () => {
		const h = handler()
			.input(z.object({ email: z.string().email() }))
			.handle(async (input) => ({ valid: true, email: input.email }));

		const rawHandler = toRaw(h);

		await expect(rawHandler.execute({ email: "invalid-email" }, {})).rejects.toThrow();
	});

	it("toRaw should work with multi-input", async () => {
		const h = handler()
			.input({
				body: z.object({ name: z.string() }),
				query: z.object({ filter: z.string() }),
			})
			.handle(async (input) => ({
				name: input.body.name,
				filter: input.query.filter,
			}));

		const rawHandler = toRaw(h);

		const result = await rawHandler.execute(
			{
				body: { name: "Alice" },
				query: { filter: "active" },
			},
			{},
		);

		expect(result).toEqual({ name: "Alice", filter: "active" });
	});

	it("toRaw should pass context to handler", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async (input, ctx) => ({
				value: input.value,
				userId: ctx.userId,
			}));

		const rawHandler = toRaw(h);

		const result = await rawHandler.execute({ value: 42 }, { userId: "123" });

		expect(result).toEqual({ value: 42, userId: "123" });
	});

	it("toRaw should work with transform stage", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async (input) => ({ result: input.value * 2 }))
			.transform((output) => ({ final: output.result + 10 }));

		const rawHandler = toRaw(h);

		const result = await rawHandler.execute({ value: 5 }, {});

		expect(result).toEqual({ final: 20 });
	});

	it("toRaw should work with transform and context", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.use(async () => ({ multiplier: 3 }))
			.handle(async (input, ctx) => ({ result: input.value * ctx.multiplier }))
			.transform((output, ctx) => ({
				result: output.result,
				multiplier: ctx.multiplier,
			}));

		const rawHandler = toRaw(h);

		const result = await rawHandler.execute({ value: 5 }, {});

		expect(result).toEqual({ result: 15, multiplier: 3 });
	});
});
