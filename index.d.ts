/*!
 * morgan - TypeScript definitions
 * Written against morgan 1.12.1 (https://github.com/expressjs/morgan)
 * MIT Licensed
 */

/// <reference types="node" />

import http = require("http");

declare namespace morgan {
    /**
     * A log entry produced by a format function.
     *
     * Format functions normally return a `string`, which morgan writes to the
     * stream followed by a newline. A `number` is accepted as well, since token
     * functions may produce one (`:res[content-length]`, for instance) and
     * morgan concatenates the entry with the newline before writing it.
     *
     * Since morgan 1.12.0 a format function may also return an `object`. When
     * the configured stream reports `writableObjectMode === true` the object is
     * handed to `stream.write()` as-is, with no newline appended; otherwise the
     * stream receives its string coercion.
     */
    export type LogEntry = string | number | object;

    /**
     * The middleware returned by `morgan()`.
     *
     * Compatible with Connect/Express middleware: it is invoked with the
     * request, the response and a `next` callback, and always calls `next()`
     * synchronously.
     */
    export type Handler<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    > = (
        req: Request,
        res: Response,
        callback: (err?: Error) => void,
    ) => void;

    /**
     * The name of a predefined format, or a format string written in token
     * notation such as `":method :url :status"`.
     *
     * Tokens are written as `:name` and may take a single argument in square
     * brackets, e.g. `:res[content-length]` or `:date[iso]`. Unknown tokens and
     * tokens that return `undefined` are rendered as `-`.
     */
    export type FormatString =
        /**
         * Standard Apache combined log output.
         *
         * `:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"`
         */
        | "combined"
        /**
         * Standard Apache common log output.
         *
         * `:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]`
         */
        | "common"
        /**
         * Concise output colored by response status, for development use.
         *
         * `:method :url :status :response-time ms - :res[content-length]`
         *
         * Coloring is disabled when the `NO_COLOR` environment variable is set
         * to a non-empty value. That variable is read once, when morgan is
         * first required.
         */
        | "dev"
        /**
         * Shorter than `combined`, also including response time.
         *
         * `:remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms`
         */
        | "short"
        /**
         * The minimal output.
         *
         * `:method :url :status :res[content-length] - :response-time ms`
         */
        | "tiny"
        /**
         * @deprecated Use `"combined"` instead. Accessing the `default` format
         * emits a deprecation warning at runtime.
         */
        | "default"
        // Any other string is treated as a format string in token notation.
        // The `& {}` keeps the literals above visible to editor completion.
        | (string & {});

    /**
     * A function that produces one log entry.
     *
     * Returning `undefined` or `null` skips the entry entirely.
     *
     * @typeParam Entry The value the function returns. Defaults to `string`;
     * widen it to `object` (or {@link LogEntry}) when writing to a stream in
     * object mode.
     */
    export type FormatFn<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
        Entry extends LogEntry = string,
    > = (
        tokens: TokenIndexer<Request, Response>,
        req: Request,
        res: Response,
    ) => Entry | undefined | null;

    /**
     * A token function.
     *
     * When invoked from a compiled format string the third argument is the text
     * between the square brackets, e.g. `"content-length"` for
     * `:res[content-length]`. It is `undefined` when the token is written
     * without brackets.
     *
     * Returning `undefined` renders the token as `-`. String results are
     * escaped by morgan before they reach the log line: control characters,
     * `"` and `\` are replaced with escape sequences so a token value cannot
     * forge or break a log record.
     */
    export type TokenCallbackFn<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    > = (
        req: Request,
        res: Response,
        arg?: string | number | boolean,
    ) => string | number | undefined;

