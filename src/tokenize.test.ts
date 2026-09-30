import { describe, expect, test } from "bun:test";
import { tokenize, stripPipelineSuffix } from "./tokenize.js";

describe("tokenize - basic quoting", () => {
  test("no quotes: baseline behavior", () => {
    expect(tokenize("clusters list")).toEqual(["clusters", "list"]);
  });

  test("double-quoted value with space", () => {
    expect(tokenize('jobs create --json \'{"name": "my job"}\'')).toEqual([
      "jobs",
      "create",
      "--json",
      '{"name": "my job"}',
    ]);
  });

  test("single-quoted value with space", () => {
    expect(tokenize('runs submit --json \'{"name": "my job"}\'')).toEqual([
      "runs",
      "submit",
      "--json",
      '{"name": "my job"}',
    ]);
  });

  test("quoted search query", () => {
    expect(tokenize('jobs list --tag "team:engineering"')).toEqual(["jobs", "list", "--tag", "team:engineering"]);
  });
});

describe("tokenize - multi-word flag values", () => {
  test("multiple quoted flags in one command", () => {
    expect(tokenize('sql query --query "SELECT 1" --warehouse-id "abc123"')).toEqual([
      "sql",
      "query",
      "--query",
      "SELECT 1",
      "--warehouse-id",
      "abc123",
    ]);
  });

  test("realistic job creation: name and json as single strings", () => {
    const tokens = tokenize('jobs create --json \'{"name": "etl-job", "tasks": []}\'');
    expect(tokens).toHaveLength(4);
    expect(tokens[2]).toBe("--json");
    expect(tokens[3]).toBe('{"name": "etl-job", "tasks": []}');
  });
});

describe("tokenize - multiline bodies", () => {
  test("json body preserves newlines as a single string", () => {
    const tokens = tokenize('jobs create --json \'{"name": "job"}\'');
    expect(tokens).toHaveLength(4);
    expect(tokens[3]).toBe('{"name": "job"}');
  });
});

describe("tokenize - equals-sign flag syntax", () => {
  test("--method=GET: no quotes needed", () => {
    expect(tokenize("api get /api/2.0/clusters/list")).toEqual(["api", "get", "/api/2.0/clusters/list"]);
  });

  test("--tag=value keeps flag and value as one token", () => {
    const tokens = tokenize('jobs list --tag="team:engineering"');
    expect(tokens).toHaveLength(3);
    expect(tokens[2]).toBe("--tag=team:engineering");
  });
});

describe("tokenize - empty and whitespace input", () => {
  test("empty string returns []", () => {
    expect(tokenize("")).toEqual([]);
  });

  test("whitespace-only returns []", () => {
    expect(tokenize("   ")).toEqual([]);
  });

  test("extra whitespace between tokens is collapsed", () => {
    expect(tokenize("  clusters  list  ")).toEqual(["clusters", "list"]);
  });
});

describe("tokenize - quotes within quotes and escaping", () => {
  test("single quote inside double quotes", () => {
    expect(tokenize('sql query --query "SELECT * FROM it\'s table"')).toEqual([
      "sql",
      "query",
      "--query",
      "SELECT * FROM it's table",
    ]);
  });
});

describe("tokenize - unsupported syntax throws", () => {
  test("pipe operator throws", () => {
    expect(() => tokenize("clusters list | grep running")).toThrow(/not supported/i);
  });

  test("redirect operator throws", () => {
    expect(() => tokenize("clusters list > output.txt")).toThrow(/not supported/i);
  });

  test("semicolon operator throws", () => {
    expect(() => tokenize("clusters list; clusters delete")).toThrow(/not supported/i);
  });

  test("inline comment (#) throws", () => {
    expect(() => tokenize("api get /api/2.0/clusters/list # --etag")).toThrow(/not supported/i);
  });

  test("glob pattern throws", () => {
    expect(() => tokenize("clusters list *.json")).toThrow(/not supported/i);
  });

  test("unbalanced double quote throws", () => {
    expect(() => tokenize('clusters get "abc-123')).toThrow(/quote/i);
  });

  test("unbalanced single quote throws", () => {
    expect(() => tokenize("clusters get 'abc-123")).toThrow(/quote/i);
  });

  test("shell variable reference throws", () => {
    expect(() => tokenize('jobs create --json \'{"name": "$JOB_NAME"}\'')).toThrow(/variable/i);
  });

  test("shell variable without quotes throws", () => {
    expect(() => tokenize("clusters list $CLUSTER_ID")).toThrow(/variable/i);
  });
});

