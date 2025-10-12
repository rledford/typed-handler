import type { Context } from "hono";
import type { Handler } from "../handler.js";
import { isResponseObject } from "../utils/response.js";

export function toHono<TInput, TContext, TOutput>(handler: Handler<TInput, TContext, TOutput>) {
	return async (c: Context) => {
		const input = handler.expectsMultiInput()
			? {
					body: await c.req.json(),
					query: c.req.query(),
					params: c.req.param(),
					headers: Object.fromEntries(c.req.raw.headers),
				}
			: await c.req.json();

		const result = await handler.execute(input as TInput, { c } as TContext);

		if (isResponseObject(result)) {
			return c.json(result.body, result.status as Parameters<typeof c.json>[1]);
		}
		return c.json(result);
	};
}
