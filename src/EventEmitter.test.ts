import {EventEmitter} from './EventEmitter';

interface TestEvents {
  test: string;
  end: void;
  error: Error;
  wait: void;
}

const wait = async (ee: EventEmitter<TestEvents>) => {
  ee.emit('wait');
  await ee.once('wait');
};

test('create a new instance without options', () => {
  const ee = new EventEmitter<{}>();
  expect(ee).toBeInstanceOf(EventEmitter);
  expect(ee.end).toBeUndefined();
  expect(ee.error).toBeUndefined();
  expect(ee.maxBufferSize).toBe(Infinity);
});

test('create a new instance with options', () => {
  const ee = new EventEmitter<TestEvents>({end: 'end', error: 'error', maxBufferSize: 42});
  expect(ee).toBeInstanceOf(EventEmitter);
  expect(ee.end).toBe('end');
  expect(ee.error).toBe('error');
  expect(ee.maxBufferSize).toBe(42);
});

test('use `on` method with event listener', async () => {
  const ee = new EventEmitter<TestEvents>();
  const listener = jest.fn();
  ee.on('test', listener);
  ee.emit('test', 'test1');
  ee.emit('test', 'test2');
  await wait(ee);
  expect(listener.mock.calls.length).toBe(2);
  expect(listener.mock.calls[0]).toEqual(['test1']);
  expect(listener.mock.calls[1]).toEqual(['test2']);
});

test('use `once` method with event listener', async () => {
  const ee = new EventEmitter<TestEvents>();
  const listener = jest.fn();
  ee.once('test', listener);
  ee.emit('test', 'test1');
  ee.emit('test', 'test2');
  await wait(ee);
  expect(listener.mock.calls.length).toBe(1);
  expect(listener.mock.calls[0]).toEqual(['test1']);
});

test('use `on` method without event listener', async () => {
  const ee = new EventEmitter<TestEvents>({end: 'end'});
  ee.emit('test', 'test1');
  ee.emit('test', 'test2');
  ee.emit('end');
  const values: string[] = [];
  for await (const value of ee.on('test')) {
    values.push(value);
  }
  expect(values).toEqual(['test1', 'test2']);
});

test('stream returned by `on` method raises an error', async () => {
  const ee = new EventEmitter<TestEvents>({error: 'error'});
  ee.emit('test', 'test1');
  ee.emit('test', 'test2');
  ee.emit('error', new Error('test'));
  const values: string[] = [];
  const afn = async () => {
    for await (const value of ee.on('test')) {
      values.push(value);
    }
  };
  await expect(afn()).rejects.toEqual(new Error('test'));
  expect(values).toEqual(['test1', 'test2']);
});

test('use `once` method without event listener', async () => {
  const ee = new EventEmitter<TestEvents>();
  ee.emit('test', 'test');
  expect(await ee.once('test')).toBe('test');
});

test('promise returned by `once` method raises an error', async () => {
  const ee = new EventEmitter<TestEvents>({error: 'error'});
  ee.emit('error', new Error('test'));
  await expect(ee.once('test')).rejects.toEqual(new Error('test'));
});

test('add listeners inside invoked listener', async () => {
  const ee = new EventEmitter<TestEvents>();

  const onListener = jest.fn();
  const onceListener = jest.fn();
  ee.once('test', () => {
    ee.on('test', onListener);
    ee.once('test', onceListener);
    ee.emit('test', 'test2');
  });
  ee.emit('test', 'test1');

  await ee.once('test'); // First 'await' is invoked by outside emit.
  await ee.once('test'); // Second 'await' is invoked by inside emit.

  expect(onListener.mock.calls).toEqual([['test2']]);
  expect(onceListener.mock.calls).toEqual([['test2']]);
});

test('raise an error of sync event listener', async () => {
  const ee = new EventEmitter<TestEvents>();

  ee.once('wait', () => {
    throw new Error('test');
  });

  await expect(ee.emit('wait')).rejects.toEqual(new Error('test'));
});

test('raise an error of async event listener', async () => {
  const ee = new EventEmitter<TestEvents>();

  ee.once('wait', async () => {
    throw new Error('test');
  });

  await expect(ee.emit('wait')).rejects.toEqual(new Error('test'));
});
