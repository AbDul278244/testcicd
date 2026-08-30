// lib/tools.ts
//
// Phase 5 — Tool calling.
//
// Two things live here:
//   1. `toolDefinitions` — JSON-schema descriptions of each function, in the
//      shape Groq/OpenAI-style `tools` param expects. This is what the model reads
//      to decide *whether* and *how* to call a tool.
//   2. `executeTool` — the actual server-side code that runs when the model
//      asks to call one of them. The model never runs code itself; it just
//      asks, and we execute + report the result back.

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "getWeather",
      description:
        "Get the current weather for a city. Use this whenever the user asks about weather, temperature, rain, or what to wear/pack for a place.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name, e.g. 'Nagpur' or 'Tokyo'",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchProducts",
      description:
        "Search for shoes/sneakers in the catalog. Use this whenever the user asks to find, show, or recommend shoes, sneakers, or footwear — optionally filtered by brand or a maximum price.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Free-text search, e.g. 'running shoes' or 'sneakers'",
          },
          brand: {
            type: "string",
            description: "Optional brand filter, e.g. 'Puma', 'Nike'",
          },
          maxPrice: {
            type: "number",
            description: "Optional maximum price in INR",
          },
        },
        required: ["query"],
      },
    },
  },
] as const;

// ---------- Types for structured results the UI will render as cards ----------

export interface WeatherResult {
  type: "weather";
  city: string;
  temperature: number;
  unit: "°C";
  description: string;
  windSpeedKmh: number;
}

export interface ProductItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: "INR";
  rating: number;
  imageUrl: string;
  url: string;
}

export interface ProductsResult {
  type: "products";
  query: string;
  items: ProductItem[];
}

export type ToolResult = WeatherResult | ProductsResult;

// ---------- getWeather — real API, no key required ----------
// Open-Meteo: free, no API key, no rate-limit signup needed.

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  95: "Thunderstorm",
  99: "Thunderstorm with hail",
};

async function getWeather(city: string): Promise<WeatherResult> {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1`
  );
  const geo = await geoRes.json();

  if (!geo.results || geo.results.length === 0) {
    throw new Error(`Could not find a location named "${city}"`);
  }

  const { latitude, longitude, name } = geo.results[0];

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m`
  );
  const weather = await weatherRes.json();
  const code: number = weather.current.weather_code;

  return {
    type: "weather",
    city: name,
    temperature: Math.round(weather.current.temperature_2m),
    unit: "°C",
    description: WEATHER_CODE_MAP[code] ?? "Unknown conditions",
    windSpeedKmh: Math.round(weather.current.wind_speed_10m),
  };
}

// ---------- searchProducts — MOCK catalog ----------
// There's no free public "search any shoe store" API. This is a small
// in-memory catalog so the tool-calling flow is real end-to-end.
// To go live, swap the body of this function for a real call to e.g.
// SerpApi's Google Shopping endpoint, RapidAPI's real-time product search,
// or a retailer's own product API — same return shape, real data.

const MOCK_CATALOG: ProductItem[] = [
  { id: "p1", name: "Puma Softride Rift", brand: "Puma", price: 2499, currency: "INR", rating: 4.3, imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300", url: "#" },
  { id: "p2", name: "Puma Flyer Runner", brand: "Puma", price: 1999, currency: "INR", rating: 4.1, imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300", url: "#" },
  { id: "p3", name: "Puma Smash V2", brand: "Puma", price: 2799, currency: "INR", rating: 4.4, imageUrl: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=300", url: "#" },
  { id: "p4", name: "Puma Cell Phase", brand: "Puma", price: 3499, currency: "INR", rating: 4.2, imageUrl: "https://images.unsplash.com/photo-1608379743498-4bca3cf0e2f5?w=300", url: "#" },
  { id: "p5", name: "Puma Axelion", brand: "Puma", price: 2299, currency: "INR", rating: 4.0, imageUrl: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300", url: "#" },
  { id: "p6", name: "Nike Revolution 6", brand: "Nike", price: 2999, currency: "INR", rating: 4.5, imageUrl: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=300", url: "#" },
  { id: "p7", name: "Adidas Runfalcon 3", brand: "Adidas", price: 2199, currency: "INR", rating: 4.2, imageUrl: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=300", url: "#" },
];

async function searchProducts(
  query: string,
  brand?: string,
  maxPrice?: number
): Promise<ProductsResult> {
  let items = MOCK_CATALOG;

  if (brand) {
    items = items.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
  }
  if (typeof maxPrice === "number") {
    items = items.filter((p) => p.price <= maxPrice);
  }

  items = [...items].sort((a, b) => a.price - b.price);

  return { type: "products", query, items };
}

// ---------- dispatcher ----------

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case "getWeather":
      return getWeather(String(args.city));
    case "searchProducts": {
  const rawMaxPrice = args.maxPrice;
  const maxPrice =
    rawMaxPrice === undefined || rawMaxPrice === null || rawMaxPrice === ""
      ? undefined
      : Number(rawMaxPrice);

  return searchProducts(
    String(args.query ?? ""),
    args.brand ? String(args.brand) : undefined,
    typeof maxPrice === "number" && !Number.isNaN(maxPrice) ? maxPrice : undefined
  );
}
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
