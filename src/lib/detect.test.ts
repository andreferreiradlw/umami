import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getLocation, hasBlockedIp, hasBlockedScreen } from './detect';
import { getIpAddress } from './ip';

const IP = '127.0.0.1';

const isLocalhost = vi.mocked(await import('is-localhost-ip'));

vi.mock('is-localhost-ip', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();

  delete process.env.CLIENT_IP_HEADER;
  delete process.env.IGNORE_IP;
  delete process.env.SKIP_LOCATION_HEADERS;
});

afterEach(() => {
  delete process.env.IGNORE_SCREEN;
  delete process.env.BLOCK_SQUARE_SCREENS;
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

test('hasBlockedScreen: blocks near-square resolutions when BLOCK_SQUARE_SCREENS is set', () => {
  process.env.BLOCK_SQUARE_SCREENS = 'true';

  expect(hasBlockedScreen('1366x1366')).toBe(true);
  expect(hasBlockedScreen('1265x1212')).toBe(true);
  expect(hasBlockedScreen('1332x1326')).toBe(true);
});

test('hasBlockedScreen: allows real (non-square) resolutions when BLOCK_SQUARE_SCREENS is set', () => {
  process.env.BLOCK_SQUARE_SCREENS = 'true';

  expect(hasBlockedScreen('1920x1080')).toBe(false);
  expect(hasBlockedScreen('1280x1024')).toBe(false); // real 5:4 monitor
  expect(hasBlockedScreen('1536x864')).toBe(false);
});

test('hasBlockedScreen: ignores small square resolutions below the size threshold', () => {
  process.env.BLOCK_SQUARE_SCREENS = 'true';

  expect(hasBlockedScreen('800x800')).toBe(false);
});

test('hasBlockedScreen: near-square no-op when BLOCK_SQUARE_SCREENS is unset', () => {
  expect(hasBlockedScreen('1366x1366')).toBe(false);
});

test('getIpAddress: Custom header', () => {
  process.env.CLIENT_IP_HEADER = 'x-custom-ip-header';

  expect(getIpAddress(new Headers({ 'x-custom-ip-header': IP }))).toEqual(IP);
});

test('getIpAddress: Custom header set to x-forwarded-for uses leftmost IP in chain', () => {
  process.env.CLIENT_IP_HEADER = 'x-forwarded-for';

  expect(getIpAddress(new Headers({ 'x-forwarded-for': `${IP}, 10.0.0.1, 10.0.0.2` }))).toEqual(IP);
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

test('getLocation: returns null for malformed ip', async () => {
  await expect(
    getLocation(
      'not-an-ip',
      new Headers({
        'cf-ipcountry': 'US',
        'cf-region-code': 'CA',
        'cf-ipcity': 'Los Angeles',
      }),
      false,
    ),
  ).resolves.toEqual(null);
});

test('getLocation: treats localhost check errors as non-local', async () => {
  isLocalhost.default.mockRejectedValue(new Error('DNS Lookup failed.'));

  await expect(
    getLocation(
      '8.8.8.8',
      new Headers({
        'cf-ipcountry': 'US',
        'cf-region-code': 'CA',
        'cf-ipcity': 'Los Angeles',
      }),
      false,
    ),
  ).resolves.toEqual({
    country: 'US',
    region: 'US-CA',
    city: 'Los Angeles',
  });
});

test('hasBlockedIp: returns false for malformed client ip with cidr block', () => {
  process.env.IGNORE_IP = '10.0.0.0/8';

  expect(hasBlockedIp('not-an-ip')).toBe(false);
});
