# databricks-mcp

This is a very thin wrapper around the `databricks` CLI.

## Security

**This server passes any command directly to `databricks` without filtering.** It can do anything your authenticated Databricks profile allows.

To control what the server can do, scope your authentication:

- **Recommended:** Use a [service principal](https://docs.databricks.com/en/dev-tools/cli/authentication.html#configuration-profiles) with only the workspace and account access your AI tool needs.
- **Alternatively:** Use a [personal access token](https://docs.databricks.com/en/dev-tools/cli/authentication.html#personal-access-token) with the minimum required permissions.
- Use [Databricks configuration profiles](https://docs.databricks.com/en/dev-tools/cli/connection-profiles.html) to isolate credentials for different workspaces.

The server prevents shell injection by design — commands are passed as argument arrays to `Bun.spawn`, never interpolated into a shell string.

## Installation

### 1. Install the Databricks CLI

Install the [Databricks CLI](https://docs.databricks.com/en/dev-tools/cli/install) using Homebrew on macOS:

```bash
brew tap databricks/tap
brew trust databricks/tap
brew install databricks
```

Or download the binary directly. Verify your installation:

```bash
databricks -v
```

### 2. Authenticate

Configure a Databricks profile:

```bash
databricks auth login
```

Follow the prompts to set your workspace URL and authentication method. Verify your configuration:

```bash
databricks auth describe
```

### 3. Install bun

This project uses [bun](https://bun.com/docs/installation) for package management. Verify your installation.

```bash
bun --version
```

### 4. Clone the repo and install dependencies

```bash
git clone https://github.com/jarrettmeyer/databricks-mcp.git
cd databricks-mcp
bun install
```

### 5. Add the server to your MCP client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

**Note**: `bun` installs to `~/.bun/bin/`, which is not on the default `PATH`. Use the full path to the `bun` executable.

```json
{
  "mcpServers": {
    "databricks": {
      "command": "/Users/your-username/.bun/bin/bun",
      "args": ["run", "/path/to/databricks-mcp/src/index.ts"]
    }
  }
}
```

Restart Claude Desktop.

#### Claude Code

Install from your terminal:

```bash
claude mcp add databricks -- bun run /path/to/databricks-mcp/src/index.ts
```

If `databricks` is in a non-standard location, pass `DATABRICKS_PATH` via `--env`:

```bash
claude mcp add databricks --env DATABRICKS_PATH=/opt/homebrew/bin/databricks -- bun run /path/to/databricks-mcp/src/index.ts
```

## Usage

### `send_command`

Execute a `databricks` CLI command. Pass everything that would follow `databricks` on the command line as the `command` string.

| Parameter | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------ |
| `command` | string | The `databricks` subcommand and arguments to run |

**Examples:**

```text
List clusters in a workspace:
  command: "clusters list"

Get details for a specific cluster:
  command: "clusters get 1234-567890-a12bcde3"

List jobs:
  command: "jobs list"

Run a SQL query:
  command: "sql query --query 'SELECT 1' --warehouse-id abc123"

Check authentication status:
  command: "auth describe"
```

This tool works with any MCP-compatible client, including Claude Desktop, Claude Code, and Cursor.

#### Pipes and redirects

If the `command` contains a pipe (`|`) or redirect (`>`, `<`), the server strips the operator and everything after it, then executes only the `databricks` portion. The raw output is returned so the client can filter or format it.

```text
Pipe is stripped — only "clusters list" runs:
  command: "clusters list | grep running"

Redirect is stripped — only "clusters list" runs:
  command: "clusters list > output.txt"

First pipe wins — only "clusters list" runs:
  command: "clusters list | grep running | head -5"
```

Operators inside quoted arguments are preserved, so SQL containing `>` or `|` is unaffected:

```text
The > inside the quoted query is kept:
  command: 'sql query --query "SELECT * FROM t WHERE a > 1"'
```

Other shell syntax — `;`, `&&`, comments (`#`), glob patterns (`*.json`), and variable references (`$VAR`) — is not supported and will produce an error.

## Additional Configuration

### `DATABRICKS_PATH`

By default, the server resolves `databricks` from your `PATH`. If `databricks` is installed in a non-standard location, set `DATABRICKS_PATH` to its absolute path:

```json
{
  "mcpServers": {
    "databricks": {
      "command": "/Users/your-username/.bun/bin/bun",
      "args": ["run", "/path/to/databricks-mcp/src/index.ts"],
      "env": {
        "DATABRICKS_PATH": "/opt/homebrew/bin/databricks"
      }
    }
  }
}
```

## Resources

- [Bun](https://bun.com/)
- [Databricks CLI](https://docs.databricks.com/en/dev-tools/cli/)
- [Databricks CLI Authentication](https://docs.databricks.com/en/dev-tools/cli/authentication.html)
- [jarrettmeyer/databricks-mcp](https://github.com/jarrettmeyer/databricks-mcp)
- [Model Context Protocol TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/)

## License

[MIT](LICENSE)
