# Pathly — AI Logistics & Route Intelligence Platform 🚚🛰️

> **Real-time accessibility monitoring, predictive weather radar, and GPS fleet coordination across Northeast India.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-pathly--services--website.vercel.app-blue?style=for-the-badge&logo=vercel)](https://pathly-services-website.vercel.app)
[![Built for NER](https://img.shields.io/badge/Region-Northeast_India_NER-emerald?style=for-the-badge)](https://pathly-services-website.vercel.app)
[![Theme](https://img.shields.io/badge/Theme-Obsidian_Tactical_Dark_Mode-purple?style=for-the-badge)](https://pathly-services-website.vercel.app)

---

## 🌟 Overview

**Pathly** is a mission-critical logistics intelligence and route optimization platform engineered specifically for the challenging mountain corridors, landslide-prone highways, and flood-vulnerable supply lines of **Northeast India (NER)** — covering Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, and Sikkim.

The platform provides transport officers, disaster response teams, and civilian logistics operators with a unified command center for real-time fleet tracking, weather-aware routing, multilingual emergency broadcasts, and corridor accessibility monitoring.

---

## 🚀 Key Features & Live Capabilities

- 🗺️ **Live Hybrid GIS Map & Topological Radar**
  - Interactive Google Maps JavaScript API with satellite, terrain, and real-time traffic layers
  - Tactical OpenStreetMap (Leaflet) fallback with seamless zero-downtime key swap
  - Real-time highway status monitoring across **NH-27, NH-44, NH-37, and NH-102**
  - Critical bridge weight ratings, emergency helipads, and terrain hazard pins

- 🚚 **Real-Time GPS Fleet Tracking & Cargo Telemetry**
  - Active telemetry for regional freight consignments
  - Real-time speedometer, altitude meter, consignment weight, and temperature tracking
  - One-click driver emergency phone and SMS dispatchers
  - Cargo manifests linked directly to corridor routing

- 🛣️ **Predictive Disruption Bypass & Route Planner**
  - Multi-corridor waypoint optimizer computing detour routes around active landslide blocks
  - Real-time elevation profile, gradient risk analysis, and bridge weight compliance
  - One-click route export and dispatch to active fleet vehicles

- 📱 **Driver Mode (HUD Cockpit)**
  - High-contrast, night-optimized heads-up display tailored for in-cab mounting
  - Turn-by-turn waypoint guidance with hazard alerts ahead
  - Offline-first cache for low-connectivity mountain passes
  - Instant One-Touch Emergency SOS beacon

- 🚨 **Emergency Scenario Drill & Simulation Demo**
  - Interactive drill module allowing disaster officers to simulate flash floods, landslides, and bridge collapse events
  - Automated dynamic rerouting and multi-agency broadcast dispatches
  - Live scenario reset and state evaluation

- 📲 **Multilingual Fast2SMS Broadcast Gateway**
  - Automated emergency SMS dispatch to drivers and transport officers
  - Pre-translated emergency alerts in **English, Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), and Manipuri (মৈতৈলোন্)**

- ⚙️ **Unified Settings & Dynamic API Key Management Hub**
  - Live in-app configuration, testing, and hot-swapping for:
    - **Google Maps Platform API Key** (JavaScript Maps API, Traffic, Places, Geocoding)
    - **OpenWeatherMap API Key** (regional weather radar, precipitation, wind speed)
    - **Fast2SMS Gateway Key** (driver SMS alerts)
  - Real-time connection diagnostic pings with instant visual feedback

- 🛡️ **Officer Command Center & Role-Based Auth**
  - OTP-verified authentication portal for state disaster response officers, transport commissioners, and citizen transporters
  - Persistent officer session management with rapid Control Mode switching

- 📊 **Regional Analytics & Field Reports**
  - Recharts-powered analytics for corridor downtime, delivery times, and seasonal bottleneck trends
  - Field incident reporting portal for on-ground personnel to log hazards with photo and GPS coordinates

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Framer Motion |
| **Routing** | Wouter (high-performance lightweight React router) |
| **Mapping** | Google Maps JavaScript API, Leaflet, React-Leaflet |
| **Charts** | Recharts |
| **Weather Telemetry** | OpenWeatherMap API, IMD Weather Feeds |
| **SMS Gateway** | Fast2SMS API Gateway |
| **Auth** | OTP-based officer authentication with session persistence |
| **State Management** | TanStack React Query |
| **Deployment** | Vercel (Edge Global CDN) |
| **Monorepo** | pnpm Workspaces |

---

## 📁 Project Structure

```
pathly-services-website/
├── api/                                    # Vercel Serverless API functions
│   └── index.mjs
├── artifacts/
│   └── Pathly-services-website/            # Main frontend application
│       ├── src/
│       │   ├── components/                 # UI components
│       │   │   ├── auth/                   # Officer authentication (OTP model)
│       │   │   ├── brand/                  # Pathly logo & tactical branding
│       │   │   ├── dashboard/              # Dashboard telemetry widgets & cards
│       │   │   ├── layout/                 # Navigation, Header, Sidebar, Drawers
│       │   │   ├── maps/                   # Google Maps & Leaflet GIS integrations
│       │   │   ├── tracking/               # Cargo manifest & fleet telemetry components
│       │   │   └── ui/                     # Radix-based UI primitives
│       │   ├── pages/                      # Page routes
│       │   │   ├── Dashboard.tsx           # Regional overview & live status
│       │   │   ├── AccessibilityMap.tsx    # Live GIS map & corridor radar
│       │   │   ├── RoutePlanner.tsx        # Disruption bypass & multi-stop planner
│       │   │   ├── VehicleTracking.tsx     # Fleet telemetry & vehicle detail
│       │   │   ├── DriverMode.tsx          # High-contrast HUD cockpit for drivers
│       │   │   ├── AlertCenter.tsx         # Weather & emergency broadcasts
│       │   │   ├── EmergencyScenarioDemo.tsx # Disaster drill simulation engine
│       │   │   ├── FieldReports.tsx        # Incident reporting portal
│       │   │   ├── Analytics.tsx           # Fleet & corridor metrics
│       │   │   ├── Settings.tsx            # API key hub & system configuration
│       │   │   ├── Login.tsx               # Officer OTP authentication
│       │   │   └── FooterPages.tsx         # Legal, compliance, and terms
│       │   ├── hooks/                      # Custom React hooks
│       │   ├── i18n/                       # Multilingual regional localization
│       │   ├── lib/                        # Utilities & API clients
│       │   ├── data/                       # Tactical regional mock data & corridor maps
│       │   └── App.tsx                     # Root app shell, router, and providers
│       ├── public/                         # Static assets & icons
│       ├── index.html
│       ├── vite.config.ts
│       └── vercel.json
├── lib/                                    # Shared workspace libraries
├── scripts/                                # Build & utility scripts
├── vercel.json                             # Root Vercel deployment configuration
├── pnpm-workspace.yaml                     # Monorepo workspace definition
├── package.json                            # Workspace package manifest
└── README.md                               # Project documentation
```

---

## 💻 Local Development

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8 (or **npm** ≥ 9)
- A **Google Maps JavaScript API key** (Maps JavaScript API, Places, Geocoding)

### Setup

```bash
# Clone the repository
git clone https://github.com/mjdpratik25-sudo/pathly-services-website.git
cd pathly-services-website

# Install dependencies
pnpm install

# Configure environment variables
cp artifacts/Pathly-services-website/.env.example artifacts/Pathly-services-website/.env.local
# Add your API keys (Google Maps, OpenWeatherMap, Fast2SMS)

# Start local development server
pnpm --filter @workspace/pathly-services dev
```

The application will run locally at `http://localhost:3000` (or `http://localhost:5173`).

---

## 🚢 Deployment

The platform is deployed globally via **Vercel**:

- **Production URL**: [https://pathly-services-website.vercel.app](https://pathly-services-website.vercel.app)
- **Framework**: Vite + React
- **Output Directory**: `dist/public`

---

## 🔑 Environment Variables

| Variable | Description | Where Configured |
|----------|------------|------------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | `.env.local` / Vercel Environment / Settings UI |
| `GOOGLE_MAPS_API_KEY` | Server-side Google Maps key | `.env.local` / Vercel Environment |
| `VITE_OPENWEATHERMAP_API_KEY` | OpenWeatherMap API key | `.env.local` / Vercel Environment / Settings UI |
| `VITE_FAST2SMS_API_KEY` | Fast2SMS Gateway API key | `.env.local` / Vercel Environment / Settings UI |

> **Note:** API keys can also be managed directly in the live web app under **Settings → API Keys** with hot-swapping and zero redeployment required.

---

## 👤 Author

**Antar Majumder** ([@mjdpratik25-sudo](https://github.com/mjdpratik25-sudo))

---

## 📄 License

MIT
