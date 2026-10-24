import { describe, expect, it } from "vitest";
import { getUserShellCommand, promptInputSchema } from "../src/index.js";

describe("explicit user shell input", () => {
  it("does not treat ordinary exclamation text as executable", () => {
    expect(
      getUserShellCommand([
        { type: "text", text: "!printf unsafe", mentions: [] },
      ]),
    ).toBeNull();
  });
  it("preserves shell quoting through wire parsing and ignores agent-only context", () => {
    const input = promptInputSchema.array().parse([
      { type: "text", text: "!printf '%s' 'a && b'", execution: "shell" },
      { type: "text", text: "context", visibility: "agent-only" },
    ]);
    expect(getUserShellCommand(input)).toBe("printf '%s' 'a && b'");
  });
  it.each([
    [{ type: "text", text: "!", execution: "shell" }],
    [
      { type: "text", text: "!echo ok", execution: "shell" },
      { type: "text", text: "next message" },
    ],
    [
      { type: "text", text: "!echo ok", execution: "shell" },
      { type: "localFile", path: "/tmp/file" },
    ],
    [{ type: "text", text: "echo ok", execution: "shell" }],
    [
      {
        type: "text",
        text: "!echo ok",
        execution: "shell",
        visibility: "agent-only",
      },
    ],
  ])("rejects ambiguous or empty execution input: %j", (...parts) => {
    expect(() =>
      getUserShellCommand(promptInputSchema.array().parse(parts)),
    ).toThrow();
  });
});
