import type { ValidatorAdapter } from "../types.js";

export const zodAdapter: ValidatorAdapter<any> = {
	name: "zod",
	detect: (schema: unknown): boolean => {
		if (!schema || typeof schema !== "object") return false;
		return "_def" in schema && "parse" in schema;
	},
	parse: async (schema: any, data: unknown) => {
		return await schema.parseAsync(data);
	},
};

export const joiAdapter: ValidatorAdapter<any> = {
	name: "joi",
	detect: (schema: unknown): boolean => {
		if (!schema || typeof schema !== "object") return false;
		if (!("$_root" in schema && "type" in schema)) return false;
		if (!("validateAsync" in schema)) return false;
		return typeof schema.validateAsync === "function";
	},
	parse: async (schema: any, data: unknown) => {
		return await schema.validateAsync(data);
	},
};

export const yupAdapter: ValidatorAdapter<any> = {
	name: "yup",
	detect: (schema: unknown): boolean => {
		if (!schema || typeof schema !== "object") return false;
		return "__isYupSchema__" in schema;
	},
	parse: async (schema: any, data: unknown) => {
		return await schema.validate(data, { abortEarly: false });
	},
};

export const builtInAdapters: ValidatorAdapter<any>[] = [zodAdapter, joiAdapter, yupAdapter];
