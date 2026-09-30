import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { executeDatabricksCommand, type DatabricksCommandResult } from "./execute.js";
import pkg from "../package.json";

const SendCommandInputSchema = z.object({
  command: z.string().describe("The databricks subcommand and arguments to run."),
});

type SendCommandInput = z.infer<typeof SendCommandInputSchema>;
type Executor = (command: string) => Promise<DatabricksCommandResult>;

const SEND_COMMAND_DESCRIPTION =
  "Execute a databricks CLI command. Provide the arguments after `databricks` — e.g. `clusters list`.";

export async function handleSendCommand({ command }: SendCommandInput, executor: Executor = executeDatabricksCommand) {
  let result;
  try {
    result = await executor(command);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Command execution failed.";
    return { isError: true as const, content: [{ type: "text" as const, text: message }] };
  }

  if (result.exitCode !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || `databricks exited with code ${result.exitCode}.`;
    return {
      isError: true as const,
      content: [{ type: "text" as const, text: `databricks exited with code ${result.exitCode}:\n${message}` }],
    };
  }

  return {
    content: [{ type: "text" as const, text: result.stdout }],
  };
}

export const server = new McpServer({
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
});

server.registerTool(
  "send_command",
  {
    description: SEND_COMMAND_DESCRIPTION,
    inputSchema: SendCommandInputSchema,
  },
  (input) => handleSendCommand(input),
);

if (import.meta.main) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("databricks-mcp server running on stdio");
}
