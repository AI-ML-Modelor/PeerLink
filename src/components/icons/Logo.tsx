
import type { SVGProps } from 'react';

export function PeerLinkLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="100"
      height="25"
      aria-label="PeerLink Logo"
      className="fill-current"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <text
        x="10"
        y="35"
        fontFamily="Space Grotesk, sans-serif"
        fontSize="30"
        fontWeight="bold"
        fill="url(#logoGradient)"
      >
        PeerLink
      </text>
      {/* Simple icon: two overlapping speech bubbles or connecting lines */}
      <path d="M150 15 Q155 10 160 15 Q165 20 160 25 L150 25 Z" fill="hsl(var(--primary))" />
      <path d="M160 25 Q165 30 170 25 Q175 20 170 15 L160 15 Z" fill="hsl(var(--accent))" />
    </svg>
  );
}
