import React, { useState, useEffect } from "react";
import { Sparkles, MessageCircle, Rocket, Flame, Footprints, AlertCircle } from "lucide-react";

// (1) AIR BALLOON (Khinh khí cầu) - floats automatically and wobbles slightly
export const AirBalloon: React.FC = () => {
  const [clicked, setClicked] = useState(false);
  const [colorOffset, setColorOffset] = useState(0);

  const handleClick = () => {
    setClicked(true);
    setColorOffset((prev) => (prev + 90) % 360);
    setTimeout(() => setClicked(false), 800);
  };

  return (
    <div 
      onClick={handleClick}
      style={{ filter: `hue-rotate(${colorOffset}deg)` }}
      className={`relative w-40 h-52 cursor-pointer transition-all duration-1000 select-none animate-float-slow flex flex-col items-center justify-center ${clicked ? "scale-110 -translate-y-4" : ""}`}
    >
      {/* Balloon Envelope */}
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_10px_20px_rgba(239,68,68,0.25)]">
        <defs>
          <linearGradient id="balloonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
          <linearGradient id="stripeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>

        {/* Main Envelope Body */}
        <path d="M50,5 C25,5 10,25 10,50 C10,75 35,95 40,105 L60,105 C65,95 90,75 90,50 C90,25 75,5 50,5 Z" fill="url(#balloonGrad)" />
        
        {/* Dynamic decorative vertical stripes */}
        <path d="M50,5 C35,5 25,25 25,50 C25,75 38,95 40,105 L45,105 C42,95 32,75 32,50 C32,25 42,5 50,5 Z" fill="url(#stripeGrad)" opacity="0.8" />
        <path d="M50,5 C65,5 75,25 75,50 C75,75 62,95 60,105 L55,105 C58,95 68,75 68,50 C68,25 58,5 50,5 Z" fill="url(#stripeGrad)" opacity="0.8" />
        
        <ellipse cx="50" cy="50" rx="6" ry="45" fill="#FFFFFF" opacity="0.4" />

        {/* Ropes connecting burner and basket */}
        <line x1="42" y1="105" x2="44" y2="114" stroke="#D1D5DB" strokeWidth="1.5" />
        <line x1="58" y1="105" x2="56" y2="114" stroke="#D1D5DB" strokeWidth="1.5" />
        <line x1="50" y1="105" x2="50" y2="114" stroke="#D1D5DB" strokeWidth="1" />

        {/* Small burner fire indicator */}
        <path d="M47,105 L50,100 L53,105 Z" fill="#F97316" className="animate-pulse" />

        {/* Woven Basket */}
        <rect x="42" y="112" width="16" height="10" rx="2" fill="#78350F" stroke="#451A03" strokeWidth="1" />
        {/* Cross hatches on basket */}
        <line x1="46" y1="112" x2="46" y2="122" stroke="#451A03" strokeWidth="0.5" />
        <line x1="50" y1="112" x2="50" y2="122" stroke="#451A03" strokeWidth="0.5" />
        <line x1="54" y1="112" x2="54" y2="122" stroke="#451A03" strokeWidth="0.5" />
        <line x1="42" y1="117" x2="58" y2="117" stroke="#451A03" strokeWidth="0.5" />
      </svg>

      {/* Floating text badge on hover */}
      <div className="absolute -bottom-2 bg-blue-900/90 text-[10px] text-white px-2 py-0.5 rounded-full border border-blue-400/50 shadow-md whitespace-nowrap opacity-90 transition-all">
        🎈 Click Đổi Màu!
      </div>
    </div>
  );
};


// (2) AI ROBOT (Robot AI) - speaks motivational quotes, reacts to clicks
const QUOTES = [
  "Chào các bạn! Hè 2026 rực cháy năng lượng cùng Cụm 2 Phường Tân Hưng nhé!",
  "Đến sinh hoạt đầy đủ để tích điểm nhận Ba lô chống gù siêu xịn nhé!",
  "Tuần 3 có chủ đề Thậm chí em yêu Khoa học, tụi mình sẽ lắp ráp Robot á!",
  "Cùng bảo vệ môi trường sông Kênh Tẻ bằng cách thu gom pin cũ đổi sen đá nào!",
  "Dậy sớm tập thể dục và đăng ký có mặt đúng giờ 8h00 sáng Chủ Nhật nhé!",
  "Ủy ban và Đoàn Phường Tân Hưng đã chuẩn bị hàng ngàn stickers siêu kute!"
];

