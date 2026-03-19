import type { HistoryItem } from '../types';

interface HistoryPageProps {
  history: HistoryItem[];
}

export default function HistoryPage({ history }: HistoryPageProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center max-w-5xl mx-auto">
        <h3 className="text-xl font-bold text-slate-700">No History Yet</h3>
        <p className="text-slate-500 mt-2">Upload and analyze images to see your past records here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold font-heading text-slate-800">Scan History</h2>
      {history.map((item) => (
        <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-6 items-start hover:shadow-md transition cursor-pointer">
           <img src={item.imageUrl} className="w-full sm:w-48 h-32 object-cover rounded-md shadow-sm" alt="Scan Thumbnail" />
           <div className="flex-1">
              <h3 className="font-extrabold text-lg text-slate-800">{item.result.overallHealth}</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">{new Date(item.date).toLocaleString()}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="block text-xs uppercase font-bold text-slate-400">Yield Est.</span>
                  <span className="text-sm font-bold text-slate-700">{item.result.yieldEstimate}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase font-bold text-slate-400">Detected Issues</span>
                  <span className="text-sm font-bold text-slate-700">{item.result.marks.length} marks, {item.result.zones.length} zones</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs uppercase font-bold text-slate-400">Extracted GeoTag</span>
                  <span className="text-sm font-bold text-slate-700">{item.geoTag.lat.toFixed(5)}, {item.geoTag.lng.toFixed(5)}</span>
                </div>
              </div>
           </div>
        </div>
      ))}
    </div>
  );
}
