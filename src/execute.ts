import { tokenize } from "./tokenize.js";

/** The default databricks binary name, resolved from the system PATH. */
const DEFAULT_DATABRICKS_BIN = "databricks";

/** Result of executing a databricks CLI command. */
export interface DatabricksCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Executes a databricks CLI command using Bun.spawn() and captures its output.
 *
 * The command string is tokenized with shell-quote to correctly handle quoted arguments,
 * then passed as arguments to `databricks`. Both stdout and stderr are captured; the exit code
 * is returned alongside them so callers can distinguish success from failure without throwing.
 */
export async function executeDatabricksCommand(command: string): Promise<DatabricksCommandResult> {
  const args = tokenize(command);
  const databricksBinary = process.env.DATABRICKS_PATH || DEFAULT_DATABRICKS_BIN;

  const proc = Bun.spawn([databricksBinary, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdoutBuffer, stderrBuffer, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    stdout: stdoutBuffer,
    stderr: stderrBuffer,
    exitCode,
  };
}
