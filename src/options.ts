/**
 * A type of `EventEmitter` options.
 *
 * @param Events event names and types.
 */
export interface Options<Events> {
  /**
   * An event name to detect ending.
   */
  end?: keyof Events | undefined;

  /**
   * An event name to detect an error.
   */
  error?: keyof Events | undefined;

  /**
   * Maximum buffer size of stream.
   */
  maxBufferSize?: number | undefined;
}

/**
 * A type of `EventEmitter#stream` options.
 *
 * @param Events event names and types.
 */
export type StreamOptions<Events> = Partial<
  Pick<Options<Events>, 'end' | 'error' | 'maxBufferSize'>
>;

/**
 * A type of `EventEmitter#wait` options.
 *
 * @param Events event names and types.
 */
export type WaitOptions<Events> = Partial<Pick<Options<Events>, 'error'>>;