    /**
     * The tokens morgan defines out of the box.
     *
     * Every entry is also reachable through the index signature on
     * {@link TokenIndexer}, so custom tokens registered with
     * {@link Morgan.token} can be read the same way.
     */
    export interface BuiltinTokens<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    > {
        /** The URL of the request: `req.originalUrl` when present, else `req.url`. */
        "url": TokenCallbackFn<Request, Response>;
        /** The HTTP method of the request. */
        "method": TokenCallbackFn<Request, Response>;
        /**
         * Milliseconds between the request arriving and the response headers
         * being written, with three decimal places by default.
         *
         * Accepts the number of digits as its argument: `:response-time[2]`.
         * Returns `undefined` when the response has not started.
         */
        "response-time": TokenCallbackFn<Request, Response>;
        /**
         * Milliseconds between the request arriving and the response finishing,
         * with three decimal places by default.
         *
         * Accepts the number of digits as its argument: `:total-time[2]`.
         *
         * @since morgan 1.10.0
         */
        "total-time": TokenCallbackFn<Request, Response>;
        /**
         * The current date, formatted as `web` (RFC 1123, the default), `clf`
         * (common log format) or `iso` (ISO 8601): `:date[iso]`.
         */
        "date": TokenCallbackFn<Request, Response>;
        /**
         * The response status code, or `undefined` when the headers have not
         * been sent.
         */
        "status": TokenCallbackFn<Request, Response>;
        /** The `Referer` header, falling back to the misspelled `Referrer`. */
        "referrer": TokenCallbackFn<Request, Response>;
        /**
         * The remote address of the request: `req.ip`, then
         * `req._remoteAddress`, then `req.connection.remoteAddress`.
         */
        "remote-addr": TokenCallbackFn<Request, Response>;
        /** The user authenticated via basic auth, or `undefined`. */
        "remote-user": TokenCallbackFn<Request, Response>;
        /**
         * The process id of the worker that handled the request.
         *
         * @since morgan 1.11.0
         */
        "pid": TokenCallbackFn<Request, Response>;
        /** The HTTP version of the request, e.g. `"1.1"`. */
        "http-version": TokenCallbackFn<Request, Response>;
        /** The `User-Agent` header. */
        "user-agent": TokenCallbackFn<Request, Response>;
        /**
         * A request header, named by the token argument: `:req[accept]`.
         * Repeated headers are joined with `", "`.
         */
        "req": TokenCallbackFn<Request, Response>;
        /**
         * A response header, named by the token argument:
         * `:res[content-length]`. Repeated headers are joined with `", "`, and
         * the token is `undefined` until the headers have been sent.
         */
        "res": TokenCallbackFn<Request, Response>;
    }

    /**
     * The `tokens` object handed to a {@link FormatFn}.
     *
     * Holds every token known to morgan, built in or registered through
     * {@link Morgan.token}, keyed by token name.
     */
    export interface TokenIndexer<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    > extends BuiltinTokens<Request, Response> {
        [tokenName: string]: TokenCallbackFn<Request, Response>;
    }

    /**
     * The destination morgan writes log entries to.
     *
     * Anything with a `write` method works, including a `WriteStream`, a
     * `PassThrough`, or a plain object adapting another logger.
     *
     * @typeParam Entry The value passed to `write`. Defaults to `string`; set
     * it to the entry type your format function returns when
     * {@link StreamOptions.writableObjectMode} is `true`.
     */
    export interface StreamOptions<Entry = string> {
        /**
         * Set to `true` to receive the value returned by the format function
         * unchanged, with no trailing newline, whenever that value is an
         * object. Strings are still written with a trailing newline.
         *
         * @since morgan 1.12.0
         */
        writableObjectMode?: boolean | undefined;

        /**
         * Write one log entry.
         *
         * Receives the log line including its trailing newline, or — in object
         * mode — the object returned by the format function.
         */
        write(entry: Entry): void;
    }

    /**
     * The options accepted by `morgan()`.
     */
    export interface Options<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    > {
        /**
         * Buffer log lines and flush them on an interval instead of writing
         * each one immediately. `true` uses a 1000 ms interval; a number sets
         * the interval in milliseconds.
         *
         * @deprecated Buffering was removed from the documented API and emits a
         * deprecation warning. Wrap the stream yourself if you need it.
         */
        buffer?: boolean | number | undefined;

        /**
         * Write the log entry when the request arrives instead of when the
         * response finishes. Requests are then logged even if the server
         * crashes, but nothing about the response — status, content length,
         * response time — is available.
         */
        immediate?: boolean | undefined;

