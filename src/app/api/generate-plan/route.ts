import { NextResponse } from 'next/server';

// --- Utility: Haversine Distance ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

// --- Security: Simple in-memory rate limiter ---
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15;      // max 15 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// --- Security: Input sanitization ---
function sanitizeString(input: unknown, maxLength: number = 200): string | null {
  if (typeof input !== 'string') return null;
  // Strip any HTML tags and trim whitespace
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
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // --- Input Validation ---
    const location = sanitizeString(body.location, 300);
    const interest = sanitizeString(body.interest, 300);
    if (!location || !interest) {
      return NextResponse.json({ error: "Invalid or missing location/interest" }, { status: 400 });
    }

    const radius = sanitizeNumber(body.radius, 1, 100) || 20; // Default 20km, max 100km
    let finalCoordinates = sanitizeCoordinates(body.coordinates);

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // If no coordinates were provided from the frontend, geocode the location text to get the center
    if (!finalCoordinates) {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (geoData.status === "OK" && geoData.results?.[0]?.geometry?.location) {
        finalCoordinates = sanitizeCoordinates(geoData.results[0].geometry.location);
      }
    }

    let url = "";
    if (finalCoordinates) {
      const radiusMeters = radius * 1000;
      const keyword = encodeURIComponent(interest);
      // Use nearbysearch for strict radius adherence around the coordinates
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${finalCoordinates.lat},${finalCoordinates.lng}&radius=${radiusMeters}&keyword=${keyword}&key=${apiKey}`;
    } else {
      const query = encodeURIComponent(`${interest} in ${location}`);
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
       console.error("Google Maps API Error:", data.status);
       if (data.status === "ZERO_RESULTS") {
         return NextResponse.json({ location, interest, places: [] });
       }
       return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 });
    }

    // Map all results, calculate distance, and sort by nearest
    let mappedPlaces = data.results.map((place: any, index: number) => {
      let distanceStr = null;
      let rawDistance = Infinity;
      
      if (finalCoordinates && place.geometry?.location?.lat && place.geometry?.location?.lng) {
        rawDistance = getDistanceFromLatLonInKm(
          finalCoordinates.lat, 
          finalCoordinates.lng, 
          place.geometry.location.lat, 
          place.geometry.location.lng
        );
        distanceStr = rawDistance < 1 ? `${(rawDistance * 1000).toFixed(0)} m away` : `${rawDistance.toFixed(1)} km away`;
      }

      return {
        id: place.place_id || index,
        name: place.name,
        rating: place.rating || "N/A",
        type: place.types?.[0]?.replace(/_/g, ' ') || "Point of Interest",
        address: place.vicinity || place.formatted_address || "Address unavailable",
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        distance: distanceStr,
        _rawDistance: rawDistance,
        desc: `A highly rated ${place.types?.[0]?.replace(/_/g, ' ') || 'spot'} in this area.`
      };
    });

    // Sort by nearest distance ascending
    mappedPlaces.sort((a: any, b: any) => a._rawDistance - b._rawDistance);

    // Grab top 5 and remove internal distance marker
    const places = mappedPlaces.slice(0, 5).map((p: any) => {
      const { _rawDistance, ...cleanPlace } = p;
      return cleanPlace;
    });

    return NextResponse.json({
      location,
      interest,
      places
    });

  } catch (error) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
