import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

describe("executeDatabricksCommand", () => {
  const originalSpawn = Bun.spawn.bind(Bun);
  const spawnCalls: string[][] = [];

  beforeEach(() => {
    spawnCalls.length = 0;
    // Guard against DATABRICKS_PATH inherited from the developer's shell environment.
    delete process.env.DATABRICKS_PATH;

    // @ts-expect-error — overriding Bun.spawn for testing
    Bun.spawn = mock((args: string[]) => {
      spawnCalls.push(args);
      const makeEmpty = () =>
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(""));
            c.close();
          },
        });
      return { stdout: makeEmpty(), stderr: makeEmpty(), exited: Promise.resolve(0) };
    });
  });

  afterEach(() => {
    Bun.spawn = originalSpawn;
    delete process.env.DATABRICKS_PATH;
  });

  test("uses 'databricks' by default when DATABRICKS_PATH is not set", async () => {
    const { executeDatabricksCommand } = await import("./execute");
    await executeDatabricksCommand("clusters list");
    expect(spawnCalls[0][0]).toBe("databricks");
  });

  test("uses DATABRICKS_PATH when set", async () => {
    process.env.DATABRICKS_PATH = "/custom/path/to/databricks";
    const { executeDatabricksCommand } = await import("./execute");
    await executeDatabricksCommand("clusters list");
    expect(spawnCalls[0][0]).toBe("/custom/path/to/databricks");
  });
});
