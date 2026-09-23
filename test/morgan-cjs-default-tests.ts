/**
 * Default-import tests in a CommonJS file.
 *
 * morgan's README documents `import morgan from "morgan"`. Under
 * `esModuleInterop` that form resolves to a `default` member of the exported
 * namespace whenever one exists, so these tests pin that the whole module — and
 * not some member of it — is what the default import yields.
 *
 * `morgan-esm-tests.mts` does not cover this: a `.mts` file resolves the import
 * through the ESM interop path and keeps working even when the CommonJS one is
 * broken.
 */

import morgan from "morgan";
import type { Request, Response } from "express";

morgan("combined");
morgan(":pid :method :url :total-time[2] ms");
morgan<Request, Response>("dev", { skip: (req) => req.path === "/health" });

morgan.token("request-id", (req: Request) => req.header("x-request-id"));
morgan.format("with-id", ":request-id :method :url");

const compiled: morgan.FormatFn = morgan.compile(":method :url");
const handler: morgan.Handler<Request, Response> = morgan<Request, Response>("tiny");

console.log(compiled, handler);
