import { spawn } from "node:child_process";
import { experimental_killPortableProcess } from "@get-bb/plugin-sdk/provider-bridge";

export interface UserShellResult {
  output: string;
  exitCode: number;
  cancelled: boolean;
}

export function runUserShell(args: {
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  signal: AbortSignal;
  onOutput: (text: string) => void;
  timeoutMs?: number;
}): Promise<UserShellResult> {
  return new Promise((resolve, reject) => {
    if (args.signal.aborted) {
      reject(new Error("Command cancelled before execution"));
      return;
    }
    const windows = process.platform === "win32";
    const child = spawn(
      windows ? "powershell.exe" : args.env.SHELL || "/bin/sh",
      windows
        ? ["-NoProfile", "-NonInteractive", "-Command", args.command]
        : ["-lc", args.command],
      {
        cwd: args.cwd,
        env: args.env,
        detached: !windows,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let output = "";
    let truncated = false;
    let cancelled = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const kill = (signal: NodeJS.Signals) => {
      if (!windows && child.pid) {
        try {
          process.kill(-child.pid, signal);
          return;
        } catch {}
      }
      experimental_killPortableProcess(child, signal);
    };
    const stop = () => {
      cancelled = true;
      kill("SIGTERM");
      killTimer ??= setTimeout(() => kill("SIGKILL"), 1000);
    };
    const timer = setTimeout(stop, args.timeoutMs ?? 3_600_000);
    args.signal.addEventListener("abort", stop, { once: true });
    const read = (text: string) => {
      const remaining = 262_144 - output.length;
      if (remaining > 0) {
        const chunk = text.slice(0, remaining);
        output += chunk;
        args.onOutput(chunk);
      }
      if (text.length > remaining && !truncated) {
        truncated = true;
        const marker = "\n[Output truncated at 256 Ki characters]\n";
        output += marker;
        args.onOutput(marker);
      }
    };
    child.stdout.setEncoding("utf8").on("data", read);
    child.stderr.setEncoding("utf8").on("data", read);
    const cleanup = () => {
      clearTimeout(timer);
      if (cancelled) kill("SIGKILL");
      clearTimeout(killTimer);
      args.signal.removeEventListener("abort", stop);
    };
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("close", (code) => {
      cleanup();
      resolve({ output, exitCode: code ?? 130, cancelled });
    });
  });
}

export function shellResultContext(
  command: string,
  cwd: string,
  result: UserShellResult,
): string {
  return `The user executed a shell command directly. This is recorded command output, not a request to execute it again.\n${JSON.stringify({ command, cwd, ...result })}`;
}
