import { Router, type IRouter } from "express";
import { ListOrderItemCategoriesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const orderItemCategories = [
  {
    slug: "groceries",
    name: "Groceries",
    description: "Fresh food for tonight",
    sources: [
      {
        name: "Grocery Stores (kirana + departmental)",
        areaOrAddress:
          "Banamalipur, T G Road, Krishna Nagar, Jay Nagar, Dhaleswar",
        contactOrLink: "justdial.com/Agartala/Grocery-Stores",
        notes: null,
      },
      {
        name: "magicpin – Grocery listings",
        areaOrAddress: "Agartala city listings",
        contactOrLink: "magicpin.in/india/Agartala/All/Grocery",
        notes: "Mix of supermarkets, organic shops, and kirana shops",
      },
    ],
  },
  {
    slug: "pharmacy",
    name: "Pharmacy",
    description: "Essentials and prescriptions",
    sources: [
      {
        name: "Kiran Medical Hall",
        areaOrAddress: "R M S Choumohani, Agartala HO – 799001",
        contactOrLink: "(0381) 2324870",
        notes: null,
      },
      {
        name: "Datta Medical Stores",
        areaOrAddress: "Ronaldsay Rd, Battala Bazar – 799001",
        contactOrLink: "(0381) 2324651",
        notes: null,
      },
      {
        name: "Grand New Pharmacy",
        areaOrAddress: "Central Rd, Melarmath, Agartala HO – 799001",
        contactOrLink: "(0381) 2323803",
        notes: null,
      },
    ],
  },
  {
    slug: "household-supplies",
    name: "Household supplies",
    description: "The things home needs",
    sources: [
      {
        name: "General/departmental stores",
        areaOrAddress: "T G Road, Krishna Nagar, Banamalipur",
        contactOrLink: "justdial.com/Agartala/Grocery-Stores",
        notes: "Also stock household items",
      },
      {
        name: "Hardware & sanitary dealers",
        areaOrAddress: "Search alongside plumbing suppliers",
        contactOrLink: "sulekha.com",
        notes: 'Search Sulekha listings for "Sanitary Hardware Fitter" and building materials',
      },
    ],
  },
  {
    slug: "local-shops",
    name: "Local shops",
    description: "Good things, close by",
    sources: [
      {
        name: "Agartala Bazar",
        areaOrAddress: "Central market — general goods, spices, retailers",
        contactOrLink: null,
        notes: "Core downtown market hub",
      },
      {
        name: "Battala Bazar",
        areaOrAddress: "Battala — pharmacy and general shops",
        contactOrLink: null,
        notes: "Cluster near Battala Bazar",
      },
      {
        name: "Krishna Nagar / Chowmuhani belt",
        areaOrAddress: "T G Road, Colonel Chowmuhani",
        contactOrLink: null,
        notes: "Dense retail corridor",
      },
      {
        name: "Melarmath",
        areaOrAddress: "Central Road — pharmacies, small shops",
        contactOrLink: null,
        notes: "Near Melarmath",
      },
    ],
  },
  {
    slug: "nearby-services",
    name: "Nearby services",
    description: "Open now around you",
    sources: [
      {
        name: "Justdial Agartala (all categories)",
        areaOrAddress:
          "City-wide directory: restaurants, salons, doctors, real estate",
        contactOrLink: "justdial.com/Agartala",
        notes: null,
      },
      {
        name: "Sulekha Agartala (all categories)",
        areaOrAddress: "City-wide verified service providers",
        contactOrLink: "sulekha.com",
        notes: 'Search for "Agartala"',
      },
    ],
  },
] as const;

router.get("/order-items/categories", (_req, res) => {
  const data = ListOrderItemCategoriesResponse.parse(orderItemCategories);
  res.json(data);
});

export default router;