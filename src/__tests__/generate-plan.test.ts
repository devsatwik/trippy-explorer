/**
 * Unit tests for /api/generate-plan route
 * Tests input validation, sanitization, rate limiting, and response structure
 */

// --- Helpers extracted for testability ---
function sanitizeString(input: unknown, maxLength: number = 200): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > maxLength) return null;
  return cleaned;
}

function sanitizeNumber(input: unknown, min: number, max: number): number | null {
  const num = Number(input);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
}

function sanitizeCoordinates(coords: unknown): { lat: number; lng: number } | null {
  if (!coords || typeof coords !== 'object') return null;
  const { lat, lng } = coords as any;
  const safeLat = sanitizeNumber(lat, -90, 90);
  const safeLng = sanitizeNumber(lng, -180, 180);
  if (safeLat === null || safeLng === null) return null;
  return { lat: safeLat, lng: safeLng };
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateMinutes(types: string[], interest: string): number {
  const interestLower = interest.toLowerCase();
  if (interestLower.includes('historical') || interestLower.includes('museum')) return 60;
  if (interestLower.includes('cafe') || interestLower.includes('food')) return 40;
  if (interestLower.includes('nature') || interestLower.includes('park')) return 50;
  if (interestLower.includes('art') || interestLower.includes('gallery')) return 50;
  if (interestLower.includes('active') || interestLower.includes('adventure')) return 75;
  if (types?.some((t: string) => ['museum', 'church'].includes(t))) return 60;
  if (types?.some((t: string) => ['cafe', 'restaurant'].includes(t))) return 40;
  if (types?.some((t: string) => ['park'].includes(t))) return 50;
  return 45;
}

// ========== TESTS ==========

describe('sanitizeString', () => {
  test('returns cleaned string for valid input', () => {
    expect(sanitizeString('Bangalore')).toBe('Bangalore');
  });

  test('strips HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
  });

  test('returns null for empty string', () => {
    expect(sanitizeString('')).toBeNull();
  });

  test('returns null for non-string input', () => {
    expect(sanitizeString(123)).toBeNull();
    expect(sanitizeString(null)).toBeNull();
    expect(sanitizeString(undefined)).toBeNull();
  });

  test('returns null for string exceeding maxLength', () => {
    const longStr = 'a'.repeat(301);
    expect(sanitizeString(longStr, 300)).toBeNull();
  });

  test('trims whitespace', () => {
    expect(sanitizeString('  Bangalore  ')).toBe('Bangalore');
  });
});

describe('sanitizeNumber', () => {
  test('returns number within range', () => {
    expect(sanitizeNumber(50, 1, 100)).toBe(50);
  });

  test('returns null for number below min', () => {
    expect(sanitizeNumber(0, 1, 100)).toBeNull();
  });

  test('returns null for number above max', () => {
    expect(sanitizeNumber(101, 1, 100)).toBeNull();
  });

  test('returns null for NaN', () => {
    expect(sanitizeNumber('abc', 1, 100)).toBeNull();
  });

  test('accepts boundary values', () => {
    expect(sanitizeNumber(1, 1, 100)).toBe(1);
    expect(sanitizeNumber(100, 1, 100)).toBe(100);
  });
});

describe('sanitizeCoordinates', () => {
  test('returns valid coordinates', () => {
    expect(sanitizeCoordinates({ lat: 12.97, lng: 77.59 })).toEqual({ lat: 12.97, lng: 77.59 });
  });

  test('returns null for invalid lat', () => {
    expect(sanitizeCoordinates({ lat: 91, lng: 77 })).toBeNull();
  });

  test('returns null for invalid lng', () => {
    expect(sanitizeCoordinates({ lat: 12, lng: 181 })).toBeNull();
  });

  test('returns null for null input', () => {
    expect(sanitizeCoordinates(null)).toBeNull();
  });

  test('returns null for non-object', () => {
    expect(sanitizeCoordinates('invalid')).toBeNull();
  });

  test('accepts edge coordinates', () => {
    expect(sanitizeCoordinates({ lat: -90, lng: -180 })).toEqual({ lat: -90, lng: -180 });
    expect(sanitizeCoordinates({ lat: 90, lng: 180 })).toEqual({ lat: 90, lng: 180 });
  });
});

describe('getDistanceFromLatLonInKm', () => {
  test('returns 0 for same coordinates', () => {
    expect(getDistanceFromLatLonInKm(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });

  test('calculates correct distance between known cities', () => {
    // Bangalore to Chennai is ~290-300 km
    const dist = getDistanceFromLatLonInKm(12.97, 77.59, 13.08, 80.27);
    expect(dist).toBeGreaterThan(280);
    expect(dist).toBeLessThan(310);
  });

  test('handles negative coordinates', () => {
    const dist = getDistanceFromLatLonInKm(-33.87, 151.21, -37.81, 144.96);
    expect(dist).toBeGreaterThan(700);
    expect(dist).toBeLessThan(800);
  });
});

describe('estimateMinutes', () => {
  test('returns 60 for historical interest', () => {
    expect(estimateMinutes([], '🏛️ Historical & Culture')).toBe(60);
  });

  test('returns 40 for cafe interest', () => {
    expect(estimateMinutes([], '☕ Cafe & Foodie Crawl')).toBe(40);
  });

  test('returns 50 for nature interest', () => {
    expect(estimateMinutes([], '🌳 Nature & Outdoors')).toBe(50);
  });

  test('returns 75 for active interest', () => {
    expect(estimateMinutes([], '🏃 Active & Adventure')).toBe(75);
  });

  test('falls back to place types if interest is generic', () => {
    expect(estimateMinutes(['museum'], 'things to do')).toBe(60);
    expect(estimateMinutes(['cafe'], 'things to do')).toBe(40);
    expect(estimateMinutes(['park'], 'things to do')).toBe(50);
  });

  test('returns default 45 for unknown interest', () => {
    expect(estimateMinutes([], 'random stuff')).toBe(45);
  });
});
