// Inline stroke icons (24x24 viewBox). Pass size/className to adjust.

import type { SVGProps } from "react";
import type { InstrumentId } from "../lib/types";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Base({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

// ------------------------------------------------------------- navigation

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Base>
);

export const PulseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h4l2.5-7 4 14 2.5-7h5" />
  </Base>
);

export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16.5 15.2c2.4.3 4.3 1.9 5 4.3" />
  </Base>
);

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12Z" />
  </Base>
);

export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" />
    <path d="M10 21h4" />
  </Base>
);

export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6" />
  </Base>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Base>
);

// ------------------------------------------------------------------ misc

export const PlayIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 5.5v13l11-6.5Z" fill="currentColor" stroke="none" />
  </Base>
);

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Base {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.5S3.5 15 3.5 9.3C3.5 6.4 5.8 4.5 8.2 4.5c1.6 0 3 .8 3.8 2 .8-1.2 2.2-2 3.8-2 2.4 0 4.7 1.9 4.7 4.8C20.5 15 12 20.5 12 20.5Z" />
  </Base>
);

export const CommentIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.8-2.9A7.5 7.5 0 1 1 21 11.5Z" />
    <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
  </Base>
);

export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15V4" />
    <path d="m7.5 8 4.5-4.5L16.5 8" />
    <path d="M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6" />
  </Base>
);

export const MapPinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s-6.5-5.3-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.7 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.2" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
);

export const BoltIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M13 2.5 4.5 13.5H11L9.5 21.5 19.5 9.5H12.5L13 2.5Z" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);

export const VerifiedIcon = ({ size = 16, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Verified" {...p}>
    <path
      d="M12 2l2.4 2 3.1-.4 1.2 2.9 2.8 1.4-.7 3.1 2 2.4-2 2.4.7 3.1-2.8 1.4-1.2 2.9-3.1-.4-2.4 2-2.4-2-3.1.4-1.2-2.9-2.8-1.4.7-3.1-2-2.4 2-2.4-.7-3.1 2.8-1.4L6.5 3.6l3.1.4Z"
      fill="#38bdf8"
    />
    <path d="m8.5 12.2 2.4 2.4 4.6-4.8" stroke="#0a0a0f" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17M8 2.8V6.2M16 2.8V6.2" />
  </Base>
);

export const DollarIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v18" />
    <path d="M16.5 7.5c0-1.7-2-2.8-4.5-2.8S7.5 5.8 7.5 7.7c0 4.4 9 2.3 9 6.8 0 1.9-2 3-4.5 3s-4.5-1.2-4.5-2.9" />
  </Base>
);

export const SendIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 3 10.5 13.5" />
    <path d="M21 3 14 21l-3.5-7.5L3 10Z" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const StarIcon = ({ filled = true, ...p }: IconProps & { filled?: boolean }) => (
  <Base {...p} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8Z" />
  </Base>
);

export const FilterIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Base>
);

export const CardIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <path d="M2.5 10h19M6 15h4" />
  </Base>
);

export const LockIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Base>
);

export const MusicNoteIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="7" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
    <path d="M10 18V5.5L20 3.5V16" />
    <path d="M10 9.5 20 7.5" />
  </Base>
);

// ------------------------------------------------------------ instruments
// Simple, recognizable line glyphs per instrument family.

export const GuitarIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m20 4-6.5 6.5" />
    <path d="M19 3.5 20.5 5" />
    <path d="M13.9 10.1a4.5 4.5 0 0 0-6.2.5c-.9 1-.9 2-1.7 2.8-.8.8-2.2.7-2.7 2.4-.5 1.6.4 3.5 1.9 4.6 1.5 1.1 3.6 1.4 4.9.2.9-.9.9-2.2 1.6-3 .7-.8 1.9-.7 2.8-1.7a4.5 4.5 0 0 0-.6-5.8Z" />
    <circle cx="8.5" cy="15.5" r="1.2" />
  </Base>
);

