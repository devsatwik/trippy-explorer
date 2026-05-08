# Trippy AI Explorer: Dynamic Travel Engine 🌍

## 1. Chosen Vertical
**Smart Assistant & Travel Logistics**
Trippy AI Explorer is a dynamic, intelligent travel assistant designed to instantly generate custom, location-based itineraries. Instead of forcing users to sift through endless travel blogs, the assistant intelligently curates points of interest based on the user's specific location, exact travel radius, and personal "vibe" (interests).

## 2. Approach and Logic
Our goal was to build a fluid, frictionless 3-step intake wizard that mimics a real conversation with a travel agent:
1. **Location Detection:** We utilize HTML5 Geolocation and Google Places Autocomplete to seamlessly capture the user's exact geographic coordinates.
2. **Contextual Intent:** The user defines a hyper-specific search radius and selects an interest (e.g., "Historical & Culture" or a custom input like "Quiet bookstores").
3. **Dynamic Generation:** Rather than relying on a static database, the backend acts as an intelligent proxy, taking the user's strict boundaries and interests, and dynamically querying the Google Places ecosystem to return real-time, highly rated, and accurate results.

We utilized Next.js (App Router) for a unified full-stack architecture, allowing us to keep the frontend highly interactive (React 18) while securely keeping our core Google API keys hidden on the server.

## 3. How the Solution Works
1. **Frontend Intake:** The user enters a location. If they type a city (e.g., "Bangalore"), the **Google Places Autocomplete API** instantly standardizes the address and fetches the exact Latitude/Longitude coordinates. If they hit enter without selecting an option, a fallback server-side **Google Geocoding API** call is made to extract the coordinates.
2. **Parameter Refinement:** The user selects a search radius (1km to 100km) and an activity category.
3. **Backend Processing:** A `POST` request is sent to our Next.js backend (`/api/generate-plan`).
4. **Google Places Integration:** The backend dynamically constructs a **Google Places Nearby Search API** call, strictly bounding the geographic search to the user's exact coordinates and radius. 
5. **Data Orchestration:** The backend calculates the Haversine distance between the user's origin and each returned place. It then sorts the locations strictly by distance (nearest first).
6. **Interactive Visualization:** The top 5 results are returned to the client and beautifully plotted on a custom dark-mode map powered by the **Google Maps JavaScript API** (`@react-google-maps/api`).

## 4. Google Services Integrations
This project deeply integrates multiple Google Maps Platform APIs:
- **Places Autocomplete API:** For standardized location entry and coordinate extraction.
- **Geocoding API:** Used as a robust server-side fallback to convert raw text into actionable lat/lng coordinates.
- **Places Nearby Search API:** To fetch highly-rated, real-time establishments strictly bounded by geographic coordinates and radius.
- **Maps JavaScript API:** Renders a fully interactive, custom-styled map with functional markers (`MarkerF`) that match the itinerary.

## 5. Assumptions Made
- **Transportation:** We assume the user is planning to travel from a central "hub" (the location they entered) to the surrounding areas within the radius.
- **Data Availability:** We assume that Google Places has sufficient data for the user's custom vibe in their selected city. If no results are found (e.g., "Eiffel Tower" in "New York"), the backend safely handles the `ZERO_RESULTS` status and returns an empty array to prevent application crashes.
- **Environment:** We assume the application will be hosted on a platform that supports Node.js serverless functions (like Google Cloud Run or Vercel), allowing the `/api/generate-plan` route to securely process API calls without exposing the `GOOGLE_PLACES_API_KEY` to the client.

## 6. How to Run Locally
1. Clone the repository.
2. Create a `.env.local` file in the root directory.
3. Add your keys:
   ```env
   GOOGLE_PLACES_API_KEY=your_key_here
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
   ```
4. Run `npm install`
5. Run `npm run dev`
6. Open `http://localhost:3000`
