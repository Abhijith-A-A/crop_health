import { useState } from 'react';
import ImageAnalyzer from './components/ImageAnalyzer';
import MapPage from './pages/MapPage';
import HistoryPage from './pages/HistoryPage';
import VoiceAssistant from './components/VoiceAssistant';
import WeatherPage from './pages/WeatherPage';
import { Layers, Map as MapIcon, History, CloudSun } from 'lucide-react';
import type { HistoryItem } from './types';

const MOCK_SCAN: HistoryItem = {
  id: 'demo-123',
  imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop', // A lush green field
  imageAspectRatio: 1.5,
  date: new Date('2026-03-18T10:00:00Z'),
  geoTag: { lat: 38.5624, lng: -121.5830 },
  result: {
    overallHealth: "Moderate Nitrogen Deficiency",
    isHealthy: false,
    plantCount: 4250,
    yieldEstimate: "4.8 Tons/Acre",
    farmContext: "California Central Valley Almond Orchard. Early leaf wilting detected in North-West quadrant. Soil moisture levels are nominal but chlorophyll indices indicate nutrient stress.",
    zones: [
      { ymin: 20, xmin: 30, ymax: 50, xmax: 60, label: "Nitrogen Stress", severityScore: 68, colorCode: "#f59e0b", action: "Apply urea-based fertilizer within 48 hours." },
      { ymin: 70, xmin: 10, ymax: 90, xmax: 40, label: "Healthy Canopy", severityScore: 12, colorCode: "#22c55e", action: "No immediate action. Maintain 4-day irrigation cycle." }
    ],
    marks: [
      { ymin: 45, xmin: 55, ymax: 47, xmax: 57, label: "Aphid Cluster", colorCode: "#ef4444" }
    ],
    weedPath: [{y: 10, x: 10}, {y: 20, x: 80}, {y: 90, x: 50}],
    irrigationLeaks: []
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'map' | 'history' | 'weather'>('analysis');
  const [history, setHistory] = useState<HistoryItem[]>([MOCK_SCAN]);

  const handleScanComplete = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const currentScan = history.length > 0 ? history[0] : null;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Top Navigation Panel */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between h-auto sm:h-16 py-3 sm:py-0">
            <div className="flex items-center justify-center sm:justify-start mb-3 sm:mb-0">
              <span className="text-2xl font-heading font-black tracking-tight text-blue-600">CropSight<span className="text-slate-800">Pro</span></span>
            </div>
            <div className="flex space-x-2 sm:space-x-4 items-center justify-center sm:justify-end">
              <button 
                onClick={() => setActiveTab('analysis')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'analysis' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Layers className="w-4 h-4" /> <span className="hidden sm:inline">Analysis Engine</span>
              </button>

              <button 
                onClick={() => setActiveTab('map')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <MapIcon className="w-4 h-4" /> <span className="hidden sm:inline">NDVI Map</span>
              </button>

              <button 
                onClick={() => setActiveTab('history')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <History className="w-4 h-4" /> <span className="hidden sm:inline">Scan History</span>
              </button>

              <button 
                onClick={() => setActiveTab('weather')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'weather' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <CloudSun className="w-4 h-4" /> <span className="hidden sm:inline">Micro-Climate</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main View Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
         {activeTab === 'analysis' && <ImageAnalyzer onComplete={handleScanComplete} />}
         {activeTab === 'map' && <MapPage currentScan={currentScan} />}
         {activeTab === 'history' && <HistoryPage history={history} />}
         {activeTab === 'weather' && <WeatherPage currentScan={currentScan} />}
      </main>

      {/* Global AR Voice Overlay */}
      <VoiceAssistant onNavigate={setActiveTab} currentScan={currentScan} />
    </div>
  );
}

export default App;
