/**
 * The README documents `import morgan from "morgan"`. These tests pin that the
 * default import keeps working under `esModuleInterop`, including alongside the
 * deprecated `morgan.default` property.
 */

import morgan from "morgan";
import type { Request, Response } from "express";

morgan("combined");
morgan<Request, Response>("dev", { skip: (req) => req.path === "/health" });
morgan.token("route", (req: Request) => req.route?.path);

const line: morgan.FormatFn = morgan.compile(":method :url");
console.log(line);
