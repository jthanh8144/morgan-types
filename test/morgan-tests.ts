import fs = require("fs");
import http = require("http");
import morgan = require("morgan");
import express = require("express");

// ---------------------------------------------------------------------------
// Predefined formats
// ---------------------------------------------------------------------------

morgan("combined");
morgan("common");
morgan("dev");
morgan("short");
morgan("tiny");
// deprecated, but still a registered format
morgan("default");

// An arbitrary format string in token notation.
morgan(":remote-addr :method :url :status :res[content-length] - :response-time[2] ms");

// A format string held in a variable is still accepted.
const formatFromConfig: string = process.env.LOG_FORMAT || "tiny";
morgan(formatFromConfig);

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

morgan("combined", {
    immediate: true,
    skip: (req, res) => res.statusCode < 400,
    stream: {
        write: (str: string) => {
            console.log(str);
        },
    },
});

// `buffer` accepts a flush interval in milliseconds, not only a boolean.
morgan("combined", { buffer: true });
morgan("combined", { buffer: 5000 });

// A real writable stream works as the destination.
morgan("combined", { stream: process.stdout });
morgan("combined", { stream: fs.createWriteStream("access.log", { flags: "a" }) });

// The deprecated single-argument call.
morgan({ format: "combined", immediate: true });
morgan({ format: (tokens, req, res) => tokens.method(req, res), immediate: true });
morgan({ immediate: true });

// ---------------------------------------------------------------------------
// Format functions
// ---------------------------------------------------------------------------

morgan((tokens, req, res) => {
    return [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, "content-length"),
        "-",
        tokens["response-time"](req, res),
        "ms",
    ].join(" ");
});

// Returning `undefined` or `null` skips the entry.
morgan((tokens, req, res) => (res.statusCode < 400 ? null : tokens.method(req, res)));
morgan(() => undefined);

// Every builtin token is typed.
morgan((tokens, req, res) => {
    const parts: Array<string | number | undefined> = [
        tokens.url(req, res),
        tokens.method(req, res),
        tokens["response-time"](req, res, 2),
        tokens["total-time"](req, res, 2),
        tokens.date(req, res, "iso"),
        tokens.status(req, res),
        tokens.referrer(req, res),
        tokens["remote-addr"](req, res),
        tokens["remote-user"](req, res),
        tokens.pid(req, res),
        tokens["http-version"](req, res),
        tokens["user-agent"](req, res),
        tokens.req(req, res, "accept"),
        tokens.res(req, res, "content-length"),
    ];
    return parts.join(" ");
});

// Custom tokens are reachable through the index signature.
morgan((tokens, req, res) => tokens["request-id"](req, res));

// ---------------------------------------------------------------------------
// Object mode (morgan 1.12.0)
// ---------------------------------------------------------------------------

interface StructuredEntry {
    method: string | number | undefined;
    url: string | number | undefined;
    status: number;
}

const structuredStream: morgan.ObjectModeStreamOptions<StructuredEntry> = {
    writableObjectMode: true,
    write(entry) {
        console.log(entry.method, entry.url, entry.status);
    },
};

morgan<http.IncomingMessage, http.ServerResponse>(
    (tokens, req, res): StructuredEntry => ({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
    }),
    { stream: structuredStream },
);

// An inline object-mode stream works too.
morgan(
    (tokens, req, res) => ({ method: tokens.method(req, res) }),
    {
        stream: {
            writableObjectMode: true,
            write: (entry: object) => {
                console.log(entry);
            },
        },
    },
);

// The entry type flows from the format function into `stream.write`, so the
// parameter needs no annotation.
morgan(
    (tokens, req, res) => ({
        url: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
        durationMs: Number(tokens["response-time"](req, res)),
    }),
    {
        immediate: false,
        stream: {
            writableObjectMode: true,
            write(entry) {
                entry.status.toFixed(0);
                entry.durationMs.toFixed(2);
                console.log(entry.url);

                // @ts-expect-error `entry` carries the format function's type,
                // so it is not `any` and unknown members are rejected
                entry.nope;
            },
        },
    },
);

// The same inference through a named entry type.
morgan(
    (tokens, req, res): StructuredEntry => ({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
    }),
    {
        stream: {
            writableObjectMode: true,
            write(entry) {
                const typed: StructuredEntry = entry;
                console.log(typed.status);
            },
        },
    },
);

// Object mode requires the flag: without it morgan writes `String(entry)`, so
// the stream receives a string and the entry's members are not there.
morgan(
    (tokens, req, res) => ({ status: Number(tokens.status(req, res)) }),
    {
        stream: {
            write(entry) {
                // `entry` is the log line, not the object
                entry.toUpperCase();

                // @ts-expect-error without `writableObjectMode: true` morgan writes `String(entry)`
                entry.status;
            },
        },
    },
);

// A format function may be typed by the entry it produces.
const jsonLine: morgan.FormatFn<http.IncomingMessage, http.ServerResponse, StructuredEntry> = (
    tokens,
    req,
    res,
) => ({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
});
morgan(jsonLine, { stream: structuredStream });

// The default entry type is still `string`.
const textLine: morgan.FormatFn = (tokens, req, res) => tokens.method(req, res) as string;
morgan(textLine);

// ---------------------------------------------------------------------------
// token / format / compile
// ---------------------------------------------------------------------------

morgan.token("status", (req, res) => (res.headersSent ? String(res.statusCode) : undefined));
morgan.token("content-length-number", (req, res) => Number(res.getHeader("content-length")));
morgan.token<express.Request, express.Response>("route", (req) => req.route?.path);

morgan.format("tiny-extended", ":method :url :status :res[content-length] - :response-time ms :user-agent");
morgan.format("json", (tokens, req, res) => ({ method: tokens.method(req, res) }));

const compiled: morgan.FormatFn = morgan.compile(":method :url :status");
morgan(compiled);

// Chaining, since token()/format() return the morgan interface.
morgan.token("a", () => "a").token("b", () => "b").format("ab", ":a :b").compile(":a :b");

// ---------------------------------------------------------------------------
// Generic request / response types
// ---------------------------------------------------------------------------

express().use(morgan<express.Request, express.Response>("combined"));
express().use(morgan("combined", { skip: (req: express.Request) => req.header("user-agent") === "fake" }));

const handler: morgan.Handler<express.Request, express.Response> = morgan<
    express.Request,
    express.Response
>("dev");
express().use(handler);

http.createServer((req, res) => {
    morgan("combined")(req, res, (err) => {
        res.setHeader("content-type", "text/plain");
        res.end("hello, world!");
    });
});

// ---------------------------------------------------------------------------
// Rejections
// ---------------------------------------------------------------------------

// @ts-expect-error a format function must return a log entry, null or undefined
morgan(() => true);

// @ts-expect-error a token returns a string, a number or undefined
morgan.token("bad", () => ({ nope: true }));

// @ts-expect-error compile takes a format string
morgan.compile(123);

// @ts-expect-error `skip` must return a boolean
morgan("combined", { skip: () => "yes" });

// @ts-expect-error a stream must have a `write` method
morgan("combined", { stream: { writableObjectMode: true } });

// @ts-expect-error `buffer` is a boolean or a number of milliseconds
morgan("combined", { buffer: "1000" });

// @ts-expect-error morgan takes at most two arguments
morgan("combined", {}, {});
