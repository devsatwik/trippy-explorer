import { NextResponse } from 'next/server';

/**
 * Secure API endpoint to provide the Maps API key to the frontend at runtime.
 * The key is stored as a server-side environment variable in Cloud Run,
 * never hardcoded in source code or Docker images.
 */
export async function GET() {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!mapsApiKey) {
    return NextResponse.json({ error: "Maps API key not configured" }, { status: 500 });
  }

  return NextResponse.json({ mapsApiKey });
}
