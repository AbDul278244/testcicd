import type { WeatherResult } from "@/lib/tools";

const ICONS: Record<string, string> = {
  Clear: "☀️",
  clear: "☀️",
  cloud: "☁️",
  Overcast: "☁️",
  rain: "🌧️",
  drizzle: "🌦️",
  snow: "❄️",
  Thunderstorm: "⛈️",
  Fog: "🌫️",
};

function iconFor(description: string) {
  const key = Object.keys(ICONS).find((k) =>
    description.toLowerCase().includes(k.toLowerCase())
  );
  return key ? ICONS[key] : "🌤️";
}

export default function WeatherCard({ data }: { data: WeatherResult }) {
  return (
    <div className="max-w-xs bg-white border border-line rounded-2xl p-5 flex items-center gap-4">
      <div className="text-4xl leading-none">{iconFor(data.description)}</div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display italic text-2xl">{data.temperature}°</span>
          <span className="font-mono text-xs text-ink/50">{data.unit.replace("°", "")}</span>
        </div>
        <div className="text-sm text-ink/70">{data.description}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink/40 mt-1">
          {data.city} · wind {data.windSpeedKmh} km/h
        </div>
      </div>
    </div>
  );
}
