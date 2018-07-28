import {EventEmitter} from './EventEmitter';
import {Listener} from './listeners';

/**
 * Call the given function with the given values,
 * and return the promise to wait this call.
 *
 * @param fn a sync/async function.
 * @param args arguments.
 */
export const pCall = async (fn: (...args: any[]) => void | Promise<void>, ...args: any[]) => {
  await fn(...args);
};

/**
 * Create an event promise.
 *
 * @param emitter an event emitter.
 * @param name an event name.
 * @param error an event name to detect error.
 */
export function createPromise<Events, K extends keyof Events>(
  emitter: EventEmitter<Events>,
  name: K,
  error: keyof Events | undefined,
): Promise<Events[K]> {
  if (!error) {
    return new Promise(resolve => emitter.once(name, resolve));
  }

  return new Promise((resolve, reject) => {
    let resolveListener: Listener<Events[K]>;
    let rejectListener: Listener<any>;

    resolveListener = (value: Events[K]) => {
      emitter.off(error, rejectListener);
      resolve(value);
    };
    rejectListener = (reason: any) => {
      emitter.off(name, resolveListener);
      reject(reason);
    };

    emitter.once(name, resolveListener);
    emitter.once(error, rejectListener);
  });
}
