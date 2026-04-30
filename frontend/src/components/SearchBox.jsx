import { useState, useRef } from "react";
import { Search, Mic, MicOff, Camera, Sparkles, ChevronDown, Loader2, X } from "lucide-react";
import { api } from "../api/client";

const LANGUAGES = [
  { code: "en-GB", label: "English" },
  { code: "ur",    label: "اردو" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ" },
  { code: "pl-PL", label: "Polski" },
  { code: "ar",    label: "العربية" },
  { code: "so",    label: "Soomaali" },
  { code: "ro-RO", label: "Română" },
  { code: "hi-IN", label: "हिन्दी" },
];

export default function SearchBox({ onSearch, loading, compact }) {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("en-GB");
  const [langOpen, setLangOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImageError(null);
    setImageLoading(true);
    try {
      const result = await api.searchByImage(file);
      if (result.query) {
        setQuery(result.query);
        onSearch(result.query);
      } else {
        setImageError(result.message || "Could not read the image. Please type your request instead.");
      }
    } catch {
      setImageError("Could not process the image. Please type your request instead.");
    } finally {
      setImageLoading(false);
    }
  };

  const submit = (text) => {
    const q = text || query;
    if (!q.trim()) return;
    onSearch(q.trim());
  };

  const stopVoice = () => {
    recognitionRef.current?.abort();
    setListening(false);
  };

  const startVoice = () => {
    if (listening) { stopVoice(); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input requires Chrome or Edge.");
      return;
    }
    setVoiceError(null);
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      const MESSAGES = {
        "not-allowed":  "Microphone access was denied. Allow it in your browser settings and try again.",
        "network":      "Speech recognition needs an internet connection.",
        "no-speech":    "No speech detected. Please try again.",
        "audio-capture":"No microphone found.",
        "aborted":      null,
        "service-not-allowed": "Speech recognition is not allowed on this page.",
      };
      const msg = MESSAGES[e.error];
      if (msg) setVoiceError(msg);
    };
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim();
      setQuery(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        if (transcript) onSearch(transcript);
      }
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch {
      setVoiceError("Could not start voice recognition. Please reload and try again.");
    }
  };

  const selectedLang = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className={compact ? "w-full" : "max-w-3xl mx-auto px-6 pt-12 pb-8"}>
      {/* Header — only shown in full (landing page) mode */}
      {!compact && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EAF2F1] text-[#2A5C5A] rounded-full text-xs font-medium mb-4">
            <Sparkles size={12} />
            One front door across every council booking system
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            What do you need to book today?
          </h1>
          <p className="mt-3 text-gray-600 text-lg">
            Describe it in your own words. We will find the right space across the whole borough.
          </p>
        </div>
      )}

      {listening && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          Listening… speak your booking request.
          <button onClick={stopVoice} className="ml-auto underline hover:no-underline flex-shrink-0">Stop</button>
        </div>
      )}

      {/* Search box */}
      <div className={`bg-white border-2 rounded-xl shadow-sm ${listening ? "border-red-400" : "border-[#2A5C5A]/60 focus-within:border-[#2A5C5A]"} transition`}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder={compact
            ? "Describe what you need — e.g. a room for 20 people with a kitchen"
            : "For example, a room for 20 children every Tuesday afternoon in Hayes, with a kitchen, accessible for a wheelchair user."
          }
          rows={compact ? 2 : 3}
          aria-label="Describe what you need"
          className="w-full px-5 pt-4 pb-2 text-base resize-none outline-none ring-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400"
        />
        {/* Toolbar row */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-2 border-t border-gray-100 rounded-b-xl">
          {/* Language picker */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              aria-label="Select voice language"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-[#2A5C5A] hover:text-[#2A5C5A] transition"
            >
              {selectedLang?.label}
              <ChevronDown size={11} />
            </button>
            {langOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs transition first:rounded-t-xl last:rounded-b-xl ${
                      l.code === lang ? "bg-[#EAF2F1] text-[#2A5C5A] font-semibold" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mic */}
          <button
            onClick={startVoice}
            aria-label={listening ? "Stop recording" : "Start voice input"}
            title={listening ? "Click to stop" : "Speak your booking request"}
            className={`p-2 rounded-lg border transition-all ${
              listening
                ? "bg-red-500 border-red-500 text-white animate-pulse"
                : "border-gray-200 text-gray-500 hover:border-[#2A5C5A] hover:text-[#2A5C5A]"
            }`}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Camera */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            aria-label="Upload photo of handwritten request"
            disabled={imageLoading || loading}
            onClick={() => fileInputRef.current?.click()}
            title="Upload a photo or handwritten note"
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-[#2A5C5A] hover:text-[#2A5C5A] disabled:opacity-50 transition"
          >
            {imageLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search button */}
          <button
            onClick={() => submit()}
            disabled={loading || !query.trim()}
            className="px-5 py-2 bg-[#2A5C5A] text-white rounded-lg font-semibold text-sm hover:bg-[#2A5C5A]/90 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>
      </div>

      {voiceError && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <Mic size={13} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{voiceError}</span>
          <button onClick={() => setVoiceError(null)} className="flex-shrink-0 text-red-400 hover:text-red-600"><X size={12} /></button>
        </div>
      )}

      {imageError && (
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Camera size={13} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{imageError}</span>
          <button onClick={() => setImageError(null)} className="flex-shrink-0 text-amber-400 hover:text-amber-600"><X size={12} /></button>
        </div>
      )}
    </div>
  );
}
