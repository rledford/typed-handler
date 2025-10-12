import { beforeEach, describe, expect, it } from "vitest";
import { configure, getConfig, resetConfig } from "../../src/config.js";

describe("Configuration System", () => {
	beforeEach(() => {
		resetConfig();
	});

	it("should return default configuration", () => {
		const config = getConfig();
		expect(config).toHaveProperty("validateInput");
		expect(config).toHaveProperty("validateOutput");
		expect(config).toHaveProperty("logger");
		expect(config.validateInput).toBe(true);
		expect(typeof config.validateOutput).toBe("boolean");
	});

	it("should update global configuration with partial config", () => {
		configure({ validateInput: false });
		const config = getConfig();
		expect(config.validateInput).toBe(false);
	});

	it("should merge configuration values", () => {
		configure({ validateInput: false });
		configure({ validateOutput: true });
		const config = getConfig();
		expect(config.validateInput).toBe(false);
		expect(config.validateOutput).toBe(true);
	});

	it("should update logger in configuration", () => {
		const customLogger = {
			error: () => {},
			warn: () => {},
			info: () => {},
			debug: () => {},
		};
		configure({ logger: customLogger });
		const config = getConfig();
		expect(config.logger).toBe(customLogger);
	});

	it("should reset configuration to defaults", () => {
		configure({ validateInput: false, validateOutput: false });
		resetConfig();
		const config = getConfig();
		expect(config.validateInput).toBe(true);
	});

	it("should return a copy of configuration to prevent external mutation", () => {
		const config1 = getConfig();
		config1.validateInput = false;
		const config2 = getConfig();
		expect(config2.validateInput).toBe(true);
	});

	it("should handle multiple configure calls", () => {
		configure({ validateInput: false });
		configure({ validateOutput: false });
		configure({ validateInput: true });
		const config = getConfig();
		expect(config.validateInput).toBe(true);
		expect(config.validateOutput).toBe(false);
	});

	it("should call default logger methods without errors", () => {
		const config = getConfig();
		expect(() => {
			config.logger.error("test error");
			config.logger.warn("test warning");
			config.logger.info("test info");
			config.logger.debug("test debug");
		}).not.toThrow();
	});

	it("should call custom logger methods", () => {
		let errorCalled = false;
		let warnCalled = false;
		let infoCalled = false;
		let debugCalled = false;

		const customLogger = {
			error: () => {
				errorCalled = true;
			},
			warn: () => {
				warnCalled = true;
			},
			info: () => {
				infoCalled = true;
			},
			debug: () => {
				debugCalled = true;
			},
		};

		configure({ logger: customLogger });
		const config = getConfig();

		config.logger.error("error");
		config.logger.warn("warn");
		config.logger.info("info");
		config.logger.debug("debug");

		expect(errorCalled).toBe(true);
		expect(warnCalled).toBe(true);
		expect(infoCalled).toBe(true);
		expect(debugCalled).toBe(true);
	});
});
