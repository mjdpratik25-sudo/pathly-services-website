export interface AgentInfo {
  name: string;
  detail: string;
  rating?: number;
  jobs?: number;
  phone?: string;
  specialty?: string;
}

export interface ServiceCategory {
  name: string;
  detail: string;
  tagline: string;
  badge: string;
  icon: string;
  tone: 'sea' | 'sun' | 'rose' | 'lilac' | 'clay' | 'mint' | 'sky';
  sources: {
    name: string;
    areas: string;
    link?: string;
    linkLabel?: string;
    type: 'directory' | 'hub' | 'verified';
    description: string;
  }[];
}

export interface MarketplaceItem {
  id: string;
  title: string;
  category: 'Furniture' | 'Appliances' | 'Books & notes' | 'Electronics' | 'Vehicles' | 'Other';
  price: number;
  originalPrice?: number;
  priceType: 'fixed' | 'negotiable';
  condition: string;
  brand?: string;
  age?: string;
  location: string;
  sellerAddress?: string;
  pincode?: string;
  distance: string;
  description: string;
  negotiateTerms?: string;
  minAcceptPrice?: number;
  includes?: string[];
  sellerName: string;
  sellerPhone: string;
  sellerWhatsapp: string;
  contactPref: string;
  postedTime: string;
  featured: boolean;
}

