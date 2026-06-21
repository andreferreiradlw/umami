import { afterEach, expect, test } from 'vitest';
import { hasBlockedScreen } from './detect';
import { getIpAddress } from './ip';

const IP = '127.0.0.1';

afterEach(() => {
  delete process.env.IGNORE_SCREEN;
});

test('hasBlockedScreen: blocks a listed resolution', () => {
  process.env.IGNORE_SCREEN = '1280x1200,1600x1600,2000x2000';

  expect(hasBlockedScreen('1280x1200')).toBe(true);
  expect(hasBlockedScreen('1600x1600')).toBe(true);
});

test('hasBlockedScreen: trims whitespace in the list', () => {
  process.env.IGNORE_SCREEN = '1280x1200, 1600x1600';

  expect(hasBlockedScreen('1600x1600')).toBe(true);
});

test('hasBlockedScreen: allows resolutions not in the list', () => {
  process.env.IGNORE_SCREEN = '1280x1200';

  expect(hasBlockedScreen('1920x1080')).toBe(false);
});

test('hasBlockedScreen: allows undefined screen', () => {
  process.env.IGNORE_SCREEN = '1280x1200';

  expect(hasBlockedScreen(undefined)).toBe(false);
});

test('hasBlockedScreen: no-op when IGNORE_SCREEN is unset', () => {
  expect(hasBlockedScreen('1280x1200')).toBe(false);
});

test('getIpAddress: Custom header', () => {
  process.env.CLIENT_IP_HEADER = 'x-custom-ip-header';

  expect(getIpAddress(new Headers({ 'x-custom-ip-header': IP }))).toEqual(IP);
});

test('getIpAddress: CloudFlare header', () => {
  expect(getIpAddress(new Headers({ 'cf-connecting-ip': IP }))).toEqual(IP);
});

test('getIpAddress: Standard header', () => {
  expect(getIpAddress(new Headers({ 'x-forwarded-for': IP }))).toEqual(IP);
});

test('getIpAddress: No header', () => {
  expect(getIpAddress(new Headers())).toEqual(undefined);
});
