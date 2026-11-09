import test from "node:test";
import assert from "node:assert/strict";
import {
  runWithPriceContext,
  retainPriceRefresh,
} from "../lib/coffee/execution.mjs";
test("a source refresh is retained independently of the HTTP response", async () => {
  let retained, finish;
  const work = new Promise((resolve) => {
    finish = resolve;
  });
  const returned = runWithPriceContext(
    {
      waitUntil: (p) => {
        retained = p;
      },
    },
    () => retainPriceRefresh(work),
  );
  assert.equal(retained, work);
  assert.equal(returned, work);
  finish("stored");
  assert.equal(await retained, "stored");
});
test("execution contexts remain isolated across concurrent requests", async () => {
  const calls = [];
  await Promise.all(
    ["a", "b"].map((id) =>
      runWithPriceContext({ waitUntil: () => calls.push(id) }, async () => {
        await Promise.resolve();
        return retainPriceRefresh(Promise.resolve());
      }),
    ),
  );
  assert.deepEqual(calls.sort(), ["a", "b"]);
});