export const CATEGORY_AGENTS_MAP: Record<string, AgentInfo[]> = {
  "Plumber": [
    { name: "Ratan Bhowmik — Master Pipe & Sanitary Pro", detail: "1.1 km away • 4.9★ (180+ jobs done)", rating: 4.9, jobs: 180, phone: "9436124501", specialty: "Pipe leaks, Bathroom fittings, Tanks" },
    { name: "Gopal Saha — Emergency Leak & Drain Tech", detail: "2.3 km away • 4.8★ (140+ jobs done)", rating: 4.8, jobs: 140, phone: "9862018472", specialty: "Drain blockage, Emergency repairs" },
    { name: "Prabir Deb — Certified Plumbing Contractor", detail: "3.0 km away • 5.0★ (95+ jobs done)", rating: 5.0, jobs: 95, phone: "8794109823", specialty: "New home plumbing, Sanitary setups" }
  ],
  "Electrician": [
    { name: "Sanjoy Paul — Senior Wireman & Earthing Pro", detail: "1.2 km away • 4.9★ (220+ jobs done)", rating: 4.9, jobs: 220, phone: "9774567812", specialty: "Short circuits, Earthing, Inverters" },
    { name: "Mithun Chakraborty — Appliance & Inverter Tech", detail: "2.0 km away • 4.8★ (160+ jobs done)", rating: 4.8, jobs: 160, phone: "9436451290", specialty: "Switchboards, Appliance wiring" },
    { name: "Uttam Barman — 24/7 Power Breakdown Tech", detail: "2.8 km away • 5.0★ (110+ jobs done)", rating: 5.0, jobs: 110, phone: "8837209145", specialty: "Emergency power restoration" }
  ],
  "Home help": [
    { name: "Maya Sarkar — Verified Housekeeping Associate", detail: "0.9 km away • 4.9★ (130+ bookings)", rating: 4.9, jobs: 130, phone: "9863124578", specialty: "Deep house cleaning, Dusting" },
    { name: "Reba Das — Domestic Staffing Coordinator", detail: "1.7 km away • 4.8★ (210+ placements)", rating: 4.8, jobs: 210, phone: "9436789123", specialty: "Cooks, Part-time & full-time maids" },
    { name: "Laxmi Roy — Daily Cooking & Maid Partner", detail: "2.5 km away • 5.0★ (85+ bookings)", rating: 5.0, jobs: 85, phone: "8794561230", specialty: "Authentic Bengali/North Indian meals" }
  ],
  "Pet care": [
    { name: "Dr. Rahul Datta — Mobile Vet & Pet Caregiver", detail: "1.4 km away • 4.9★ (175+ visits)", rating: 4.9, jobs: 175, phone: "9862998877", specialty: "Vaccinations, Health checkups" },
    { name: "Anirban Sen — Certified Dog Groomer & Walker", detail: "2.1 km away • 4.8★ (120+ sessions)", rating: 4.8, jobs: 120, phone: "9774112233", specialty: "Pet baths, Walking, Behavioral care" },
    { name: "Tapan Debnath — Boarding & Pet Care Associate", detail: "2.9 km away • 5.0★ (90+ stays)", rating: 5.0, jobs: 90, phone: "9436009988", specialty: "Safe home-based pet boarding" }
  ],
  "Home setup": [
    { name: "Gouranga Sutradhar — Master Carpenter & Woodcrafter", detail: "1.0 km away • 4.9★ (160+ setups)", rating: 4.9, jobs: 160, phone: "9862334455", specialty: "Custom furniture, Door & window fitting" },
    { name: "Dipak Shil — Modular Fit-out & Shelving Pro", detail: "2.2 km away • 4.8★ (115+ jobs)", rating: 4.8, jobs: 115, phone: "8794887766", specialty: "Kitchen cabinets, TV units" },
    { name: "Nirmal Rudra — Furniture Assembly Specialist", detail: "2.7 km away • 5.0★ (80+ jobs)", rating: 5.0, jobs: 80, phone: "9436776655", specialty: "IKEA/Urban Ladder flatpack assembly" }
  ],
  "Health & paperwork": [
    { name: "Barnali Deb — Certified Home Care Attendant", detail: "1.3 km away • 4.9★ (140+ visits)", rating: 4.9, jobs: 140, phone: "9862445566", specialty: "Elderly nursing, BP/Sugar checks" },
    { name: "Swarup Majumder — Healthcare & Errands Runner", detail: "1.9 km away • 4.8★ (95+ jobs)", rating: 4.8, jobs: 95, phone: "9774665544", specialty: "Medicine pickup, Lab report collection" },
    { name: "Aparna Ghosh — Hospital Escort & Documentation Pro", detail: "2.8 km away • 5.0★ (65+ visits)", rating: 5.0, jobs: 65, phone: "9436223344", specialty: "OPD token assistance, Govt office paperwork" }
  ],
  "Laundry": [
    { name: "Haripada Das — Express Laundry & Ironing Desk", detail: "0.8 km away • 4.9★ (340+ orders)", rating: 4.9, jobs: 340, phone: "9862112244", specialty: "Wash & fold, Same-day steam ironing" },
    { name: "Kamal Roy — Steam Press & Dry Clean Partner", detail: "1.8 km away • 4.8★ (280+ orders)", rating: 4.8, jobs: 280, phone: "8794334411", specialty: "Blazers, Sarees, Delicate wear" },
    { name: "Agartala Doorstep Wash Hub", detail: "2.5 km away • 5.0★ (190+ orders)", rating: 5.0, jobs: 190, phone: "9436554422", specialty: "Curtain & blanket deep laundering" }
  ],
  "PGs & homestays": [
    { name: "Sujit Paul — Area Accommodation Agent", detail: "0.8 km away • 4.9★ (75+ visits hosted)", rating: 4.9, jobs: 75, phone: "9862778811", specialty: "Student PGs near MBB College & TIT" },
    { name: "Bankumari Verified Host Network", detail: "1.5 km away • 5.0★ (50+ stays)", rating: 5.0, jobs: 50, phone: "9774221199", specialty: "Furnished homestays with WiFi" },
    { name: "Krishna Nagar Student PG Helpdesk", detail: "1.1 km away • 4.8★ (115+ visits)", rating: 4.8, jobs: 115, phone: "9436889900", specialty: "Single/Shared rooms with food options" }
  ],
  "Transport": [
    { name: "Subir Debnath — Fleet & Taxi Desk", detail: "1.2 km away • 4.9★ (140+ rentals)", rating: 4.9, jobs: 140, phone: "9862991122", specialty: "Airport drops, Outstation cabs" },
    { name: "Agartala Self-Drive Rental Hub", detail: "2.4 km away • 4.8★ (320+ rentals)", rating: 4.8, jobs: 320, phone: "8794667788", specialty: "Bikes & Cars for daily rent" },
    { name: "Dhaleswar City Bike & Cab Pool", detail: "1.8 km away • 5.0★ (85+ rentals)", rating: 5.0, jobs: 85, phone: "9436110099", specialty: "Fast local point-to-point transit" }
  ],
  "Guides & translators": [
    { name: "Biplab Tripura — Multilingual Heritage Guide (Kokborok/Bengali/English)", detail: "1.5 km away • 4.9★ (90+ tours)", rating: 4.9, jobs: 90, phone: "9862001144", specialty: "Ujjayanta Palace, Neermahal, Unakoti" },
    { name: "Chandan Roy — City Tourism & Travel Guide", detail: "2.3 km away • 4.8★ (110+ tours)", rating: 4.8, jobs: 110, phone: "9774332211", specialty: "Food trails, Temple tours" },
    { name: "Suniti Debbarma — Local Cultural & Sightseeing Escort", detail: "3.1 km away • 5.0★ (70+ tours)", rating: 5.0, jobs: 70, phone: "9436443322", specialty: "Handloom markets & tribal culture" }
  ],
  "Cleaning and pest control": [
    { name: "Rajesh Roy — Certified Pest Exterminator", detail: "1.2 km away • 4.9★ (190+ treatments)", rating: 4.9, jobs: 190, phone: "9862556677", specialty: "Termite control, Cockroach gel treatment" },
    { name: "Shankar Sen — Deep Sanitization & Tank Cleaner", detail: "2.0 km away • 4.8★ (140+ jobs)", rating: 4.8, jobs: 140, phone: "8794118822", specialty: "Overhead water tank mechanized scrubbing" },
    { name: "Agartala CleanCare Team", detail: "2.7 km away • 5.0★ (210+ jobs)", rating: 5.0, jobs: 210, phone: "9436994411", specialty: "Post-renovation deep house wash" }
  ],
  "AC repair": [
    { name: "Amitav Shil — Senior HVAC & AC Tech", detail: "1.0 km away • 4.9★ (250+ repairs)", rating: 4.9, jobs: 250, phone: "9862887700", specialty: "Inverter AC PCB repair, Coil cleaning" },
    { name: "Biplob Datta — Gas Refill & Coil Cleaning Specialist", detail: "2.2 km away • 4.8★ (180+ repairs)", rating: 4.8, jobs: 180, phone: "9774990011", specialty: "R32/R410A gas top-up, Jet pump service" },
    { name: "Surajit Paul — Split & Inverter AC Specialist", detail: "2.9 km away • 5.0★ (130+ repairs)", rating: 5.0, jobs: 130, phone: "9436665511", specialty: "Copper piping installation & uninstallation" }
  ],
  "Salon and massage": [
    { name: "Priya Das — Certified Wellness & Spa Therapist", detail: "1.1 km away • 4.9★ (160+ sessions)", rating: 4.9, jobs: 160, phone: "9862123450", specialty: "Therapeutic massage, Home facial & cleanup" },
    { name: "Rita Deb — Professional Hair & Bridal Stylist", detail: "2.0 km away • 4.8★ (195+ appointments)", rating: 4.8, jobs: 195, phone: "8794234561", specialty: "Hair spa, Waxing, Pedicure at doorstep" },
    { name: "Diamond Spa Home Service Team", detail: "2.6 km away • 5.0★ (120+ sessions)", rating: 5.0, jobs: 120, phone: "9436345672", specialty: "Aromatherapy, Head & shoulder relief" }
  ],
  "Home painting and renovation": [
    { name: "Manoj Sarkar — Master Wall Painter & Texture Pro", detail: "1.3 km away • 4.9★ (170+ contracts)", rating: 4.9, jobs: 170, phone: "9862456783", specialty: "Asian Paints Royale, Texture accent walls" },
    { name: "Abhijit Saha — Waterproofing & Renovation Contractor", detail: "2.4 km away • 4.8★ (135+ contracts)", rating: 4.8, jobs: 135, phone: "9774567894", specialty: "Roof waterproofing, Damp proofing" },
    { name: "Tripura ColorCraft Decorators", detail: "3.0 km away • 5.0★ (90+ projects)", rating: 5.0, jobs: 90, phone: "9436678905", specialty: "Interior & exterior wall painting" }
  ]
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    name: "Plumber",
    detail: "Leaks, drains, fixtures",
    tagline: "Certified plumbers for pipe leaks, taps, bathroom fixtures and emergency drainage.",
    badge: "Agartala Plumbers Directory",
    icon: "Wrench",
    tone: "sea",
    sources: [
      {
        name: "Sulekha Plumbers – Agartala",
        areas: "West Tripura / Agartala-wide listings",
        link: "https://sulekha.com/plumbers/agartala",
        linkLabel: "sulekha.com/plumbers/agartala",
        type: "directory",
        description: "Verified plumbing professionals for residential pipe leaks, clogged drains, and bathroom fixtures."
      },
      {
        name: "Emergency Plumber Service Agartala",
        areas: "West Pratapgarh, near United Club, A.D. Nagar",
        link: "https://agartalaonline.in",
        linkLabel: "agartalaonline.in",
        type: "directory",
        description: "24/7 on-call emergency plumber service for urgent leakages, tank overflow, and pipe repair."
      },
      {
        name: "Smart City Care – Expert Plumber",
        areas: "Doorstep service, Agartala",
        link: "https://smartcitycare.in",
        linkLabel: "smartcitycare.in",
        type: "verified",
        description: "Standardized residential maintenance with transparent upfront pricing."
      }
    ]
  },
  {
    name: "Electrician",
    detail: "Lights, outlets, wiring",
    tagline: "Licensed electricians for earthing, switchboards, MCB repair, and inverter connections.",
    badge: "Power & Wiring Experts",
    icon: "Zap",
    tone: "sun",
    sources: [
      {
        name: "Justdial – Electricians Agartala",
        areas: "Battala, Dhaleswar, Ramnagar, Banamalipur",
        link: "https://justdial.com/Agartala/Electricians",
        linkLabel: "justdial.com/Agartala/Electricians",
        type: "directory",
        description: "Local licensed electricians on call for power tripping, circuit repair, and meter wiring."
      },
      {
        name: "Tripura Power Assist Group",
        areas: "West Tripura District",
        type: "verified",
        description: "Emergency electrical breakdown support and appliance wiring."
      }
    ]
  },
  {
    name: "Home help",
    detail: "Maids, laundry, repairs",
    tagline: "Verified domestic helpers, daily meal cooks, and thorough housekeepers.",
    badge: "Verified Domestic Help",
    icon: "Home",
    tone: "rose",
    sources: [
      {
        name: "CareSeva Domestic Agency Agartala",
        areas: "Krishna Nagar, Math Chowmuhani, Dhaleswar",
        type: "verified",
        description: "Identity-checked domestic helpers with flexible part-time and monthly shifts."
      },
      {
        name: "Neighborhood Helper Desk",
        areas: "All residential wards",
        type: "hub",
        description: "Connect with verified local helpers for urgent cleaning and meal prep."
      }
    ]
  },
  {
    name: "Pet care",
    detail: "Walks, sitting, grooming",
    tagline: "Loving pet care: veterinary home visits, grooming, walking, and safe home boarding.",
    badge: "Certified Pet Caregivers",
    icon: "HeartHandshake",
    tone: "lilac",
    sources: [
      {
        name: "Agartala Veterinary Polyclinic & Home Care",
        areas: "Abhoynagar, Kunjaban, GB Hospital road",
        type: "verified",
        description: "On-call vets for vaccination, parasite treatment, and emergency illness consultation."
      },
      {
        name: "PawFriends Agartala Care Club",
        areas: "Banamalipur, Dhaleswar",
        type: "hub",
        description: "Dedicated dog walkers and stress-free in-home grooming services."
      }
    ]
  },
  {
    name: "Home setup",
    detail: "Furniture, TV mounting, shelves",
    tagline: "Carpenters and handymen for custom woodwork, door repairs, and TV wall installation.",
    badge: "Carpentry & Fit-outs",
    icon: "Hammer",
    tone: "clay",
    sources: [
      {
        name: "Agartala WoodCraft Associates",
        areas: "Battala Furniture Market & Citywide",
        type: "verified",
        description: "Experienced carpenters for wardrobe hinges, lock change, and modular furniture setup."
      }
    ]
  },
  {
    name: "Health & paperwork",
    detail: "Escorts, forms, appointments",
    tagline: "Assistance with hospital visits, elderly patient escorts, medicine runs, and official forms.",
    badge: "Care & Document Escorts",
    icon: "ShieldAlert",
    tone: "mint",
    sources: [
      {
        name: "Swasthya Mitra Home Companion",
        areas: "GB Pant Hospital, IGM Hospital, ILS belt",
        type: "verified",
        description: "Trained companions to guide seniors through OPD queues, diagnostic tests, and paperwork."
      }
    ]
  },
  {
    name: "Laundry",
    detail: "Wash, fold, steam ironing",
    tagline: "Doorstep laundry with hygienic washing, crisp steam press, and same-day delivery.",
    badge: "Express Laundry & Dry Clean",
    icon: "Sparkles",
    tone: "sky",
    sources: [
      {
        name: "Justdial – Laundry Services Agartala",
        areas: "Compare prices, doorstep pickup",
        link: "https://justdial.com/Agartala/Laundry-Services",
        linkLabel: "justdial.com/Agartala/Laundry-Services",
        type: "directory",
        description: "Compare prices for wash, fold, ironing, and doorstep pickup across Agartala."
      }
    ]
  },
  {
    name: "PGs & homestays",
    detail: "Rooms, student stays, hosts",
    tagline: "Curated student PGs, verified family homestays, and budget rental flats in Agartala.",
    badge: "Verified Local Stays",
    icon: "Bed",
    tone: "sea",
    sources: [
      {
        name: "Agartala PG Finder",
        areas: "Near TIT Narsingarh, MBB College, GBP Hospital",
        type: "verified",
        description: "Safe, furnished accommodation for students and working professionals."
      }
    ]
  },
  {
    name: "Transport",
    detail: "Bikes, auto-cabs, daily rentals",
    tagline: "Reliable city rides, bike rentals, station pickups, and airport transfers.",
    badge: "Local Transit Desk",
    icon: "Car",
    tone: "sun",
    sources: [
      {
        name: "Agartala QuickCab & Bike Network",
        areas: "MBB Airport, Agartala Railway Station, City Centre",
        type: "verified",
        description: "Fixed transparent fares with instant driver allocation."
      }
    ]
  },
  {
    name: "Guides & translators",
    detail: "Kokborok, Bengali, tours",
    tagline: "Friendly local guides for heritage exploration, local markets, and Kokborok translation.",
    badge: "Heritage & Language Guides",
    icon: "Compass",
    tone: "rose",
    sources: [
      {
        name: "Tripura Heritage Trail Guides",
        areas: "Ujjayanta Palace, Heritage Park, Kasba Kali Bari",
        type: "verified",
        description: "Certified bilingual and trilingual guides for cultural tours and official interactions."
      }
    ]
  },
  {
    name: "Cleaning and pest control",
    detail: "Deep sanitization, bug control",
    tagline: "Eco-friendly pest extermination, termite treatments, and full home deep cleaning.",
    badge: "Sanitization & Pest Shield",
    icon: "CheckCircle",
    tone: "mint",
    sources: [
      {
        name: "Agartala Pest Shield Pro",
        areas: "City-wide residential & commercial coverage",
        type: "verified",
        description: "Safe odorless herbal pest control and tank chlorination."
      }
    ]
  },
  {
    name: "AC repair",
    detail: "Cooling, gas refill, servicing",
    tagline: "Fast AC servicing: gas top-up, split AC uninstallation, PCB repairs, and jet pump cleaning.",
    badge: "HVAC & Cooling Pros",
    icon: "Fan",
    tone: "sky",
    sources: [
      {
        name: "CoolTech Agartala AC Service",
        areas: "Krishna Nagar, Ramnagar, Banamalipur, Indranagar",
        type: "verified",
        description: "90-day warranty on all compressor repairs and copper pipe replacements."
      }
    ]
  },
  {
    name: "Salon and massage",
    detail: "At-home beauty & relaxation",
    tagline: "Professional salon services, haircuts, manicures, and revitalizing massages in your comfort.",
    badge: "Doorstep Salon & Wellness",
    icon: "Smile",
    tone: "lilac",
    sources: [
      {
        name: "GlowHome Beauty Studio",
        areas: "All residential areas in Agartala",
        type: "verified",
        description: "Hygienic single-use kits and certified beauticians for women & men."
      }
    ]
  },
  {
    name: "Home painting and renovation",
    detail: "Wall painting, waterproofing",
    tagline: "Flawless wall putty, texture paints, waterproofing, and complete home renovation.",
    badge: "Painting & Renovation Crew",
    icon: "Paintbrush",
    tone: "clay",
    sources: [
      {
        name: "Tripura ColorCraft & Waterproofing",
        areas: "Agartala, Ranirbazar, Bishalgarh road",
        type: "verified",
        description: "Laser measurement, color consultation, and on-time completion guarantee."
      }
    ]
  }
];

