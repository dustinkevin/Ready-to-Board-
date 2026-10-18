import React from 'react';

export const AirportCounterIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 500 320"
        className="w-full max-w-[440px] drop-shadow-md rounded-2xl overflow-hidden"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Airport Terminal */}
        <rect width="500" height="320" fill="#F0F7FF" />
        <rect y="240" width="500" height="80" fill="#E2E8F0" />
        
        {/* Departure Window & Plane in Sky */}
        <path d="M40 30 H460 V120 H40 Z" fill="#E0F2FE" rx="8" />
        <line x1="140" y1="30" x2="140" y2="120" stroke="#BAE6FD" strokeWidth="3" />
        <line x1="250" y1="30" x2="250" y2="120" stroke="#BAE6FD" strokeWidth="3" />
        <line x1="360" y1="30" x2="360" y2="120" stroke="#BAE6FD" strokeWidth="3" />
        
        {/* Distant Airplane climbing */}
        <g transform="translate(300, 60) scale(0.7) rotate(-15)">
          <path d="M0 15 L25 10 L50 15 L40 22 L55 23 L60 27 L10 27 L0 15 Z" fill="#38BDF8" />
          <path d="M22 10 L30 -5 L37 10 Z" fill="#0284C7" />
          <path d="M25 22 L32 35 L38 22 Z" fill="#0284C7" />
        </g>
        
        {/* Flight Information Board */}
        <rect x="60" y="45" width="130" height="60" rx="6" fill="#1E293B" />
        <rect x="65" y="52" width="50" height="6" rx="2" fill="#F59E0B" />
        <rect x="65" y="63" width="90" height="4" rx="2" fill="#38BDF8" />
        <text x="65" y="82" fill="#F8FAFC" fontSize="11" fontFamily="monospace" fontWeight="bold">
          KE907 LHR ON TIME
        </text>
        <text x="65" y="96" fill="#10B981" fontSize="9" fontFamily="monospace">
          BOARDING GATE 42
        </text>

        {/* Airport Check-in Desk Counter */}
        <rect x="110" y="150" width="280" height="110" rx="12" fill="#0284C7" />
        <rect x="120" y="160" width="260" height="90" rx="8" fill="#0369A1" />
        {/* Counter Top Surface */}
        <path d="M90 148 L410 148 L390 162 L110 162 Z" fill="#38BDF8" />
        
        {/* Airline Logo on Desk */}
        <circle cx="250" cy="205" r="22" fill="#FFFFFF" />
        <path d="M238 205 L262 205 M250 193 L250 217" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M242 198 L258 212 M258 198 L242 212" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <text x="250" y="238" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" letterSpacing="1">
          SKYLINE AIRWAYS
        </text>

        {/* Emma (Friendly Staff) behind counter */}
        {/* Hair */}
        <ellipse cx="250" cy="115" rx="28" ry="32" fill="#78350F" />
        {/* Face */}
        <circle cx="250" cy="120" r="20" fill="#FED7AA" />
        {/* Hair bangs */}
        <path d="M232 110 Q250 100 268 110 Q268 118 250 115 Q232 118 232 110 Z" fill="#78350F" />
        {/* Eyes & Smile */}
        <circle cx="243" cy="119" r="2.5" fill="#1E293B" />
        <circle cx="257" cy="119" r="2.5" fill="#1E293B" />
        {/* Cheerful blush */}
        <circle cx="239" cy="125" r="3" fill="#F472B6" opacity="0.6" />
        <circle cx="261" cy="125" r="3" fill="#F472B6" opacity="0.6" />
        {/* Happy smile */}
        <path d="M245 127 Q250 133 255 127" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Uniform Collar & Scarf */}
        <path d="M234 140 L250 148 L266 140 L268 152 L232 152 Z" fill="#0284C7" />
        <path d="M246 144 L254 144 L250 154 Z" fill="#F59E0B" />
        {/* Uniform Badge */}
        <rect x="258" y="145" width="8" height="5" rx="1" fill="#FEF08A" />

        {/* Luggage Scale on Left */}
        <rect x="40" y="220" width="60" height="40" rx="4" fill="#64748B" />
        <rect x="45" y="210" width="50" height="10" rx="2" fill="#94A3B8" />
        {/* Suitcase on scale */}
        <rect x="48" y="165" width="44" height="46" rx="6" fill="#F97316" />
        <rect x="52" y="172" width="36" height="32" rx="3" fill="#EA580C" />
        {/* Handle */}
        <path d="M62 165 V154 H78 V165" stroke="#334155" strokeWidth="3" fill="none" />
        {/* Tag */}
        <path d="M78 180 L88 185 L85 190 L75 185 Z" fill="#FEF08A" />
        {/* Weight display */}
        <rect x="52" y="235" width="36" height="15" rx="3" fill="#0F172A" />
        <text x="70" y="246" textAnchor="middle" fill="#22C55E" fontSize="9" fontFamily="monospace" fontWeight="bold">
          18.4 kg
        </text>

        {/* Boarding Pass & Passport on Counter */}
        <g transform="translate(130, 140) rotate(-10)">
          {/* Passport */}
          <rect x="0" y="0" width="28" height="38" rx="3" fill="#1E3A8A" />
          <circle cx="14" cy="18" r="7" stroke="#FDE047" strokeWidth="1.2" fill="none" />
          <text x="14" y="32" fill="#FDE047" fontSize="5" textAnchor="middle" fontWeight="bold">PASSPORT</text>
        </g>
        <g transform="translate(160, 138) rotate(5)">
          {/* Boarding pass preview */}
          <rect x="0" y="0" width="55" height="24" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="0" y="0" width="12" height="24" rx="2" fill="#0284C7" />
          <line x1="16" y1="6" x2="38" y2="6" stroke="#64748B" strokeWidth="2" />
          <line x1="16" y1="12" x2="30" y2="12" stroke="#94A3B8" strokeWidth="1.5" />
          <rect x="42" y="4" width="10" height="15" fill="#0F172A" opacity="0.8" />
        </g>

        {/* Passenger's Backpack on Right */}
        <g transform="translate(400, 185)">
          <path d="M10 25 C10 10 45 10 45 25 L48 65 C48 70 42 75 35 75 L20 75 C13 75 8 70 8 65 Z" fill="#3B82F6" />
          <rect x="14" y="38" width="28" height="26" rx="4" fill="#2563EB" />
          <path d="M18 15 C18 5 37 5 37 15" stroke="#1E293B" strokeWidth="3" fill="none" />
          <circle cx="28" cy="44" r="2" fill="#93C5FD" />
        </g>
      </svg>
    </div>
  );
};
