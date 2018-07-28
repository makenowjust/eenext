import {EventEmitter} from './EventEmitter';
import {createPromise} from './promises';

interface TestEvents {
  test: string;
  error: Error;
}

test('resolve promise', async () => {
  const ee = new EventEmitter<TestEvents>();
  ee.emit('test', 'test');
  expect(await createPromise(ee, 'test', 'error')).toBe('test');
});

test('reject promise', async () => {
  const ee = new EventEmitter<TestEvents>();
  ee.emit('error', new Error('test'));
  await expect(createPromise(ee, 'test', 'error')).rejects.toEqual(new Error('test'));
});
