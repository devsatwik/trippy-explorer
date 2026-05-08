import { NextResponse } from 'next/server';

// --- Utility: Haversine Distance ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

// --- Time estimation based on place type ---
function estimateMinutes(types: string[], interest: string): number {
  const interestLower = interest.toLowerCase();
  if (interestLower.includes('historical') || interestLower.includes('museum')) return 60;
  if (interestLower.includes('cafe') || interestLower.includes('food')) return 40;
  if (interestLower.includes('nature') || interestLower.includes('park') || interestLower.includes('outdoor')) return 50;
  if (interestLower.includes('art') || interestLower.includes('gallery')) return 50;
  if (interestLower.includes('active') || interestLower.includes('adventure') || interestLower.includes('hik')) return 75;
  
  // Fallback: use Google's place types
  if (types?.some((t: string) => ['museum', 'church', 'hindu_temple', 'mosque', 'synagogue'].includes(t))) return 60;
  if (types?.some((t: string) => ['cafe', 'restaurant', 'bakery', 'bar'].includes(t))) return 40;
  if (types?.some((t: string) => ['park', 'campground', 'natural_feature'].includes(t))) return 50;
  if (types?.some((t: string) => ['art_gallery'].includes(t))) return 50;
  if (types?.some((t: string) => ['gym', 'stadium'].includes(t))) return 75;
  
  return 45; // default
}

// --- Security: Simple in-memory rate limiter ---
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// --- Security: Input sanitization ---
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

export async function POST(request: Request) {
  try {
    // --- Rate Limiting ---
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json();

    // --- Input Validation ---
    const location = sanitizeString(body.location, 300);
    if (!location) {
      return NextResponse.json({ error: "Invalid or missing location" }, { status: 400 });
    }

    // Support both single interest (string) and multiple interests (array)
    let interests: string[] = [];
    if (Array.isArray(body.interests)) {
      interests = body.interests.map((i: unknown) => sanitizeString(i, 300)).filter(Boolean) as string[];
    } else if (typeof body.interest === 'string') {
      const single = sanitizeString(body.interest, 300);
      if (single) interests = [single];
    }
    if (interests.length === 0) {
      return NextResponse.json({ error: "At least one interest is required" }, { status: 400 });
    }

    const radius = sanitizeNumber(body.radius, 1, 100) || 20;
    let finalCoordinates = sanitizeCoordinates(body.coordinates);

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Geocode if no coordinates
    if (!finalCoordinates) {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (geoData.status === "OK" && geoData.results?.[0]?.geometry?.location) {
        finalCoordinates = sanitizeCoordinates(geoData.results[0].geometry.location);
      }
    }

    // Fetch places for ALL interests in parallel
    const placesPerInterest = Math.max(2, Math.ceil(8 / interests.length)); // aim for ~8 total places
    const fetchPromises = interests.map(async (interest) => {
      let url = "";
      if (finalCoordinates) {
        const radiusMeters = radius * 1000;
        const keyword = encodeURIComponent(interest);
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${finalCoordinates.lat},${finalCoordinates.lng}&radius=${radiusMeters}&keyword=${keyword}&key=${apiKey}`;
      } else {
        const query = encodeURIComponent(`${interest} in ${location}`);
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK") return [];

      return data.results.slice(0, placesPerInterest).map((place: any) => {
        let rawDistance = Infinity;
        let distanceStr = null;

        if (finalCoordinates && place.geometry?.location?.lat && place.geometry?.location?.lng) {
          rawDistance = getDistanceFromLatLonInKm(
            finalCoordinates.lat, finalCoordinates.lng,
            place.geometry.location.lat, place.geometry.location.lng
          );
          distanceStr = rawDistance < 1 ? `${(rawDistance * 1000).toFixed(0)} m away` : `${rawDistance.toFixed(1)} km away`;
        }

        const duration = estimateMinutes(place.types || [], interest);

        return {
          id: place.place_id,
          name: place.name,
          rating: place.rating || "N/A",
          type: place.types?.[0]?.replace(/_/g, ' ') || "Point of Interest",
          interest: interest,
          address: place.vicinity || place.formatted_address || "Address unavailable",
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng,
          distance: distanceStr,
          _rawDistance: rawDistance,
          duration: duration,
          desc: `A highly rated ${place.types?.[0]?.replace(/_/g, ' ') || 'spot'} in this area.`
        };
      });
    });

    const allResults = await Promise.all(fetchPromises);
    let allPlaces = allResults.flat();

    // Deduplicate by place_id
    const seen = new Set();
    allPlaces = allPlaces.filter((p: any) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Sort by nearest first
    allPlaces.sort((a: any, b: any) => a._rawDistance - b._rawDistance);

    // Take top 8 and build a day plan with start times
    const dayPlaces = allPlaces.slice(0, 8);
    let currentTime = 9 * 60; // Start at 9:00 AM (in minutes)

    const itinerary = dayPlaces.map((p: any) => {
      const startHour = Math.floor(currentTime / 60);
      const startMin = currentTime % 60;
      const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      
      const endTime = currentTime + p.duration;
      const endHour = Math.floor(endTime / 60);
      const endMin = endTime % 60;
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

      // Add travel buffer of 15 min between stops
      currentTime = endTime + 15;

      const { _rawDistance, ...cleanPlace } = p;
      return {
        ...cleanPlace,
        startTime: startTimeStr,
        endTime: endTimeStr,
        durationLabel: p.duration >= 60 ? `${Math.floor(p.duration / 60)}h ${p.duration % 60}m` : `${p.duration} min`
      };
    });

    // Calculate totals
    const totalDuration = dayPlaces.reduce((sum: number, p: any) => sum + p.duration, 0);
    const endMinutes = 9 * 60 + totalDuration + (dayPlaces.length - 1) * 15; // include travel buffers
    const dayEndHour = Math.floor(endMinutes / 60);
    const dayEndMin = endMinutes % 60;

    return NextResponse.json({
      location,
      interests,
      itinerary,
      summary: {
        totalPlaces: itinerary.length,
        totalDuration: totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m` : `${totalDuration} min`,
        dayStart: "09:00",
        dayEnd: `${dayEndHour.toString().padStart(2, '0')}:${dayEndMin.toString().padStart(2, '0')}`,
        travelBuffers: `${(dayPlaces.length - 1) * 15} min`
      }
    });

  } catch (error) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
