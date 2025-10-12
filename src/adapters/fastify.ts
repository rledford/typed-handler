import type { FastifyReply, FastifyRequest } from "fastify";
import type { Handler } from "../handler.js";
import { isResponseObject } from "../utils/response.js";

export function toFastify<TInput, TContext, TOutput>(handler: Handler<TInput, TContext, TOutput>) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const input = handler.expectsMultiInput()
			? {
					body: request.body,
					query: request.query,
					params: request.params,
					headers: request.headers,
				}
			: request.body;

		const result = await handler.execute(
			input as TInput,
			{
				request,
				reply,
			} as TContext,
		);

		if (isResponseObject(result)) {
			return reply.status(result.status).send(result.body);
		}
		return result;
	};
}
