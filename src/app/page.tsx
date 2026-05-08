"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useJsApiLoader, GoogleMap, MarkerF, Autocomplete } from "@react-google-maps/api";

// Inline SVGs
const MapPinIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CoffeeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>;
const MuseumIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="22" width="16" height="2"></rect><rect x="4" y="2" width="16" height="2"></rect><rect x="6" y="4" width="2" height="18"></rect><rect x="16" y="4" width="2" height="18"></rect><rect x="11" y="4" width="2" height="18"></rect></svg>;
const WalkIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><path d="m9 20 3-6 3 6"></path><path d="m6 12 6-2 6 2"></path><path d="M12 10v4"></path></svg>;
const StarIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="gold" stroke="gold" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;

const INTERESTS = [
  { id: "historical", icon: <MuseumIcon />, title: "🏛️ Historical & Culture", desc: "Monuments, ruins, and museums" },
  { id: "cafe", icon: <CoffeeIcon />, title: "☕ Cafe & Foodie Crawl", desc: "Local eateries and specialty coffee" },
  { id: "nature", icon: <WalkIcon />, title: "🌳 Nature & Outdoors", desc: "Parks, gardens, and trails" },
  { id: "art", icon: <MuseumIcon />, title: "🎨 Arts & Museums", desc: "Galleries and creative spaces" },
  { id: "active", icon: <WalkIcon />, title: "🏃 Active & Adventure", desc: "Hiking, biking, and activities" }
];

const libraries: ("places")[] = ['places'];
const mapContainerStyle = { width: '100%', height: '100%' };

// --- Wrapper component: fetches key first, then renders the real app ---
export default function AppWrapper() {
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => setMapsApiKey(data.mapsApiKey || ""))
      .catch(() => setMapsApiKey(""));
  }, []);

  if (mapsApiKey === null) {
    return (
      <div className="flex-center" style={{ height: "100vh", flexDirection: "column", gap: "20px" }}>
        <div style={{ animation: "pulse 1.5s infinite" }}><MapPinIcon /></div>
        <h2 style={{ color: "var(--text-muted)" }}>Loading Trippy Explorer...</h2>
      </div>
    );
  }

  return <TrippyAIExplorer mapsApiKey={mapsApiKey} />;
}

