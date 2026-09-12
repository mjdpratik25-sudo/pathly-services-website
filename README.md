# Pathly — AI Logistics & Route Intelligence Platform 🚚🛰️

> **Real-time accessibility monitoring, predictive weather radar, GPS fleet coordination, and in-cab driver guidance across Northeast India.**

[![Live Production](https://img.shields.io/badge/Live_Production-pathly--services--website.vercel.app-blue?style=for-the-badge&logo=vercel)](https://pathly-services-website.vercel.app)
[![Built for NER](https://img.shields.io/badge/Region-Northeast_India_NER-emerald?style=for-the-badge)](https://pathly-services-website.vercel.app)
[![Theme](https://img.shields.io/badge/UI-Government_Standard_Theme-0B3D6D?style=for-the-badge)](https://pathly-services-website.vercel.app)

---

## 🌟 Overview

**Pathly** is an emergency logistics intelligence and route optimization platform engineered specifically for the challenging mountain corridors, landslide-prone highways, and flood-vulnerable supply lines of **Northeast India** — covering Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, and Sikkim.

The platform connects state disaster response forces, transport control rooms, and field drivers into a unified operating picture with real-time GPS fleet tracking, predictive weather routing, turn-by-turn driver navigation, and emergency Fast2SMS priority dispatches.

- **Live Production URL**: [https://pathly-services-website.vercel.app](https://pathly-services-website.vercel.app)
- **Deployment Platform**: Vercel (Edge CDN + Serverless Express APIs)

---

## 🚀 Key Modules & Capabilities

### 1. 🗺️ Dual-Engine GIS Map & Tactical Radar (`/`, `/accessibility`)
- **Google Maps & Leaflet GIS**: Interactive vector maps tracking active highway corridors (NH-27, NH-44, NH-37, NH-102), strategic river bridges, and emergency helipads.
- **Corridor Health & Mountain Risk Matrix**: Real-time status indicators (Open, At-Risk, Blocked, Under Repair) with soil saturation indices and flood levels.
- **High-Contrast & Tactical Modes**: Quick toggle between official national government theme and high-contrast night tactical mode.

### 2. 🚛 Smart Routing Engine with Order Linking (`/routes`)
- **Order-Tied Route Planning**: Associate computed routes directly with registered consignment IDs (e.g. `ORD-AS-90412`, `ORD-MN-51190`).
- **Disruption Bypass Logic**: Automatically detects corridor blockades (such as the NH-2 Imphal–Moreh landslide) and computes safe alternatives via bypass corridors (e.g. MDR Kakching corridor).
- **Consignment Preset Chips**: One-click demo presets for judges and evaluators covering essential medicine, food grains, fuel, and heavy construction equipment.
- **Dispatch to Fleet**: Dispatches routes directly to active fleet vehicles and saves assignments to the persistent order-route registry.

### 3. 🧭 Driver Mode — In-Cab Turn-by-Turn Navigation (`/driver-mode`)
- **Detailed Multi-Waypoint Guidance**: 7 realistic intermediate waypoints along the NH-44 corridor (Guwahati ➔ Jorabat ➔ Jagi Road ➔ Raha ➔ Nagaon ➔ Kaliabhomora Setu ➔ Tezpur) summing exactly to **178 km**.
- **Critical Bridge Landmark Flag**: Special visual icon and badge for the Kaliabhomora Setu Brahmaputra river crossing with 40-tonne gross vehicle weight checks.
- **In-Cab Route Setup**: Drivers can set or adjust departure and destination directly in-cab with full Northeast district hub autocomplete.
- **Bidirectional Control Room Sync**: In-cab route adjustments instantly update the Control Room's Vehicle Tracking view and Cargo Manifest.
- **Voice Guidance**: In-cab audio alerts via Web Speech Synthesis with offline caching.

### 4. 📦 GPS Fleet Tracking & Cargo Manifest (`/tracking`)
- **Live Telemetry & AIS-140 Pipeline**: Real-time tracking of active commercial vehicles with speed, heading, altitude, and signal latency.
- **Interactive Cargo Manifest**: Full vehicle inspection drawer displaying consignment weight, driver contacts, real-time geocoded location, and assigned route plan with distance and risk index.

### 5. ⛈️ Predictive Weather Radar & Disruption Prediction (`/`, `/alerts`)
- **Live IMD / OpenWeather Integration**: District-by-district meteorological observations across all 8 Northeastern states.
- **Real-Time Critical Alert Ticker**: Seamless, gap-free scrolling marquee displaying active flood, landslide, and bridge alerts.
- **Multilingual Emergency Alerts**: Alert center localizing warnings in English, Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), and Manipuri (মৈতৈলোন্).

### 6. 📱 Officer Control Center & Fast2SMS Priority Dispatch
- **Officer Drawer**: Access duty clearance, jurisdiction, session statistics, and notification credits.
- **Demo-Visible Test Dispatch Card**: Rich confirmation panel displaying simulated SMS payloads, driver recipient details (`Ranjan Das · +91 9864011223`), credit usage preview, and honest simulation notices.

### 7. 🚨 Emergency Monsoon Scenario Drill (`/scenario`)
- Scripted, interactive multi-step disaster simulation demonstrating automated landslide detection, convoy re-routing, field report verification, and emergency response.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **Routing** | Wouter (lightweight client router) |
| **Mapping** | Google Maps JavaScript API, Leaflet, React-Leaflet |
| **Telemetry & API** | Node.js Express serverless functions, SQLite/WAL (`gps.db`) |
| **Icons & Design** | Lucide React, Government Design Tokens (National Tricolor Palette) |
| **Data & Feeds** | IMD / Open-Meteo Weather feeds, OpenWeatherMap, AIS-140 GPS simulator |
| **Deployment** | Vercel (Edge CDN + Automated Git CI/CD) |
| **Monorepo** | pnpm Workspaces |

---

## 📁 Repository Structure

```
Pathly-Services-Website/
├── api/                                      # Vercel Serverless API entrypoint
│   └── index.mjs
├── artifacts/
│   ├── Pathly-services-website/              # Frontend React application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── auth/                     # OfficerAuthModal & login models
│   │   │   │   ├── dashboard/                # Metric cards, AlertTicker marquee
│   │   │   │   ├── layout/                   # Header, OfficerProfileDrawer, Footer
│   │   │   │   ├── maps/                     # GoogleNERMap, TacticalNERMap
│   │   │   │   └── tracking/                 # CargoManifest drawer & telemetry tags
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx             # Main surveillance overview
│   │   │   │   ├── DriverMode.tsx            # In-cab turn-by-turn & route config
│   │   │   │   ├── RoutePlanner.tsx          # Smart routing engine & order linking
│   │   │   │   ├── VehicleTracking.tsx       # Live fleet surveillance
│   │   │   │   ├── AccessibilityMap.tsx      # GIS corridor accessibility map
│   │   │   │   ├── AlertCenter.tsx           # Multilingual alerts & notices
│   │   │   │   ├── EmergencyScenarioDemo.tsx # Monsoon disaster drill
│   │   │   │   ├── FieldReports.tsx          # Ground officer incident reporting
│   │   │   │   └── Login.tsx                 # Standalone duty sign-in portal
│   │   │   ├── lib/
│   │   │   │   ├── orderRouteStore.ts        # Order-to-route persistence store
│   │   │   │   ├── scenarioEngine.ts         # Drill state & vehicle override registry
│   │   │   │   ├── aiEngine.ts               # Multi-corridor route optimizer
│   │   │   │   └── api.ts                    # Backend API client
│   │   │   ├── data/
│   │   │   │   └── nerData.ts                # NER states, districts, highways & vehicles
│   │   │   ├── hooks/                        # useVehicleTracking, useAlerts, etc.
│   │   │   └── i18n/                         # Multilingual translations
│   │   └── vite.config.ts
│   └── api-server/                           # Backend telemetry & GPS pipeline
│       └── src/
│           ├── routes/                       # Fleet, weather, telemetry, alerts
│           └── services/                     # GPS ingestion & geofence engine
├── vercel.json                               # Vercel deployment & routing config
├── pnpm-workspace.yaml                       # Monorepo configuration
└── package.json
```

---

## 💻 Local Development

### 1. Prerequisites
- **Node.js** ≥ 18
- **pnpm** ≥ 9

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/mjdpratik25-sudo/pathly-services-website.git
cd pathly-services-website

# Install dependencies
pnpm install

# Start local development server
pnpm --filter @workspace/pathly-services dev
```
The application will be live at `http://localhost:3000`.

### 3. Build & Typecheck
```bash
# Verify TypeScript types
pnpm --filter @workspace/pathly-services run typecheck

# Build client production bundle
pnpm --filter @workspace/pathly-services build
```

---

## 🚢 Live Production Deployment

The project is deployed continuously to **Vercel** connected to the `main` branch of this repository.

- **Production URL**: [https://pathly-services-website.vercel.app](https://pathly-services-website.vercel.app)
- **Preview Deployments**: Automated on every push to GitHub.

---

## 🔑 Environment Variables Configured on Vercel

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Client | Google Maps JavaScript API key for interactive mapping |
| `GOOGLE_MAPS_API_KEY` | Server | Google Maps API key for server-side geocoding and elevation |
| `VITE_OPENWEATHERMAP_API_KEY` | Client/Server | Weather telemetry and precipitation alerts |
| `VITE_FAST2SMS_API_KEY` | Server | SMS broadcast gateway for driver emergency dispatches |

---

## 👤 Author & Maintainer

**Antar Majumder** ([@mjdpratik25-sudo](https://github.com/mjdpratik25-sudo))  
*Pathly Emergency Logistics & Route Intelligence Platform*

---

## 📄 License

MIT
