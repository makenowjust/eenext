/**
 * A type of event listener function.
 *
 * @param T an event type.
 */
export type Listener<T> = (value: T) => void | Promise<void>;

/**
 * A type of listeners mapping.
 *
 * @param Events event names and types.
 */
export type Listeners<Events> = {[K in keyof Events]?: Listener<Events[K]>[]};

/**
 * Add event listener to listeners mapping.
 *
 * @param listeners listeners mapping
 * @param name an event name.
 * @param listener an event listener.
 */
export const addListener = <Events, K extends keyof Events>(
  listeners: Listeners<Events>,
  name: K,
  listener: Listener<Events[K]>,
): void => {
  if (!listeners[name]) {
    listeners[name] = [];
  }

  listeners[name]!.push(listener);
};

/**
 * Remove event listener from listeners mapping.
 *
 * @param listeners listeners mapping.
 * @param name an event name.
 * @param listener an event listener.
 * @returns whether removed event listener or not.
 */
export const removeListener = <Events, K extends keyof Events>(
  listeners: Listeners<Events>,
  name: K,
  listener: Listener<Events[K]>,
): boolean => {
  const list = listeners[name];
  if (!list) {
    return false;
  }

  const index = list.indexOf(listener);
  if (index === -1) {
    return false;
  }

  list.splice(index, 1);

  return true;
};
