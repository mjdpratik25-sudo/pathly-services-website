# Pathly — AI Logistics & Route Intelligence Platform 🚚🛰️

> **Real-time accessibility monitoring, predictive weather radar, and GPS fleet coordination across Northeast India.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-pathly--services.vercel.app-blue?style=for-the-badge&logo=vercel)](https://pathly-services.vercel.app)
[![Built for NER](https://img.shields.io/badge/Region-Northeast_India_NER-emerald?style=for-the-badge)](https://pathly-services.vercel.app)
[![Theme](https://img.shields.io/badge/Theme-Obsidian_Tactical_Dark_Mode-purple?style=for-the-badge)](https://pathly-services.vercel.app)

---

## 🌟 Overview

**Pathly** is a mission-critical logistics intelligence and route optimization platform engineered specifically for the challenging mountain corridors, landslide-prone highways, and flood-vulnerable supply lines of **Northeast India** — covering Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, and Sikkim.

The platform provides transport officers, disaster response teams, and civilian logistics operators with a unified command center for real-time fleet tracking, weather-aware routing, multilingual emergency broadcasts, and corridor accessibility monitoring.

---

## 🚀 Key Features

- 🗺️ **Live GIS Map & Topological Radar** — Interactive Google Maps & Leaflet tactical views tracking highway statuses (NH-27, NH-44, NH-37, NH-102), strategic bridges, and emergency helipads
- 📦 **Real-Time GPS Fleet Tracking** — Instant telemetry for active cargo consignments with live road speed, altitude, cargo manifests, and driver emergency dialers
- 🏬 **Strategic Transit Hubs** — Quick jump to major regional terminals (Guwahati ICD, Shillong Mountain Depot, Silchar Terminal, Dimapur Rail Yard, Agartala Border Port)
- 🌧️ **IMD Weather & Flood Telemetry** — Live district-wise precipitation radar, flash flood warnings, and landslide probability prediction matrix via OpenWeatherMap & IMD feeds
- 🛣️ **Predictive Disruption Bypass & Route Planner** — Multi-corridor optimizer computing alternative routes around blocked highway segments with bridge weight limits and gradient profiles
- 📲 **Multilingual Fast2SMS Broadcast Gateway** — Automated emergency SMS dispatch to drivers and transport officers in English, Hindi, Assamese, Bengali, and Manipuri
- 🛡️ **Officer Command Center & Role-Based Auth** — OTP-verified login portal for state disaster response officers, transport commissioners, and citizen transporters
- 📊 **Analytics Dashboard** — Regional logistics analytics with Recharts-powered visualizations for fleet performance, route disruptions, and delivery metrics
- 📝 **Field Reports** — Structured field incident reporting system for on-ground officers
- ⚡ **Offline-First Support** — Service worker integration with offline sync capabilities for areas with intermittent connectivity
- 🌐 **Multilingual i18n** — Full interface localization in English, Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), and Manipuri (মৈতৈলোন্)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, Radix UI Primitives, Framer Motion |
| **Routing** | Wouter (lightweight React router) |
| **Mapping** | Google Maps JavaScript API, Leaflet, React-Leaflet |
| **Charts** | Recharts |
| **Weather** | OpenWeatherMap API, IMD Weather Feeds |
| **SMS Gateway** | Fast2SMS API |
| **Auth** | OTP-based officer authentication |
| **State Management** | TanStack React Query |
| **Deployment** | Vercel (Edge CDN + Serverless Functions) |
| **Monorepo** | pnpm Workspaces |

---

## 📁 Project Structure

```
pathly-services-website/
├── api/                          # Vercel Serverless API functions
│   └── index.mjs
├── artifacts/
│   └── Pathly-services-website/  # Main frontend application
│       ├── src/
│       │   ├── components/       # Reusable UI components
│       │   │   ├── auth/         # Officer authentication (OTP modal)
│       │   │   ├── brand/        # Pathly logo & branding
│       │   │   ├── dashboard/    # Dashboard widgets & cards
│       │   │   ├── layout/       # Sidebar, Header, Drawers
│       │   │   ├── maps/         # Google Maps & Leaflet integrations
│       │   │   ├── tracking/     # Cargo manifest & fleet components
│       │   │   └── ui/           # Radix-based design system primitives
│       │   ├── pages/            # Route-level page components
│       │   │   ├── Dashboard.tsx
│       │   │   ├── AccessibilityMap.tsx
│       │   │   ├── RoutePlanner.tsx
│       │   │   ├── VehicleTracking.tsx
│       │   │   ├── AlertCenter.tsx
│       │   │   ├── FieldReports.tsx
│       │   │   ├── Analytics.tsx
│       │   │   ├── Login.tsx
│       │   │   └── Settings.tsx
│       │   ├── hooks/            # Custom React hooks
│       │   ├── i18n/             # Multilingual translations
│       │   ├── lib/              # Utilities (API client, scroll lock)
│       │   ├── data/             # Mock data & fixtures
│       │   └── App.tsx           # Root app shell & router
│       ├── public/               # Static assets
│       ├── index.html
│       └── vite.config.ts
├── lib/                          # Shared workspace libraries
├── scripts/                      # Build & utility scripts
├── vercel.json                   # Vercel deployment config
├── pnpm-workspace.yaml           # Monorepo workspace definition
└── package.json
```

---

## 💻 Local Development

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- A **Google Maps JavaScript API key** with Maps JavaScript API enabled and billing active

### Setup

```bash
# Clone the repository
git clone https://github.com/mjdpratik25-sudo/pathly-services-website.git
cd pathly-services-website

# Install dependencies
pnpm install

# Configure environment variables
cp artifacts/Pathly-services-website/.env.example artifacts/Pathly-services-website/.env.local
# Edit .env.local and add your Google Maps API key

# Start local development server
pnpm --filter @workspace/pathly-services dev
```

The app will be available at `http://localhost:5173`.

---

## 🚢 Deployment

The platform is deployed on **Vercel** with Edge CDN and Serverless Functions.

- **Production**: [https://pathly-services.vercel.app](https://pathly-services.vercel.app)
- **Build Command**: `pnpm --filter @workspace/api-server build && pnpm --filter @workspace/pathly-services build`
- **Output Directory**: `artifacts/Pathly-services-website/dist/public`

API routes are handled via Vercel Serverless Functions under the `/api` path with automatic rewrites configured in `vercel.json`.

---

## 🔑 Environment Variables

| Variable | Description |
|----------|------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key (frontend) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key (server-side) |

---

## 👤 Author

**Antar Majumder** ([@mjdpratik25-sudo](https://github.com/mjdpratik25-sudo))

---

## 📄 License

MIT