export interface NearbyStore {
  name: string;
  location: string;
  rating?: string;
  contact?: string;
  specialty: string;
}

export const CATEGORY_STORES_MAP: Record<string, NearbyStore[]> = {
  "Groceries & Daily Essentials": [
    { name: "Supermarket cluster, Agartala Bazar / Colonel Chowmuhani", location: "Colonel Chowmuhani", rating: "4.1★", contact: "+91 94361 24501", specialty: "Rice, dal, fresh vegetables & dairy" },
    { name: "Grocery Stores, Banamalipur / T G Road, Krishna Nagar", location: "Banamalipur / T G Road", rating: "4.5★", contact: "+91 98620 18472", specialty: "Daily staples, spices, packaged goods" },
    { name: "Supermarket cluster, Jail Ashram Road, Dhaleswar", location: "Jail Ashram Road", rating: "4.8★", contact: "+91 87941 09823", specialty: "Express supermarket grocery delivery" }
  ],
  "Pharmacy & Medicine Supplies": [
    { name: "Kiran Medical Hall, R M S Choumohani", location: "R M S Choumohani – 799001", rating: "4.8★", contact: "(0381) 2324870", specialty: "Prescription medicines, baby care, wellness" },
    { name: "Datta Medical Stores, Battala Bazar", location: "Battala Bazar – 799001", rating: "4.9★", contact: "(0381) 2324651", specialty: "24/7 Emergency drugs & medical supplies" },
    { name: "Apollo Pharmacy – Battala", location: "Battala Main Road, Agartala", rating: "4.7★", contact: "+91 98629 11223", specialty: "Verified chain, rapid home delivery" }
  ],
  "Hardware & Electrical Supplies": [
    { name: "Joyram Hardwares, Near Railway Station", location: "Jogendranagar – 799001", rating: "4.6★", contact: "+91 94361 88990", specialty: "Tools, fasteners, plumbing pipes & tapes" },
    { name: "Star Hardware, Khose Bagan, Surja Road", location: "Surja Road, Agartala Bazar – 799001", rating: "4.5★", contact: "+91 98620 44556", specialty: "Electrical fittings, wires, LED bulbs" },
    { name: "Electrical Goods Dealers, Motor Stand Road", location: "Motor Stand Road, Agartala Bazar", rating: "4.2★", contact: "+91 87941 33221", specialty: "Switchboards, conduits, wiring supplies" }
  ],
  "Bakery, Snacks & Fresh Food": [
    { name: "Cakes N Buns, Ramnagar Road 3", location: "Ramnagar Road 3, Agartala Bazar – 799001", rating: "4.2★", contact: "+91 94361 77665", specialty: "Fresh oven bread, cakes, tea patties" },
    { name: "Sherowali Sweet Snacks Bakery", location: "Krishna Nagar – 799002", rating: "4.0★", contact: "+91 98620 99881", specialty: "Hot samosas, local sweets, savory snacks" },
    { name: "Indian Cakes and Nuts, Krishnanagar", location: "Krishnanagar Thakurpally Road", rating: "4.6★", contact: "+91 87941 55443", specialty: "Custom cakes, cookies, dry fruit packs" }
  ],
  "Local shops": [
    { name: "Battala Central Traders & Stationers", location: "Battala Market Area", rating: "4.5★", contact: "+91 94361 11234", specialty: "Xerox, printing, books, stationery" },
    { name: "Dhaleswar Neighborhood Tailoring & Fabrics", location: "Dhaleswar Road 2", rating: "4.8★", contact: "+91 98620 22345", specialty: "Alterations, fabric styling, dry cleaning" }
  ],
  "Nearby services": [
    { name: "Agartala Express Courier & Logistics Hub", location: "Post Office Chowmuhani", rating: "4.9★", contact: "+91 94361 66789", specialty: "Same-day city parcels & document runs" },
    { name: "City Home Key & Locksmith Services", location: "Motor Stand Area", rating: "4.7★", contact: "+91 98620 77890", specialty: "Emergency lock repair, key duplication" }
  ]
};

