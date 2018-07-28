## lint

Check code styles.

With `--fix` option, it fixes styles as possible.

```bash
if [[ $1 == --fix ]]; then
  PRETTIER_OPT=--write
  TSLINT_OPT=--fix
else
  PRETTIER_OPT=--list-different
  TSLINT_OPT=
fi
set -ex
prettier-package-json $PRETTIER_OPT
prettier --ignore-path .gitignore $PRETTIER_OPT '**/*.{js,json,md,ts}'
tslint -t stylish -p . $TSLINT_OPT
```

## test

Run tests.

```bash
set -ex
jest "$@"
```

## build

Build bundled library.

```bash
set -ex
rollup -c "$@"
```

## ci

Check the project on CI.

```bash
set -ex
yarn lint
yarn test --coverage
```

## publish

Publish this package.

```bash
set -ex

# Check
yarn lint
yarn test

# Prepare
yarn build

yarn publish
```