// --- Main Application ---
function TrippyAIExplorer({ mapsApiKey }: { mapsApiKey: string }) {
  const [step, setStep] = useState<"location" | "interests" | "loading" | "itinerary">("location");
  
  // State
  const [location, setLocation] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [customInterest, setCustomInterest] = useState("");
  const [places, setPlaces] = useState<any[]>([]);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState<number>(20);

  const onLoadAutocomplete = useCallback((autocompleteInstance: any) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setLocation(place.formatted_address);
      } else if (place.name) {
        setLocation(place.name);
      }
      if (place.geometry?.location) {
        setCoordinates({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: mapsApiKey,
    libraries: libraries as any
  });

  const center = useMemo(() => {
    if (places && places.length > 0 && places[0].lat && places[0].lng) {
      return { lat: places[0].lat, lng: places[0].lng };
    }
    return { lat: 40.7128, lng: -74.0060 };
  }, [places]);

  // Step 1: Auto-Detect Location
  const handleAutoDetect = () => {
    setIsDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`Lat: ${position.coords.latitude.toFixed(2)}, Lng: ${position.coords.longitude.toFixed(2)}`);
          setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
          setIsDetecting(false);
        },
        () => {
          alert("Location access denied. Please enter it manually.");
          setIsDetecting(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
      setIsDetecting(false);
    }
  };

  const submitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) setStep("interests");
  };

  // Step 2 & 3: Generate Plan
  const handleGenerate = async (interestId: string) => {
    setSelectedInterest(interestId);
    setStep("loading");

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, interest: interestId, radius, coordinates })
      });
      const data = await response.json();
      setPlaces(data.places || []);
    } catch (err) {
      console.error(err);
      alert("Failed to generate plan");
    } finally {
      setStep("itinerary");
    }
  };

  // View: Location Intake
  if (step === "location") {
    return (
      <div className="container animate-slide-up" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "1rem", background: "linear-gradient(to right, #f43f5e, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Where are you exploring?
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", textAlign: "center" }}>
          Enter a city, neighborhood, or let us detect your location to start planning.
        </p>

        <form onSubmit={submitLocation} className="glass-panel" style={{ padding: "2rem", width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {isLoaded ? (
            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Bangalore, India" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </Autocomplete>
          ) : (
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Bangalore, India" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          )}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={handleAutoDetect} disabled={isDetecting}>
              {isDetecting ? "Detecting..." : "📍 Auto-Detect"}
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Next ➔</button>
          </div>
        </form>
      </div>
    );
  }

  // View: Interests Selection
  if (step === "interests") {
    return (
      <div className="container animate-slide-up" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "4rem 2rem" }}>
        <button onClick={() => setStep("location")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", alignSelf: "flex-start", marginBottom: "2rem" }}>
          ← Back to location
        </button>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>What's your vibe?</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "3rem" }}>Select what you'd like to explore in <strong style={{ color: "white" }}>{location}</strong></p>

        <div style={{ marginBottom: "3rem", display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "400px", alignSelf: "center", width: "100%" }}>
          <label style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "flex", justifyContent: "space-between" }}>
            <span>Search Radius</span>
            <strong style={{ color: "white" }}>{radius} km</strong>
          </label>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={radius} 
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#f43f5e" }}
          />
        </div>

        <div className="grid-3">
          {INTERESTS.map((interest) => (
            <div key={interest.id} className="glass-panel vibe-card" onClick={() => handleGenerate(interest.title)}>
              <div className="vibe-icon">{interest.icon}</div>
              <div className="vibe-title">{interest.title}</div>
              <div className="vibe-desc">{interest.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <p style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>Or type your own custom vibe:</p>
          <form 
            onSubmit={(e) => { e.preventDefault(); if (customInterest.trim()) handleGenerate(customInterest); }}
            style={{ display: "flex", gap: "1rem", maxWidth: "500px", margin: "0 auto" }}
          >
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g., Hidden bookstores and jazz clubs" 
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
            />
            <button type="submit" className="btn-primary">Generate</button>
          </form>
        </div>
      </div>
    );
  }

  // View: Loading
  if (step === "loading") {
    return (
      <div className="flex-center" style={{ height: "100vh", flexDirection: "column", gap: "20px" }}>
        <div style={{ animation: "pulse 1.5s infinite" }}>
          <MapPinIcon />
        </div>
        <h2>Scouring Google Maps for the best {selectedInterest?.split(' ')[0]} spots...</h2>
      </div>
    );
  }

  // View: Generated Itinerary
  if (step === "itinerary") {
    return (
      <div className="app-layout animate-slide-up">
        {/* Sidebar */}
        <div className="sidebar">
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Your Plan</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Curated places for <strong style={{ color: "white" }}>{selectedInterest}</strong> in <strong style={{ color: "white" }}>{location}</strong>.
            </p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {places.map((place, index) => (
              <div key={place.id} className="glass-panel" style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ background: "var(--accent)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold", flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div>
                  <h4 style={{ marginBottom: "0.25rem" }}>{place.name}</h4>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "2px" }}><StarIcon /> {place.rating}</span> • <span>{place.type}</span>
                    {place.distance && (
                      <> • <span style={{ color: "var(--accent)" }}>📍 {place.distance}</span></>
                    )}
                  </div>
                  <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>{place.desc}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>📍 {place.address}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
             <button className="btn-secondary" style={{ width: "100%" }} onClick={() => setStep("location")}>
               Plan Another Trip
             </button>
          </div>
        </div>

        {/* Map Area */}
        <div className="map-container">
          {!isLoaded ? (
            <div className="flex-center" style={{ height: "100%", width: "100%", color: "var(--text-muted)" }}>
              Loading Google Maps...
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={14}
              options={{ disableDefaultUI: true, styles: [ { "elementType": "geometry", "stylers": [ { "color": "#212121" } ] }, { "elementType": "labels.icon", "stylers": [ { "visibility": "off" } ] }, { "elementType": "labels.text.fill", "stylers": [ { "color": "#757575" } ] }, { "elementType": "labels.text.stroke", "stylers": [ { "color": "#212121" } ] }, { "featureType": "administrative", "elementType": "geometry", "stylers": [ { "color": "#757575" } ] }, { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [ { "color": "#9e9e9e" } ] }, { "featureType": "administrative.land_parcel", "stylers": [ { "visibility": "off" } ] }, { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [ { "color": "#bdbdbd" } ] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [ { "color": "#757575" } ] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [ { "color": "#181818" } ] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [ { "color": "#616161" } ] }, { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [ { "color": "#1b1b1b" } ] }, { "featureType": "road", "elementType": "geometry.fill", "stylers": [ { "color": "#2c2c2c" } ] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#8a8a8a" } ] }, { "featureType": "road.arterial", "elementType": "geometry", "stylers": [ { "color": "#373737" } ] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [ { "color": "#3c3c3c" } ] }, { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [ { "color": "#4e4e4e" } ] }, { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [ { "color": "#616161" } ] }, { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [ { "color": "#757575" } ] }, { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#000000" } ] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#3d3d3d" } ] } ] }}
            >
              {places.map((place, index) => (
                place.lat && place.lng ? (
                  <MarkerF 
                    key={place.id} 
                    position={{ lat: place.lat, lng: place.lng }} 
                    label={{ text: String(index + 1), color: "white", fontWeight: "bold" }}
                  />
                ) : null
              ))}
            </GoogleMap>
          )}
        </div>
      </div>
    );
  }

  return null;
}