export const AIRobot: React.FC = () => {
  const [speech, setSpeech] = useState("Chào các bạn nhỏ Cụm 2 nhé!");
  const [clicked, setClicked] = useState(false);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * QUOTES.length);
      setSpeech(QUOTES[idx]);
      setGlow(true);
      setTimeout(() => setGlow(false), 2000);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    setClicked(true);
    const idx = Math.floor(Math.random() * QUOTES.length);
    setSpeech(QUOTES[idx]);
    setGlow(true);
    setTimeout(() => {
      setClicked(false);
      setGlow(false);
    }, 1000);
  };

  return (
    <div 
      onClick={handleClick}
      className="relative w-44 h-56 cursor-pointer select-none animate-float flex flex-col items-center justify-end group"
    >
      {/* Dialog box speaking bubble */}
      <div className="absolute -top-12 z-20 w-48 text-center bg-slate-900/95 text-sky-200 text-xs p-2 rounded-xl border border-sky-500/30 shadow-xl transition-all duration-300 transform scale-95 group-hover:scale-100 group-hover:-translate-y-1">
        <p className="line-clamp-3 leading-relaxed font-medium">{speech}</p>
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-sky-500/30 rotate-45"></div>
      </div>

      {/* Cybernetic AI Platform */}
      <div className="absolute bottom-2 w-32 h-6 bg-cyan-950/60 rounded-full border border-sky-500/20 blur-sm"></div>

      {/* Smart Robot Vector Body */}
      <svg viewBox="0 0 100 100" className="w-28 h-28 relative z-10">
        <defs>
          <linearGradient id="robotMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0B5394" />
          </linearGradient>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>

        {/* Hover Hover ring */}
        <ellipse cx="50" cy="92" rx="20" ry="5" fill="#22D3EE" opacity="0.3" className="animate-pulse" />

        {/* Neck connector */}
        <rect x="46" y="55" width="8" height="10" rx="2" fill="#4B5563" />

        {/* Hovering arms */}
        <g className="animate-pulse">
          <ellipse cx="14" cy="45" rx="5" ry="12" fill="url(#robotMetal)" transform="rotate(-15 14 45)" />
          <ellipse cx="86" cy="45" rx="5" ry="12" fill="url(#robotMetal)" transform="rotate(15 86 45)" />
        </g>

        {/* Main Torso */}
        <rect x="25" y="42" width="50" height="32" rx="10" fill="url(#robotMetal)" stroke="#0284C7" strokeWidth="2" />
        
        {/* Glowing chest panel */}
        <rect x="35" y="48" width="30" height="14" rx="4" fill="#0F172A" stroke="#22D3EE" strokeWidth="1" />
        <circle cx="42" cy="55" r="3" fill={glow ? "#EF4444" : "#10B981"} className="animate-ping" />
        <circle cx="42" cy="55" r="3" fill={glow ? "#EF4444" : "#10B981"} />
        <circle cx="50" cy="55" r="2" fill="#EAB308" />
        <circle cx="58" cy="55" r="2.5" fill="#3B82F6" />

        {/* Head structure */}
        <g className={`transition-all duration-300 ${clicked ? "translate-y-1 scale-95" : ""}`}>
          <rect x="28" y="16" width="44" height="34" rx="8" fill="url(#robotMetal)" stroke="#0284C7" strokeWidth="2" />
          
          {/* Cyan Glow Visor Screen */}
          <rect x="34" y="22" width="32" height="15" rx="4" fill="#090D16" stroke="#22D3EE" strokeWidth="1.5" />
          
          {/* Eyes with heartbeat glow */}
          <circle cx="42" cy="29" r="3.5" fill="url(#eyeGlow)" className={glow ? "scale-125" : ""} />
          <circle cx="58" cy="29" r="3.5" fill="url(#eyeGlow)" className={glow ? "scale-125" : ""} />

          {/* Antennas */}
          <line x1="50" y1="16" x2="50" y2="8" stroke="#38BDF8" strokeWidth="3" />
          <circle cx="50" cy="6" r="3.5" fill="#F43F5E" className="animate-bounce" />
        </g>
      </svg>
      
      <span className="text-[10px] text-sky-300 font-mono tracking-widest mt-1 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20 uppercase">
        🤖 Robot AI Cụm 2
      </span>
    </div>
  );
};


