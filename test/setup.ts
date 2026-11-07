import { getSnapshot, setToasterAnimation, toast } from '../src/store';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  setToasterAnimation('default', undefined);
  toast.clear();
  jest.runOnlyPendingTimers();
  if (getSnapshot().length > 0) {
    toast.dismiss();
    jest.runOnlyPendingTimers();
  }
  jest.useRealTimers();
});
