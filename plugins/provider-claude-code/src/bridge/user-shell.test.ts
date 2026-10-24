import { describe, expect, it } from "vitest";
import { runUserShell, shellResultContext } from "./user-shell.js";
import { tmpdir } from "node:os";

describe.skipIf(process.platform === "win32")("user shell execution", () => {
  it("streams stdout and stderr and records nonzero exit without asking a model", async () => {
    const chunks: string[] = [];
    const result = await runUserShell({
      command: "printf 'shell-output'; printf 'shell-error' >&2; exit 7",
      cwd: tmpdir(),
      env: process.env,
      signal: new AbortController().signal,
      onOutput: (text) => chunks.push(text),
    });
    expect(result.exitCode).toBe(7);
    expect(result.output).toContain("shell-output");
    expect(result.output).toContain("shell-error");
    expect(chunks.join("")).toBe(result.output);
    expect(shellResultContext("test", tmpdir(), result)).toContain(
      '"exitCode":7',
    );
  });
  it("stops an active command and its process group", async () => {
    const controller = new AbortController();
    const result = await runUserShell({
      command: "printf ready; sleep 30",
      cwd: tmpdir(),
      env: process.env,
      signal: controller.signal,
      onOutput: () => controller.abort(),
    });
    expect(result.cancelled).toBe(true);
    expect(result.output).toContain("ready");
  });
  it("bounds captured output and reports truncation", async () => {
    const result = await runUserShell({
      command: "head -c 300000 /dev/zero",
      cwd: tmpdir(),
      env: process.env,
      signal: new AbortController().signal,
      onOutput: () => {},
    });
    expect(result.output.length).toBeLessThan(263000);
    expect(result.output).toContain("truncated");
  });
});
