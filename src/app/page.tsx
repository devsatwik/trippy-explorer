"use client";

import { useState } from "react";

// Inline SVGs to avoid dependency issues
const MapPinIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CoffeeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>;
const MuseumIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="22" width="16" height="2"></rect><rect x="4" y="2" width="16" height="2"></rect><rect x="6" y="4" width="2" height="18"></rect><rect x="16" y="4" width="2" height="18"></rect><rect x="11" y="4" width="2" height="18"></rect></svg>;
const WalkIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><path d="m9 20 3-6 3 6"></path><path d="m6 12 6-2 6 2"></path><path d="M12 10v4"></path></svg>;

// Hardcoded data for the Hackathon simulation
const ROUTES = {
  normal: [
    { id: 1, name: "The Colosseum", type: "Outdoor", time: "1:00 PM", desc: "Ancient amphitheater exploration." },
    { id: 2, name: "Roman Forum", type: "Outdoor", time: "2:30 PM", desc: "Walk through the ruins of ancient Rome." },
    { id: 3, name: "Piazza Navona", type: "Outdoor", time: "4:00 PM", desc: "Beautiful square with fountains." },
  ],
  rain: [
    { id: 1, name: "The Colosseum (Covered Tour)", type: "Indoor", time: "1:00 PM", desc: "Guided tour focusing on the underground." },
    { id: 4, name: "Capitoline Museums", type: "Indoor", time: "2:30 PM", desc: "World's oldest public museum, safe from rain." },
    { id: 5, name: "Pantheon", type: "Indoor", time: "4:00 PM", desc: "Ancient temple with an oculus (mostly dry inside)." },
  ],
  late: [
    { id: 1, name: "The Colosseum", type: "Outdoor", time: "1:00 PM", desc: "Ancient amphitheater exploration." },
    // Skipped Roman Forum to save time
    { id: 3, name: "Piazza Navona", type: "Outdoor", time: "2:15 PM", desc: "Beautiful square with fountains." },
  ]
};

export default function TrippyAIExplorer() {
  const [step, setStep] = useState<"intake" | "loading" | "map">("intake");
  const [simulation, setSimulation] = useState<"normal" | "rain" | "late">("normal");
  const [selectedVibe, setSelectedVibe] = useState("");

  const handleStart = (vibe: string) => {
    setSelectedVibe(vibe);
    setStep("loading");
    setTimeout(() => {
      setStep("map");
    }, 1500);
  };

  if (step === "loading") {
    return (
      <div className="flex-center" style={{ height: "100vh", flexDirection: "column", gap: "20px" }}>
        <div style={{ animation: "pulse 1.5s infinite" }}>
          <MapPinIcon />
        </div>
        <h2>Generating your dynamic route...</h2>
      </div>
    );
  }

  if (step === "map") {
    const currentRoute = ROUTES[simulation];

    return (
      <div className="app-layout animate-slide-up">
        {/* Sidebar */}
        <div className="sidebar">
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{selectedVibe}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {simulation === "normal" && "Your optimized route based on preferences."}
              {simulation === "rain" && "⚠️ Route updated to indoor locations due to rain."}
              {simulation === "late" && "⚠️ Route shortened to ensure you meet your deadline."}
            </p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {currentRoute.map((stop, index) => (
              <div key={stop.id} className="glass-panel" style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ background: "var(--accent)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold", flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div>
                  <h4 style={{ marginBottom: "0.25rem" }}>{stop.name}</h4>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "flex", gap: "0.5rem" }}>
                    <span>{stop.time}</span> • <span>{stop.type}</span>
                  </div>
                  <p style={{ fontSize: "0.9rem" }}>{stop.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto" }}>
             <button className="btn-secondary" style={{ width: "100%" }} onClick={() => setStep("intake")}>
               Start New Route
             </button>
          </div>
        </div>

        {/* Map Area */}
        <div className="map-container">
          <div className="simulator-controls glass-panel" style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
             <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>Simulate Event:</span>
             <select 
                className="input-field" 
                style={{ width: "auto", padding: "8px 16px", borderRadius: "8px" }}
                value={simulation}
                onChange={(e) => setSimulation(e.target.value as any)}
             >
               <option value="normal">Normal Conditions</option>
               <option value="rain">Heavy Rain</option>
               <option value="late">Running Late</option>
             </select>
          </div>

          {/* Placeholder for actual Mapbox/Leaflet implementation */}
          <div className="flex-center" style={{ height: "100%", width: "100%", flexDirection: "column", gap: "1rem" }}>
             <div style={{ width: "80%", height: "80%", border: "2px dashed var(--panel-border)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "rgba(0,0,0,0.2)" }}>
               <MapPinIcon />
               <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>[Interactive Map Rendered Here]</p>
               <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", maxWidth: "600px" }}>
                  {currentRoute.map(stop => (
                    <div key={stop.id} className="glass-panel" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", border: "1px solid var(--accent)" }}>
                      {stop.name}
                    </div>
                  ))}
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-slide-up" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "1rem", background: "linear-gradient(to right, #f43f5e, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Trippy AI Explorer
        </h1>
        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <MapPinIcon /> Detected Location: <strong style={{ color: "var(--text-main)" }}>Near The Colosseum, Rome</strong>
        </p>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", textAlign: "center" }}>Zero-Click Suggestions:</h3>
        
        <div className="grid-3">
          <div className="glass-panel vibe-card" onClick={() => handleStart("🎨 2-Hr Art & Coffee")}>
            <div className="vibe-icon"><CoffeeIcon /></div>
            <div className="vibe-title">Art & Coffee</div>
            <div className="vibe-desc">A relaxed 2-hour stroll connecting local cafes with hidden street art and galleries.</div>
          </div>
          
          <div className="glass-panel vibe-card" onClick={() => handleStart("🏛️ 3-Hr Ancient Rome Sprint")}>
            <div className="vibe-icon"><MuseumIcon /></div>
            <div className="vibe-title">Ancient Rome Sprint</div>
            <div className="vibe-desc">Maximize your time. Fast-paced walking tour hitting the top 5 historical monuments.</div>
          </div>
          
          <div className="glass-panel vibe-card" onClick={() => handleStart("🍷 Relaxed Evening Walk")}>
            <div className="vibe-icon"><WalkIcon /></div>
            <div className="vibe-title">Relaxed Evening Walk</div>
            <div className="vibe-desc">A slow-paced sunset walk ending at a highly-rated local wine bar.</div>
          </div>
        </div>

        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <p style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>Or create a custom constraint:</p>
          <div style={{ display: "flex", gap: "1rem", maxWidth: "500px", margin: "0 auto" }}>
            <input type="text" className="input-field" placeholder="E.g., I have 1 hour and a bad knee..." />
            <button className="btn-primary" onClick={() => handleStart("Custom Route")}>Build</button>
          </div>
        </div>
      </div>
    </div>
  );
}
