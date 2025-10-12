import type { ValidatorAdapter } from "../types.js";

// biome-ignore lint/suspicious/noExplicitAny: Zod types are dynamic and inferred at runtime
export const zodAdapter: ValidatorAdapter<any> = {
	name: "zod",
	detect: (schema: unknown): boolean => {
		if (!schema || typeof schema !== "object") return false;
		return "_def" in schema && "parse" in schema;
	},
	// biome-ignore lint/suspicious/noExplicitAny: Schema type is determined at runtime
	parse: async (schema: any, data: unknown) => {
		return await schema.parseAsync(data);
	},
};

// biome-ignore lint/suspicious/noExplicitAny: Joi types are dynamic and inferred at runtime
export const joiAdapter: ValidatorAdapter<any> = {
	name: "joi",
	detect: (schema: unknown): boolean => {
		if (!schema || typeof schema !== "object") return false;
		if (!("$_root" in schema && "type" in schema)) return false;
		if (!("validateAsync" in schema)) return false;
		return typeof schema.validateAsync === "function";
	},
	// biome-ignore lint/suspicious/noExplicitAny: Schema type is determined at runtime
	parse: async (schema: any, data: unknown) => {
		return await schema.validateAsync(data);
	},
};

// biome-ignore lint/suspicious/noExplicitAny: Yup types are dynamic and inferred at runtime
export const yupAdapter: ValidatorAdapter<any> = {
	name: "yup",
	detect: (schema: unknown): boolean => {
		if (!schema || typeof schema !== "object") return false;
		return "__isYupSchema__" in schema;
	},
	// biome-ignore lint/suspicious/noExplicitAny: Schema type is determined at runtime
	parse: async (schema: any, data: unknown) => {
		return await schema.validate(data, { abortEarly: false });
	},
};

// biome-ignore lint/suspicious/noExplicitAny: Adapter types are dynamic and inferred at runtime
export const builtInAdapters: ValidatorAdapter<any>[] = [zodAdapter, joiAdapter, yupAdapter];
