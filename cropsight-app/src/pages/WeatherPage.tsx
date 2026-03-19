import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Droplets, Loader2, MapPin, Thermometer, CalendarDays } from 'lucide-react';
import type { HistoryItem } from '../types';

interface WeatherPageProps {
  currentScan: HistoryItem | null;
}

export default function WeatherPage({ currentScan }: WeatherPageProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const geoTag = currentScan?.geoTag;

  useEffect(() => {
    async function fetchWeather(lat: number, lng: number) {
      setLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relativehumidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        const res = await fetch(url);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Weather sync failed", err);
      }
      setLoading(false);
    }

    if (geoTag) {
      fetchWeather(geoTag.lat, geoTag.lng);
    } else {
      fetchWeather(38.5624, -121.5830);
    }
  }, [geoTag]);

  if (!currentScan) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center max-w-5xl mx-auto">
        <h3 className="text-xl font-bold text-slate-700">Awaiting Sub-Millimeter Telemetry</h3>
        <p className="text-slate-500 mt-2">Upload and analyze an image so we can extract exact GPS coordinates for accurate micro-climate reporting.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-24 flex flex-col items-center justify-center text-slate-500 max-w-5xl mx-auto">
         <Loader2 className="animate-spin w-10 h-10 mb-4 text-blue-500" />
         <h2 className="text-xl font-bold">Synchronizing Global Satellite Weather...</h2>
      </div>
    );
  }

  if (!data || !data.current_weather) return null;

  const current = data.current_weather;
  const humidity = data.hourly?.relativehumidity_2m?.[0] || 45;
  const daily = data.daily || {};

  const getWeatherUI = (code: number) => {
    if (code === 0) return { label: 'Clear Sky', icon: <Sun className="w-16 h-16 text-yellow-400 drop-shadow-md" /> };
    if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: <Cloud className="w-16 h-16 text-slate-300 drop-shadow-md" /> };
    if (code >= 45 && code <= 48) return { label: 'Fog / Overcast', icon: <Cloud className="w-16 h-16 text-slate-400 drop-shadow-md" /> };
    if (code >= 51 && code <= 67) return { label: 'Rain / Drizzle', icon: <CloudRain className="w-16 h-16 text-blue-400 drop-shadow-md" /> };
    if (code >= 95 && code <= 99) return { label: 'Thunderstorms', icon: <CloudLightning className="w-16 h-16 text-indigo-400 drop-shadow-md" /> };
    return { label: 'Clear', icon: <Sun className="w-16 h-16 text-yellow-400 drop-shadow-md" /> };
  };

  const ui = getWeatherUI(current.weathercode);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      
      {/* Current Conditions Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-white relative overflow-hidden">
         {/* Decorative Background Elements */}
         <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
         <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            
            {/* Condition & Geolocation */}
            <div className="flex flex-col items-center md:items-start">
               <div className="flex items-center gap-6">
                 <div className="bg-slate-800/80 p-5 rounded-full border border-slate-700 shadow-inner">
                   {ui.icon}
                 </div>
                 <div>
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tight">{ui.label}</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
                       <MapPin className="w-4 h-4 text-red-400" /> Lat: {geoTag!.lat.toFixed(4)} | Lng: {geoTag!.lng.toFixed(4)}
                    </p>
                 </div>
               </div>
            </div>

            {/* Core Metrics */}
            <div className="flex gap-8 lg:gap-14">
               <div className="flex flex-col items-center">
                  <Thermometer className="w-8 h-8 text-orange-400 mb-2" />
                  <span className="text-4xl font-black tabular-nums">{current.temperature}°<span className="text-xl text-slate-500">C</span></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Temp</span>
               </div>
               
               <div className="flex flex-col items-center">
                  <Droplets className="w-8 h-8 text-blue-400 mb-2" />
                  <span className="text-4xl font-black tabular-nums">{humidity}%</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Humidity</span>
               </div>

               <div className="flex flex-col items-center">
                  <Wind className="w-8 h-8 text-emerald-400 mb-2" />
                  <span className="text-4xl font-black tabular-nums">{current.windspeed}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">km/h Wind</span>
               </div>
            </div>
         </div>
      </div>

      {/* 7-Day Forecast Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <CalendarDays className="w-5 h-5 text-blue-500" /> Targeted 7-Day Forecast
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {daily.time?.map((timeStr: string, index: number) => {
            const date = new Date(timeStr);
            const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
            const maxTemp = daily.temperature_2m_max[index];
            const minTemp = daily.temperature_2m_min[index];
            const rainProb = daily.precipitation_probability_max[index];
            const dailyCode = daily.weathercode[index];
            const dailyUI = getWeatherUI(dailyCode);

            return (
              <div key={timeStr} className="flex flex-col items-center bg-slate-50 border border-slate-100 p-4 rounded-xl hover:shadow-md transition cursor-default">
                 <span className={`text-sm font-black uppercase mb-3 ${index === 0 ? 'text-blue-600' : 'text-slate-500'}`}>{dayName}</span>
                 
                 {/* Scale down the SVG for the grid */}
                 <div className="scale-75 -my-2">{dailyUI.icon}</div>
                 
                 <div className="flex items-center gap-2 mt-3 font-bold text-sm">
                   <span className="text-slate-800">{Math.round(maxTemp)}°</span>
                   <span className="text-slate-400">{Math.round(minTemp)}°</span>
                 </div>
                 
                 {rainProb > 20 && (
                   <span className="text-xs font-bold text-blue-500 mt-2 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                     <Droplets className="w-3 h-3" /> {rainProb}%
                   </span>
                 )}
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
