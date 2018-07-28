import {EventEmitter} from './EventEmitter';
import {Listener} from './listeners';

/**
 * A type of pair of promise `resolve` and `reject` functions.
 */
interface Deferred<T> {
  resolve(value: T): void;
  reject(reason: any): void;
}

/**
 * A type of event stream.
 * It implements `AsyncIterator<T>` and `AsyncIterable<T>`.
 *
 * @param T a value type of this stream.
 */
export interface EventStream<T> extends AsyncIterator<T>, AsyncIterable<T> {
  next(): Promise<IteratorResult<T>>;
  return(value?: any): Promise<IteratorResult<T>>;
  throw(reason?: any): Promise<IteratorResult<T>>;
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

/**
 * Create an event stream
 * @param emitter an event emitter.
 * @param next an event name to get next value.
 * @param end an event name to detect ending.
 * @param error an event name to detect error.
 * @param maxBufferSize a maximum size of value buffer.
 */
export function createStream<Events, K extends keyof Events>(
  emitter: EventEmitter<Events>,
  next: K,
  end: keyof Events | undefined,
  error: keyof Events | undefined,
  maxBufferSize: number,
): EventStream<Events[K]> {
  // Internal types:
  type T = Events[K];
  type IT = IteratorResult<T>;
  type Item = IT | {reason: any};

  // Internal state:
  let done = false;
  let queue: Deferred<IT>[] | null = [];
  let buffer: Item[] | null = [];

  // Listeners function to handle `next`, `end` and `error` events.
  let nextListener: Listener<Events[K]>;
  let endListener: Listener<any> | undefined;
  let errorListener: Listener<any> | undefined;

  // Whether the given item means last or not.
  const isLast = (item: Item): boolean => {
    return 'reason' in item || item.done;
  };

  // Resolve or reject queued promises.
  const resolveQueue = (value: IT) => {
    for (const q of queue!) {
      q.resolve(value);
    }
    queue!.length = 0;
  };
  const rejectQueue = (reason: any) => {
    for (const q of queue!) {
      q.reject(reason);
    }
    queue!.length = 0;
  };

  // Send item by `resolve` or `reject`.
  const send = (item: Item, resolve: (value: IT) => void, reject: (reason: any) => void) => {
    if ('reason' in item) {
      reject(item.reason);
    } else {
      resolve(item);
    }

    // Clear `queue` and `buffer` if `item` is last.
    if (isLast(item)) {
      // It is safe, because `queue` and `buffer` must be empty at here.
      queue = null;
      buffer = null;
    }
  };

  // Send `item` if `queue` is not empty, otherwise add `item` to `buffer`.
  const push = (item: Item) => {
    if (queue && queue.length > 0) {
      send(item, resolveQueue, rejectQueue);
    } else if (buffer && !done) {
      buffer.push(item);
      // Check buffer size.
      if (buffer.length > maxBufferSize) {
        buffer.shift();
      }
    }

    if (isLast(item)) {
      done = true;
      emitter.off(next, nextListener);
      if (end && endListener) {
        emitter.off(end, endListener);
      }
      if (error && errorListener) {
        emitter.off(error, errorListener);
      }
    }
  };

  // Send buffered item or return a new promise.
  const pull = (): Promise<IT> => {
    if (buffer && buffer.length > 0) {
      const item = buffer.shift()!;
      return new Promise((resolve, reject) => send(item, resolve, reject));
    }

    if (done) {
      return Promise.resolve({value: undefined, done: true} as any);
    }

    return new Promise((resolve, reject) => {
      queue!.push({resolve, reject});
    });
  };

  // Set `next` event listener.
  nextListener = (value: T) => push({value, done: false});
  emitter.on(next, nextListener);

  // Set `end` listener when `end` is given.
  if (end) {
    endListener = (value: any) => push({value, done: true});
    emitter.once(end, endListener);
  }

  // Set `error` listener when `error` is given.
  if (error) {
    errorListener = (reason: any) => push({reason});
    emitter.once(error, errorListener);
  }

  // Return a object implementing `AsyncStream<T>`.
  return {
    next(): Promise<IT> {
      return pull();
    },

    return(value: any): Promise<IT> {
      push({value, done: true});
      return Promise.resolve({value, done: true});
    },

    throw(reason: any) {
      push({reason});
      return Promise.reject(reason);
    },

    [Symbol.asyncIterator](): AsyncIterator<T> {
      return this;
    },
  };
}