export const BassIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m21 3-8 8" />
    <path d="M12.6 11.4a5 5 0 0 0-6.8.4C4 13.6 4.6 15 3.8 16.4c-.6 1-1.4 2.2-.5 3.6.9 1.4 3 1.9 4.6 1.2 1.6-.6 1.8-2.2 3.2-3 1.2-.8 2.4-.5 3.6-1.9a5 5 0 0 0-2.1-4.9Z" />
    <path d="M18.5 2.5 20 4M20 2.5l1.5 1.5" />
  </Base>
);

export const DrumsIcon = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="9" rx="8" ry="3" />
    <path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9" />
    <path d="M4 12.5c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    <path d="m7 3 5 3.5M17 3l-5 3.5" />
  </Base>
);

export const KeysIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.5" y="7" width="19" height="10.5" rx="1.5" />
    <path d="M7.3 7v10.5M12 7v10.5M16.8 7v10.5" />
    <path d="M6 7v6h2.5V7M10.8 7v6h2.5V7M15.5 7v6H18V7" strokeWidth="0" fill="currentColor" opacity="0.35" />
  </Base>
);

export const VocalsIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="3" width="6" height="10" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M8.5 21h7" />
  </Base>
);

export const SaxIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 3.5c-1 0-1.7.6-1.7 1.7v8.3a5 5 0 0 1-10 0" />
    <path d="M3.3 10.5v3a6.7 6.7 0 0 0 13.4 0V5.2c0-.9.6-1.7 1.6-1.7" />
    <path d="M13.3 7h-2.5M13.3 9.5h-2.5M13.3 12h-2.5" />
  </Base>
);

export const TrumpetIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10.5h11c2.5 0 4.5-1.5 6-3v9c-1.5-1.5-3.5-3-6-3H3Z" />
    <path d="M3 9v3M8.5 13.5v3.5M11.5 13.5v3.5M14.5 13.5v3.5" />
  </Base>
);

export const ViolinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m20.5 3.5-7 7" />
    <path d="M19 2.5 21.5 5" />
    <path d="M13.7 10.3c-1.5-1-3.6-.8-4.9.5-.9.9-1 1.9-.6 2.9-1.4-.2-2.6.1-3.5 1-1.5 1.5-1.4 4 .2 5.6 1.6 1.6 4.1 1.7 5.6.2.9-.9 1.2-2.1 1-3.5 1 .4 2 .3 2.9-.6 1.3-1.3 1.5-3.4.5-4.9" />
  </Base>
);

export const SteelIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="7.5" width="18" height="6" rx="1.5" />
    <path d="M5.5 13.5v6M18.5 13.5v6M3 10.5h18" />
  </Base>
);

export const DJIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
    <rect x="2.5" y="13" width="4.5" height="7" rx="1.5" />
    <rect x="17" y="13" width="4.5" height="7" rx="1.5" />
  </Base>
);

export const SoundTechIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 4v16M12 4v16M18 4v16" />
    <rect x="4" y="8" width="4" height="3" rx="1" fill="currentColor" stroke="none" />
    <rect x="10" y="13" width="4" height="3" rx="1" fill="currentColor" stroke="none" />
    <rect x="16" y="6" width="4" height="3" rx="1" fill="currentColor" stroke="none" />
  </Base>
);

export const LightingTechIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="10" r="5" />
    <path d="M12 2v1.5M4.9 4.9l1 1M19.1 4.9l-1 1M2 10h1.5M20.5 10H22" />
    <path d="M9.5 18h5M10.5 21h3M9.8 15h4.4" />
  </Base>
);

const INSTRUMENT_ICONS: Record<InstrumentId, (p: IconProps) => ReturnType<typeof Base>> = {
  guitar: GuitarIcon,
  bass: BassIcon,
  drums: DrumsIcon,
  keys: KeysIcon,
  vocals: VocalsIcon,
  sax: SaxIcon,
  trumpet: TrumpetIcon,
  violin: ViolinIcon,
  "pedal-steel": SteelIcon,
  dj: DJIcon,
  "sound-tech": SoundTechIcon,
  "lighting-tech": LightingTechIcon,
};

export function InstrumentIcon({
  instrument,
  ...p
}: IconProps & { instrument: InstrumentId }) {
  const C = INSTRUMENT_ICONS[instrument] ?? MusicNoteIcon;
  return <C {...p} />;
}
