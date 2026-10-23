import React, { useId } from 'react';

interface CharacterProps {
  className?: string;
  tone?: 'mint' | 'amber' | 'blush';
}

/**
 * Lightweight, dependency-free 3D-ish characters used across the dashboard.
 * Each illustration is inline SVG so it scales crisply and needs no network assets.
 */
export const LeafCluster: React.FC<CharacterProps> = ({ className }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`leafBody-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2FFE3" />
          <stop offset="42%" stopColor="#A8F58F" />
          <stop offset="100%" stopColor="#3FA55F" />
        </linearGradient>
        <linearGradient id={`leafSide-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9FFC6" />
          <stop offset="100%" stopColor="#5ECB78" />
        </linearGradient>
        <radialGradient id={`leafShine-${uid}`} cx="32%" cy="22%" r="62%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="82" cy="147" rx="44" ry="9" fill="#000000" opacity="0.28" />

      {/* Back leaves */}
      <path
        d="M76 96C52 94 34 78 32 54c24-2 44 10 52 30Z"
        fill={`url(#leafSide-${uid})`}
        opacity="0.9"
      />
      <path
        d="M94 92c20-8 32-26 30-48-20 2-34 16-40 36Z"
        fill={`url(#leafSide-${uid})`}
        opacity="0.75"
      />

      {/* Main body */}
      <circle cx="80" cy="92" r="41" fill={`url(#leafBody-${uid})`} />
      <ellipse cx="62" cy="70" rx="18" ry="13" fill={`url(#leafShine-${uid})`} />

      {/* Stem and top leaf */}
      <path d="M80 52c0-12 6-20 16-24" stroke="#2E8A4F" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M92 34c10-6 20-5 26 2-8 8-18 10-27 7Z" fill="#7CF07A" />

      {/* Face */}
      <ellipse cx="66" cy="89" rx="3.6" ry="5.4" fill="#10321F" />
      <ellipse cx="94" cy="89" rx="3.6" ry="5.4" fill="#10321F" />
      <circle cx="67.2" cy="87.4" r="1.2" fill="#FFFFFF" opacity="0.9" />
      <circle cx="95.2" cy="87.4" r="1.2" fill="#FFFFFF" opacity="0.9" />
      <path d="M70 103c6 6 14 6 20 0" stroke="#10321F" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <circle cx="55" cy="101" r="5.4" fill="#FF9DB5" opacity="0.6" />
      <circle cx="105" cy="101" r="5.4" fill="#FF9DB5" opacity="0.6" />

      {/* Sparkles */}
      <path d="M128 62l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4Z" fill="#F2FFE3" opacity="0.85" />
      <circle cx="34" cy="42" r="3" fill="#B9FF9D" opacity="0.8" />
    </svg>
  );
};

export const LilacOcto: React.FC<CharacterProps> = ({ className }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`lilacBody-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6ECFF" />
          <stop offset="45%" stopColor="#D3B7FF" />
          <stop offset="100%" stopColor="#9B78EA" />
        </linearGradient>
        <linearGradient id={`lilacLimb-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A9FF" />
          <stop offset="100%" stopColor="#8B64DD" />
        </linearGradient>
        <radialGradient id={`lilacShine-${uid}`} cx="30%" cy="20%" r="66%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="80" cy="148" rx="44" ry="9" fill="#000000" opacity="0.28" />

      {/* Tentacles */}
      <rect x="36" y="102" width="18" height="42" rx="9" fill={`url(#lilacLimb-${uid})`} />
      <rect x="60" y="110" width="18" height="36" rx="9" fill={`url(#lilacLimb-${uid})`} />
      <rect x="84" y="110" width="18" height="36" rx="9" fill={`url(#lilacLimb-${uid})`} />
      <rect x="106" y="102" width="18" height="42" rx="9" fill={`url(#lilacLimb-${uid})`} />

      {/* Body */}
      <rect x="30" y="34" width="100" height="86" rx="32" fill={`url(#lilacBody-${uid})`} />
      <ellipse cx="58" cy="58" rx="22" ry="15" fill={`url(#lilacShine-${uid})`} />

      {/* Little horn */}
      <path d="M80 24l7 14H73Z" fill="#B99CFF" />

      {/* Face */}
      <ellipse cx="63" cy="76" rx="3.8" ry="5.6" fill="#2B1747" />
      <ellipse cx="97" cy="76" rx="3.8" ry="5.6" fill="#2B1747" />
      <circle cx="64.3" cy="74.2" r="1.3" fill="#FFFFFF" opacity="0.9" />
      <circle cx="98.3" cy="74.2" r="1.3" fill="#FFFFFF" opacity="0.9" />
      <path d="M70 90c6 7 14 7 20 0" stroke="#2B1747" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <circle cx="51" cy="88" r="5.6" fill="#FFB3D0" opacity="0.7" />
      <circle cx="109" cy="88" r="5.6" fill="#FFB3D0" opacity="0.7" />

      {/* Sparkles */}
      <path d="M130 30l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4Z" fill="#F6ECFF" opacity="0.9" />
      <circle cx="28" cy="54" r="3" fill="#DCC8FF" opacity="0.85" />
    </svg>
  );
};

