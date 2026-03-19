import { useState } from 'react';
import ImageAnalyzer from './components/ImageAnalyzer';
import MapPage from './components/MapPage';
import HistoryPage from './components/HistoryPage';
import VoiceAssistant from './components/VoiceAssistant';
import WeatherPage from './components/WeatherPage';
import { Layers, Map as MapIcon, History, CloudSun } from 'lucide-react';
import type { HistoryItem } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'map' | 'history' | 'weather'>('analysis');
  const [history, setHistory] = useState<HistoryItem[]>([]);

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
