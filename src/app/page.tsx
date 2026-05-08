"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useJsApiLoader, GoogleMap, MarkerF, Autocomplete } from "@react-google-maps/api";

const MapPinIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CoffeeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>;
const MuseumIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="22" width="16" height="2"></rect><rect x="4" y="2" width="16" height="2"></rect><rect x="6" y="4" width="2" height="18"></rect><rect x="16" y="4" width="2" height="18"></rect><rect x="11" y="4" width="2" height="18"></rect></svg>;
const WalkIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><path d="m9 20 3-6 3 6"></path><path d="m6 12 6-2 6 2"></path><path d="M12 10v4"></path></svg>;
const StarIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="gold" stroke="gold" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

const INTERESTS = [
  { id: "historical", title: "🏛️ Historical & Culture", desc: "Monuments, ruins, and museums" },
  { id: "cafe", title: "☕ Cafe & Foodie Crawl", desc: "Local eateries and specialty coffee" },
  { id: "nature", title: "🌳 Nature & Outdoors", desc: "Parks, gardens, and trails" },
  { id: "art", title: "🎨 Arts & Museums", desc: "Galleries and creative spaces" },
  { id: "active", title: "🏃 Active & Adventure", desc: "Hiking, biking, and activities" }
];

const libraries: ("places")[] = ['places'];
const mapContainerStyle = { width: '100%', height: '100%' };

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