export const NEARBY_ESSENTIALS = [
  {
    name: "Groceries & Daily Essentials",
    detail: "Rice, vegetables, dairy & staples",
    time: "20-30 mins delivery",
    tag: "Everyday Need",
    icon: "ShoppingBag"
  },
  {
    name: "Pharmacy & Medicine Supplies",
    detail: "Prescription drugs, baby care, first aid",
    time: "15-25 mins delivery",
    tag: "Urgent Care",
    icon: "Activity"
  },
  {
    name: "Hardware & Electrical Supplies",
    detail: "Wires, bulbs, plumbing tapes, tools",
    time: "30-45 mins delivery",
    tag: "Repair Essentials",
    icon: "Wrench"
  },
  {
    name: "Bakery, Snacks & Fresh Food",
    detail: "Morning bread, tea snacks, local sweets",
    time: "25-35 mins delivery",
    tag: "Fresh Food",
    icon: "Coffee"
  }
];


export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: "MKT-AGTL-70192",
    title: "Solid Sheesham Wood Study Table & Ergonomic Chair",
    category: "Furniture",
    price: 3200,
    originalPrice: 7500,
    priceType: "negotiable",
    condition: "Like New (Used 6 mos)",
    brand: "Royal Oak / Local Teak Craft",
    age: "6 Months",
    location: "Dhaleswar, Agartala",
    sellerAddress: "House 42, Dhaleswar Main Road, near Old Shiv Mandir",
    pincode: "799001",
    distance: "0.8 km away",
    description: "Solid seasoned wood study desk with 2 smooth gliding drawers + cushioned breathable ergonomic study chair. Strictly well-maintained with zero termite or wood rot. Moving out of city for higher studies.",
    negotiateTerms: "Open to ₹2,800 for instant self-pickup today",
    minAcceptPrice: 2800,
    includes: ["Solid Teak Study Table (3.5ft x 2ft)", "Hydraulic Swivel Mesh Chair", "All Assembly Bolts & Floor Pads"],
    sellerName: "Animesh Debnath",
    sellerPhone: "9436128945",
    sellerWhatsapp: "9436128945",
    contactPref: "Call & WhatsApp",
    postedTime: "2 hours ago",
    featured: true
  },
  {
    id: "MKT-AGTL-84910",
    title: "LG 190L Smart Inverter Single Door Refrigerator",
    category: "Appliances",
    price: 6500,
    originalPrice: 15990,
    priceType: "fixed",
    condition: "Good Condition (Fully Working)",
    brand: "LG Smart Inverter",
    age: "1.5 Years",
    location: "Krishna Nagar, Agartala",
    sellerAddress: "Lane 3, Behind Krishna Nagar Post Office",
    pincode: "799001",
    distance: "1.2 km away",
    description: "5-Star energy rating, super fast ice making within 1 hour, toughened glass shelves. Includes heavy-duty base stand with extra storage drawer. Original invoice bill copy available, never repaired.",
    negotiateTerms: "Fixed price strictly (Already 60% below MRP)",
    minAcceptPrice: 6500,
    includes: ["LG 190L Refrigerator", "Heavy-Duty Base Stand with Drawer", "Original Purchase Invoice Copy"],
    sellerName: "Susmita Saha",
    sellerPhone: "9862045112",
    sellerWhatsapp: "9862045112",
    contactPref: "Call & WhatsApp",
    postedTime: "5 hours ago",
    featured: false
  },
  {
    id: "MKT-AGTL-59201",
    title: "Engineering (1st-4th Sem) Reference Books & Curated Notes Bundle",
    category: "Books & notes",
    price: 850,
    originalPrice: 3400,
    priceType: "negotiable",
    condition: "Well Maintained (Clean Pages)",
    brand: "S.Chand / McGraw Hill / Pearson",
    age: "1 Year",
    location: "Banamalipur, Agartala",
    sellerAddress: "Banamalipur Club Road, Near Ramthakur Ashram",
    pincode: "799001",
    distance: "1.5 km away",
    description: "Complete package: B.S. Grewal (Higher Engg Mathematics), B.L. Theraja (Electrical Technology Vol 1 & 2), Reema Thareja (Data Structures in C), plus clean spiral-bound lecture notes and 5-year solved semester question banks.",
    negotiateTerms: "Willing to give at ₹750 for first-year students",
    minAcceptPrice: 750,
    includes: ["4 Core Standard Textbooks", "3 Spiral Handwritten Lecture Notebooks", "Solved Exam Model Papers"],
    sellerName: "Pritam Chakraborty",
    sellerPhone: "8794216390",
    sellerWhatsapp: "8794216390",
    contactPref: "WhatsApp only",
    postedTime: "1 day ago",
    featured: true
  },
  {
    id: "MKT-AGTL-61034",
    title: "Philips 750W Heavy-Duty Mixer Grinder (3 Stainless Steel Jars)",
    category: "Appliances",
    price: 1400,
    originalPrice: 3295,
    priceType: "fixed",
    condition: "Like New (Used 3 times)",
    brand: "Philips HL7756",
    age: "3 Months",
    location: "Ramnagar, Agartala",
    sellerAddress: "Ramnagar Road No. 4, Opposite Girls High School",
    pincode: "799002",
    distance: "2.0 km away",
    description: "Powerful 750W Turbo copper motor with 1.5L wet grinding jar, 1.0L multi-purpose jar, and 0.3L chutney jar with leak-proof rubber gaskets. Received as duplicate wedding gift, in original carton box with manual.",
    negotiateTerms: "Fixed price. Pristine condition with retail box.",
    minAcceptPrice: 1400,
    includes: ["750W Motor Base Unit", "3 Stainless Steel Jars with Lids", "Original Retail Box & Spatula"],
    sellerName: "Ruma Ghosh",
    sellerPhone: "9774588219",
    sellerWhatsapp: "9774588219",
    contactPref: "Call & WhatsApp",
    postedTime: "1 day ago",
    featured: false
  },
  {
    id: "MKT-AGTL-33918",
    title: "Hero Sprint 26T 21-Speed Mountain Bicycle with Lock & Helmet",
    category: "Vehicles",
    price: 4200,
    originalPrice: 9800,
    priceType: "negotiable",
    condition: "Excellent (Brand New Ralson Tyres)",
    brand: "Hero Sprint Pro",
    age: "8 Months",
    location: "Battala, Agartala",
    sellerAddress: "Battala Bazar Overbridge Link Road",
    pincode: "799001",
    distance: "1.9 km away",
    description: "Dual front and rear mechanical disc brakes, front shock absorption suspension fork, 21-speed Shimano rapid fire shifters. Fitted with USB rechargeable night LED headlight, loud bell, and braided steel chain lock.",
    negotiateTerms: "Can reduce to ₹3,800 if buyer picks up without helmet",
    minAcceptPrice: 3800,
    includes: ["26T Mountain Gear Bicycle", "Safety Crash Helmet", "Steel Combination Chain Lock", "Rechargeable LED Light"],
    sellerName: "Deepak Roy",
    sellerPhone: "9436881234",
    sellerWhatsapp: "9436881234",
    contactPref: "Call only",
    postedTime: "2 days ago",
    featured: true
  },
  {
    id: "MKT-AGTL-92015",
    title: "Samsung 32-inch HD Ready Smart LED TV (Wi-Fi / Netflix / YouTube)",
    category: "Electronics",
    price: 8900,
    originalPrice: 16900,
    priceType: "negotiable",
    condition: "Mint Condition (Zero Scratches)",
    brand: "Samsung Series 4 Smart",
    age: "1 Year",
    location: "Indranagar, Agartala",
    sellerAddress: "Indranagar VIP Road, Near ITI Complex",
    pincode: "799006",
    distance: "2.4 km away",
    description: "Vibrant IPS panel with HDR10, Dolby Digital Plus 20W speakers, built-in screen mirroring and Wi-Fi. Heavy-duty swivel wall mount bracket and original smart remote included. Upgraded to 55-inch hence selling.",
    negotiateTerms: "Open to ₹8,200 for cash settlement on test & inspection",
    minAcceptPrice: 8200,
    includes: ["32-inch Smart LED TV", "Original Smart Remote with Batteries", "Heavy-Duty Wall Mount Frame", "HDMI Cable"],
    sellerName: "Bishal Debbarma",
    sellerPhone: "9863456789",
    sellerWhatsapp: "9863456789",
    contactPref: "Call & WhatsApp",
    postedTime: "3 days ago",
    featured: false
  },
  {
    id: "MKT-AGTL-41802",
    title: "L-Shaped 5-Seater Modern Fabric Sectional Sofa Set",
    category: "Furniture",
    price: 6800,
    originalPrice: 18500,
    priceType: "negotiable",
    condition: "Gently Used (Steam Cleaned)",
    brand: "Home Centre / Urban Ladder style",
    age: "10 Months",
    location: "Banamalipur, Agartala",
    sellerAddress: "Banamalipur Central, Near Motor Stand Road",
    pincode: "799001",
    distance: "1.4 km away",
    description: "High density foam cushioning with dark teal washable fabric covers. Sturdy solid wood internal frame with chrome legs. Pet-free and smoke-free home.",
    negotiateTerms: "Minimum ₹6,200 (Can help book local tempo for delivery)",
    minAcceptPrice: 6200,
    includes: ["3-Seater Main Sofa Unit", "2-Seater Lounger / Ottoman", "4 Decorative Throw Pillows"],
    sellerName: "Rituparna Sen",
    sellerPhone: "9862118743",
    sellerWhatsapp: "9862118743",
    contactPref: "Call & WhatsApp",
    postedTime: "4 hours ago",
    featured: true
  },
  {
    id: "MKT-AGTL-10923",
    title: "Voltas 1.5 Ton 3-Star Split AC with 100% Copper Condenser",
    category: "Appliances",
    price: 13500,
    originalPrice: 32000,
    priceType: "negotiable",
    condition: "Excellent (Ice Cold Cooling)",
    brand: "Voltas Inverter Series",
    age: "1.8 Years",
    location: "Dhaleswar, Agartala",
    sellerAddress: "Dhaleswar Kalyani Road, Near Water Tank",
    pincode: "799001",
    distance: "1.1 km away",
    description: "Rapid cooling turbo mode, copper connecting pipes + outdoor wall mounting brackets included. Recently serviced with fresh gas recharge before uninstallation.",
    negotiateTerms: "Will settle at ₹12,500 if uninstalled unit collected directly",
    minAcceptPrice: 12500,
    includes: ["Indoor Unit (IDU)", "Outdoor Condenser (ODU)", "10ft Copper Piping + Wires", "Remote Control"],
    sellerName: "Subhashis Roy",
    sellerPhone: "9436554109",
    sellerWhatsapp: "9436554109",
    contactPref: "Call only",
    postedTime: "6 hours ago",
    featured: false
  },
  {
    id: "MKT-AGTL-27841",
    title: "NEET UG / Medical Entrance Complete Physics, Chem & Bio Prep Package",
    category: "Books & notes",
    price: 1100,
    originalPrice: 4800,
    priceType: "fixed",
    condition: "Like New (Few Pencil Highlights)",
    brand: "Allen Kota Modules + NCERT Fingertips",
    age: "6 Months",
    location: "Krishna Nagar, Agartala",
    sellerAddress: "Opposite Town Hall, Krishna Nagar",
    pincode: "799001",
    distance: "0.9 km away",
    description: "Complete 12-module package from Allen Kota for NEET UG, MTG NCERT at your Fingertips (Bio + Chem), and 33 Years NEET Chapterwise Solved Papers. Scored 640+ in NEET, passing on to aspiring medical aspirants.",
    negotiateTerms: "Fixed price (Value over ₹4,800)",
    minAcceptPrice: 1100,
    includes: ["12 Allen Kota Core Theory & Question Modules", "2 MTG NCERT Fingertips Guides", "33 Years Solved Question Archive"],
    sellerName: "Dr. Ananya Majumder",
    sellerPhone: "8794332190",
    sellerWhatsapp: "8794332190",
    contactPref: "Call & WhatsApp",
    postedTime: "1 day ago",
    featured: true
  }
];

