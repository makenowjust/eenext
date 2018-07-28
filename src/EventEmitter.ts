import {Listener, Listeners, addListener, removeListener} from './listeners';
import {Options, StreamOptions, WaitOptions} from './options';
import {createPromise, pCall} from './promises';
import {EventStream, createStream} from './streams';
import {NonVoidKeys, VoidKeys} from './utils';

/**
 * An event emitter class.
 *
 * @param Events event names and types.
 */
export class EventEmitter<Events = any> {
  /**
   * Default event name to detect ending.
   *
   * This property is used by `EventEmitter#stream`.
   */
  public end: keyof Events | undefined;

  /**
   * Default event name to detect an error.
   *
   * This property is used by `EventEmitter#stream` and `EventEmitter#wait`.
   */
  public error: keyof Events | undefined;

  /**
   * Maximum buffer size of `stream`.
   *
   * This property is used by `EventEmitter#stream`.
   *
   * When this value is `<= 0`, it means `stream` does not use buffer.
   *
   * Default value is `Infinity`.
   */
  public maxBufferSize: number;

  /**
   * A flag that is whether emitting or not.
   */
  private _isEmitting: boolean = false;

  /**
   * A listeners mapping of 'on' listsners.
   */
  private readonly _listeners: Listeners<Events> = Object.create(null);

  /**
   * A listeners mapping of 'once' listeners.
   */
  private readonly _onceListeners: Listeners<Events> = Object.create(null);

  /**
   * A queue to collect actions on emitting.
   * It is important to enable that can add or remove an event listener inside a listener.
   */
  private readonly _lazyActions: {
    action: 'on' | 'off' | 'once';
    name: keyof Events;
    listener: Listener<any>;
  }[] = [];

  /**
   * A queue of emitting actions.
   */
  private readonly _emits: {
    resolve: () => void;
    reject: (reason: any) => void;
    name: keyof Events;
    value: any;
  }[] = [];

  /**
   * Create a new `EventEmitter` instance with given options.
   *
   * @param opts a options.
   */
  constructor(opts: Options<Events> = {}) {
    this.end = opts.end;
    this.error = opts.error;
    this.maxBufferSize = opts.maxBufferSize !== undefined ? opts.maxBufferSize : Infinity;
  }

  // Public methods:

  /**
   * Return an event stream.
   * Is is same as `this.stream(name)`.
   *
   * @param name an event name.
   */
  public on<K extends keyof Events>(name: K): EventStream<Events[K]>;

  /**
   * Add event listener.
   *
   * @param name an event name.
   * @param listener an event listener.
   */
  public on<K extends keyof Events>(name: K, listener: Listener<Events[K]>): void;

  // The implementation of `on` method.
  public on<K extends keyof Events>(
    name: K,
    listener?: Listener<Events[K]>,
  ): EventStream<Events[K]> | void {
    // If `listener` is not given, it means the first signature.
    if (!listener) {
      return this.stream(name);
    }

    // Queue this action if emitting.
    if (this._isEmitting) {
      this._lazyActions.push({action: 'on', name, listener});
      return;
    }

    addListener(this._listeners, name, listener);
  }

  /**
   * Return an event promise.
   * It is same as `this.wait(name)`.
   *
   * @param name an event name.
   */
  public once<K extends keyof Events>(name: K): Promise<Events[K]>;

  /**
   * Add event listener invoked only once,
   *
   * @param name an event name.
   * @param listener an event listener.
   */
  public once<K extends keyof Events>(name: K, listener: Listener<Events[K]>): void;

  // The implementation of `once` method.
  public once<K extends keyof Events>(
    name: K,
    listener?: Listener<Events[K]>,
  ): Promise<Events[K]> | void {
    // If `listener` is not given, it means the first signature.
    if (!listener) {
      return this.wait(name);
    }

    // Queue this action if emitting.
    if (this._isEmitting) {
      this._lazyActions.push({action: 'once', name, listener});
      return;
    }

    addListener(this._onceListeners, name, listener);
  }

  /**
   * Remove event listener.
   *
   * @param name an event name.
   * @param listener an event listener.
   */
  public off<K extends keyof Events>(name: K, listener: Listener<Events[K]>): void {
    // Queue this action if emitting.
    if (this._isEmitting) {
      this._lazyActions.push({action: 'off', name, listener});
      return;
    }

    // Try to remove 'once' event listener and return immediately if succeeded.
    if (removeListener(this._onceListeners, name, listener)) {
      return;
    }

    // Or, try to remove 'on' event listener.
    removeListener(this._listeners, name, listener);
  }

  /**
   * Create an event stream.
   *
   * @param next an event name.
   * @param opts options.
   */
  public stream<K extends keyof Events>(
    next: K,
    opts: StreamOptions<Events> = {},
  ): EventStream<Events[K]> {
    const {end = this.end, error = this.error, maxBufferSize = this.maxBufferSize} = opts;

    return createStream(this, next, end, error, maxBufferSize);
  }

  /**
   * Create an event promise.
   *
   * @param name an event name.
   * @param opts options.
   */
  public wait<K extends keyof Events>(name: K, opts: WaitOptions<Events> = {}): Promise<Events[K]> {
    const {error = this.error} = opts;

    return createPromise(this, name, error);
  }

  /**
   * Emit an event with or without the given value.
   *
   * @param name an event name.
   * @param value a value to emit.
   */
  public emit<K extends VoidKeys<Events>>(name: K, value?: Events[K]): Promise<void>;

  /**
   * Emit an event with the given value.
   *
   * @param name an event name.
   * @param value a value to emit.
   */
  public emit<K extends NonVoidKeys<Events>>(name: K, value: Events[K]): Promise<void>;

  // The implementation of `emit` method.
  public emit<K extends keyof Events>(name: K, value: Events[K]): Promise<void> {
    // Fork emitting thread if not forked.
    if (this._emits.length === 0) {
      setImmediate(this._emit);
    }

    // Return a promise.
    return new Promise((resolve, reject) => {
      this._emits.push({resolve, reject, name, value});
    });
  }

  // Private:

  /**
   * Consume `this._emits` and make its loop.
   */
  private readonly _emit = async () => {
    // Dequeue emitting action.
    const {resolve, reject, name, value} = this._emits.shift()!;
    // Need to re-fork emitting thread after this.
    const reforkEmit = this._emits.length > 0;

    // Listener promises collector.
    const promises = [];

    this._isEmitting = true; // Set `true` to collect actions.

    // Invoke 'once' listeners.
    const onceListeners = this._onceListeners[name];
    if (onceListeners && onceListeners.length > 0) {
      for (const listener of onceListeners!) {
        promises.push(pCall(listener, value));
      }
      onceListeners.length = 0; // Remove 'once' listeners.
    }

    // Invoke 'on' listeners.
    const listeners = this._listeners[name];
    if (listeners && listeners.length > 0) {
      for (const listener of listeners!) {
        promises.push(pCall(listener, value));
      }
    }

    // Wait listener promises.
    try {
      await Promise.all(promises);
      resolve();
    } catch (err) {
      reject(err);
    }

    this._isEmitting = false; // End of emitting.

    // Run queued actions.
    if (this._lazyActions.length > 0) {
      for (const {action, name, listener} of this._lazyActions) {
        this[action](name, listener);
      }
      this._lazyActions.length = 0;
    }

    // Re-fork emitting thread.
    if (reforkEmit) {
      setImmediate(this._emit);
    }
  };
}
