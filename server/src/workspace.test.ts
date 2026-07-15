import { describe, it, expect } from "vitest";
import { safeResolve, assertNotHidden, assertAllowedExtension, hashContent } from "./workspace.js";
import path from "path";

// Point WORKSPACE_DIR at something predictable for tests
process.env.WORKSPACE_DIR = path.resolve("test-workspace");

describe("safeResolve", () => {
  it("allows normal relative paths", () => {
    const result = safeResolve("notes/todo.md");
    expect(result).toContain("notes");
    expect(result).toContain("todo.md");
  });

  it("throws on path traversal", () => {
    expect(() => safeResolve("../../etc/passwd")).toThrow("PATH_TRAVERSAL");
  });

  it("throws on absolute path", () => {
    expect(() => safeResolve("/etc/passwd")).toThrow("PATH_TRAVERSAL");
  });

  it("rejects POSIX-absolute path with leading slash", () => {
    expect(() => safeResolve("/notes.md")).toThrow("PATH_TRAVERSAL");
  });
});

describe("assertNotHidden", () => {
  it("allows normal paths", () => {
    expect(() => assertNotHidden("notes/todo.md")).not.toThrow();
  });

  it("throws on dotfile", () => {
    expect(() => assertNotHidden(".env")).toThrow("HIDDEN_PATH");
  });

  it("throws on hidden dir segment", () => {
    expect(() => assertNotHidden(".git/config")).toThrow("HIDDEN_PATH");
  });
});

describe("assertAllowedExtension", () => {
  it("allows .md", () => {
    expect(() => assertAllowedExtension("file.md")).not.toThrow();
  });

  it("allows .markdown", () => {
    expect(() => assertAllowedExtension("file.markdown")).not.toThrow();
  });

  it("throws on .js", () => {
    expect(() => assertAllowedExtension("exploit.js")).toThrow("INVALID_EXTENSION");
  });

  it("throws on .sh", () => {
    expect(() => assertAllowedExtension("run.sh")).toThrow("INVALID_EXTENSION");
  });
});

describe("hashContent", () => {
  it("returns a string", () => {
    expect(typeof hashContent("hello")).toBe("string");
  });

  it("same content → same hash", () => {
    expect(hashContent("abc")).toBe(hashContent("abc"));
  });

  it("different content → different hash", () => {
    expect(hashContent("abc")).not.toBe(hashContent("xyz"));
  });
});
