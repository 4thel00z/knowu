/**
 * @jest-environment jsdom
 */

require('../src/index.js'); // Loads the UMD library, attaching Knowu to window

describe('Knowu Library', () => {
  let knowuInstance;
  const dummyUrl = 'http://dummy-endpoint.test';

  beforeEach(() => {
    // Create an instance with sendOnLoad disabled for testing.
    knowuInstance = new window.Knowu(dummyUrl, { sendOnLoad: false });
  });

  test('should attach Knowu to window', () => {
    expect(window.Knowu).toBeDefined();
    expect(typeof window.Knowu).toBe('function');
  });

  test('record() returns a fingerprint object with expected properties', async () => {
    const fp = await knowuInstance.record();
    expect(fp).toBeDefined();
    expect(typeof fp).toBe('object');
    expect(fp).toHaveProperty('canvas');
    expect(fp).toHaveProperty('webgl');
    expect(fp).toHaveProperty('webglExtensions');
    expect(fp).toHaveProperty('fonts');
    expect(fp).toHaveProperty('screen');
    expect(fp).toHaveProperty('recorded_at');
  });

  test('send() calls fetch with proper parameters', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
    const dummyFingerprint = { test: 'data' };
    const response = await knowuInstance.send(dummyFingerprint);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(dummyUrl, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dummyFingerprint)
    }));
    // Clean up the fetch mock.
    global.fetch.mockRestore();
  });
});

