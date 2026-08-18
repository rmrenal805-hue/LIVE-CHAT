import React, { useState, useMemo } from 'react';
import {
  Globe,
  MapPin,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquarePlus,
  Compass,
  Activity,
  Layers,
  Sparkles,
  Users,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { LiveVisitor } from '../../types';

interface WorldMapVisualizationProps {
  visitors: LiveVisitor[];
  onInviteToChat: (visitor: LiveVisitor) => void;
}

// Known Location to Geolocation (Lat, Lng) Mapping
const KNOWN_GEOLOCATIONS: Record<string, { lat: number; lng: number; flag: string; country: string }> = {
  // Bangladesh
  'ঢাকা, বাংলাদেশ': { lat: 23.8103, lng: 90.4125, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'dhaka': { lat: 23.8103, lng: 90.4125, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'চট্টগ্রাম, বাংলাদেশ': { lat: 22.3569, lng: 91.7832, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'chittagong': { lat: 22.3569, lng: 91.7832, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'chattogram': { lat: 22.3569, lng: 91.7832, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'সিলেট, বাংলাদেশ': { lat: 24.8949, lng: 91.8687, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'sylhet': { lat: 24.8949, lng: 91.8687, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'রাজশাহী, বাংলাদেশ': { lat: 24.3745, lng: 88.6042, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'খুলনা, বাংলাদেশ': { lat: 22.8456, lng: 89.5403, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'বরিশাল, বাংলাদেশ': { lat: 22.7010, lng: 90.3535, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'কুমিল্লা, বাংলাদেশ': { lat: 23.4607, lng: 91.1809, flag: '🇧🇩', country: 'বাংলাদেশ' },
  'রংপুর, বাংলাদেশ': { lat: 25.7439, lng: 89.2752, flag: '🇧🇩', country: 'বাংলাদেশ' },
  
  // International
  'london': { lat: 51.5074, lng: -0.1278, flag: '🇬🇧', country: 'United Kingdom' },
  'london, uk': { lat: 51.5074, lng: -0.1278, flag: '🇬🇧', country: 'United Kingdom' },
  'new york': { lat: 40.7128, lng: -74.0060, flag: '🇺🇸', country: 'USA' },
  'new york, usa': { lat: 40.7128, lng: -74.0060, flag: '🇺🇸', country: 'USA' },
  'san francisco': { lat: 37.7749, lng: -122.4194, flag: '🇺🇸', country: 'USA' },
  'dubai': { lat: 25.2048, lng: 55.2708, flag: '🇦🇪', country: 'UAE' },
  'dubai, uae': { lat: 25.2048, lng: 55.2708, flag: '🇦🇪', country: 'UAE' },
  'singapore': { lat: 1.3521, lng: 103.8198, flag: '🇸🇬', country: 'Singapore' },
  'tokyo': { lat: 35.6762, lng: 139.6503, flag: '🇯🇵', country: 'Japan' },
  'tokyo, japan': { lat: 35.6762, lng: 139.6503, flag: '🇯🇵', country: 'Japan' },
  'sydney': { lat: -33.8688, lng: 151.2093, flag: '🇦🇺', country: 'Australia' },
  'toronto': { lat: 43.6532, lng: -79.3832, flag: '🇨🇦', country: 'Canada' },
  'berlin': { lat: 52.5200, lng: 13.4050, flag: '🇩🇪', country: 'Germany' },
  'paris': { lat: 48.8566, lng: 2.3522, flag: '🇫🇷', country: 'France' },
  'kolkata': { lat: 22.5726, lng: 88.3639, flag: '🇮🇳', country: 'India' },
  'delhi': { lat: 28.6139, lng: 77.2090, flag: '🇮🇳', country: 'India' },
};

// Deterministic Lat/Lng derived from IP or string hash when location is unknown
function getCoordinatesFromLocationOrIp(locationStr: string, ipStr: string): { lat: number; lng: number; flag: string; country: string } {
  const norm = (locationStr || '').toLowerCase().trim();
  
  for (const [key, val] of Object.entries(KNOWN_GEOLOCATIONS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return val;
    }
  }

  // Check country name fallback
  if (norm.includes('bangladesh') || norm.includes('বাংলাদেশ')) {
    return { lat: 23.8103, lng: 90.4125, flag: '🇧🇩', country: 'বাংলাদেশ' };
  }
  if (norm.includes('usa') || norm.includes('united states') || norm.includes('আমেরিকা')) {
    return { lat: 37.0902, lng: -95.7129, flag: '🇺🇸', country: 'USA' };
  }
  if (norm.includes('uk') || norm.includes('united kingdom') || norm.includes('লন্ডন')) {
    return { lat: 51.5074, lng: -0.1278, flag: '🇬🇧', country: 'UK' };
  }
  if (norm.includes('uae') || norm.includes('dubai') || norm.includes('দুবাই')) {
    return { lat: 25.2048, lng: 55.2708, flag: '🇦🇪', country: 'UAE' };
  }

  // Hash IP to generate reasonable default lat/lng
  let hash = 0;
  const str = ipStr + locationStr;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  
  // Default to Bangladesh/South Asia region or world spread
  const lat = 20 + (Math.abs(hash % 300) / 10);
  const lng = 70 + (Math.abs((hash >> 2) % 600) / 10);

  return {
    lat,
    lng,
    flag: '🌐',
    country: locationStr || 'অজানা স্থান',
  };
}

// Map latitude and longitude to SVG (1000 x 500) canvas coordinates
function latLngToSvgCoords(lat: number, lng: number, width = 1000, height = 500): { x: number; y: number } {
  // Equirectangular projection
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x: Math.max(20, Math.min(width - 20, x)), y: Math.max(20, Math.min(height - 20, y)) };
}

export const WorldMapVisualization: React.FC<WorldMapVisualizationProps> = ({ visitors, onInviteToChat }) => {
  const [selectedVisitor, setSelectedVisitor] = useState<LiveVisitor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapTheme, setMapTheme] = useState<'tactical' | 'light'>('tactical');
  const [showGrid, setShowGrid] = useState(true);

  // Filter visitors based on search query
  const filteredVisitors = useMemo(() => {
    if (!searchTerm.trim()) return visitors;
    const term = searchTerm.toLowerCase();
    return visitors.filter(
      (v) =>
        v.name.toLowerCase().includes(term) ||
        v.location.toLowerCase().includes(term) ||
        v.ip.toLowerCase().includes(term) ||
        v.currentPage.toLowerCase().includes(term)
    );
  }, [visitors, searchTerm]);

  // Map visitors to coordinates
  const mappedVisitors = useMemo(() => {
    return filteredVisitors.map((v) => {
      const geo = getCoordinatesFromLocationOrIp(v.location, v.ip);
      const coords = latLngToSvgCoords(geo.lat, geo.lng);
      return {
        ...v,
        geo,
        coords,
      };
    });
  }, [filteredVisitors]);

  // Country stats breakdown
  const countryBreakdown = useMemo(() => {
    const stats: Record<string, { count: number; flag: string }> = {};
    visitors.forEach((v) => {
      const geo = getCoordinatesFromLocationOrIp(v.location, v.ip);
      const key = geo.country;
      if (!stats[key]) {
        stats[key] = { count: 0, flag: geo.flag };
      }
      stats[key].count += 1;
    });
    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
  }, [visitors]);

  return (
    <div className="bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 text-white overflow-hidden space-y-4">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">লাইভ জিও-লোকেশন ভিজিটর ম্যাপ</h3>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                LIVE RADAR
              </span>
            </div>
            <p className="text-xs text-slate-400">আইপি এড্রেস ও জিপিএস লোকেশনের ভিত্তিতে বর্তমান ব্রাউজিং ভিজিটর ট্র্যাকিং</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="নাম, স্থান বা IP দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/80 border border-slate-700/80 text-white pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 md:w-56"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setMapTheme(mapTheme === 'tactical' ? 'light' : 'tactical')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer flex items-center gap-1"
            title="ম্যাপ থিম পরিবর্তন"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">{mapTheme === 'tactical' ? 'ডার্ক নেভি' : 'লাইট থিম'}</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
              showGrid
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="গ্রিড লাইন চালু/বন্ধ"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="জুম ইন"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.8))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="জুম আউট"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setSelectedVisitor(null);
              }}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer border-l border-slate-700"
              title="রিসেট ভিউ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Country Breakdown Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] shrink-0 flex items-center gap-1">
          <Users className="w-3 h-3 text-blue-400" />
          দেশভিত্তিক ট্রাফিক:
        </span>
        {countryBreakdown.map(([country, info]) => (
          <span
            key={country}
            className="bg-slate-800/90 text-slate-200 border border-slate-700/80 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1.5"
          >
            <span>{info.flag}</span>
            <span>{country}</span>
            <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[10px]">
              {info.count}
            </span>
          </span>
        ))}
      </div>

      {/* World Map Interactive SVG Canvas */}
      <div className="relative w-full h-[360px] md:h-[420px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-inner flex items-center justify-center">
        
        {/* Subtle Map Background Pattern */}
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full object-cover select-none"
            style={{
              filter: mapTheme === 'tactical' ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.1))' : 'none',
            }}
          >
            <defs>
              {/* Ocean Gradient */}
              <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={mapTheme === 'tactical' ? '#030712' : '#0f172a'} />
                <stop offset="100%" stopColor={mapTheme === 'tactical' ? '#0b132b' : '#1e293b'} />
              </linearGradient>

              {/* Grid Line Pattern */}
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke={mapTheme === 'tactical' ? '#1e293b' : '#334155'}
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              </pattern>

              {/* Marker Glow Filter */}
              <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Ocean Rect */}
            <rect width="1000" height="500" fill="url(#oceanGrad)" />

            {/* Grid Overlay */}
            {showGrid && <rect width="1000" height="500" fill="url(#grid)" opacity="0.6" />}

            {/* Equator Line */}
            {showGrid && (
              <line
                x1="0"
                y1="250"
                x2="1000"
                y2="250"
                stroke="#3b82f6"
                strokeWidth="0.8"
                strokeDasharray="4,4"
                opacity="0.3"
              />
            )}

            {/* Prime Meridian Line */}
            {showGrid && (
              <line
                x1="500"
                y1="0"
                x2="500"
                y2="500"
                stroke="#3b82f6"
                strokeWidth="0.8"
                strokeDasharray="4,4"
                opacity="0.3"
              />
            )}

            {/* CONTINENTS SVG VECTOR LANDMASSES */}
            <g
              fill={mapTheme === 'tactical' ? '#1e293b' : '#334155'}
              stroke={mapTheme === 'tactical' ? '#334155' : '#475569'}
              strokeWidth="0.8"
              opacity="0.85"
            >
              {/* North America */}
              <path d="M 120 80 Q 180 50 280 70 T 320 140 T 260 220 T 180 200 T 100 150 Z M 160 110 L 220 120 L 210 160 L 150 140 Z" />

              {/* South America */}
              <path d="M 270 240 Q 320 250 340 310 T 310 420 T 260 400 T 250 300 Z" />

              {/* Europe */}
              <path d="M 460 70 Q 520 60 560 90 T 540 150 T 480 160 T 450 110 Z" />

              {/* Africa */}
              <path d="M 470 170 Q 540 170 580 220 T 560 350 T 500 380 T 450 280 Z" />

              {/* Asia / Eurasia */}
              <path d="M 550 70 Q 720 50 880 80 T 920 180 T 820 240 T 720 220 T 600 210 T 560 140 Z" />

              {/* South Asia & Bangladesh Region Highlight */}
              <path
                d="M 720 170 L 770 170 L 780 210 L 740 220 L 720 190 Z"
                fill={mapTheme === 'tactical' ? '#1e3a8a' : '#1e40af'}
                stroke="#3b82f6"
                strokeWidth="1.2"
                opacity="0.9"
              />

              {/* Southeast Asia & Islands */}
              <path d="M 800 230 Q 860 240 880 280 T 820 300 Z" />

              {/* Australia */}
              <path d="M 840 330 Q 920 330 940 380 T 880 430 T 820 390 Z" />

              {/* Greenland */}
              <path d="M 330 40 Q 390 30 400 70 T 350 90 Z" />

              {/* UK / Ireland */}
              <path d="M 485 100 Q 500 95 505 115 T 490 125 Z" />

              {/* Japan */}
              <path d="M 880 140 Q 900 150 890 180 Z" />
            </g>

            {/* VISITOR GEO-PINS & RADAR PULSES */}
            {mappedVisitors.map((v) => {
              const isSelected = selectedVisitor?.id === v.id;
              const isBrowsing = v.status === 'browsing';

              return (
                <g
                  key={v.id}
                  transform={`translate(${v.coords.x}, ${v.coords.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVisitor(v);
                  }}
                >
                  {/* Outer Radar Ripple Wave */}
                  <circle
                    r="18"
                    fill="none"
                    stroke={isBrowsing ? '#3b82f6' : '#10b981'}
                    strokeWidth="1.5"
                    className="animate-ping origin-center opacity-75"
                  />

                  {/* Secondary Pulse */}
                  <circle
                    r="10"
                    fill={isBrowsing ? '#3b82f6' : '#10b981'}
                    opacity="0.25"
                    className="animate-pulse"
                  />

                  {/* Core Marker Point */}
                  <circle
                    r={isSelected ? '7' : '5'}
                    fill={isSelected ? '#38bdf8' : isBrowsing ? '#60a5fa' : '#34d399'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glowBlue)"
                    className="transition-all duration-200 group-hover:scale-125"
                  />

                  {/* Floating Visitor Name Badge on Map */}
                  <g transform="translate(0, -12)">
                    <rect
                      x="-35"
                      y="-16"
                      width="70"
                      height="16"
                      rx="8"
                      fill="#0f172a"
                      stroke={isSelected ? '#38bdf8' : '#334155'}
                      strokeWidth="1"
                      opacity="0.9"
                    />
                    <text
                      x="0"
                      y="-5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {v.name.split(' ')[0]}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Visitor Detail Floating Card Modal */}
        {selectedVisitor && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl text-white animate-in slide-in-from-bottom-2 z-20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {getCoordinatesFromLocationOrIp(selectedVisitor.location, selectedVisitor.ip).flag}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedVisitor.name}</h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span>{selectedVisitor.location}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">আইপি এড্রেস:</span>
                <span className="font-mono font-bold text-blue-400">{selectedVisitor.ip}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ডিভাইস:</span>
                <span className="font-semibold text-slate-200 truncate block">{selectedVisitor.device}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">বর্তমান পেজ:</span>
                <span className="font-mono text-emerald-400 font-bold truncate block">
                  {selectedVisitor.currentPage}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">পেজে অবস্থান:</span>
                <span className="font-semibold text-slate-300">{selectedVisitor.timeOnPage}</span>
              </div>
              <div>
                <span className="text-slate-500 block">অবস্থা:</span>
                <span className="font-bold text-amber-400 uppercase">{selectedVisitor.status}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onInviteToChat(selectedVisitor);
                setSelectedVisitor(null);
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>চ্যাট ইনভাইট পাঠান</span>
            </button>
          </div>
        )}

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs border border-slate-800/80 px-3 py-1.5 rounded-xl text-[10px] text-slate-300 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>ব্রাউজিং ভিজিটর</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>চ্যাটে সক্রিয়</span>
          </div>
        </div>
      </div>
    </div>
  );
};
