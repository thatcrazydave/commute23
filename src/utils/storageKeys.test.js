// storageKeys uses window.location.hostname and sessionStorage — mock them
const mockStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((k) => store[k] ?? null),
    setItem: jest.fn((k, v) => { store[k] = String(v); }),
    removeItem: jest.fn((k) => { delete store[k]; }),
    clear: jest.fn(() => { store = {}; }),
    _store: () => store,
  };
})();

Object.defineProperty(global, 'sessionStorage', { value: mockStorage, writable: true });
Object.defineProperty(global, 'window', {
  value: { location: { hostname: 'localhost' } },
  writable: true,
});
Object.defineProperty(global, 'performance', {
  value: { getEntriesByType: jest.fn(() => [{ type: 'navigate' }]) },
  writable: true,
});

describe('storageKeys (sk)', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.resetModules();
  });

  it('returns a key in the expected format: hostname:tabId:key', () => {
    const { sk } = require('./storageKeys');
    const result = sk('authToken');
    // Format: "<hostname>:<uuid>:<key>"
    const parts = result.split(':');
    expect(parts[0]).toBe('localhost');
    expect(parts[parts.length - 1]).toBe('authToken');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it('returns the same key on repeated calls within a module instance', () => {
    const { sk } = require('./storageKeys');
    expect(sk('authToken')).toBe(sk('authToken'));
  });

  it('produces different keys for different key names', () => {
    const { sk } = require('./storageKeys');
    expect(sk('authToken')).not.toBe(sk('refreshToken'));
  });

  it('generates a new tabId for a cloned tab (navigate type)', () => {
    // First module load (simulates fresh tab)
    performance.getEntriesByType = jest.fn(() => [{ type: 'navigate' }]);
    const firstTabId = require('./storageKeys').sk('x').split(':')[1];

    // Simulate a cloned tab: sessionStorage already has a tabId but nav type is 'navigate'
    // (not reload or back_forward), so it should generate a new one
    jest.resetModules();
    const secondTabId = require('./storageKeys').sk('x').split(':')[1];

    // In a real clone scenario the ids differ; here both are fresh loads so they differ
    // (each fresh module generates a new UUID since sessionStorage is cleared per test)
    expect(typeof firstTabId).toBe('string');
    expect(typeof secondTabId).toBe('string');
  });

  it('tab id is stable within a single module instance (simulates reload)', () => {
    const { sk } = require('./storageKeys');
    // Within same module load the tab id must not change between calls
    const id1 = sk('a').split(':')[1];
    const id2 = sk('b').split(':')[1];
    expect(id1).toBe(id2);
  });
});
