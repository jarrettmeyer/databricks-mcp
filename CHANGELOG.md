# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-30

### Added

- Forked from [jarrettmeyer/gh-mcp](https://github.com/jarrettmeyer/gh-mcp) v0.2.0 and adapted for the `databricks` CLI.
- MCP server wrapping the `databricks` CLI via a single `send_command` tool.
- `DATABRICKS_PATH` environment variable to specify a custom path to the `databricks` binary (defaults to `databricks` on `PATH`).
- 31 unit tests covering tokenization, execution, and handler logic.

[Unreleased]: https://github.com/jarrettmeyer/databricks-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jarrettmeyer/databricks-mcp/releases/tag/v0.1.0
