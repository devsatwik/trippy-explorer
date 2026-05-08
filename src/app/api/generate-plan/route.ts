import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
  try {
    const { location, interest, radius, coordinates } = await request.json();

    if (!location || !interest) {
      return NextResponse.json({ error: "Location and interest are required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration: API key missing" }, { status: 500 });
    }

    let finalCoordinates = coordinates;

    // If no coordinates were provided from the frontend, geocode the location text to get the center
    if (!finalCoordinates?.lat || !finalCoordinates?.lng) {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (geoData.status === "OK" && geoData.results?.[0]?.geometry?.location) {
        finalCoordinates = {
          lat: geoData.results[0].geometry.location.lat,
          lng: geoData.results[0].geometry.location.lng
        };
      }
    }

    let url = "";
    if (finalCoordinates?.lat && finalCoordinates?.lng && radius) {
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
       console.error("Google Maps API Error:", data);
       if (data.status === "ZERO_RESULTS") {
         return NextResponse.json({ location, interest, places: [] });
       }
       return NextResponse.json({ error: "Failed to fetch places from Google" }, { status: 500 });
    }

    // Map all results, calculate distance, and sort by nearest
    let mappedPlaces = data.results.map((place: any, index: number) => {
      let distanceStr = null;
      let rawDistance = Infinity;
      
      if (finalCoordinates?.lat && finalCoordinates?.lng && place.geometry?.location?.lat && place.geometry?.location?.lng) {
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
