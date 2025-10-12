import Joi from "joi";
import { expectAssignable, expectType } from "tsd";
import * as yup from "yup";
import { z } from "zod";
import { handler } from "../../src/index.js";

const zodInputSchema = z.object({ name: z.string(), age: z.number() });
const zodOutputSchema = z.object({ message: z.string() });

const joiInputSchema = Joi.object({
	email: Joi.string().email().required(),
});

const yupInputSchema = yup.object({
	username: yup.string().required(),
});

const h1 = handler()
	.input(zodInputSchema)
	.handle((input) => {
		expectType<{ name: string; age: number }>(input);
		return { message: `Hello ${input.name}` };
	});

const h2 = handler()
	.input(joiInputSchema)
	.handle((input) => {
		expectType<{ email: string }>(input);
		return { valid: true };
	});

const h3 = handler()
	.input(yupInputSchema)
	.handle((input) => {
		expectType<{ username: string }>(input);
		return { user: input.username };
	});

const h4 = handler()
	.input(zodInputSchema)
	.handle((input) => ({ message: `Hello ${input.name}` }))
	.output(zodOutputSchema);

expectType<Promise<{ message: string }>>(h4.execute({ name: "Alice", age: 30 }, {}));

const h5 = handler()
	.input({
		body: z.object({ name: z.string() }),
		query: z.object({ filter: z.string() }),
		params: z.object({ id: z.string() }),
	})
	.handle((input) => {
		expectType<{
			body: { name: string };
			query: { filter: string };
			params: { id: string };
		}>(input);
		return { result: "ok" };
	});

const h6 = handler()
	.input(zodInputSchema)
	.use(async () => ({ user: { id: "123", role: "admin" } }))
	.handle((input, ctx) => {
		expectType<{ name: string; age: number }>(input);
		expectType<{ user: { id: string; role: string } }>(ctx);
		return { message: "ok" };
	});

const h7 = handler()
	.input(zodInputSchema)
	.use(async () => ({ user: { id: "123" } }))
	.use(async () => ({ permissions: ["read", "write"] }))
	.handle((input, ctx) => {
		expectType<{ name: string; age: number }>(input);
		expectType<{
			user: { id: string };
			permissions: string[];
		}>(ctx);
		return { message: "ok" };
	});

const h8 = handler()
	.input<{ id: string }>()
	.handle((input) => {
		expectType<{ id: string }>(input);
		return { found: true };
	});

const h9 = handler()
	.input(zodInputSchema)
	.handle((input) => {
		expectType<{ name: string; age: number }>(input);
		return { message: `Hello ${input.name}` };
	})
	.output(zodOutputSchema);

expectType<Promise<{ message: string }>>(h9.execute({ name: "Bob", age: 25 }, {}));
