import {EventEmitter} from './EventEmitter';
import {createStream} from './streams';

interface TestEvents {
  test: string;
  end: void;
  error: Error;
}

test('call `return` to finish stream', async () => {
  const ee = new EventEmitter<TestEvents>();
  const stream = createStream(ee, 'test', 'end', 'error', Infinity);
  expect(await stream.return('return1')).toEqual({value: 'return1', done: true});
  expect(await stream.return('return2')).toEqual({value: 'return2', done: true});
  ee.emit('test', 'test1');
  expect(await stream.next()).toEqual({value: 'return1', done: true});
  expect(await stream.next()).toEqual({value: undefined, done: true});
});

test('call `throw` to finish stream', async () => {
  const ee = new EventEmitter<TestEvents>();
  const stream = createStream(ee, 'test', 'end', 'error', Infinity);
  await expect(stream.throw(new Error('error1'))).rejects.toEqual(new Error('error1'));
  await expect(stream.throw(new Error('error2'))).rejects.toEqual(new Error('error2'));
  ee.emit('test', 'test1');
  await expect(stream.next()).rejects.toEqual(new Error('error1'));
  expect(await stream.next()).toEqual({value: undefined, done: true});
});

test('finish stream by `end` event quickly', async () => {
  const ee = new EventEmitter<TestEvents>();
  const stream = createStream(ee, 'test', 'end', 'error', Infinity);
  ee.emit('end');
  const values: string[] = [];
  for await (const value of stream) {
    values.push(value);
  }
  expect(values).toEqual([]);
});

test('finish stream by `error` event quickly', async () => {
  const ee = new EventEmitter<TestEvents>();
  const stream = createStream(ee, 'test', 'end', 'error', Infinity);
  ee.emit('error', new Error('test'));
  const values: string[] = [];
  const afn = async () => {
    for await (const value of stream) {
      values.push(value);
    }
  };
  await expect(afn()).rejects.toEqual(new Error('test'));
  expect(values).toEqual([]);
});

test('drop item exceeded `maxBufferSize`', async () => {
  const ee = new EventEmitter<TestEvents>();
  const stream = createStream(ee, 'test', 'end', 'error', 2);
  ee.emit('test', 'test1');
  ee.emit('test', 'test2');
  ee.emit('end');
  await ee.once('end');
  const values: string[] = [];
  for await (const value of stream) {
    values.push(value);
  }
  expect(values).toEqual(['test2']);
});