// 7 Northeast Indian States with major cities
export interface NEState {
  name: string;
  capital: string;
  cities: string[];
}

export const NE_STATES: NEState[] = [
  {
    name: "Assam",
    capital: "Dispur",
    cities: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur", "Nagaon", "Tinsukia", "Bongaigaon"]
  },
  {
    name: "Meghalaya",
    capital: "Shillong",
    cities: ["Shillong", "Tura", "Jowai", "Nongstoin", "Williamnagar", "Baghmara"]
  },
  {
    name: "Tripura",
    capital: "Agartala",
    cities: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar", "Ambassa", "Belonia", "Sabroom"]
  },
  {
    name: "Manipur",
    capital: "Imphal",
    cities: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching", "Ukhrul"]
  },
  {
    name: "Mizoram",
    capital: "Aizawl",
    cities: ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib", "Saiha"]
  },
  {
    name: "Nagaland",
    capital: "Kohima",
    cities: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto"]
  },
  {
    name: "Arunachal Pradesh",
    capital: "Itanagar",
    cities: ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila", "Along"]
  }
];

// Flat list of all NE cities for dropdowns
export const NE_ALL_CITIES: string[] = NE_STATES.flatMap(s => s.cities);

// Legacy alias — some components may still reference this
export const AGARTALA_AREAS = [
  "Krishna Nagar",
  "Dhaleswar",
  "Banamalipur",
  "Battala",
  "Ramnagar",
  "Indranagar",
  "Abhoynagar",
  "Kunjaban",
  "A.D. Nagar",
  "Bordowali",
  "Badharghat",
  "College Tilla",
  "Narsingarh"
];

