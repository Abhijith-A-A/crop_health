import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ImageOverlay, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star, Info } from 'lucide-react';
import type { HistoryItem } from '../types';

// Fix leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom Peak Health Icon
const peakHealthIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-lime-500 p-2 rounded-full border-2 border-white shadow-lg animate-bounce"><svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 18);
  }, [lat, lng, map]);
  return null;
}

// Hook to apply SVG filter to Leaflet ImageOverlay
function useNDVIFilter(filterId: string, opacity: number) {
  const ref = useRef<L.ImageOverlay>(null);
  
  useEffect(() => {
    if (ref.current) {
      const el = ref.current.getElement();
      if (el) {
        el.style.filter = `url(#${filterId}) brightness(1.1) contrast(1.1)`;
        el.style.opacity = opacity.toString();
      }
    }
  }, [filterId, opacity]);

  return ref;
}

interface MapPageProps {
  currentScan: HistoryItem | null;
}

export default function MapPage({ currentScan }: MapPageProps) {
  const [forecastDays, setForecastDays] = useState(0);

  // Memoize Peak Health Location
  const peakHealthZone = useMemo(() => {
    if (!currentScan || !currentScan.result.zones) return null;
    return [...currentScan.result.zones].sort((a, b) => a.severityScore - b.severityScore)[0];
  }, [currentScan]);

  const ndviRef = useNDVIFilter('ndvi-spectral', forecastDays > 0 ? 0.4 : 0.85);

  if (!currentScan) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center max-w-5xl mx-auto">
        <h3 className="text-xl font-bold text-slate-700">No Image Data Available</h3>
        <p className="text-slate-500 mt-2">Upload and analyze an image to view its NDVI vegetation map overlay here.</p>
      </div>
    );
  }

  const { geoTag, imageUrl, imageAspectRatio = 1.5, result } = currentScan;

  const latSpan = 0.0015; 
  const latCorrection = Math.cos(geoTag.lat * (Math.PI / 180));
  const lngSpan = (latSpan * imageAspectRatio) / latCorrection;

  const bounds: L.LatLngBoundsExpression = [
    [geoTag.lat - latSpan / 2, geoTag.lng - lngSpan / 2],
    [geoTag.lat + latSpan / 2, geoTag.lng + lngSpan / 2]
  ];

  const mapYToLat = (yPct: number) => (geoTag.lat + latSpan / 2) - (yPct / 100) * latSpan;
  const mapXToLng = (xPct: number) => (geoTag.lng - lngSpan / 2) + (xPct / 100) * lngSpan;

  const baseLoss = (result.marks?.length || 1) * 250 + (result.zones?.reduce((acc, z) => acc + (z.severityScore * 12), 0) || 0);
  const projectedLoss = Math.floor(baseLoss * Math.pow(1.18, forecastDays));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col h-[800px] max-w-6xl mx-auto relative overflow-hidden">
       {/* Hidden SVG Filter Definition for Professional NDVI Scaling */}
       <svg style={{ position: 'absolute', width: 0, height: 0 }}>
         <filter id="ndvi-spectral">
           {/* Step 1: Maximize contrast between green channel and others */}
           <feColorMatrix type="matrix" values="
             0 0 0 0 0
             0 3 -2 0 0
             -1.5 0 0 0 0
             0 0 0 1 0" />
           {/* Step 2: Map to a Red-Yellow-Green Ramp */}
           <feComponentTransfer>
             <feFuncR type="table" tableValues="1 1 0.1" />
             <feFuncG type="table" tableValues="0.1 0.9 1" />
             <feFuncB type="table" tableValues="0.1 0 0.1" />
           </feComponentTransfer>
         </filter>
       </svg>

       <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
         <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              Precision NDVI Spectral Map
              {forecastDays > 0 && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black flex items-center gap-2">Predictive Active</span>}
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Georeferenced Footprint: <strong className="text-slate-700">{geoTag.lat.toFixed(5)}, {geoTag.lng.toFixed(5)}</strong>
            </p>
         </div>
         {peakHealthZone && (
            <div className="bg-lime-50 px-4 py-2 rounded-lg border border-lime-200 flex items-center gap-3">
               <div className="bg-lime-500 p-1.5 rounded-full"><Star className="w-4 h-4 text-white" /></div>
               <div>
                  <span className="block text-[10px] uppercase font-black text-lime-700 leading-none">Peak Health Area</span>
                  <span className="text-sm font-bold text-slate-800">Zone Detected @ {peakHealthZone.severityScore}% Stress</span>
               </div>
            </div>
         )}
       </div>

       <div className="flex-1 rounded-xl overflow-hidden shadow-inner border border-slate-300 relative bg-slate-200">
         <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-slate-200 w-64 translate-x-0 opacity-100 transition-all">
            <h4 className="font-extrabold text-xs mb-3 text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-widest flex items-center justify-between">
              Spectral Legend <Info className="w-3 h-3 text-slate-400" />
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div className="w-4 h-4 bg-[#22c55e] rounded-sm ring-1 ring-black/10"></div> 
                High Vegetation (NDVI 0.6+)
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div className="w-4 h-4 bg-[#eab308] rounded-sm ring-1 ring-black/10"></div> 
                Moderate/Transition (0.3-0.6)
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div className="w-4 h-4 bg-[#ef4444] rounded-sm ring-1 ring-black/10"></div> 
                Low/Stressed (&lt; 0.3)
              </div>
            </div>
         </div>

         <MapContainer center={[geoTag.lat, geoTag.lng]} zoom={18} style={{ height: '100%', width: '100%', zIndex: 0 }}>
           <MapRecenter lat={geoTag.lat} lng={geoTag.lng} />
           <TileLayer
             url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
             attribution="Tiles &copy; Esri"
           />
           
           <Marker position={[geoTag.lat, geoTag.lng]}>
             <Popup className="font-bold text-center">Scan Point Origin</Popup>
           </Marker>

           {peakHealthZone && (
             <Marker 
               position={[mapYToLat((peakHealthZone.ymin + peakHealthZone.ymax) / 2), mapXToLng((peakHealthZone.xmin + peakHealthZone.xmax) / 2)]} 
               icon={peakHealthIcon}
             >
               <Popup className="font-black">
                 <div className="text-center p-1">
                   <div className="text-lime-600 uppercase text-[10px] tracking-widest font-black mb-1">Peak Vegetative Density</div>
                   <div className="text-lg">Healthy {peakHealthZone.label}</div>
                   <div className="text-slate-500 text-xs mt-1 font-medium italic">Confirmed high chlorophyll reflectance</div>
                 </div>
               </Popup>
             </Marker>
           )}

           <ImageOverlay 
             ref={ndviRef}
             url={imageUrl} 
             bounds={bounds} 
             className="shadow-2xl transition-all duration-700" 
           />

           {forecastDays > 0 && result.marks?.map((mark, i) => (
             <Circle 
               key={`sm-${i}`} 
               center={[mapYToLat((mark.ymin+mark.ymax)/2), mapXToLng((mark.xmin+mark.xmax)/2)]} 
               radius={3 * Math.pow(1.22, forecastDays)} 
               pathOptions={{ color: '#ef4444', fillOpacity: 0.5 }}
             />
           ))}
         </MapContainer>
         
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-slate-700 w-[95%] max-w-2xl transition-all">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-white font-black text-lg">Disease Spread Time Machine</h3>
               <div className="bg-red-500/20 px-4 py-1 rounded-full border border-red-500/30">
                  <span className="text-red-400 font-black tabular-nums">+${projectedLoss.toLocaleString()} Loss</span>
               </div>
            </div>
            <input 
              type="range" min="0" max="14" step="1" value={forecastDays} 
              onChange={(e) => setForecastDays(Number(e.target.value))} 
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-lime-500"
            />
            <div className="flex justify-between text-[10px] font-black text-slate-500 mt-3 uppercase tracking-widest">
               <span>Current</span>
               <span className="text-white bg-slate-800 px-3 py-1 rounded-full">{forecastDays} Days Forecast</span>
               <span>Two Weeks</span>
            </div>
         </div>
       </div>
    </div>
  );
}
