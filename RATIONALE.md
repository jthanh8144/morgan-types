# Why these definitions differ from `@types/morgan`

Design notes for `index.d.ts`, written while reading the source of
[morgan 1.12.1](https://github.com/expressjs/morgan). `README.md` covers
installing and using the package; this file records why each type looks the way
it does.

## What changed against `@types/morgan`

Everything below is additive unless marked otherwise. `export = morgan`, the
`<Request, Response>` generics and the names `Morgan`, `FormatFn`,
`TokenCallbackFn`, `TokenIndexer`, `Options` and `StreamOptions` are unchanged,
so existing code keeps compiling — `morgan-compat-tests.ts` is the published
`@types/morgan` test suite kept verbatim to prove it.

### Format functions may return objects (morgan 1.12.0)

`FormatFn` takes a third type parameter for the entry it produces, defaulting to
`string`:

```ts
type FormatFn<Request, Response, Entry extends LogEntry = string> =
    (tokens, req, res) => Entry | undefined | null;
```

`morgan()` accepts `FormatFn<Request, Response, LogEntry>`, where
`LogEntry = string | number | object`. `number` is included because token
functions can produce one and morgan concatenates the entry with the newline
before writing it.

### Streams in object mode (morgan 1.12.0)

`StreamOptions` gained `writableObjectMode` and a type parameter for the entry
it receives:

```ts
interface StreamOptions<Entry = string> {
    writableObjectMode?: boolean | undefined;
    write(entry: Entry): void;
}
```

On top of that, object mode has its own pair of types and its own overload, so
that `stream.write` receives exactly what the format function returns:

```ts
interface ObjectModeStreamOptions<Entry extends object> {
    writableObjectMode: true;
    write(entry: Entry): void;
}

interface ObjectModeOptions<Request, Response, Entry extends object>
    extends Omit<Options<Request, Response>, "stream"> {
    stream: ObjectModeStreamOptions<Entry>;
}

declare function morgan<Request, Response, Entry extends object>(
    format: FormatFn<Request, Response, Entry>,
    options: ObjectModeOptions<Request, Response, Entry>,
): Handler<Request, Response>;
```

`Entry` is inferred from the format function, and TypeScript then contextually
types the `write` parameter from it, so nothing needs annotating:

```ts
morgan(
    (tokens, req, res) => ({ url: tokens.url(req, res), status: Number(tokens.status(req, res)) }),
    {
        stream: {
            writableObjectMode: true,
            write(entry) {
                entry.status.toFixed(0); // number
                entry.nope;              // Property 'nope' does not exist
            },
        },
    },
);
```

`writableObjectMode` is the literal `true` rather than an optional boolean
because it is what makes `Entry` true. `index.js` forwards the value unchanged
only under `stream.writableObjectMode && typeof line === 'object'`; without the
flag it writes `line + '\n'`, and the stream receives a string. Typing the entry
as the object in that case would be a lie, so omitting the flag falls through to
the ordinary overload, where `write` takes a `string`.

The consequence to know about: a stream declared as
`morgan.StreamOptions<MyEntry>` no longer fits an object-mode call, because its
`writableObjectMode` is an optional `boolean` rather than `true`. Declare it as
`morgan.ObjectModeStreamOptions<MyEntry>` instead. Streams written inline are
unaffected.

### `Options.stream` is a single type, not a union

`Options.stream` is `StreamOptions<string> | undefined` — no
`NodeJS.WritableStream` member, although `process.stdout` and
`fs.createWriteStream()` are exactly what people pass.

They still work: `NodeJS.WritableStream.write` is
`(buffer: string | Uint8Array, cb?) => boolean`, which satisfies
`(entry: string) => void` structurally, so the union member was redundant. It
was also harmful. TypeScript cannot contextually type a parameter from a union
of two shapes, so with the union in place an inline

```ts
stream: { write(entry) { … } }
```

left `entry` implicitly `any` — silently, in the case the types exist to catch.
Dropping the union gives `entry` its `string` type.

### `buffer` accepts a duration

`index.js` reads `buffer` as `typeof buffer !== 'number' ? 1000 : buffer`, so the
option is `boolean | number` (milliseconds), not `boolean`. Still `@deprecated`.

### The deprecated one-argument call

`morgan(options)` — where the format lives on `options.format` — is typed through
`OptionsWithFormat`, marked `@deprecated`, matching the `depd` warning morgan
emits for it.

### Built-in tokens are named

`TokenIndexer` extends a new `BuiltinTokens` interface listing all fourteen
tokens morgan registers — `url`, `method`, `response-time`, `total-time`, `date`,
`status`, `referrer`, `remote-addr`, `remote-user`, `pid`, `http-version`,
`user-agent`, `req`, `res` — each with documentation for its bracket argument.
The string index signature is still there, so custom tokens work as before.

`pid` arrived in 1.11.0 and `total-time` in 1.10.0; neither was in
`@types/morgan`.

### Format names are documented

`FormatString` is a union of the six registered names plus `string & {}`, so
editors complete `"combined"`, `"common"`, `"dev"`, `"short"`, `"tiny"` and the
deprecated `"default"` while any format string is still accepted.

### `Handler` is exported

`@types/morgan` declared `Handler` as a file-local type, so consumers could not
name the middleware's type. It now lives on the namespace as `morgan.Handler`.

## Intentional tightening

One change is not backwards compatible:

**`TokenCallbackFn` returns `string | number | undefined`** instead of
`string | undefined`. The `res` token returns `res.getHeader(field)`, which Node
types as `number | string | string[] | undefined` (arrays are joined), so the old
signature was wrong. Code that assigned a token result straight to
`string | undefined` needs a coercion:

```ts
const length = String(tokens.res(req, res, "content-length") ?? "");
```

## Behaviour the types only document

* **`NO_COLOR`** — when the environment variable is set to a non-empty value the
  `dev` format is registered without escape sequences. It is read once, at
  require time, so it cannot be expressed in the type system; it is described in
  the JSDoc for `"dev"`.
* **`morgan.default`** — morgan exposes the format registered under the name
  `"default"` as a property, deprecated since 1.0. It is deliberately *not*
  typed. Declaring a namespace member called `default` on an `export =` module
  makes `import morgan from "morgan"` resolve to that property under
  `esModuleInterop`, which breaks the import form morgan's own README
  documents. `morgan-cjs-default-tests.ts` guards against reintroducing it.
* **Escaping** — since 1.11.0 (and tightened in 1.12.1) morgan escapes control
  characters, `"` and `\` in every string a token returns. This is noted on
  `TokenCallbackFn` and on `Morgan.token`, because it changes what a custom
  token may assume about its own output.