export const BlushOcto: React.FC<CharacterProps> = ({ className }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`blushBody-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFEAF3" />
          <stop offset="45%" stopColor="#FFC0DA" />
          <stop offset="100%" stopColor="#EF86B4" />
        </linearGradient>
        <linearGradient id={`blushLimb-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB8D5" />
          <stop offset="100%" stopColor="#E274A5" />
        </linearGradient>
        <radialGradient id={`blushShine-${uid}`} cx="30%" cy="20%" r="64%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="80" cy="148" rx="42" ry="9" fill="#000000" opacity="0.28" />

      {/* Tentacles */}
      <rect x="42" y="104" width="16" height="40" rx="8" fill={`url(#blushLimb-${uid})`} />
      <rect x="64" y="112" width="16" height="32" rx="8" fill={`url(#blushLimb-${uid})`} />
      <rect x="86" y="112" width="16" height="32" rx="8" fill={`url(#blushLimb-${uid})`} />
      <rect x="106" y="102" width="16" height="42" rx="8" fill={`url(#blushLimb-${uid})`} />

      {/* Head */}
      <circle cx="80" cy="78" r="46" fill={`url(#blushBody-${uid})`} />
      <ellipse cx="60" cy="52" rx="18" ry="13" fill={`url(#blushShine-${uid})`} />

      {/* Curl */}
      <path d="M96 32c12-4 22 4 20 14" stroke="#E274A5" strokeWidth="5" strokeLinecap="round" fill="none" />

      {/* Face */}
      <ellipse cx="64" cy="76" rx="4" ry="5.8" fill="#3B1022" />
      <ellipse cx="96" cy="76" rx="4" ry="5.8" fill="#3B1022" />
      <circle cx="65.3" cy="74.2" r="1.3" fill="#FFFFFF" opacity="0.9" />
      <circle cx="97.3" cy="74.2" r="1.3" fill="#FFFFFF" opacity="0.9" />
      <path d="M73 90c4 5 10 5 14 0" stroke="#3B1022" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <circle cx="51" cy="88" r="6" fill="#FF7FAE" opacity="0.45" />
      <circle cx="109" cy="88" r="6" fill="#FF7FAE" opacity="0.45" />

      {/* Sparkles */}
      <path d="M132 46l2.2 5.6 5.6 2.2-5.6 2.2-2.2 5.6-2.2-5.6-5.6-2.2 5.6-2.2Z" fill="#FFEAF3" opacity="0.9" />
      <circle cx="28" cy="74" r="2.8" fill="#FFC6DE" opacity="0.9" />
    </svg>
  );
};

