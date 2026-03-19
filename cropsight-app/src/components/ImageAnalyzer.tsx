import React, { useState } from 'react';
import { UploadCloud, AlertTriangle, Loader2, Download, MessageSquare, PlusCircle, FileJson, FileText, Shield, TrendingUp, Sprout, Droplets, Target, Activity } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import exifr from 'exifr';
import type { AnalysisResult, HistoryItem, GeoTag } from '../types';

interface ImageAnalyzerProps {
  onComplete?: (item: HistoryItem) => void;
}

export default function ImageAnalyzer({ onComplete }: ImageAnalyzerProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showZones, setShowZones] = useState(true);
  const [showMarks, setShowMarks] = useState(true);
  const [showWeedPath, setShowWeedPath] = useState(false);
  const [showIrrigation, setShowIrrigation] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', msg: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const apiKeysStr = import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || '';
  const apiKeys = apiKeysStr.split(',').map((k: string) => k.trim()).filter((k: string) => k !== '');
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImage(URL.createObjectURL(file));
      setMimeType(file.type);
      setResult(null); setError(null); setChatHistory([]);
      try { setBase64Image(await fileToBase64(file)); }
      catch (err) { setError('Failed to read image file'); }
    }
  };

  const analyzeImage = async () => {
    if (!image || !base64Image || !mimeType) return;
    if (apiKeys.length === 0) { setError('Gemini API Keys are missing.'); return; }

    setIsAnalyzing(true); setError(null);
    let success = false; let attemptIndex = currentKeyIndex; let attempts = 0;
    let parsedData: AnalysisResult | null = null;

    while (!success && attempts < apiKeys.length) {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKeys[attemptIndex] });
        const prompt = `You are an expert agricultural AI for CropSight — an SDG Goal 2 (Zero Hunger) Aerial Crop Health Intelligence Platform.
        
This is a top-down aerial/drone image of farmland captured at 10-50m altitude. Perform comprehensive crop stress and health analysis.

Your response must be farmer-readable. Each zone must carry a severity score and a specific actionable recommendation.

Strictly output valid JSON:
{
  "overallHealth": "string (e.g. 'Moderate Stress Detected' or 'Healthy - No Action Needed')",
  "isHealthy": boolean,
  "zones": [
    {
      "ymin": number(0-100), "xmin": number(0-100), "ymax": number(0-100), "xmax": number(0-100),
      "label": "string (specific stress type: e.g. 'Nitrogen Deficiency', 'Leaf Blight', 'Water Stress', 'Healthy Canopy')",
      "severityScore": number(0-100),
      "colorCode": "string(hex) (#22c55e for healthy, #f59e0b for moderate, #ef4444 for severe, #7c3aed for critical)",
      "action": "string (specific farmer action: e.g. 'Apply urea at 50kg/ha within 48 hours', 'Schedule fungicide spray within 24 hours')"
    }
  ],
  "marks": [{"ymin": number, "xmin": number, "ymax": number, "xmax": number, "label": "string", "colorCode": "string"}],
  "plantCount": number,
  "yieldEstimate": "string",
  "weedPath": [{"y": number(0-100), "x": number(0-100)}],
  "irrigationLeaks": [{"ymin": number, "xmin": number, "ymax": number, "xmax": number, "label": "Leak", "severityScore": 100, "colorCode": "#3b82f6", "action": "Fix irrigation line"}],
  "farmContext": "string (detailed paragraph about conditions for chatbot context)"
}

CRITICAL RULES:
- Each zone MUST have a specific, actionable recommendation a farmer can execute within the hour.
- Severity scores: 0-25 = Healthy, 26-50 = Monitor, 51-75 = Action Required, 76-100 = Critical/Urgent
- Use colour codes that match severity: green for healthy, yellow for moderate, red for severe, purple for critical.
- Label zones with SPECIFIC disease/stress names, not generic terms.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [prompt, { inlineData: { data: base64Image, mimeType: mimeType } }],
          config: { responseMimeType: "application/json" }
        });

        const text = response.text || '';
        parsedData = JSON.parse(text.replace(/```json\n|\n```|```/g, '').trim()) as AnalysisResult;

        success = true; setResult(parsedData);
        if (attemptIndex !== currentKeyIndex) setCurrentKeyIndex(attemptIndex);
      } catch (err: any) {
        if (err.message?.includes('429') || err.message?.includes('quota') || err.status === 429) {
          attemptIndex = (attemptIndex + 1) % apiKeys.length; attempts++;
          if (attempts === apiKeys.length) setError('All API keys have hit quota.');
        } else { setError(err.message || 'Failed to analyze image.'); break; }
      }
    }

    setIsAnalyzing(false);

    if (success && parsedData && onComplete) {
      let geoTag: GeoTag = { lat: 38.562410, lng: -121.583030 };
      let aspectRatio = 1.5;

      try {
        if (imageFile) {
          const tag = await exifr.gps(imageFile);
          if (tag && tag.latitude && tag.longitude) {
            geoTag = { lat: tag.latitude, lng: tag.longitude };
          }
        }
      } catch (e) { console.error('EXIF parse failed', e); }

      if (image) {
        const imgObj = new Image();
        imgObj.src = image;
        await new Promise((resolve) => {
          imgObj.onload = () => { aspectRatio = imgObj.width / imgObj.height; resolve(true); };
          imgObj.onerror = () => resolve(false);
        });
      }

      onComplete({
        id: Date.now().toString(),
        imageUrl: image,
        imageAspectRatio: aspectRatio,
        result: parsedData,
        geoTag,
        date: new Date()
      });
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || apiKeys.length === 0 || !result) return;
    const userMsg = chatInput;
    setChatInput(''); setChatLoading(true);
    setChatHistory(p => [...p, {role: 'user', msg: userMsg}]);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });
      const prompt = `You are CropSight AI, an expert crop health advisor aligned with SDG Goal 2 (Zero Hunger). 
      Context from recent aerial drone scan: ${result.farmContext}. 
      Zones detected: ${result.zones?.map(z => `${z.label} (Severity: ${z.severityScore}%, Action: ${z.action})`).join('; ')}.
      The farmer asks: "${userMsg}". 
      Give a concise, actionable, farmer-friendly answer with specific timelines and quantities where possible.`;

      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [prompt] });
      setChatHistory(p => [...p, {role: 'ai', msg: response.text || 'I apologize, I could not process that query.'}]);
    } catch (e: any) {
      setChatHistory(p => [...p, {role: 'ai', msg: "Network error processing your request."}]);
    }
    setChatLoading(false);
  };

  /* ── Export JSON Report ── */
  const exportJSON = () => {
    if (!result) return;
    const report = {
      platform: 'CropSight — Aerial Crop Health Intelligence',
      sdgGoal: 'SDG 2 — Zero Hunger',
      generatedAt: new Date().toISOString(),
      overallHealth: result.overallHealth,
      isHealthy: result.isHealthy,
      plantCount: result.plantCount,
      yieldEstimate: result.yieldEstimate,
      healthZones: result.zones?.map(z => ({
        stressType: z.label,
        severityScore: z.severityScore,
        severityLevel: z.severityScore <= 25 ? 'Healthy' : z.severityScore <= 50 ? 'Monitor' : z.severityScore <= 75 ? 'Action Required' : 'Critical',
        recommendedAction: z.action,
        boundingBox: { ymin: z.ymin, xmin: z.xmin, ymax: z.ymax, xmax: z.xmax }
      })),
      irrigationLeaks: result.irrigationLeaks?.length || 0,
      farmContext: result.farmContext
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const dl = document.createElement('a'); dl.setAttribute("href", dataStr); dl.setAttribute("download", "cropsight_report.json");
    document.body.appendChild(dl); dl.click(); dl.remove();
  };

  /* ── Export PDF Report ── */
  const exportPDF = () => {
    if (!result) return;
    const severityLabel = (s: number) => s <= 25 ? 'Healthy' : s <= 50 ? 'Monitor' : s <= 75 ? 'Action Required' : 'CRITICAL';

    const zonesHTML = result.zones?.map((z, i) =>
      `<tr>
        <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:${z.colorCode}">${i+1}. ${z.label}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center"><span style="background:${z.colorCode};color:white;padding:2px 10px;border-radius:12px;font-weight:bold;font-size:12px">${z.severityScore}%</span></td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold">${severityLabel(z.severityScore)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0">${z.action}</td>
      </tr>`
    ).join('') || '';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CropSight Health Report</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:40px;max-width:900px;margin:auto;color:#1e293b}
    h1{color:#2563eb;margin-bottom:4px}h2{color:#334155;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-top:32px}
    .badge{display:inline-block;padding:4px 14px;border-radius:16px;font-weight:700;font-size:13px}
    .stats{display:flex;gap:16px;margin:20px 0}.stat{flex:1;padding:16px;border-radius:12px;text-align:center}
    table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f1f5f9;padding:10px;border:1px solid #e2e8f0;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px}
    .footer{margin-top:40px;padding-top:16px;border-top:2px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}</style></head>
    <body>
    <h1>🌾 CropSight Health Report</h1>
    <p style="color:#64748b;margin-top:0">SDG Goal 2 — Zero Hunger | Aerial Crop Health Intelligence Platform</p>
    <p style="color:#94a3b8;font-size:12px">Generated: ${new Date().toLocaleString()} | Pipeline: Gemini Vision AI</p>

    <h2>📊 Overall Field Assessment</h2>
    <p style="font-size:18px;font-weight:700">${result.overallHealth}</p>

    <div class="stats">
      <div class="stat" style="background:#f0fdf4;border:1px solid #bbf7d0">
        <div style="font-size:11px;font-weight:800;color:#16a34a;text-transform:uppercase;letter-spacing:1px">Plant Count</div>
        <div style="font-size:28px;font-weight:900;color:#166534">${result.plantCount}</div>
      </div>
      <div class="stat" style="background:#eff6ff;border:1px solid #bfdbfe">
        <div style="font-size:11px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:1px">Yield Estimate</div>
        <div style="font-size:20px;font-weight:900;color:#1e40af">${result.yieldEstimate}</div>
      </div>
      <div class="stat" style="background:#fefce8;border:1px solid #fde68a">
        <div style="font-size:11px;font-weight:800;color:#ca8a04;text-transform:uppercase;letter-spacing:1px">Stress Zones</div>
        <div style="font-size:28px;font-weight:900;color:#854d0e">${result.zones?.length || 0}</div>
      </div>
    </div>

    <h2>🗺️ Severity Report — Zoned Health Map</h2>
    <p style="color:#64748b;font-size:13px">Each zone is colour-coded by severity. Actions are ranked by urgency for immediate farmer intervention.</p>
    <table>
      <thead><tr><th>Zone / Stress Type</th><th>Severity Score</th><th>Level</th><th>Recommended Action</th></tr></thead>
      <tbody>${zonesHTML}</tbody>
    </table>

    ${(result.irrigationLeaks?.length || 0) > 0 ? `
    <h2>💧 Irrigation Anomalies</h2>
    <p>${result.irrigationLeaks?.length} moisture pooling area(s) detected. Inspect irrigation lines within 24 hours.</p>` : ''}

    <h2>🧠 AI Farm Context Summary</h2>
    <p style="line-height:1.8;color:#475569">${result.farmContext}</p>

    <div class="footer">
      <p><strong>CropSight</strong> — Aerial Crop Health Intelligence Platform | SDG Goal 2: Zero Hunger</p>
      <p>Early-stage crop stress detection reduces yield loss by enabling targeted intervention before irreversible damage.</p>
    </div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  /* ── Severity helpers ── */
  const getSeverityLevel = (score: number) => {
    if (score <= 25) return { label: 'Healthy', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (score <= 50) return { label: 'Monitor', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    if (score <= 75) return { label: 'Action Required', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { label: 'CRITICAL', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  /* ── RENDER ── */
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-5xl mx-auto">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 flex items-center gap-2"><AlertTriangle className="w-5 h-5 shrink-0" /> {error}</div>}

      {!image ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 cursor-pointer min-h-[400px] hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300">
          <UploadCloud className="w-16 h-16 text-slate-400 mb-4" />
          <span className="text-lg font-medium text-slate-700">Upload Aerial Farm Image</span>
          <span className="text-slate-500 mt-2 text-sm">RGB or Multispectral · JPEG / PNG · Drone or Satellite Top-View (10-50m altitude)</span>
          <span className="text-xs text-slate-400 mt-1">GPS EXIF metadata will be auto-extracted for geo-referencing</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      ) : (
        <div className="flex flex-col space-y-6">
          {/* Image Canvas with Overlays */}
          <div className="flex items-center justify-center bg-slate-900 rounded-xl p-4 overflow-hidden min-h-[400px]">
            <div className="relative inline-block max-w-full">
              <img src={image} alt="Aerial Farm" className={`max-w-full max-h-[600px] object-contain block rounded-sm shadow-2xl transition-all duration-1000 ${showSimulation ? 'saturate-[1.3] brightness-110 contrast-105 hue-rotate-[-5deg]' : ''}`} />

              {showSimulation && <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay pointer-events-none rounded-sm transition-opacity duration-1000 z-0" />}

              {showZones && result?.zones?.map((zone, idx) => (
                <div key={`zone-${idx}`} className="absolute border-[3px] shadow-sm bg-white/10 z-10 transition-all cursor-crosshair hover:bg-white/20"
                  style={{ top: `${zone.ymin}%`, left: `${zone.xmin}%`, height: `${zone.ymax - zone.ymin}%`, width: `${zone.xmax - zone.xmin}%`, borderColor: zone.colorCode }}>
                  <div className="absolute -top-7 left-[-3px] px-3 py-1 text-xs font-bold text-white rounded-t-sm whitespace-nowrap" style={{ backgroundColor: zone.colorCode }}>
                    {zone.label} ({zone.severityScore}%)
                  </div>
                </div>
              ))}

              {showMarks && result?.marks?.map((mark, idx) => (
                <div key={`mark-${idx}`} className="absolute border-[3px] shadow-xl rounded-full z-20"
                  style={{ top: `${mark.ymin}%`, left: `${mark.xmin}%`, height: `${mark.ymax - mark.ymin}%`, width: `${mark.xmax - mark.xmin}%`, borderColor: mark.colorCode, backgroundColor: `${mark.colorCode}40` }}>
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-bold text-white rounded-sm whitespace-nowrap shadow-md" style={{ backgroundColor: mark.colorCode }}>
                    {mark.label}
                  </div>
                </div>
              ))}

              {showIrrigation && result?.irrigationLeaks?.map((leak, idx) => (
                <div key={`leak-${idx}`} className="absolute bg-blue-500/30 blur-md rounded-full pointer-events-none z-10"
                  style={{ top: `${leak.ymin}%`, left: `${leak.xmin}%`, height: `${leak.ymax - leak.ymin}%`, width: `${leak.xmax - leak.xmin}%` }} />
              ))}

              {showWeedPath && result?.weedPath && result.weedPath.length > 1 && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 overflow-visible">
                  <polyline points={result.weedPath.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="1,1" className="animate-pulse" />
                  {result.weedPath.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#ef4444" />)}
                </svg>
              )}
            </div>
          </div>

          {!result ? (
            <div className="flex justify-center">
              <button onClick={analyzeImage} disabled={isAnalyzing} className="bg-blue-600 text-white px-8 py-3 rounded-md font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg">
                {isAnalyzing ? <><Loader2 className="animate-spin w-5 h-5" /> Running Crop Health Pipeline...</> : <><PlusCircle className="w-5 h-5" /> Analyze Crop Health</>}
              </button>
            </div>
          ) : (
            <div>
              {/* Visual Layer Toggles */}
              <div className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest align-middle flex items-center mr-2">Overlay Layers:</span>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white px-2 py-1 rounded transition"><input type="checkbox" checked={showZones} onChange={e => setShowZones(e.target.checked)} className="rounded text-blue-600 w-4 h-4" /> Health Zones</label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white px-2 py-1 rounded transition"><input type="checkbox" checked={showMarks} onChange={e => setShowMarks(e.target.checked)} className="rounded text-orange-600 w-4 h-4" /> Micro-Problems</label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white px-2 py-1 rounded transition"><input type="checkbox" checked={showWeedPath} onChange={e => setShowWeedPath(e.target.checked)} className="rounded text-red-600 w-4 h-4" /> Weed Spray Path</label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white px-2 py-1 rounded transition"><input type="checkbox" checked={showIrrigation} onChange={e => setShowIrrigation(e.target.checked)} className="rounded text-blue-400 w-4 h-4" /> Irrigation Leaks</label>
                <label className="flex items-center gap-2 text-sm font-semibold text-emerald-700 cursor-pointer hover:bg-white px-2 py-1 rounded transition"><input type="checkbox" checked={showSimulation} onChange={e => setShowSimulation(e.target.checked)} className="rounded text-emerald-600 w-4 h-4" /> Simulated Healing</label>
              </div>

              {/* ── Overall Field Assessment ── */}
              <div className="mb-6 p-5 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Overall Field Assessment</p>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Shield className={`w-5 h-5 ${result.isHealthy ? 'text-emerald-500' : 'text-orange-500'}`} />
                      {result.overallHealth}
                    </h3>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => {setImage(null); setResult(null); setBase64Image(null);}} className="text-sm px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-bold transition">New Image</button>
                    <button onClick={exportJSON} className="text-sm px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 font-bold shadow-sm transition"><FileJson className="w-4 h-4" /> JSON Report</button>
                    <button onClick={exportPDF} className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold shadow-sm transition"><FileText className="w-4 h-4" /> PDF Report</button>
                  </div>
                </div>
              </div>

              {/* ── Key Metrics ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                  <Sprout className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Estimated Plant Count</p>
                  <p className="text-3xl font-black text-emerald-800 mt-1">{result.plantCount}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                  <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Projected Yield</p>
                  <p className="text-2xl font-black text-blue-800 mt-1">{result.yieldEstimate}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                  <Target className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Stress Zones Detected</p>
                  <p className="text-3xl font-black text-amber-800 mt-1">{result.zones?.length || 0}</p>
                </div>
              </div>

              {/* ── Severity Report: Zoned Health Map ── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Severity Report — Crop Health Zones</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">Zones are colour-coded by severity with specific actions ranked by urgency. Each zone carries a health score and a recommended intervention the farmer can execute within the hour.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.zones?.map((zone, idx) => {
                    const sev = getSeverityLevel(zone.severityScore);
                    return (
                      <div key={idx} className={`${sev.bg} border ${sev.border} rounded-xl p-5 transition hover:shadow-md`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone {idx + 1}</span>
                            <h4 className="font-black text-base mt-0.5" style={{ color: zone.colorCode }}>{zone.label}</h4>
                          </div>
                          <div className="text-right">
                            <span className="inline-block text-white text-xs font-black px-3 py-1 rounded-full" style={{ backgroundColor: zone.colorCode }}>
                              {zone.severityScore}%
                            </span>
                            <p className={`text-[10px] font-black mt-1 ${sev.color}`}>{sev.label}</p>
                          </div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3 border border-white">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">🎯 Recommended Action</p>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">{zone.action}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Irrigation Anomalies ── */}
              {(result.irrigationLeaks?.length || 0) > 0 && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-black text-blue-700 uppercase tracking-widest">Irrigation Anomalies Detected</h3>
                  </div>
                  <p className="text-sm text-blue-700">{result.irrigationLeaks?.length} moisture pooling area(s) detected. Toggle the &ldquo;Irrigation Leaks&rdquo; overlay to see exact positions. Inspect irrigation lines within 24 hours.</p>
                </div>
              )}

              {/* ── AI Farm Context ── */}
              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">🧠 AI Farm Context Summary</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{result.farmContext}</p>
              </div>

              {/* ── Interactive Chat ── */}
              <div className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-800 text-white px-5 py-3 font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  Ask CropSight AI — Farm Advisory Chat
                </div>
                <div className="p-5 h-56 overflow-y-auto space-y-4 bg-slate-50/50">
                  {chatHistory.length === 0 && <div className="text-center text-slate-400 text-sm mt-10">Ask about specific treatments, timelines, or anything from the severity report above.</div>}
                  {chatHistory.map((c, i) => (
                    <div key={i} className={`flex ${c.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`text-sm max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${c.role === 'ai' ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}>
                        {c.msg}
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div className="text-sm text-slate-400 animate-pulse ml-2">CropSight AI is analyzing...</div>}
                </div>
                <div className="flex p-3 bg-white border-t border-slate-100">
                  <input type="text" className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" placeholder="e.g. What treatment should I apply for Zone 1?" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} />
                  <button onClick={handleSendChat} disabled={chatLoading} className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50">Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
