import React from 'react';

export default function CodalooLogo({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="codaloo-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6EE7B7" />
          <stop offset="0.5" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#codaloo-gradient)" />
      <path
        d="M44 32c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12c2.21 0 4.28.6 6.04 1.65"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="20" r="4" fill="#fff" />
    </svg>
  );
} 