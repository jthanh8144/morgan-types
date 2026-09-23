# @types/morgan

TypeScript definitions for **morgan 1.12**, written against the source of
[morgan 1.12.1](https://github.com/expressjs/morgan). A drop-in replacement for
the `@types/morgan` published on npm, which still tracks 1.9.

The package keeps the name `@types/morgan` on purpose: npm installs it to
`node_modules/@types/morgan`, where TypeScript finds it on its own. Projects
using it need no `paths`, no `typeRoots`, no change to their `tsconfig.json`.

## Install

Install straight from GitHub, under the name `@types/morgan`:

```sh
npm install -D @types/morgan@github:jthanh8144/morgan-types
# pin a tag or commit
npm install -D "@types/morgan@github:jthanh8144/morgan-types#v1.12.0"
```

which writes this to the consuming project's `package.json`:

```jsonc
{
  "devDependencies": {
    "@types/morgan": "github:jthanh8144/morgan-types"
  }
}
```

Other spellings of the same dependency, for yarn, pnpm or SSH:

```sh
yarn add -D @types/morgan@github:jthanh8144/morgan-types
pnpm add -D @types/morgan@github:jthanh8144/morgan-types
npm install -D "@types/morgan@git+ssh://git@github.com/jthanh8144/morgan-types.git"
```

The package has no install-time scripts, so the package manager only clones
the repo and copies `index.d.ts` — it does not install TypeScript or run the
tests on your machine.

### If the project already depends on the published `@types/morgan`

npm resolves a transitive `@types/morgan` (pulled in by another package, or left
in `package-lock.json`) before the git entry, and you end up back on 1.9. Pin
it:

```jsonc
{
  "overrides": {
    "@types/morgan": "github:jthanh8144/morgan-types"
  }
}
```

(yarn: `resolutions`; pnpm: `pnpm.overrides`.)

### Local development

To work on the types against a real project, point the dependency at a
checkout instead:

```jsonc
{
  "devDependencies": {
    "@types/morgan": "file:../morgan-types"
  }
}
```

npm symlinks the folder into `node_modules/@types/morgan`, so edits here show up
in the consuming project immediately — no reinstall, no rebuild.

The installed package carries `index.d.ts`, `README.md`, `LICENSE` and
`package.json` only (the `files` field keeps the tests out). `npm publish` runs
the type tests first, through `prepublishOnly`.

## Verify the install

In the consuming project:

```ts
import morgan from "morgan";

morgan(":pid :method :url :total-time[2] ms");
```

`:pid` (morgan 1.11.0) and `:total-time` (1.10.0) do not exist in the published
`@types/morgan`, so if that line type-checks, the right package is in place.

## Development

```sh
npm install
npm test          # tsc -p test/tsconfig.json
```

`index.d.ts` lives here; this package is the only copy of these definitions.

The suite mixes positive tests with `@ts-expect-error` tests. An
`@ts-expect-error` that stops being an error fails the build, so both directions
are pinned.

| File | Covers |
| --- | --- |
| `test/morgan-tests.ts` | the current API, including object mode and the deprecated surface |
| `test/morgan-compat-tests.ts` | the published `@types/morgan` suite, unchanged, as a regression guard |
| `test/morgan-cjs-default-tests.ts` | `import morgan from "morgan"` in a CommonJS file |
| `test/morgan-esm-tests.mts` | the same, in an ES module |

The two import tests are not redundant. A `.mts` file resolves the default
import through the ESM interop path and keeps passing even when the CommonJS one
is broken — which is how a `default` member on the exported namespace slipped
past the first round of testing here.

## What changed against the published `@types/morgan`

`export = morgan`, the `<Request, Response>` generics and the names `Morgan`,
`FormatFn`, `TokenCallbackFn`, `TokenIndexer`, `Options` and `StreamOptions` are
unchanged, so existing code keeps compiling.

* Format functions may return objects, for streams in `writableObjectMode`
  (morgan 1.12.0). The entry type flows from the format function into
  `stream.write`, so the parameter needs no annotation:

  ```ts
  morgan(
      (tokens, req, res) => ({ url: tokens.url(req, res), status: Number(tokens.status(req, res)) }),
      {
          stream: {
              writableObjectMode: true,
              write(entry) {
                  entry.status.toFixed(0); // number
              },
          },
      },
  );
  ```
* `StreamOptions` gained `writableObjectMode`; `Options.stream` also accepts a
  `NodeJS.WritableStream`.
* `buffer` is `boolean | number`, the number being a flush interval in ms.
* The deprecated one-argument call `morgan(options)` is typed.
* All fourteen built-in tokens are named and documented, including `:pid`
  (1.11.0) and `:total-time` (1.10.0).
* Predefined format names complete in the editor.
* `Handler` is exported as `morgan.Handler`.

One change is **not** backwards compatible: `TokenCallbackFn` returns
`string | number | undefined` instead of `string | undefined`, because the `res`
token returns `res.getHeader(field)`.

[RATIONALE.md](RATIONALE.md) has the full reasoning for each item, including
the bits of morgan's behaviour the types can only document.

## License

MIT, matching morgan.
