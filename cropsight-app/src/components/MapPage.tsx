import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ImageOverlay, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HistoryItem } from '../types';

// Fix leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 18);
  }, [lat, lng, map]);
  return null;
}

interface MapPageProps {
  currentScan: HistoryItem | null;
}

export default function MapPage({ currentScan }: MapPageProps) {
  const [forecastDays, setForecastDays] = useState(0);

  if (!currentScan) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center max-w-5xl mx-auto">
        <h3 className="text-xl font-bold text-slate-700">No Image Data Available</h3>
        <p className="text-slate-500 mt-2">Upload and analyze an image to view its NDVI vegetation map overlay here.</p>
      </div>
    );
  }

  const { geoTag, imageUrl, imageAspectRatio = 1.5, result } = currentScan;

  // We want the overlay to cover a realistic farm area footprint.
  // 0.0015 degrees lat is approximately 160 meters.
  const latSpan = 0.0015; 
  // Adjust longitude span based on the aspect ratio to strictly prevent image stretching
  // Include Web Mercator projection scaling correction based on latitude
  const latCorrection = Math.cos(geoTag.lat * (Math.PI / 180));
  const lngSpan = (latSpan * imageAspectRatio) / latCorrection;

  const bounds: L.LatLngBoundsExpression = [
    [geoTag.lat - latSpan / 2, geoTag.lng - lngSpan / 2],
    [geoTag.lat + latSpan / 2, geoTag.lng + lngSpan / 2]
  ];

  // Map 0-100% coordinates from AI output to Top-Left/Bottom-Right Leaflet Lat/Lng coordinates
  const mapYToLat = (yPct: number) => (geoTag.lat + latSpan / 2) - (yPct / 100) * latSpan;
  const mapXToLng = (xPct: number) => (geoTag.lng - lngSpan / 2) + (xPct / 100) * lngSpan;

  // Financial Loss Physics Engine
  // Base loss calculated off existing problems. 
  // We use an exponential model mimicking unchecked fungal or pest growth propagating 18% per day.
  const baseLoss = (result.marks?.length || 1) * 250 + (result.zones?.reduce((acc, z) => acc + (z.severityScore * 12), 0) || 0);
  const projectedLoss = Math.floor(baseLoss * Math.pow(1.18, forecastDays));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[750px] max-w-5xl mx-auto relative overflow-hidden">
       <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
         <div>
            <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
              Simulated NDVI Vegetation Map
              {forecastDays > 0 && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs uppercase tracking-widest font-black flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-[ping_1.5s_ease-in-out_infinite]"></div> Predictive Analytics Active</span>}
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Extracted GeoTag Location: <strong className="text-slate-700">{geoTag.lat.toFixed(5)}, {geoTag.lng.toFixed(5)}</strong>
            </p>
         </div>
       </div>

       <div className="flex-1 rounded-xl overflow-hidden shadow-inner border border-slate-300 relative">
         <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200 w-64">
            <h4 className="font-extrabold text-sm mb-3 text-slate-800 border-b border-slate-200 pb-2">NDVI Legend</h4>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700"><div className="w-5 h-5 bg-red-600 rounded-sm shadow-sm ring-1 ring-black/10"></div> Severely Stressed (-1 to 0)</div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700 mt-2"><div className="w-5 h-5 bg-yellow-400 rounded-sm shadow-sm ring-1 ring-black/10"></div> Moderate Stress (0 to 0.3)</div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700 mt-2"><div className="w-5 h-5 bg-lime-500 rounded-sm shadow-sm ring-1 ring-black/10"></div> Healthy Canopy (0.3 to 1)</div>
         </div>

         <MapContainer center={[geoTag.lat, geoTag.lng]} zoom={18} style={{ height: '100%', width: '100%', zIndex: 0 }}>
           <MapRecenter lat={geoTag.lat} lng={geoTag.lng} />
           <TileLayer
             url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
             attribution="Tiles &copy; Esri"
           />
           <Marker position={[geoTag.lat, geoTag.lng]}>
             <Popup className="font-bold text-center">
               Extracted GeoTag Origin<br/>
               <span className="text-xs text-slate-500 font-medium">{new Date(currentScan.date).toLocaleString()}</span>
             </Popup>
           </Marker>

           {/* Core NDVI Image Simulation using aggressive CSS filters */}
           <ImageOverlay 
             url={imageUrl} 
             bounds={bounds} 
             className="mix-blend-color-burn saturate-[4] hue-rotate-[115deg] contrast-[1.8] brightness-75 opacity-80 shadow-2xl rounded-sm transition-opacity duration-1000" 
             style={{ opacity: forecastDays > 0 ? 0.3 : 0.9 }} // Map fades out gracefully to highlight the spreading disease bloom
           />

           {/* Cellular Automaton Disease Spread Physics Render */}
           {forecastDays > 0 && result.marks?.map((mark, i) => {
              // Convert exact pixel defect coordinate back into Earth Lat/Lng
              const lat = mapYToLat((mark.ymin + mark.ymax) / 2);
              const lng = mapXToLng((mark.xmin + mark.xmax) / 2);
              
              // Exponential bloom based on slider (e.g. 2m base radius, compounding 22% footprint expansion per day)
              const currentRadius = 2 * Math.pow(1.22, forecastDays); 
              
              return (
                <Circle 
                  key={`spread-mark-${i}`} 
                  center={[lat, lng]} 
                  radius={Math.min(currentRadius, 120)} // max spread cap
                  pathOptions={{
                     color: forecastDays > 7 ? '#991b1b' : '#ef4444', 
                     fillColor: forecastDays > 5 ? '#dc2626' : '#f87171', 
                     fillOpacity: Math.min(0.4 + (forecastDays * 0.04), 0.85),
                     weight: 2
                  }}
                  className="transition-all duration-300 ease-in-out"
                />
              );
           })}

           {/* Also Bloom the Major Zones if time passing */}
           {forecastDays > 0 && result.zones?.map((zone, i) => {
              if (zone.severityScore < 30) return null; // Don't bloom healthy zones
              const lat = mapYToLat((zone.ymin + zone.ymax) / 2);
              const lng = mapXToLng((zone.xmin + zone.xmax) / 2);
              const currentRadius = 6 * Math.pow(1.15, forecastDays); 
              
              return (
                <Circle 
                  key={`spread-zone-${i}`} 
                  center={[lat, lng]} 
                  radius={Math.min(currentRadius, 150)} 
                  pathOptions={{ color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.3, weight: 1, dashArray: '4' }}
                  className="transition-all duration-300 ease-in-out"
                />
              );
           })}
         </MapContainer>
         
         {/* Disease Spread Time Machine Control Deck */}
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/95 backdrop-blur-xl p-5 md:px-8 md:py-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700 w-[95%] max-w-3xl transition-all">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
               <div className="flex items-center gap-3">
                 <div className={`w-4 h-4 rounded-full ${forecastDays > 5 ? 'bg-red-500 animate-[ping_1.5s_ease-in-out_infinite]' : 'bg-slate-500'}`}></div>
                 <div>
                    <h3 className="text-white font-black text-xl tracking-tight">Disease Spread Time Machine</h3>
                    <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mt-1">Predictive Analytics Physics Model</p>
                 </div>
               </div>
               <div className="text-left md:text-right bg-black/30 px-5 py-2 rounded-xl border border-red-500/20">
                  <span className="block text-[10px] uppercase text-red-400 font-extrabold tracking-widest mb-1">Projected Revenue Loss</span>
                  <span className="text-3xl font-black text-red-500 tabular-nums">${projectedLoss.toLocaleString()}</span>
               </div>
            </div>

            <div className="relative pt-2">
               <input 
                 type="range" min="0" max="14" step="1" value={forecastDays} 
                 onChange={(e) => setForecastDays(Number(e.target.value))} 
                 className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-red-500 accent-red-600 shadow-inner"
                 aria-label="Forecast Days"
               />
               
               <div className="flex justify-between text-xs font-black text-slate-500 mt-4 px-1 relative uppercase tracking-wider">
                  <span className={`${forecastDays === 0 ? 'text-white' : ''}`}>Day 0 (Current)</span>
                  <div className="absolute left-1/2 -translate-x-1/2 -top-12 opacity-100 flex items-center justify-center">
                      <span className="text-white font-black bg-red-600 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.6)] text-sm tabular-nums border border-red-400">+{forecastDays} Days</span>
                  </div>
                  <span className={`${forecastDays === 14 ? 'text-red-400' : ''}`}>Day +14 (Critical)</span>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}
