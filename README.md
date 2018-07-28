# eenext

> `EventEmitter` for next generation,
> which is well-typed in TypeScript and supports `Promise` and `AsyncIterator`

[![Build Status][travis-badge]](https://travis-ci.org/MakeNowJust/eenext)
[![NPM Version][npm-badge]](https://www.npmjs.com/package/eenext)

## Install

NPM:

```console
$ npm install eenext
```

Yarn:

```console
$ yarn add eenext
```

NOTE: this package uses `setImmediate`, so you maybe need to use `core-js` or
some `setImmediate` shim providers to run this on browsers.

## Features

1.  The best™ typed `EventEmitter` in TypeScript
2.  `Promise` and `AsyncIterator` support
3.  Async `emit`

### The best™ typed `EventEmitter` in TypeScript

You can pass `Events` type parameter to `EventEmitter`.

```typescript
import EventEmitter from 'eenext';

// `Events` type: it is mapper of event name to type.
interface FooEvents {
  foo: string;
  bar: void;
}

const ee = new EventEmitter<FooEvents>();

// It can be compiled because `'foo'` is known event name in `FooEvents`:
ee.on('foo', value => {
  console.log(`foo: ${value}`);
});

// It can be compiled too:
ee.on('bar', () => {
  console.log('bar');
});

// But it cannot be compiled because `'baz'` is not known:
// ee.on('baz', () => {
//   console.log('baz');
// });

ee.emit('foo', 'value');
ee.emit('bar'); // You can omit a value when event type is `void`.

// Also they cannot be compiled:
// ee.emit('foo'); // value is needed.
// ee.emit('foo', 42); // value type is not matched.
// ee.emit('baz', 'value'); // unknown event type.
```

NOTE: Currently `eenext` does not support two or more arguments event due to TypeScript limitation.

### `Promise` and `AsyncIterator` support

`on` method without event listener returns `AsyncIterator`, and `once` returns `Promise`.

```typescript
// `FooEvents` is defined in above example.

// Pass option to set `'bar'` as end event of stream returned by `on` method.
const ee = new EventEmitter<FooEvents>({end: 'bar'});

(async () => {
  // Wait `'foo'` event.
  const foo1st = await ee.once('foo');
  console.log(`foo 1st: ${foo1st}`);

  // Show `'foo'` event value until `'bar'` event emitted.
  for await (const foo of ee.on('foo')) {
    console.log(`foo: ${foo}`);
  }
})();

// Emit events.
ee.emit('foo', '1st');
ee.emit('foo', '2nd');
ee.emit('foo', '3rd');
ee.emit('bar');
```

### Async `emit`

`emit` method is asynchronous action.

It returns a promise to wait for real emitting.

```typescript
const ee = new EventEmitter<FooEvents>();

(async () => {
  // Pass async function as event listener:
  ee.once('bar', async () => {
    console.log('before bar');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('after bar');
  });

  // Wait 1sec to go.
  console.log('before await');
  await ee.emit('bar');
  console.log('after await');

  // Handle error in event listener.
  ee.once('bar', async () => {
    throw new Error('error');
  });

  try {
    await ee.emit('bar');
  } catch (err) {
    console.error(err); // => Error: error
  }
})();
```

## API

```typescript
import EventEmitter from 'eenext';

import {
  Options,
  StreamOptions,
  WaitOptions,
  Listener,
  EventStream,
  VoidKeys,
  NonVoidKeys,
} from 'eenext';
```

### `class EventEmitter<Events = any>`

An event emitter class.

Type Parameters:

- `Events`: event names and types.

#### `constructor(opts: Options<Events>)`

Create a new `EventEmitter` instance with given options.

Arguments:

- `opts`: a options.

#### `on<K extends keyof Events>(name: K, listener: Listener<Events[K]>): void`

Add event listener.

Arguments:

- `name`: an event name.
- `listener`: an event listener.

#### `on<K extends keyof Events>(name: K): EventStream<Events[K]>`

Return an event stream.
Is is same as `this.stream(name)`.

Arguments:

- `name`: an event name.

#### `once<K extends keyof Events>(name: K, listener: Listener<Events[K]>): void`

Add event listener invoked only once,

Arguments:

- `name`: an event name.
- `listener`: an event listener.

#### `once<K extends keyof Events>(name: K): Promise<Events[K]>`

Return an event promise.
It is same as `this.wait(name)`.

Arguments:

- `name`: an event name.

#### `off<K extends keyof Events>(name: K, listener: Listener<Events[K]>): void`

Remove event listener.

Arguments:

- `name`: an event name.
- `listener`: an event listener.

#### `stream<K extends Events>(name: K, opts: StreamOptions<Events>): EventStream<Events[K]>`

Create an event stream.

Arguments:

- `next`: an event name.
- `opts`: options.

#### `wait<K extends Events>(name: K, opts: WaitOptions<Events>): EventStream<Events[K]>`

Create an event promise.

Arguments:

- `name`: an event name.
- `opts`: options.

#### `emit<K extends VoidKeys<Events>>(name: K, value?: Events[K]): Promise<void>`

Emit an event with or without the given value.

Arguments:

- `name`: an event name.
- `value`: a value to emit.

#### `emit<K extends NonVoidKeys<Events>>(name: K, value: Events[K]): Promise<void>`

Emit an event with the given value.

Arguments:

- `name`: an event name.
- `value`: a value to emit.

### `interface Options<Events>`

A type of `EventEmitter` options.

Type Parameters:

- `Events`: event names and types.

Properties:

- `end`: an event name to detect ending (optional).
- `error`: an event name to detect an error (optional).
- `maxBufferSize`: maximum buffer size of stream (optional).

### `type StreamOptions<Events>`

A type of `EventEmitter#stream` options.

Type Parameters:

- `Events`: event names and types.

```typescript
type StreamOptions<Events> = Partial<Pick<Options<Events>, 'end' | 'error' | 'maxBufferSize'>>;
```

### `type WaitOptions<Events>`

A type of `EventEmitter#wait` options.

Type Parameters:

- `Events`: event names and types.

Definition:

```typescript
type WaitOptions<Events> = Partial<Pick<Options<Events>, 'error'>>;
```

### `type Lisrener<T>`

A type of event listener function.

Type Parameters:

- `T`: an event type.

Definition:

```typescript
type Listener<T> = (value: T) => void | Promise<void>;
```

### `interface EventStream<T>`

A type of event stream.
It implements `AsyncIterator<T>` and `AsyncIterable<T>`.

Type Parameters:

- `T`: a value type of this stream.

Methods:

- `next(): Promise<IteratorResult<T>>`
- `return(value?: any): Promise<IteratorResult<T>>`
- `throw(reason?: any): Promise<IteratorResult<T>>`
- `[Symbol.asyncIterator](): AsyncIterator<T>`

### `type VoidKeys<T>`

Like `keyof T` but it only includes `void` typed keys.

Type Parameters:

- `T`: a type.

### `type NonVoidKeys<T>`

Like `keyof T` but it excludes `void` typed keys.

Type Parameters:

- `T`: a type.

## License

MIT License.

[travis-badge]: https://img.shields.io/travis/MakeNowJust/eenext/master.svg?style=for-the-badge&logo=travis&colorA=8B6858
[npm-badge]: https://img.shields.io/npm/v/eenext.svg?style=for-the-badge&colorA=001f34
