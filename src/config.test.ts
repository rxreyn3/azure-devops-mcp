import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { validateConfig } from "./config.js";

describe("Config validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it("should validate a complete configuration", () => {
    process.env.ADO_ORGANIZATION = "https://dev.azure.com/testorg";
    process.env.ADO_PROJECT = "TestProject";
    process.env.ADO_PAT = "test-pat-token";

    const config = validateConfig();
    
    expect(config.organization).toBe("https://dev.azure.com/testorg");
    expect(config.project).toBe("TestProject");
    expect(config.pat).toBe("test-pat-token");
    expect(config.logLevel).toBe("info");
  });

  it("should throw error when ADO_ORGANIZATION is missing", () => {
    delete process.env.ADO_ORGANIZATION;
    process.env.ADO_PROJECT = "TestProject";
    process.env.ADO_PAT = "test-pat-token";

    expect(() => validateConfig()).toThrow("ADO_ORGANIZATION is required");
  });

  it("should throw error when ADO_PROJECT is missing", () => {
    process.env.ADO_ORGANIZATION = "https://dev.azure.com/testorg";
    delete process.env.ADO_PROJECT;
    process.env.ADO_PAT = "test-pat-token";

    expect(() => validateConfig()).toThrow("ADO_PROJECT is required");
  });

  it("should throw error when ADO_PAT is missing", () => {
    process.env.ADO_ORGANIZATION = "https://dev.azure.com/testorg";
    process.env.ADO_PROJECT = "TestProject";
    delete process.env.ADO_PAT;

    expect(() => validateConfig()).toThrow("ADO_PAT is required");
  });

  it("should clean up organization URL format", () => {
    process.env.ADO_ORGANIZATION = "testorg/";
    process.env.ADO_PROJECT = "TestProject";
    process.env.ADO_PAT = "test-pat-token";

    const config = validateConfig();
    
    expect(config.organization).toBe("https://dev.azure.com/testorg");
  });

  it("should handle organization URL with trailing slash", () => {
    process.env.ADO_ORGANIZATION = "https://dev.azure.com/testorg/";
    process.env.ADO_PROJECT = "TestProject";
    process.env.ADO_PAT = "test-pat-token";

    const config = validateConfig();
    
    expect(config.organization).toBe("https://dev.azure.com/testorg");
  });

  it("should use custom log level when provided", () => {
    process.env.ADO_ORGANIZATION = "https://dev.azure.com/testorg";
    process.env.ADO_PROJECT = "TestProject";
    process.env.ADO_PAT = "test-pat-token";
    process.env.LOG_LEVEL = "debug";

    const config = validateConfig();
    
    expect(config.logLevel).toBe("debug");
  });
});