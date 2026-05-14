# Queue — BullMQ

Background work runs on BullMQ over Redis. All queue/worker code lives under `src/bull/`.

```
src/bull/
├── index.ts          # imports workers (side-effect) + re-exports queues
├── queue/
│   ├── index.ts
│   └── <name>-queue.ts    # one Queue per file
└── worker/
    ├── index.ts
    └── <name>-worker.ts   # one Worker per file
```

## Rules

1. **One queue per file, one worker per file.** Filename pattern: `<kebab-name>-queue.ts` / `<kebab-name>-worker.ts`. The queue name string (`"send-email"`) must match between the queue and its worker.
2. **Always use `RedisClient.getQueueConnectionOptions()`** for the `connection` option. Do not construct a new `IORedis` instance — the shared connection pool is intentional.
3. **Job payloads must be typed.** Use `new Queue<Payload>(...)` and `new Worker<Payload>(...)` with a type from `@types`. Never use `any`.
4. **Producers enqueue, services orchestrate.** Route handlers and services call a thin enqueue helper (often via `@mailer` or another `libs/` service). Don't `new Queue()` inline in a handler.
5. **Workers must re-throw on failure.** BullMQ uses thrown errors to trigger retries. Pattern:
   ```ts
   async (job) => {
     try {
       await doWork(job.data);
     } catch (error) {
       log.error(error, `job ${job.id} failed`);
       throw error;          // ← required for retry
     }
   }
   ```
6. **Always attach a `worker.on("failed", ...)` log handler** so terminal failures (after retries are exhausted) land in logs with `log.error` from `@utils`.
7. **No `console.log` in workers.** Use `log` from `@utils`.
8. **Workers boot via `src/bull/index.ts`.** Importing `@bull` registers all workers — never import a worker file from a route handler.
9. **Idempotent jobs.** Workers should tolerate the same job running twice (retry, restart). Use database guards (`upsert`, "already processed" checks) when at-least-once semantics aren't enough.
10. **Configure retries explicitly when enqueuing** if the default isn't right:
    ```ts
    await sendEmailQueue.add("send", payload, { attempts: 5, backoff: { type: "exponential", delay: 1000 } });
    ```
11. **Do not enqueue inside a Prisma transaction.** If the transaction rolls back the job stays in Redis. Enqueue only after the transaction commits.
12. **Job names are human-readable strings**, distinct from the queue name. Use them to discriminate handlers if a single queue serves multiple job types.

## Adding a new queue

1. Add the payload type to `@types`.
2. Create `src/bull/queue/<name>-queue.ts`.
3. Create `src/bull/worker/<name>-worker.ts` and import the side-effect in `src/bull/worker/index.ts`.
4. Export the queue from `src/bull/queue/index.ts`.
5. Wrap the producer call in a service (`libs/<domain>/...service.ts`) so callers don't depend on BullMQ directly.
