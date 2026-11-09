import { AsyncLocalStorage } from "node:async_hooks";
const contexts = new AsyncLocalStorage();
export const runWithPriceContext = (context, run) => contexts.run(context, run);
export function retainPriceRefresh(work) {
  contexts.getStore()?.waitUntil(work);
  return work;
}
