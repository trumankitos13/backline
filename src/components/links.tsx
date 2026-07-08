// External-links row — renders an object's `links[]` as tappable pills. Every
// object (Player/Band/Venue/Event) can link out to where it already lives
// online. Brand-neutral (labels + an arrow), so no trademark logos needed.

import type { ExternalLink, LinkKind } from "../lib/types";
import { SectionHeader } from "./ui";

const LINK_LABEL: Record<LinkKind, string> = {
  website: "Website",
  spotify: "Spotify",
  "apple-music": "Apple Music",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  bandsintown: "Bandsintown",
  x: "X",
};

function ArrowUpRight({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function LinksRow({
  links,
  className = "",
}: {
  links?: ExternalLink[];
  className?: string;
}) {
  if (!links || links.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((l, i) => (
        <a
          key={i}
          href={l.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-surface-800 px-3 py-1.5 text-xs font-medium text-text-mid transition-colors hover:border-text-faint hover:text-text-hi"
        >
          {l.label ?? LINK_LABEL[l.kind]}
          <span className="text-text-lo">
            <ArrowUpRight />
          </span>
        </a>
      ))}
    </div>
  );
}

/** links row with a mono "LINKS" section header — for profile pages. */
export function LinksSection({
  links,
  title = "Links",
  className = "",
}: {
  links?: ExternalLink[];
  title?: string;
  className?: string;
}) {
  if (!links || links.length === 0) return null;
  return (
    <section className={className}>
      <SectionHeader title={title} className="mb-3" />
      <LinksRow links={links} />
    </section>
  );
}