export const FlowerBuddy: React.FC<CharacterProps> = ({ className }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`petal-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F3E8FF" />
          <stop offset="55%" stopColor="#CBA8FF" />
          <stop offset="100%" stopColor="#8E67DD" />
        </linearGradient>
        <linearGradient id={`center-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF6D8" />
          <stop offset="100%" stopColor="#FFD98A" />
        </linearGradient>
      </defs>

      <ellipse cx="80" cy="148" rx="34" ry="8" fill="#000000" opacity="0.26" />

      {/* Petals */}
      <g fill={`url(#petal-${uid})`}>
        <ellipse cx="80" cy="38" rx="21" ry="27" />
        <ellipse cx="80" cy="108" rx="21" ry="27" />
        <ellipse cx="45" cy="73" rx="27" ry="21" />
        <ellipse cx="115" cy="73" rx="27" ry="21" />
        <ellipse cx="57" cy="48" rx="22" ry="19" transform="rotate(-38 57 48)" />
        <ellipse cx="103" cy="48" rx="22" ry="19" transform="rotate(38 103 48)" />
        <ellipse cx="57" cy="100" rx="22" ry="19" transform="rotate(38 57 100)" />
        <ellipse cx="103" cy="100" rx="22" ry="19" transform="rotate(-38 103 100)" />
      </g>

      {/* Center */}
      <circle cx="80" cy="73" r="25" fill={`url(#center-${uid})`} />
      <ellipse cx="72" cy="64" rx="8" ry="5" fill="#FFFFFF" opacity="0.55" />

      {/* Face */}
      <ellipse cx="72" cy="71" rx="3" ry="4.6" fill="#5A3A10" />
      <ellipse cx="88" cy="71" rx="3" ry="4.6" fill="#5A3A10" />
      <path d="M75 82c3 4 7 4 10 0" stroke="#5A3A10" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="64" cy="80" r="4" fill="#FFB3D0" opacity="0.6" />
      <circle cx="96" cy="80" r="4" fill="#FFB3D0" opacity="0.6" />

      {/* Sparkles */}
      <path d="M132 30l2.2 5.6 5.6 2.2-5.6 2.2-2.2 5.6-2.2-5.6-5.6-2.2 5.6-2.2Z" fill="#F3E8FF" opacity="0.9" />
      <circle cx="26" cy="36" r="3" fill="#DCC8FF" opacity="0.85" />
    </svg>
  );
};

export const VerdictBlob: React.FC<CharacterProps> = ({ className, tone = 'mint' }) => {
  const uid = useId().replace(/:/g, '');
  const palette = {
    mint: { top: '#E7FFD8', mid: '#A9F58D', bottom: '#3FA55F', leaf: '#7CF07A', mouth: '#10321F' },
    amber: { top: '#FFF7D6', mid: '#FFE08A', bottom: '#E0A93C', leaf: '#F7C948', mouth: '#3A2A07' },
    blush: { top: '#FFEAF2', mid: '#FFC0D8', bottom: '#E274A0', leaf: '#F79BC3', mouth: '#3B1022' },
  }[tone];

  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`blob-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.top} />
          <stop offset="52%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.bottom} />
        </linearGradient>
        <radialGradient id={`blobShine-${uid}`} cx="30%" cy="20%" r="62%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="80" cy="148" rx="40" ry="8" fill="#000000" opacity="0.26" />

      <path
        d="M80 26c30 0 52 19 52 45 0 27-22 47-52 47S28 98 28 71c0-26 22-45 52-45Z"
        fill={`url(#blob-${uid})`}
      />
      <ellipse cx="60" cy="50" rx="18" ry="12" fill={`url(#blobShine-${uid})`} />

      {/* Leaf */}
      <path d="M80 30c0-10 6-17 16-19 2 10-4 18-13 21Z" fill={palette.leaf} />
      <path d="M80 30c-8-4-14-3-19 2 5 6 12 7 18 4Z" fill={palette.leaf} opacity="0.8" />

      {/* Face */}
      <ellipse cx="64" cy="72" rx="3.8" ry="5.6" fill={palette.mouth} />
      <ellipse cx="96" cy="72" rx="3.8" ry="5.6" fill={palette.mouth} />
      <circle cx="65.3" cy="70.2" r="1.3" fill="#FFFFFF" opacity="0.9" />
      <circle cx="97.3" cy="70.2" r="1.3" fill="#FFFFFF" opacity="0.9" />

      {tone === 'mint' && (
        <path d="M70 88c6 6 14 6 20 0" stroke={palette.mouth} strokeWidth="3.6" strokeLinecap="round" fill="none" />
      )}
      {tone === 'amber' && (
        <ellipse cx="80" cy="90" rx="5" ry="6" fill={palette.mouth} opacity="0.85" />
      )}
      {tone === 'blush' && (
        <path d="M71 92c5-5 13-5 18 0" stroke={palette.mouth} strokeWidth="3.6" strokeLinecap="round" fill="none" />
      )}

      <circle cx="52" cy="86" r="5.6" fill="#FF8FB3" opacity="0.55" />
      <circle cx="108" cy="86" r="5.6" fill="#FF8FB3" opacity="0.55" />
    </svg>
  );
};
