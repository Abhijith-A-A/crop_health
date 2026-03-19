import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Activity, Globe, MessageSquareQuote, Bot } from 'lucide-react';
import type { HistoryItem, Zone } from '../types';

interface VoiceAssistantProps {
  onNavigate: (tab: 'analysis' | 'map' | 'history' | 'weather') => void;
  currentScan: HistoryItem | null;
}

const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const LANGUAGES = [
  { code: 'en-US', name: 'English' },
  { code: 'ml-IN', name: 'മലയാളം' },
  { code: 'ta-IN', name: 'தமிழ்' },
  { code: 'zh-CN', name: '中文' }
];

const DICT: Record<string, any> = {
  'en-US': {
    keys: {
      map:      ['map', 'ndvi', 'vegetation', 'show me the map', 'open map'],
      history:  ['history', 'scan history', 'past scans', 'show me the scan', 'show me the history', 'logs', 'open history', 'past'],
      analysis: ['analysis', 'engine', 'home', 'dashboard', 'detect', 'go home', 'show me the dashboard'],
      weather:  ['weather', 'climate', 'forecast', 'temperature', 'show me the weather'],
      analyze:  ['analyze', 'engage', 'start scan', 'process', 'run analysis', 'scan this', 'scan image'],
      yield:    ['yield', 'count', 'how many', 'produce', 'estimated yield', 'show me the yield'],
      status:   ['status', 'health', 'problem', 'report', 'overall health', 'show me the status'],
      disease:  ['disease', 'blight', 'infection', 'issues', 'details', 'tell me', 'read me', 'show me the disease', 'show me the details', 'read the details']
    },
    speech: {
      map:     "Switching to the NDVI Vegetation Map.",
      history: "Opening your Farm Scan History.",
      analysis:"Returning to the Analysis Dashboard.",
      weather: "Loading Micro-Climate data.",
      analyze: "Engaging CropSight scan now.",
      reqUpload:"Please upload a drone image first.",
      yield:   (c: any, y: any) => `I estimate ${c} plants with a projected yield of ${y}.`,
      reqYield:"I need an active scan to calculate yield.",
      status:  (h: any, z: any) => `Field status: ${h}. ${z} severity zones detected.`,
      disease: (zones: Zone[]) => {
        if (!zones.length) return "No disease markers detected. Your crops look healthy.";
        return `I found ${zones.length} stress zones: ${zones.map(z => z.label).filter((v,i,a) => a.indexOf(v)===i).join(", ")}. Check the NDVI map for locations.`;
      },
      noScan:  "No active scan data available.",
      ready:   "CropSight Voice AI is now online. Just speak your command.",
      off:     "Voice assistant offline."
    }
  },
  'ml-IN': {
    keys: {
      map: ['map','മാപ്പ്','ഭൂപടം','ndvi'], history: ['history','ചരിത്രം','ഹിസ്റ്ററി','past'],
      analysis: ['analysis','വിശകലനം','അനാലിസിസ്','ഹോം'], weather: ['weather','കാലാവസ്ഥ','വെതർ','മഴ'],
      analyze: ['scan','സ്കാൻ','പരിശോധിക്കുക'], yield: ['yield','വിളവ്','എണ്ണം','കണക്ക്'],
      status: ['status','അവസ്ഥ','ആരോഗ്യം','health'], disease: ['രോഗം','പ്രശ്നം','വിശദാംശങ്ങൾ','disease','details']
    },
    speech: {
      map:"മാപ്പിലേക്ക് മാറുന്നു",history:"ചരിത്രം തുറക്കുന്നു",
      analysis:"അനാലിസിസ് പേജിലേക്ക്",weather:"കാലാവസ്ഥ വിവരങ്ങൾ",
      analyze:"സ്കാനിംഗ് തുടങ്ങുന്നു",reqUpload:"ചിത്രം അപ്‌ലോഡ് ചെയ്യുക.",
      yield:(c:any,y:any)=>`${c} ചെടികൾ, വിളവ് ${y}.`,reqYield:"സ്കാൻ ആവശ്യമാണ്.",
      status:(h:any,z:any)=>`അവസ്ഥ ${h}. ${z} മേഖലകൾ.`,
      disease:(zones:Zone[])=>{if(!zones.length)return"രോഗങ്ങൾ ഇല്ല.";return`${zones.length} മേഖലകൾ: ${zones.map(z=>z.label).filter((v,i,a)=>a.indexOf(v)===i).join(", ")}.`;},
      noScan:"ഡാറ്റ ഇല്ല.",ready:"വോയ്സ് AI സജീവം. കമാൻഡ് പറയൂ.",off:"ഓഫ്."
    }
  },
  'ta-IN': {
    keys: {
      map: ['map','வரைபடம்','ndvi','மேப்'], history: ['history','வரலாறு','ஹிஸ்டரி','past'],
      analysis: ['analysis','பகுப்பாய்வு','home','அனாலிசிஸ்'], weather: ['weather','வானிலை','மழை'],
      analyze: ['scan','ஸ்கேன்','பரிசோதி'], yield: ['yield','விளைச்சல்','எண்ணிக்கை'],
      status: ['status','நிலை','health','ஸ்டேட்டஸ்'], disease: ['நோய்','விவரம்','பிரச்சனை','disease','details']
    },
    speech: {
      map:"வரைபடத்திற்கு மாறுகிறது",history:"வரலாற்றை திறக்கிறது",
      analysis:"பகுப்பாய்வுக்கு திரும்புகிறது",weather:"வானிலை தரவு",
      analyze:"ஸ்கேனிங் தொடங்குகிறது",reqUpload:"படம் பதிவேற்றவும்.",
      yield:(c:any,y:any)=>`${c} தாவரங்கள், விளைச்சல் ${y}.`,reqYield:"ஸ்கேன் தேவை.",
      status:(h:any,z:any)=>`நிலை ${h}. ${z} மண்டலங்கள்.`,
      disease:(zones:Zone[])=>{if(!zones.length)return"நோய் இல்லை.";return`${zones.length} மண்டலங்கள்: ${zones.map(z=>z.label).filter((v,i,a)=>a.indexOf(v)===i).join(", ")}.`;},
      noScan:"தரவு இல்லை.",ready:"குரல் AI தயார்.",off:"முடக்கம்."
    }
  },
  'zh-CN': {
    keys: {
      map: ['地图','map','ndvi'], history: ['历史','history','过去'],
      analysis: ['分析','主页','home'], weather: ['天气','weather','气候'],
      analyze: ['扫描','scan','分析图像'], yield: ['产量','yield','数量'],
      status: ['状态','健康','status'], disease: ['疾病','详情','病虫害','disease']
    },
    speech: {
      map:"切换到植被地图",history:"打开扫描历史",analysis:"返回分析引擎",weather:"同步气候数据",
      analyze:"启动扫描",reqUpload:"请上传图像。",
      yield:(c:any,y:any)=>`${c}株，产量${y}。`,reqYield:"需要扫描。",
      status:(h:any,z:any)=>`状态${h}，${z}个区域。`,
      disease:(zones:Zone[])=>{if(!zones.length)return"无病害。";return`${zones.length}个区域：${zones.map(z=>z.label).filter((v,i,a)=>a.indexOf(v)===i).join(",")}。`;},
      noScan:"无数据。",ready:"语音AI就绪。直接说出命令。",off:"已关闭。"
    }
  }
};

