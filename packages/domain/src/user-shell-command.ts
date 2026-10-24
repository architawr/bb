import type { PromptInput } from "./shared-types.js";

export function hasUserShellCommand(input: readonly PromptInput[]): boolean {
  return input.some(
    (part) => part.type === "text" && part.execution === "shell",
  );
}

export function getUserShellCommand(
  input: readonly PromptInput[],
): string | null {
  if (!hasUserShellCommand(input)) return null;
  const visible = input.filter((part) => part.visibility !== "agent-only");
  const part = visible[0];
  if (
    visible.length !== 1 ||
    part?.type !== "text" ||
    part.execution !== "shell" ||
    part.mentions.length !== 0 ||
    !part.text.startsWith("!") ||
    !part.text.slice(1).trim()
  ) {
    throw new Error(
      "A shell command must be a single !command without attachments or mentions.",
    );
  }
  return part.text.slice(1).trim();
}
