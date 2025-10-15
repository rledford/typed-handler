import type { FastifyReply, FastifyRequest } from "fastify";
import Joi from "joi";
import { describe, expect, it, vi } from "vitest";
import { toFastify } from "../../src/adapters/fastify.js";
import { handler } from "../../src/index.js";

describe("Fastify Adapter", () => {
	it("toFastify should extract body for single input", async () => {
		const schema = Joi.object({ name: Joi.string().required() });
		const h = handler()
			.input(schema)
			.handle(async (input) => ({ message: `Hello ${input.name}` }));

		const fastifyHandler = toFastify(h);

		const request = { body: { name: "Alice" } } as FastifyRequest;
		const reply = {} as FastifyReply;

		const result = await fastifyHandler(request, reply);

		expect(result).toEqual({ message: "Hello Alice" });
	});

	it("toFastify should extract body/query/params/headers for multi-input", async () => {
		const h = handler()
			.input({
				body: Joi.object({ name: Joi.string().required() }),
				query: Joi.object({ filter: Joi.string() }),
				params: Joi.object({ id: Joi.string() }),
			})
			.handle(async (input) => ({
				body: input.body,
				query: input.query,
				params: input.params,
			}));

		const fastifyHandler = toFastify(h);

		const request = {
			body: { name: "Alice" },
			query: { filter: "active" },
			params: { id: "123" },
			headers: { "content-type": "application/json" },
		} as unknown as FastifyRequest;
		const reply = {} as FastifyReply;

		const result = await fastifyHandler(request, reply);

		expect(result).toEqual({
			body: { name: "Alice" },
			query: { filter: "active" },
			params: { id: "123" },
		});
	});

	it("toFastify should pass request and reply in context", async () => {
		const h = handler()
			.input(Joi.object({ name: Joi.string().required() }))
			.use(async (_input, ctx) => {
				expect(ctx.request).toBeDefined();
				expect(ctx.reply).toBeDefined();
				return { validated: true };
			})
			.handle(async (input, ctx) => {
				expect(ctx.request).toBeDefined();
				expect(ctx.reply).toBeDefined();
				expect(ctx.validated).toBe(true);
				return { success: true };
			});

		const fastifyHandler = toFastify(h);

		const request = { body: { name: "Alice" } } as FastifyRequest;
		const reply = {} as FastifyReply;

		const result = await fastifyHandler(request, reply);

		expect(result).toEqual({ success: true });
	});

	it("toFastify should return result directly", async () => {
		const h = handler()
			.input(Joi.object({ value: Joi.number().required() }))
			.handle(async (input) => ({ doubled: input.value * 2 }));

		const fastifyHandler = toFastify(h);

		const request = { body: { value: 21 } } as FastifyRequest;
		const reply = {} as FastifyReply;

		const result = await fastifyHandler(request, reply);

		expect(result).toEqual({ doubled: 42 });
	});

	it("toFastify should handle ResponseObject with reply.status().send()", async () => {
		const h = handler()
			.input(Joi.object({ name: Joi.string().required() }))
			.handle(async (input) => ({
				status: 201,
				body: { created: true, name: input.name },
			}));

		const fastifyHandler = toFastify(h);

		const request = { body: { name: "Bob" } } as FastifyRequest;
		const reply = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		} as unknown as FastifyReply;

		await fastifyHandler(request, reply);

		expect(reply.status).toHaveBeenCalledWith(201);
		expect(reply.send).toHaveBeenCalledWith({ created: true, name: "Bob" });
	});

	it("toFastify should apply custom headers from ResponseObject", async () => {
		const h = handler()
			.input(Joi.object({ name: Joi.string().required() }))
			.handle(async (input) => ({
				status: 200,
				body: { message: `Hello ${input.name}` },
				headers: {
					"X-Custom-Header": "custom-value",
					"X-Request-Id": "123-456-789",
				},
			}));

		const fastifyHandler = toFastify(h);

		const request = { body: { name: "Alice" } } as FastifyRequest;
		const reply = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			header: vi.fn(),
		} as unknown as FastifyReply;

		await fastifyHandler(request, reply);

		expect(reply.header).toHaveBeenCalledWith("X-Custom-Header", "custom-value");
		expect(reply.header).toHaveBeenCalledWith("X-Request-Id", "123-456-789");
		expect(reply.status).toHaveBeenCalledWith(200);
		expect(reply.send).toHaveBeenCalledWith({ message: "Hello Alice" });
	});

	it("toFastify should handle ResponseObject without headers", async () => {
		const h = handler()
			.input(Joi.object({ name: Joi.string().required() }))
			.handle(async (input) => ({
				status: 200,
				body: { message: `Hello ${input.name}` },
			}));

		const fastifyHandler = toFastify(h);

		const request = { body: { name: "Bob" } } as FastifyRequest;
		const reply = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			header: vi.fn(),
		} as unknown as FastifyReply;

		await fastifyHandler(request, reply);

		expect(reply.header).not.toHaveBeenCalled();
		expect(reply.status).toHaveBeenCalledWith(200);
		expect(reply.send).toHaveBeenCalledWith({ message: "Hello Bob" });
	});

	it("toFastify should throw errors for framework error handling", async () => {
		const h = handler()
			.input(Joi.object({ value: Joi.number().required() }))
			.handle(async () => {
				throw new Error("Something went wrong");
			});

		const fastifyHandler = toFastify(h);

		const request = { body: { value: 42 } } as FastifyRequest;
		const reply = {} as FastifyReply;

		await expect(fastifyHandler(request, reply)).rejects.toThrow("Something went wrong");
	});

	it("toFastify should work with Joi validation", async () => {
		const h = handler()
			.input(Joi.object({ email: Joi.string().email().required() }))
			.handle(async (input) => ({ valid: true, email: input.email }));

		const fastifyHandler = toFastify(h);

		const request = { body: { email: "invalid-email" } } as FastifyRequest;
		const reply = {} as FastifyReply;

		await expect(fastifyHandler(request, reply)).rejects.toThrow();
	});

	it("toFastify should work with transform stage", async () => {
		const h = handler()
			.input(Joi.object({ value: Joi.number().required() }))
			.handle(async (input) => ({ result: input.value * 2 }))
			.transform((output) => ({ final: output.result + 10 }));

		const fastifyHandler = toFastify(h);

		const request = { body: { value: 5 } } as FastifyRequest;
		const reply = {} as FastifyReply;

		const result = await fastifyHandler(request, reply);

		expect(result).toEqual({ final: 20 });
	});

	it("toFastify should work with transform and context", async () => {
		const h = handler()
			.input(Joi.object({ value: Joi.number().required() }))
			.use(async () => ({ multiplier: 3 }))
			.handle(async (input, ctx) => ({ result: input.value * ctx.multiplier }))
			.transform((output, ctx) => ({
				result: output.result,
				multiplier: ctx.multiplier,
			}));

		const fastifyHandler = toFastify(h);

		const request = { body: { value: 5 } } as FastifyRequest;
		const reply = {} as FastifyReply;

		const result = await fastifyHandler(request, reply);

		expect(result).toEqual({ result: 15, multiplier: 3 });
	});
});
