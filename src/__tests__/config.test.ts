/**
 * Unit tests for /api/config logic
 * Tests secure API key selection from environment variables
 */

// Test the key selection logic directly (without importing Next.js server modules)
function getApiKey(env: Record<string, string | undefined>): string | null {
  return env.GOOGLE_MAPS_API_KEY || env.GOOGLE_PLACES_API_KEY || null;
}

describe('Config API - Key Selection Logic', () => {
  test('prefers GOOGLE_MAPS_API_KEY when both are set', () => {
    const key = getApiKey({ GOOGLE_MAPS_API_KEY: 'maps-key', GOOGLE_PLACES_API_KEY: 'places-key' });
    expect(key).toBe('maps-key');
  });

  test('falls back to GOOGLE_PLACES_API_KEY when MAPS key is missing', () => {
    const key = getApiKey({ GOOGLE_PLACES_API_KEY: 'places-key' });
    expect(key).toBe('places-key');
  });

  test('returns null when no keys are set', () => {
    const key = getApiKey({});
    expect(key).toBeNull();
  });

  test('returns null when keys are undefined', () => {
    const key = getApiKey({ GOOGLE_MAPS_API_KEY: undefined, GOOGLE_PLACES_API_KEY: undefined });
    expect(key).toBeNull();
  });

  test('does not return empty string as valid key', () => {
    const key = getApiKey({ GOOGLE_MAPS_API_KEY: '', GOOGLE_PLACES_API_KEY: 'valid-key' });
    expect(key).toBe('valid-key');
  });
});
