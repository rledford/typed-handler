import Joi from "joi";
import { beforeEach, describe, expect, it } from "vitest";
import * as yup from "yup";
import { z } from "zod";
import { HandlerError, ValidationError } from "../../src/errors/index.js";
import { configure, handler, resetConfig } from "../../src/index.js";

describe("End-to-End Handler Execution", () => {
	beforeEach(() => {
		resetConfig();
	});

	it("Full handler execution with Zod validation (input and output)", async () => {
		const inputSchema = z.object({ value: z.number() });
		const outputSchema = z.object({ result: z.number() });

		configure({ validateOutput: true });

		const h = handler()
			.input(inputSchema)
			.handle(async (input) => ({ result: input.value * 2 }))
			.output(outputSchema);

		const result = await h.execute({ value: 21 }, {});
		expect(result).toEqual({ result: 42 });

		await expect(h.execute({ value: "not a number" }, {})).rejects.toThrow();

		const invalidOutputHandler = handler()
			.input(inputSchema)
			.handle(async (input) => ({ wrong: input.value * 2 }))
			.output(outputSchema);

		configure({ validateOutput: true });
		await expect(invalidOutputHandler.execute({ value: 21 }, {})).rejects.toThrow();
	});

	it("Full handler execution with Joi validation", async () => {
		const inputSchema = Joi.object({
			email: Joi.string().email().required(),
		});
		const outputSchema = Joi.object({
			valid: Joi.boolean().required(),
			email: Joi.string().required(),
		});

		configure({ validateOutput: true });

		const h = handler()
			.input(inputSchema)
			.handle(async (input) => ({ valid: true, email: input.email }))
			.output(outputSchema);

		const result = await h.execute({ email: "test@example.com" }, {});
		expect(result).toEqual({ valid: true, email: "test@example.com" });

		await expect(h.execute({ email: "invalid-email" }, {})).rejects.toThrow();
	});

	it("Full handler execution with Yup validation", async () => {
		const inputSchema = yup.object({
			age: yup.number().required().min(18),
		});
		const outputSchema = yup.object({
			allowed: yup.boolean().required(),
		});

		configure({ validateOutput: true });

		const h = handler()
			.input(inputSchema)
			.handle(async (input) => ({ allowed: input.age >= 18 }))
			.output(outputSchema);

		const result = await h.execute({ age: 25 }, {});
		expect(result).toEqual({ allowed: true });

		await expect(h.execute({ age: 16 }, {})).rejects.toThrow();
	});

	it("Multi-input handling with separate validation per part", async () => {
		const h = handler()
			.input({
				body: z.object({ name: z.string() }),
				query: z.object({ filter: z.string() }),
				params: z.object({ id: z.string() }),
			})
			.handle(async (input) => ({
				name: input.body.name,
				filter: input.query.filter,
				id: input.params.id,
			}));

		const result = await h.execute(
			{
				body: { name: "Alice" },
				query: { filter: "active" },
				params: { id: "123" },
			},
			{},
		);

		expect(result).toEqual({ name: "Alice", filter: "active", id: "123" });

		await expect(
			h.execute(
				{
					body: { name: 123 },
					query: { filter: "active" },
					params: { id: "123" },
				},
				{},
			),
		).rejects.toThrow();
	});

	it("Middleware chain execution and context accumulation", async () => {
		const h = handler()
			.input(z.object({ userId: z.string() }))
			.use(async (input) => ({
				user: { id: input.userId, name: "Alice" },
			}))
			.use(async (_input, ctx) => ({
				permissions: ["read", "write"],
				userFullName: ctx.user.name,
			}))
			.use(async (_input, ctx) => ({
				canWrite: ctx.permissions.includes("write"),
			}))
			.handle(async (input, ctx) => ({
				userId: input.userId,
				userName: ctx.user.name,
				userFullName: ctx.userFullName,
				canWrite: ctx.canWrite,
			}));

		const result = await h.execute({ userId: "123" }, {});

		expect(result).toEqual({
			userId: "123",
			userName: "Alice",
			userFullName: "Alice",
			canWrite: true,
		});
	});

	it("Error handling with ValidationError", async () => {
		const h = handler()
			.input(z.object({ email: z.string().email() }))
			.handle(async (input) => ({ email: input.email }));

		try {
			await h.execute({ email: "invalid-email" }, {});
			expect.fail("Should have thrown ValidationError");
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError);
			expect((error as ValidationError).message).toContain("Validation failed");
		}
	});

	it("Error handling with HandlerError", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async () => {
				throw new HandlerError("Custom error", 400, { reason: "test" });
			});

		try {
			await h.execute({ value: 42 }, {});
			expect.fail("Should have thrown HandlerError");
		} catch (error) {
			expect(error).toBeInstanceOf(HandlerError);
			expect((error as HandlerError).statusCode).toBe(400);
			expect((error as HandlerError).details).toEqual({ reason: "test" });
		}
	});

	it("Type-only mode (no validation)", async () => {
		configure({ validateInput: false });

		const h = handler()
			.input<{ name: string }>()
			.handle(async (input) => ({ message: `Hello ${input.name}` }));

		const result = await h.execute({ name: "Alice" }, {});
		expect(result).toEqual({ message: "Hello Alice" });

		const invalidResult = await h.execute({ name: 123 }, {});
		expect(invalidResult).toEqual({ message: "Hello 123" });
	});

	it("Mixed validator usage (Zod input, Joi output)", async () => {
		configure({ validateOutput: true });

		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async (input) => ({ result: input.value * 2 }))
			.output(Joi.object({ result: Joi.number().required() }));

		const result = await h.execute({ value: 21 }, {});
		expect(result).toEqual({ result: 42 });
	});

	it("ResponseObject handling in handler return", async () => {
		const h = handler()
			.input(z.object({ name: z.string() }))
			.handle(async (input) => ({
				status: 201,
				body: { created: true, name: input.name },
			}));

		const result = await h.execute({ name: "Alice" }, {});
		expect(result).toEqual({
			status: 201,
			body: { created: true, name: "Alice" },
		});
	});
});