        /**
         * Decide whether to skip logging a request, defaults to `false`.
         */
        skip?(req: Request, res: Response): boolean;

        /**
         * Where to write log entries, defaults to `process.stdout`.
         *
         * Outside object mode morgan always writes a string — the log line and
         * its trailing newline. To receive the object a format function
         * returns, use {@link ObjectModeStreamOptions} instead.
         *
         * A real `NodeJS.WritableStream` — `process.stdout`, the result of
         * `fs.createWriteStream()`, a `PassThrough` — satisfies this
         * structurally, so it needs no separate union member. Keeping the type
         * to a single member is what lets an inline `write(entry)` have its
         * parameter typed without an annotation.
         */
        stream?: StreamOptions<string> | undefined;
    }

    /**
     * A stream that receives log entries as objects rather than as lines.
     *
     * `writableObjectMode` must be the literal `true`: morgan only forwards an
     * object unchanged when the stream reports object mode, and writes
     * `String(entry) + "\n"` otherwise, so the flag is what makes `Entry`
     * accurate.
     *
     * @since morgan 1.12.0
     */
    export interface ObjectModeStreamOptions<Entry extends object> {
        writableObjectMode: true;

        /**
         * Receives the object returned by the format function, unchanged and
         * without a trailing newline.
         */
        write(entry: Entry): void;
    }

    /**
     * The options accepted by `morgan()` when the format function returns
     * objects.
     *
     * `stream` is required here, because it is what puts morgan in object mode;
     * the default stream, `process.stdout`, is not in object mode.
     *
     * @since morgan 1.12.0
     */
    export interface ObjectModeOptions<
        Request extends http.IncomingMessage,
        Response extends http.ServerResponse,
        Entry extends object,
    > extends Omit<Options<Request, Response>, "stream"> {
        stream: ObjectModeStreamOptions<Entry>;
    }

    /**
     * The options accepted by the deprecated single-argument call
     * `morgan(options)`.
     *
     * @deprecated Use `morgan(format, options)` instead.
     */
    export interface OptionsWithFormat<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    > extends Options<Request, Response> {
        /**
         * The format to use, defaulting to the deprecated `"default"` format.
         *
         * @deprecated Pass the format as the first argument instead.
         */
        format?: FormatString | FormatFn<Request, Response, LogEntry> | undefined;
    }

    /**
     * The public interface of the morgan module.
     */
    export interface Morgan<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    > {
        /**
         * Create a logger middleware from a format function that returns
         * objects, writing them to a stream in object mode.
         *
         * The entry type is inferred from the format function, so
         * `stream.write` receives exactly what the format function returns.
         */
        <Entry extends object>(
            format: FormatFn<Request, Response, Entry>,
            options: ObjectModeOptions<Request, Response, Entry>,
        ): Handler<Request, Response>;

        /**
         * Create a logger middleware from the name of a predefined format or
         * from a format string in token notation.
         */
        (format: FormatString, options?: Options<Request, Response>): Handler<Request, Response>;

        /**
         * Create a logger middleware from a format function.
         *
         * The function is called with the token table, the request and the
         * response, and returns the log entry — or `undefined` / `null` to skip
         * the entry.
         */
        (
            format: FormatFn<Request, Response, LogEntry>,
            options?: Options<Request, Response>,
        ): Handler<Request, Response>;

        /**
         * Create a logger middleware from an options object carrying the
         * format.
         *
         * @deprecated Use `morgan(format, options)` instead.
         */
        (options: OptionsWithFormat<Request, Response>): Handler<Request, Response>;

        /**
         * Register a token under the given name so it can be used as `:name` in
         * a format string and read as `tokens.name` in a format function.
         *
         * String values returned by the token are escaped before being written,
         * so a token cannot inject control characters or quotes into a log
         * line.
         */
        token(name: string, callback: TokenCallbackFn<Request, Response>): Morgan<Request, Response>;

        /**
         * Register a named format defined by a format string in token notation.
         */
        format(name: string, fmt: FormatString): Morgan<Request, Response>;

        /**
         * Register a named format defined by a format function.
         */
        format(
            name: string,
            fmt: FormatFn<Request, Response, LogEntry>,
        ): Morgan<Request, Response>;

