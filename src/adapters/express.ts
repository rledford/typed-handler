import type { NextFunction, Request, Response } from "express";
import type { Handler } from "../handler.js";
import { isResponseObject } from "../utils/response.js";

export function toExpress<TInput, TContext, TOutput>(handler: Handler<TInput, TContext, TOutput>) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const input = handler.expectsMultiInput()
				? {
						body: req.body,
						query: req.query,
						params: req.params,
						headers: req.headers,
					}
				: req.body;

			const result = await handler.execute(
				input as TInput,
				{
					req,
					res,
				} as TContext,
			);

			if (isResponseObject(result)) {
				if (result.headers) {
					Object.entries(result.headers).forEach(([key, value]) => res.set(key, value));
				}
				res.status(result.status).json(result.body);
			} else {
				res.json(result);
			}
		} catch (error) {
			next(error);
		}
	};
}
