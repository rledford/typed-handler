declare namespace NodeJS {
	interface ProcessEnv extends Record<string, string | undefined> {
		NODE_ENV?: string;
	}
}
