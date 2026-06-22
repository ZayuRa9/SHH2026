import React from "react";

export const DoanLogo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} title="Đoàn Thanh niên Cộng sản Hồ Chí Minh">
      {/* Outer Glow Circle */}
      <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full animate-pulse-slow"></div>
      
      {/* Stylized Badge SVG representing Vietnamese Youth Union colors & flag */}
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-md">
        <defs>
          <linearGradient id="doanGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF200" />
            <stop offset="100%" stopColor="#F15A24" />
          </linearGradient>
          <linearGradient id="doanBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00AEEF" />
            <stop offset="100%" stopColor="#0054A6" />
          </linearGradient>
          <linearGradient id="doanRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ED1C24" />
            <stop offset="100%" stopColor="#A00F14" />
          </linearGradient>
        </defs>
        
        {/* Background Shield */}
        <circle cx="50" cy="50" r="46" fill="url(#doanBlue)" stroke="url(#doanGold)" strokeWidth="3" />
        
        {/* Inner flag background */}
        <path d="M50,12 C71,12 71,28 84,28 L84,54 C71,54 71,68 50,68 C29,68 29,54 16,54 L16,28 C29,28 29,12 50,12 Z" fill="url(#doanRed)" />
        
        {/* Diagonal Vietnam Southern-style Ribbon representation */}
        <path d="M16,28 L84,54 L84,58 L16,32 Z" fill="#22C55E" />
        
        {/* Arm holding flag representation (Stylized with high-density paths) */}
        <path d="M45,65 L40,40 L48,42 L52,58 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M38,40 C41,37 46,37 48,40 L52,43 C54,45 53,49 49,49 L43,45" fill="url(#doanGold)" />
        
        {/* Golden Star representing the Country */}
        <polygon points="50,18 53,24 60,24 55,28 57,34 50,30 43,34 45,28 40,24 47,24" fill="url(#doanGold)" />
        
        {/* Outer Text Circle */}
        <path id="doanTextPath" d="M 12 50 A 38 38 0 1 1 88 50" fill="none" />
        <text className="text-[7.5px] font-bold tracking-widest uppercase font-sans" fill="#FFFFFF">
          <textPath href="#doanTextPath" startOffset="50%" textAnchor="middle">
            THANH NIÊN VIỆT NAM
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export const DoiLogo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} title="Đội Thiếu niên Tiền phong Hồ Chí Minh">
      {/* Outer Glow Circle */}
      <div className="absolute inset-0 bg-red-500/20 blur-lg rounded-full animate-pulse-slow"></div>
      
      {/* Stylized Badge SVG representing Vietnamese Young Pioneers colors */}
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-md">
        <defs>
          <linearGradient id="doiGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF200" />
            <stop offset="100%" stopColor="#FF8A00" />
          </linearGradient>
          <linearGradient id="doiGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="doiRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
        </defs>
        
        {/* Circular frame */}
        <circle cx="50" cy="50" r="46" fill="url(#doiGreen)" stroke="url(#doiGold)" strokeWidth="3" />
        
        {/* Sharp Bamboo Shoot symbol (Măng non) inside - Represents youth growing */}
        <path d="M50,15 C55,30 65,45 65,65 C65,75 58,82 50,82 C42,82 35,75 35,65 C35,45 45,30 50,15 Z" fill="url(#doiGold)" />
        <path d="M50,15 C52,32 58,45 58,62 C58,72 53,78 50,78 Z" fill="#EAB308" opacity="0.8" />
        <path d="M50,30 C45,43 40,55 40,68 C40,75 45,80 50,80 Z" fill="#CA8A04" opacity="0.5" />
        
        {/* Red Scarf overlapping representation (Khăn quàng đỏ) */}
        <path d="M32,48 L48,58 L54,78 L48,82 L30,55 Z" fill="url(#doiRed)" />
        <path d="M68,48 L52,58 L46,78 L52,82 L70,55 Z" fill="url(#doiRed)" />
        
        {/* Yellow Star of Vietnam in the center */}
        <polygon points="50,32 52,38 58,38 53,42 55,48 50,44 45,48 47,42 42,38 48,38" fill="url(#doiRed)" />
        
        {/* Outer "SẴN SÀNG" banner bottom text */}
        <rect x="25" y="81" width="50" height="10" rx="3" fill="#EF4444" stroke="url(#doiGold)" strokeWidth="1" />
        <text x="50" y="88" fill="#FFFFFF" className="text-[7.5px] font-black tracking-widest text-center" textAnchor="middle">
          SẴN SÀNG
        </text>
      </svg>
    </div>
  );
};

export const ThanhNienLogo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} title="Hội Liên hiệp Thanh niên Việt Nam">
      <div className="absolute inset-0 bg-blue-500/10 blur-sm rounded-full animate-pulse-slow"></div>
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-md">
        <defs>
          <linearGradient id="tnBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0080FF" />
            <stop offset="100%" stopColor="#0056b3" />
          </linearGradient>
          <linearGradient id="tnDarkBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#004080" />
            <stop offset="100%" stopColor="#002D5A" />
          </linearGradient>
        </defs>
        
        {/* Outer Circular Rim */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="#1D4ED8" strokeWidth="3" />
        
        {/* Sky Blue circle with S curve */}
        <path d="M 50,4 C 24,4 4,24 4,50 C 4,76 24,96 50,96 C 45,76 72,60 55,4 Z" fill="url(#tnBlue)" />
        <path d="M 50,4 C 72,60 45,76 50,96 C 76,96 96,76 96,50 C 96,24 76,4 50,4 Z" fill="#FFFFFF" />
        
        {/* Star inside blue section */}
        <polygon points="32,24 35,31 42,31 37,35 39,42 32,38 25,42 27,35 22,31 29,31" fill="url(#tnDarkBlue)" />
        
        {/* White bottom text box */}
        <path d="M 4,70 L 96,70 C 90,86 70,96 50,96 C 30,96 10,86 4,70 Z" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.5" />
        
        {/* Text bottom */}
        <text x="50" y="80" fill="#1D4ED8" className="text-[6.5px] font-black tracking-widest text-center" textAnchor="middle" style={{ fontFamily: "Inter, sans-serif" }}>
          THANH NIÊN
        </text>
        <text x="50" y="88" fill="#1D4ED8" className="text-[6.5px] font-black tracking-widest text-center" textAnchor="middle" style={{ fontFamily: "Inter, sans-serif" }}>
          VIỆT NAM
        </text>
      </svg>
    </div>
  );
};

export const DefaultLogoCluster: React.FC<{ className?: string }> = ({ className = "h-11 md:h-12" }) => {
  return (
    <div className={`flex items-center gap-1.5 md:gap-2.5 select-none shrink-0 ${className}`} style={{ aspectRatio: "1096/391" }}>
      <ThanhNienLogo className="h-full w-auto" />
      <DoanLogo className="h-full w-auto" />
      <DoiLogo className="h-full w-auto" />
    </div>
  );
};