describe("tokenize - acceptance criteria", () => {
  test("4 tokens for jobs create with --json", () => {
    const tokens = tokenize('jobs create --json \'{"name": "etl job"}\'');
    expect(tokens).toEqual(["jobs", "create", "--json", '{"name": "etl job"}']);
    expect(tokens).toHaveLength(4);
  });
});

describe("stripPipelineSuffix - no operator", () => {
  test("returns input unchanged when no pipe or redirect is present", () => {
    expect(stripPipelineSuffix("clusters list")).toBe("clusters list");
  });

  test("returns input unchanged for a complex command with no operators", () => {
    expect(stripPipelineSuffix('jobs create --json \'{"name": "etl job"}\'')).toBe(
      'jobs create --json \'{"name": "etl job"}\'',
    );
  });

  test("returns empty string unchanged", () => {
    expect(stripPipelineSuffix("")).toBe("");
  });
});

describe("stripPipelineSuffix - unquoted pipe", () => {
  test("strips at unquoted pipe operator", () => {
    expect(stripPipelineSuffix("clusters list | grep running")).toBe("clusters list ");
  });

  test("strips at first pipe when multiple pipes present", () => {
    expect(stripPipelineSuffix("clusters list | grep running | head -5")).toBe("clusters list ");
  });

  test("strips at double pipe (logical OR) - first pipe wins", () => {
    expect(stripPipelineSuffix("clusters list || echo fail")).toBe("clusters list ");
  });
});

describe("stripPipelineSuffix - unquoted redirect", () => {
  test("strips at unquoted > operator", () => {
    expect(stripPipelineSuffix("clusters list > output.txt")).toBe("clusters list ");
  });

  test("strips at unquoted >> operator - first > wins", () => {
    expect(stripPipelineSuffix("clusters list >> output.txt")).toBe("clusters list ");
  });

  test("strips at unquoted < operator", () => {
    expect(stripPipelineSuffix("clusters list < input.txt")).toBe("clusters list ");
  });

  test("strips at unquoted << operator - first < wins", () => {
    expect(stripPipelineSuffix("clusters list << input.txt")).toBe("clusters list ");
  });
});

describe("stripPipelineSuffix - first operator wins", () => {
  test("pipe before redirect: stops at pipe", () => {
    expect(stripPipelineSuffix("clusters list | grep running > output.txt")).toBe("clusters list ");
  });

  test("redirect before pipe: stops at redirect", () => {
    expect(stripPipelineSuffix("clusters list > output.txt | grep running")).toBe("clusters list ");
  });
});

describe("stripPipelineSuffix - quoted operators preserved", () => {
  test("pipe inside double quotes is not a delimiter", () => {
    expect(stripPipelineSuffix('echo "a|b"')).toBe('echo "a|b"');
  });

  test("pipe inside single quotes is not a delimiter", () => {
    expect(stripPipelineSuffix("echo 'a|b'")).toBe("echo 'a|b'");
  });

  test("redirect inside double quotes is not a delimiter", () => {
    expect(stripPipelineSuffix('echo "a > b"')).toBe('echo "a > b"');
  });

  test("redirect inside single quotes is not a delimiter", () => {
    expect(stripPipelineSuffix("echo 'a > b'")).toBe("echo 'a > b'");
  });

  test("greater-than in quoted SQL is preserved", () => {
    expect(stripPipelineSuffix('sql query --query "SELECT * FROM t WHERE a > 1"')).toBe(
      'sql query --query "SELECT * FROM t WHERE a > 1"',
    );
  });

  test("pipe after a quoted segment containing redirect is stripped at the pipe", () => {
    expect(stripPipelineSuffix('sql query --query "SELECT a > b" | grep x')).toBe('sql query --query "SELECT a > b" ');
  });
});

describe("stripPipelineSuffix - edge cases", () => {
  test("pipe at start returns empty string", () => {
    expect(stripPipelineSuffix("| grep running")).toBe("");
  });

  test("redirect at start returns empty string", () => {
    expect(stripPipelineSuffix("> output.txt")).toBe("");
  });

  test("pipe immediately after databricks command with no space", () => {
    expect(stripPipelineSuffix("clusters list|grep running")).toBe("clusters list");
  });
});