// (3) WATER ROCKET (Tên lửa nước) - Click to launch! Custom micro-particle physics
export const WaterRocket: React.FC = () => {
  const [launching, setLaunching] = useState(false);
  const [altitude, setAltitude] = useState(0);

  const handleLaunch = () => {
    if (launching) return;
    setLaunching(true);
    
    // Simulate climb-up
    let pos = 0;
    const interval = setInterval(() => {
      pos += 12;
      setAltitude(pos);
      if (pos > 180) {
        clearInterval(interval);
        setTimeout(() => {
          // Reset after landing
          setAltitude(0);
          setLaunching(false);
        }, 1500);
      }
    }, 40);
  };

  return (
    <div className="relative w-40 h-72 flex flex-col items-center justify-end select-none">
      {/* Interactive Platform Desk */}
      <div 
        style={{ transform: `translateY(-${altitude}px)` }} 
        className="relative transition-all duration-300 ease-out flex flex-col items-center"
      >
        {/* Dynamic Flame vector when launched */}
        {launching && altitude < 150 && (
          <div className="absolute bottom-[-45px] z-0 flex flex-col items-center">
            {/* Inner fire particle */}
            <div className="w-6 h-12 bg-gradient-to-t from-transparent via-orange-500 to-yellow-300 rounded-full animate-pulse"></div>
            <div className="w-4 h-6 bg-red-600 rounded-full animate-ping -mt-6"></div>
          </div>
        )}

        {/* Real rocket body */}
        <svg viewBox="0 0 100 120" className="w-24 h-48 drop-shadow-xl z-10">
          <defs>
            <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6A00" />
              <stop offset="100%" stopColor="#FFD200" />
            </linearGradient>
            <linearGradient id="rocketFin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0056B3" />
              <stop offset="100%" stopColor="#00AEEF" />
            </linearGradient>
          </defs>

          {/* Rocket Nose Cone */}
          <path d="M50,10 C45,25 40,35 40,45 L60,45 C60,35 55,25 50,10 Z" fill="#ED1C24" />

          {/* Re-usable plastic pet bottle body */}
          <path d="M40,45 C40,43 60,43 60,45 L60,95 C60,98 57,100 50,100 C43,100 40,98 40,95 Z" fill="url(#rocketBody)" stroke="#FFFFFF" strokeWidth="1" />
          {/* Water level indicators inside bottle */}
          <rect x="42" y="70" width="16" height="25" fill="#38BDF8" opacity="0.6" rx="2" />
          <path d="M42,70 Q50,68 58,70 L58,73 Q50,71 42,73 Z" fill="#FFFFFF" opacity="0.8" />

          {/* Fin Wings left & right */}
          <path d="M40,78 L20,95 L25,102 C35,102 40,94 40,90 Z" fill="url(#rocketFin)" />
          <path d="M60,78 L80,95 L75,102 C65,102 60,94 60,90 Z" fill="url(#rocketFin)" />

          {/* Water nozzle booster neck */}
          <rect x="47" y="100" width="6" height="6" fill="#4B5563" />
          <polygon points="44,106 56,106 52,112 48,112" fill="#1F2937" />
        </svg>

        {/* Label and statistics banner inside rocket shadow */}
        <span className="absolute top-2/3 bg-slate-900/90 text-[9px] text-yellow-300 font-mono px-1.5 py-0.5 rounded border border-yellow-500/30 whitespace-nowrap">
          H₂O TÊN LỬA
        </span>
      </div>

      {/* Launcher base pad standing */}
      <div className="w-32 h-10 relative z-0 flex flex-col items-center">
        {/* Launch pad legs */}
        <svg viewBox="0 0 100 30" className="w-full h-full">
          <path d="M10,25 L40,10 L60,10 L90,25" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.4" />
          <rect x="35" y="5" width="30" height="8" fill="#1E293B" rx="2" stroke="#FFFFFF" strokeWidth="1.5" />
          <ellipse cx="50" cy="25" rx="45" ry="4" fill="#000000" opacity="0.6" />
        </svg>
      </div>

      {/* Button Launcher triggers */}
      <button 
        onClick={handleLaunch} 
        disabled={launching}
        className={`absolute bottom-2 text-xs font-bold leading-none px-3 py-1.5 rounded-full shadow-lg border outline-none cursor-pointer transition-all ${launching ? "bg-red-800 border-red-500 text-red-200 cursor-not-allowed scale-90" : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-orange-400 text-white hover:scale-105 active:scale-95"}`}
      >
        {launching ? "ĐANG BAY..." : "🚀 BẮN ROCKET!"}
      </button>
    </div>
  );
};


