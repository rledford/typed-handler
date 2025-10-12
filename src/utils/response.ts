/**
 * Response object utilities
 */

export interface ResponseObject<T = unknown> {
	status: number;
	body: T;
	headers?: Record<string, string>;
}

export function isResponseObject(obj: unknown): obj is ResponseObject {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"status" in obj &&
		"body" in obj &&
		typeof (obj as ResponseObject).status === "number"
	);
}