export const AGENT_PRICING_PLANS = [
  {
    id: "monthly",
    name: "Monthly Partner Pass",
    price: 99,
    period: "/ month",
    billingTag: "Billed Monthly",
    badge: "Popular Starter",
    featured: false,
    perks: [
      "0% Commission on direct customer leads",
      "Direct phone calls & WhatsApp customer requests",
      "Verified Pro Badge in search listings",
      "Instant Job Alerts via SMS & WhatsApp",
      "Northeast India Live Radar Map visibility",
      "Cancel anytime with 1 click"
    ],
    cta: "Select Monthly Pass"
  },
  {
    id: "annual",
    name: "Annual Partner Pass",
    price: 799,
    period: "/ year",
    billingTag: "Save 33% (₹66/month)",
    badge: "Best Value • VIP Agent",
    featured: true,
    perks: [
      "Everything in Monthly Pass",
      "VIP Top-Ranked Placement in search results",
      "33% Flat Annual Savings (Save ₹389/yr)",
      "Golden Verified Pro Shield on profile",
      "Priority Instant Lead Dispatch directly to phone",
      "Dedicated Agent Relationship Manager",
      "Quarterly Performance Bonus eligibility"
    ],
    cta: "Get VIP Annual Pass"
  }
];

export const CUSTOMER_PRO_PLANS = [
  {
    id: "monthly_pro",
    name: "Monthly Pro Pass",
    price: 49,
    period: "/ month",
    perks: [
      "Zero platform booking fees",
      "Priority agent dispatch within 20 mins",
      "Free ₹1,000 service damage protection",
      "Exclusive 15% discount on marketplace deals"
    ]
  },
  {
    id: "annual_pro",
    name: "Annual VIP Pass",
    price: 299,
    period: "/ year",
    badge: "Save 50%",
    perks: [
      "All Monthly Pro perks included",
      "Free quarterly plumbing & electrical checkup",
      "24/7 dedicated priority helpline",
      "Unlimited free emergency SOS connects"
    ]
  }
];