// (4) EDUCATIONAL BOOK (Sách & Thúc đẩy giáo dục) - spin in 3D perspective
export const EducationBook: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <div 
      onClick={() => setOpen(!open)}
      className="relative w-44 h-52 cursor-pointer flex flex-col items-center justify-center select-none animate-float-slow group"
    >
      {/* Spawns decorative glowing math symbols */}
      <div className="absolute top-2 text-sky-400 font-mono text-xs opacity-70 translate-x-[-30px] -rotate-12 animate-bounce">
        e = mc²
      </div>
      <div className="absolute top-6 right-2 text-amber-400 font-mono text-xs opacity-70 translate-x-[30px] rotate-12 animate-pulse">
        H₂O
      </div>
      <div className="absolute top-1/2 left-3 text-red-400 font-serif text-sm opacity-60 -translate-x-[40px] animate-bounce delay-300">
        ♫
      </div>

      {/* 3D Book Layout */}
      <svg viewBox="0 0 100 100" className="w-32 h-32 drop-shadow-2xl transition-all duration-700 transform group-hover:rotate-12">
        <defs>
          <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="bookPages" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>

        {/* Cover thickness */}
        <path d="M5,50 Q50,60 95,50 L95,54 Q50,65 5,54 Z" fill="#1E3A8A" />
        <path d="M5,54 Q50,64 95,54 L95,56 Q50,67 5,56 Z" fill="#F59E0B" />

        {/* Sheets paper pages open */}
        <path d="M6,49 Q50,59 50,59 Q50,59 94,49 L93,38 Q50,47 50,47 Q50,47 7,38 Z" fill="url(#bookPages)" />
        
        {/* Layered sheet overlays */}
        <path d="M8,46 Q50,56 50,56 Q50,56 92,46 L91,35 Q50,44 50,44 Q50,44 10,35 Z" fill="#F1F5F9" />
        
        {/* Book spine middle shadow */}
        <path d="M49,34 C49,34 50,54 50,56 C50,54 51,34 51,34 Z" fill="#CBD5E1" />

        {/* Little decorative bookmark ribbon draping down */}
        <path d="M50,44 L50,68 L53,65 L56,68 L54,44 Z" fill="#EF4444" />

        {/* Written graphic patterns on pages representing literacy */}
        <path d="M15,30 L32,25 M15,35 L38,30 M15,40 L35,35" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M85,30 L68,25 M85,35 L62,30 M85,40 L65,35" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 1" />
      </svg>

      <span className="text-[10px] text-amber-300 font-bold tracking-wider bg-slate-900/90 text-center px-2.5 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap mt-2">
        📖 Tri Thức Trẻ
      </span>
    </div>
  );
};


// (5) HCM CITY SKYLINE (Bản sắc thành phố Hồ Chí Minh) - beautiful dynamic silhouette background
export const HcmSkyline: React.FC = () => {
  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none" style={{ height: "180px" }}>
      {/* Moving slow cloud 1 */}
      <div className="absolute top-4 left-[20%] w-16 h-6 bg-white/5 blur-sm rounded-full animate-pulse-slow"></div>
      <div className="absolute top-10 right-[30%] w-24 h-8 bg-white/5 blur-sm rounded-full animate-marquee" style={{ animationDuration: "50s" }}></div>

      {/* Skyline SVGs representing Landmark 81, Bitexco Financial, Ben Thanh Tower and generic skyline towers */}
      <svg viewBox="0 0 1000 150" className="w-full h-full absolute bottom-0 opacity-15" preserveAspectRatio="none">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0056B3" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Background far silhouette structures */}
        <path d="M0,150 L0,120 L40,110 L50,120 L100,100 L120,120 L150,115 L180,150" fill="url(#skyGrad)" />
        <path d="M180,150 L200,90 L220,90 L240,150" fill="url(#skyGrad)" />
        <path d="M450,150 L480,110 L500,110 L510,130 L550,130 L580,150" fill="url(#skyGrad)" />

        {/* BITEXCO FINANCIAL TOWER representation (with its iconic heli-pad) */}
        <path d="M280,150 L310,65 Q318,50 320,35 Q322,50 330,65 L360,150 Z" fill="url(#skyGrad)" />
        <ellipse cx="320" cy="55" rx="14" ry="4" fill="#0056B3" />
        <line x1="320" y1="35" x2="320" y2="10" stroke="#0056B3" strokeWidth="2" />

        {/* LANDMARK 81 representation (tiered thin skyscraper) */}
        <rect x="670" y="100" width="40" height="50" fill="url(#skyGrad)" />
        <rect x="675" y="70" width="30" height="30" fill="url(#skyGrad)" />
        <rect x="680" y="40" width="20" height="30" fill="url(#skyGrad)" />
        <rect x="685" y="15" width="10" height="25" fill="url(#skyGrad)" />
        <line x1="690" y1="15" x2="690" y2="0" stroke="#0056B3" strokeWidth="1.5" />

        {/* SÀI GÒN - BẾN THÀNH Market tower outline silhouette */}
        <path d="M820,150 L820,125 L840,125 L840,110 L850,95 L860,110 L860,125 L880,125 L880,150 Z" fill="url(#skyGrad)" />
        <circle cx="850" cy="115" r="4" fill="#0056B3" />

        {/* Base line represent the Saigon River (Sông Sài Gòn Kênh Tẻ) */}
        <rect x="0" y="146" width="1000" height="4" fill="#0056B3" />
      </svg>
    </div>
  );
};