function TrippyAIExplorer({ mapsApiKey }: { mapsApiKey: string }) {
  const [step, setStep] = useState<"location" | "interests" | "loading" | "itinerary">("location");
  const [location, setLocation] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState<number>(20);
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);

  const onLoadAutocomplete = useCallback((inst: any) => setAutocomplete(inst), []);
  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place.formatted_address) setLocation(place.formatted_address);
    else if (place.name) setLocation(place.name);
    if (place.geometry?.location) {
      setCoordinates({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
    }
  };

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: mapsApiKey, libraries: libraries as any });

  const center = useMemo(() => {
    if (itinerary.length > 0 && itinerary[0].lat && itinerary[0].lng) return { lat: itinerary[0].lat, lng: itinerary[0].lng };
    return { lat: 12.97, lng: 77.59 };
  }, [itinerary]);

  const toggleInterest = (title: string) => {
    setSelectedInterests(prev => prev.includes(title) ? prev.filter(i => i !== title) : [...prev, title]);
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest("");
    }
  };

  const handleAutoDetect = () => {
    setIsDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation(`Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}`); setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsDetecting(false); },
        () => { alert("Location access denied."); setIsDetecting(false); }
      );
    } else { alert("Geolocation not supported"); setIsDetecting(false); }
  };

  const handleGenerate = async () => {
    if (selectedInterests.length === 0) return;
    setStep("loading");
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, interests: selectedInterests, radius, coordinates })
      });
      const data = await res.json();
      setItinerary(data.itinerary || []);
      setSummary(data.summary || null);
    } catch { alert("Failed to generate plan"); }
    finally { setStep("itinerary"); }
  };

  // --- LOCATION STEP ---
  if (step === "location") {
    return (
      <div className="container animate-slide-up" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "1rem", background: "linear-gradient(to right, #f43f5e, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Where are you exploring?</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", textAlign: "center" }}>Enter a city, neighborhood, or let us detect your location.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (location.trim()) setStep("interests"); }} className="glass-panel" style={{ padding: "2rem", width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {isLoaded ? (
            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
              <input type="text" className="input-field" placeholder="e.g. Bangalore, India" value={location} onChange={(e) => setLocation(e.target.value)} required style={{ width: "100%" }} aria-label="Enter your destination city or neighborhood" />
            </Autocomplete>
          ) : (
            <input type="text" className="input-field" placeholder="e.g. Bangalore, India" value={location} onChange={(e) => setLocation(e.target.value)} required aria-label="Enter your destination city or neighborhood" />
          )}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={handleAutoDetect} disabled={isDetecting} aria-label="Auto-detect my current location">{isDetecting ? "Detecting..." : "📍 Auto-Detect"}</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} aria-label="Proceed to interest selection">Next ➔</button>
          </div>
        </form>
      </div>
    );
  }

  // --- INTERESTS STEP (Multi-Select) ---
  if (step === "interests") {
    return (
      <div className="container animate-slide-up" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "4rem 2rem" }}>
        <button onClick={() => setStep("location")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", alignSelf: "flex-start", marginBottom: "2rem" }}>← Back</button>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Plan your perfect day</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Pick all the vibes you want in <strong style={{ color: "white" }}>{location}</strong> — we'll build a full-day itinerary!</p>

        <div style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "400px", alignSelf: "center", width: "100%" }}>
          <label style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "flex", justifyContent: "space-between" }}>
            <span>Search Radius</span><strong style={{ color: "white" }}>{radius} km</strong>
          </label>
          <input type="range" min="1" max="100" value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: "100%", accentColor: "#f43f5e" }} aria-label={`Search radius: ${radius} kilometers`} aria-valuemin={1} aria-valuemax={100} aria-valuenow={radius} />
        </div>

        <div className="grid-3" role="group" aria-label="Select your interests">
          {INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest.title);
            return (
              <div key={interest.id} className={`glass-panel vibe-card ${isSelected ? 'vibe-selected' : ''}`} onClick={() => toggleInterest(interest.title)}
                role="button" tabIndex={0} aria-pressed={isSelected} aria-label={`${interest.title}: ${interest.desc}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleInterest(interest.title); }}}
                style={{ border: isSelected ? "2px solid #f43f5e" : "2px solid transparent", position: "relative" }}>
                {isSelected && <div aria-hidden="true" style={{ position: "absolute", top: "8px", right: "8px", background: "#f43f5e", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "white", fontWeight: "bold" }}>✓</div>}
                <div className="vibe-title">{interest.title}</div>
                <div className="vibe-desc">{interest.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <p style={{ marginBottom: "0.75rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>Add your own vibe:</p>
          <div style={{ display: "flex", gap: "0.75rem", maxWidth: "500px", margin: "0 auto" }}>
            <input type="text" className="input-field" placeholder="e.g., Jazz clubs" value={customInterest} onChange={(e) => setCustomInterest(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomInterest(); }}} />
            <button type="button" className="btn-secondary" onClick={addCustomInterest}>Add</button>
          </div>
          {selectedInterests.filter(i => !INTERESTS.find(x => x.title === i)).length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", marginTop: "1rem" }}>
              {selectedInterests.filter(i => !INTERESTS.find(x => x.title === i)).map(custom => (
                <span key={custom} style={{ background: "rgba(244,63,94,0.2)", border: "1px solid #f43f5e", borderRadius: "20px", padding: "4px 14px", fontSize: "0.85rem", color: "#f43f5e", cursor: "pointer" }}
                  onClick={() => setSelectedInterests(prev => prev.filter(i => i !== custom))}>{custom} ✕</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <button className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.1rem", opacity: selectedInterests.length === 0 ? 0.4 : 1 }}
            disabled={selectedInterests.length === 0} onClick={handleGenerate}>
            🗓️ Plan My Day ({selectedInterests.length} vibe{selectedInterests.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    );
  }

  // --- LOADING ---
  if (step === "loading") {
    return (
      <div className="flex-center" style={{ height: "100vh", flexDirection: "column", gap: "20px" }}>
        <div style={{ animation: "pulse 1.5s infinite" }}><MapPinIcon /></div>
        <h2>Building your perfect day...</h2>
        <p style={{ color: "var(--text-muted)" }}>Finding the best spots across {selectedInterests.length} vibes</p>
      </div>
    );
  }

  // --- ITINERARY (Day Plan) ---
  if (step === "itinerary") {
    return (
      <div className="app-layout animate-slide-up">
        <div className="sidebar">
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🗓️ Your Day Plan</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {summary && <><strong style={{ color: "white" }}>{summary.totalPlaces} stops</strong> · {summary.totalDuration} · {summary.dayStart} – {summary.dayEnd}</>}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "1rem" }}>
            {itinerary.map((place: any, index: number) => (
              <div key={place.id}>
                {/* Place Card */}
                <div className="glass-panel" onMouseEnter={() => setHoveredPlace(place.id)} onMouseLeave={() => setHoveredPlace(null)}
                  style={{ padding: "1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start", border: hoveredPlace === place.id ? "1px solid #f43f5e" : "1px solid transparent", transition: "border 0.2s" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: "48px" }}>
                    <div style={{ background: "var(--accent)", color: "white", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold" }}>{index + 1}</div>
                    <span style={{ fontSize: "0.7rem", color: "#f43f5e", fontWeight: "600" }}>{place.startTime}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: "0.2rem", fontSize: "0.95rem" }}>{place.name}</h4>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "2px" }}><StarIcon /> {place.rating}</span>
                      <span>·</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "2px", color: "#a78bfa" }}><ClockIcon /> {place.durationLabel}</span>
                      {place.distance && <><span>·</span><span style={{ color: "var(--accent)" }}>📍 {place.distance}</span></>}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{place.address}</p>
                  </div>
                </div>
                {/* Travel connector */}
                {index < itinerary.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0 2px 20px" }}>
                    <div style={{ width: "2px", height: "20px", background: "rgba(244,63,94,0.3)", marginLeft: "2px" }}></div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>~15 min travel</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
            <button className="btn-secondary" style={{ width: "100%" }} onClick={() => { setStep("interests"); setItinerary([]); setSummary(null); }}>Replan My Day</button>
          </div>
        </div>

        <div className="map-container">
          {!isLoaded ? (
            <div className="flex-center" style={{ height: "100%", width: "100%", color: "var(--text-muted)" }}>Loading Google Maps...</div>
          ) : (
            <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={13}
              options={{ disableDefaultUI: true, styles: [{"elementType":"geometry","stylers":[{"color":"#212121"}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#212121"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#757575"}]},{"featureType":"administrative.country","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]},{"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},{"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#bdbdbd"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#181818"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#2c2c2c"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#373737"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#3c3c3c"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"}]}]}}>
              {itinerary.map((place: any, index: number) => (
                place.lat && place.lng ? <MarkerF key={place.id} position={{ lat: place.lat, lng: place.lng }} label={{ text: String(index + 1), color: "white", fontWeight: "bold" }} /> : null
              ))}
            </GoogleMap>
          )}
        </div>
      </div>
    );
  }
  return null;
}