export default function VoiceAssistant({ onNavigate, currentScan }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lang, setLang] = useState('en-US');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [matched, setMatched] = useState(false);

  const recRef = useRef<any>(null);
  const activeRef = useRef(false);
  const navRef = useRef(onNavigate);
  const scanRef = useRef(currentScan);
  const langRef = useRef(lang);
  const debounceRef = useRef('');

  useEffect(() => { navRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { scanRef.current = currentScan; }, [currentScan]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langRef.current;
    window.speechSynthesis.speak(u);
  }, []);

  const toast = useCallback((msg: string) => {
    setFeedback(msg);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 4500);
  }, []);

  /* ── Direct command matching — no wake word needed ── */
  const execCmd = useCallback((text: string) => {
    if (text === debounceRef.current) return;

    const d = DICT[langRef.current];
    const k = d.keys;
    const s = d.speech;
    const lower = text.toLowerCase().trim();
    const m = (keys: string[]) => keys.some(kw => lower.includes(kw.toLowerCase()));
    const nav = navRef.current;
    const scan = scanRef.current;

    let found = false;

    if (m(k.map))           { nav('map');      speak(s.map);      toast('→ NDVI Map');   found = true; }
    else if (m(k.weather))  { nav('weather');   speak(s.weather);  toast('→ Weather');    found = true; }
    else if (m(k.history))  { nav('history');   speak(s.history);  toast('→ Scan History');found = true; }
    else if (m(k.analysis)) { nav('analysis');  speak(s.analysis); toast('→ Dashboard');  found = true; }
    else if (m(k.disease))  {
      if (scan) { speak(s.disease(scan.result.zones)); toast('→ Disease Report'); }
      else speak(s.noScan);
      found = true;
    }
    else if (m(k.analyze)) {
      nav('analysis');
      setTimeout(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          ['analyze','engage','scan'].some(kw => b.textContent?.toLowerCase().includes(kw)));
        if (btn) { btn.click(); speak(s.analyze); toast('→ Scanning'); }
        else speak(s.reqUpload);
      }, 300);
      found = true;
    }
    else if (m(k.yield)) {
      if (scan) speak(s.yield(scan.result.plantCount, scan.result.yieldEstimate));
      else speak(s.reqYield);
      found = true;
    }
    else if (m(k.status)) {
      if (scan) speak(s.status(scan.result.overallHealth, scan.result.zones.length));
      else speak(s.noScan);
      found = true;
    }

    if (found) {
      setLastCommand(lower);
      setMatched(true);
      debounceRef.current = text;
      setTimeout(() => { debounceRef.current = ''; }, 3000);
      setTimeout(() => setMatched(false), 2000);
      console.log('[CropSight] ✅ Command matched:', lower);
    } else {
      setMatched(false);
      console.log('[CropSight] ⏳ No match yet:', lower);
    }
  }, [speak, toast]);

  /* ── Speech Recognition ── */
  useEffect(() => {
    if (!SR) return;

    if (recRef.current) {
      recRef.current.onend = null;
      recRef.current.onerror = null;
      recRef.current.onresult = null;
      try { recRef.current.stop(); } catch(e) {}
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => {
      console.log('[CropSight] 🎙️ Listening on', lang);
      if (activeRef.current) setIsListening(true);
    };

    rec.onerror = (ev: any) => {
      console.warn('[CropSight] ⚠️ Error:', ev.error);
      if (ev.error === 'not-allowed') { activeRef.current = false; setIsListening(false); return; }
      if (activeRef.current) setTimeout(() => { try { rec.start(); } catch(e) {} }, 500);
    };

    rec.onend = () => {
      if (activeRef.current) setTimeout(() => { try { rec.start(); } catch(e) {} }, 200);
    };

    rec.onresult = (ev: any) => {
      let interim = '';
      let final_ = '';
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final_ += t;
        else interim += t;
      }

      const display = final_ || interim;
      setTranscript(display);

      // Try to match on BOTH interim and final for faster response
      if (display) execCmd(display);

      // Clear transcript after a while
      if (final_) {
        setTimeout(() => setTranscript(p => p === display ? '' : p), 4000);
      }
    };

    recRef.current = rec;
    if (activeRef.current) {
      try { rec.start(); setIsListening(true); } catch(e) {}
    }
  }, [lang, execCmd]);

  useEffect(() => () => {
    activeRef.current = false;
    if (recRef.current) { recRef.current.onend = null; try { recRef.current.stop(); } catch(e) {} }
  }, []);

  const toggle = () => {
    if (activeRef.current) {
      activeRef.current = false;
      setIsListening(false);
      setTranscript('');
      setLastCommand(null);
      try { recRef.current?.stop(); } catch(e) {}
      speak(DICT[lang].speech.off);
    } else {
      activeRef.current = true;
      setIsListening(true);
      try { recRef.current?.start(); } catch(e) {}
      speak(DICT[lang].speech.ready);
      toast('Voice AI Online');
    }
  };

  if (!SR) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3 pointer-events-none">

      {/* Executed Command */}
      {lastCommand && (
        <div className="bg-slate-900 border-l-4 border-emerald-500 p-3.5 rounded-xl shadow-2xl flex items-start gap-3 max-w-xs pointer-events-auto animate-in">
          <MessageSquareQuote className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-black text-emerald-400/70 uppercase tracking-widest">Executed</span>
            <p className="text-white text-sm font-bold mt-0.5 truncate">&ldquo;{lastCommand}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Live Transcript */}
      <div className={`transition-all duration-300 max-w-xs ${isListening ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
        <div className={`backdrop-blur-xl px-5 py-4 rounded-2xl shadow-2xl border transition-colors duration-300 ${matched ? 'bg-emerald-950/90 border-emerald-500/40' : 'bg-slate-800/95 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative w-2 h-2">
              <div className={`absolute inset-0 rounded-full ${matched ? 'bg-emerald-400' : 'bg-blue-500'} animate-ping`} />
              <div className={`absolute inset-0 rounded-full ${matched ? 'bg-emerald-400' : 'bg-blue-500'}`} />
            </div>
            <span className={`text-[10px] uppercase font-black tracking-[0.15em] ${matched ? 'text-emerald-400' : 'text-white/40'}`}>
              {matched ? '✓ COMMAND MATCHED' : `CropSight Voice · ${LANGUAGES.find(l => l.code === lang)?.name}`}
            </span>
          </div>
          <p className="font-bold text-base leading-snug text-white">
            {transcript
              ? <span>&ldquo;{transcript}&rdquo;</span>
              : <span className="opacity-20 text-sm italic">Say a command...</span>
            }
          </p>
        </div>
      </div>

      {/* Toast */}
      {showFeedback && (
        <div className="bg-blue-600 text-white font-black px-4 py-2 rounded-lg shadow-xl text-xs uppercase tracking-widest flex items-center gap-2">
          <Bot className="w-4 h-4" /> {feedback}
        </div>
      )}

      {/* Language Menu */}
      {showLangMenu && (
        <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 p-2 pointer-events-auto flex flex-col gap-1 w-48">
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setShowLangMenu(false); }}
              className={`text-left text-sm font-bold px-4 py-2.5 rounded-lg transition ${lang === l.code ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              {l.name}
            </button>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col items-center gap-3 pointer-events-auto">
        <button onClick={() => setShowLangMenu(!showLangMenu)}
          className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition shadow-xl">
          <Globe className="w-5 h-5" />
        </button>
        <button onClick={toggle}
          className={`w-[4.5rem] h-[4.5rem] rounded-[1.8rem] shadow-2xl transition-all duration-500 border-2 flex items-center justify-center ${isListening ? 'bg-blue-600 border-blue-400 scale-110 pulse-shadow' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
          {isListening ? <Activity className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-slate-400" />}
        </button>
      </div>
    </div>
  );
}