export const EMERGENCY_CONTACTS = [
  { name: "Police Emergency (All India)", number: "112", detail: "24/7 Central Helpline" },
  { name: "Fire & Rescue Services", number: "101", detail: "All NE State Capitals" },
  { name: "Ambulance / Health Emergency", number: "108", detail: "Immediate Medical Transit" },
  { name: "Women Helpline", number: "1091", detail: "Toll-Free Safety Desk" },
  { name: "Assam State Disaster Helpline", number: "1070", detail: "Flood & Disaster Relief" },
  { name: "Pathly 24/7 Support Desk", number: "+91 94361 23456", detail: "Customer & Agent Rapid Support" }
];

export const FAQS = [
  {
    q: "What is Pathly?",
    a: "Pathly connects people across all 7 Northeast Indian states — Assam, Meghalaya, Tripura, Manipur, Mizoram, Nagaland & Arunachal Pradesh — with real-time route accessibility, trusted local service professionals, and predictive logistics with fair pricing."
  },
  {
    q: "Which cities does Pathly serve?",
    a: "Pathly is live in 40+ cities across Northeast India including Guwahati, Shillong, Agartala, Imphal, Aizawl, Kohima, Itanagar, Silchar, Dibrugarh, Tezpur, Tura, and many more."
  },
  {
    q: "How does Pathly charge for Agent memberships?",
    a: "Pathly charges agents a simple transparent membership (₹99/mo or ₹799/yr) and takes 0% commission on the jobs you do. You keep 100% of what customers pay you directly!"
  },
  {
    q: "How does customer booking work?",
    a: "Select your state and city, pick the service category you need, view top-rated local agents nearby with ratings and verified badges, and book directly or contact them via Call and WhatsApp."
  },
  {
    q: "Can I buy and sell pre-owned items safely?",
    a: "Yes! The Pathly Second-Hand Market allows verified locals across Northeast India to list furniture, appliances, books, and electronics with direct seller contacts and price fixing transparency."
  }
];