        /**
         * Compile a format string in token notation into a format function.
         *
         * @throws TypeError when `format` is not a string.
         */
        compile(format: string): FormatFn<Request, Response>;
    }

    /**
     * Register a token under the given name so it can be used as `:name` in a
     * format string and read as `tokens.name` in a format function.
     *
     * String values returned by the token are escaped before being written, so
     * a token cannot inject control characters or quotes into a log line.
     */
    export function token<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    >(
        name: string,
        callback: TokenCallbackFn<Request, Response>,
    ): Morgan<Request, Response>;

    /**
     * Register a named format defined by a format string in token notation.
     *
     * The type parameters are not inferred from the arguments; they exist so
     * that the returned `Morgan` can be bound to the request and response types
     * the caller works with, as in `morgan.format<Request, Response>(…)`.
     */
    export function format<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    >(name: string, fmt: FormatString): Morgan<Request, Response>;

    /**
     * Register a named format defined by a format function.
     */
    export function format<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    >(
        name: string,
        fmt: FormatFn<Request, Response, LogEntry>,
    ): Morgan<Request, Response>;

    /**
     * Compile a format string in token notation into a format function.
     *
     * @throws TypeError when `format` is not a string.
     */
    export function compile<
        Request extends http.IncomingMessage = http.IncomingMessage,
        Response extends http.ServerResponse = http.ServerResponse,
    >(format: string): FormatFn<Request, Response>;

    // morgan also exposes the format registered under the name "default" as a
    // `morgan.default` property, deprecated since 1.0. It is deliberately left
    // untyped: declaring a namespace member called `default` on an `export =`
    // module makes `import morgan from "morgan"` resolve to that property under
    // `esModuleInterop`, which breaks the import form morgan's own README
    // documents. Use the "combined" format instead.
}

/**
 * Create a logger middleware from a format function that returns objects,
 * writing them to a stream in object mode.
 *
 * The entry type is inferred from the format function, so `stream.write`
 * receives exactly what the format function returns:
 *
 * ```ts
 * morgan(
 *     (tokens, req, res) => ({ url: tokens.url(req, res), status: Number(tokens.status(req, res)) }),
 *     {
 *         stream: {
 *             writableObjectMode: true,
 *             write(entry) {
 *                 entry.status; // number
 *             },
 *         },
 *     },
 * );
 * ```
 *
 * @since morgan 1.12.0
 */
declare function morgan<
    Request extends http.IncomingMessage = http.IncomingMessage,
    Response extends http.ServerResponse = http.ServerResponse,
    Entry extends object = object,
>(
    format: morgan.FormatFn<Request, Response, Entry>,
    options: morgan.ObjectModeOptions<Request, Response, Entry>,
): morgan.Handler<Request, Response>;

/**
 * Create a logger middleware from the name of a predefined format or from a
 * format string in token notation.
 *
 * @see {@link morgan.FormatString} for the predefined names and the token
 * notation.
 */
declare function morgan<
    Request extends http.IncomingMessage = http.IncomingMessage,
    Response extends http.ServerResponse = http.ServerResponse,
>(
    format: morgan.FormatString,
    options?: morgan.Options<Request, Response>,
): morgan.Handler<Request, Response>;

/**
 * Create a logger middleware from a format function.
 *
 * The function is called with the token table, the request and the response,
 * and returns the log entry — or `undefined` / `null` to skip the entry.
 */
declare function morgan<
    Request extends http.IncomingMessage = http.IncomingMessage,
    Response extends http.ServerResponse = http.ServerResponse,
>(
    format: morgan.FormatFn<Request, Response, morgan.LogEntry>,
    options?: morgan.Options<Request, Response>,
): morgan.Handler<Request, Response>;

/**
 * Create a logger middleware from an options object carrying the format.
 *
 * @deprecated Use `morgan(format, options)` instead.
 */
declare function morgan<
    Request extends http.IncomingMessage = http.IncomingMessage,
    Response extends http.ServerResponse = http.ServerResponse,
>(
    options: morgan.OptionsWithFormat<Request, Response>,
): morgan.Handler<Request, Response>;

export = morgan;
