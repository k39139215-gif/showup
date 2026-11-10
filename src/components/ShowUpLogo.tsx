import React from 'react';

interface ShowUpLogoProps {
  size?: number;
  className?: string;
}

export const ShowUpLogo: React.FC<ShowUpLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(242, 106, 27, 0.35))' }}
      aria-label="ShowUp Logo"
    >
      <defs>
        <linearGradient id="showup-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF702E" />
          <stop offset="100%" stopColor="#DE4205" />
        </linearGradient>
        <linearGradient id="showup-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rounded Container */}
      <rect width="36" height="36" rx="9" fill="url(#showup-grad)" />
      <rect x="0.5" y="0.5" width="35" height="35" rx="8.5" stroke="url(#showup-glow)" strokeWidth="1" />

      {/* Dynamic S Shape */}
      <path
        d="M23.5 11.8C22 10.2 19.6 9.5 17.5 10C14.8 10.7 13.2 13 13.7 15.5C14.2 18 16.6 19.2 19 20.2C21.6 21.3 23.8 22.6 23.3 25.2C22.7 28.1 19.8 29.4 17 28.8C14.5 28.3 12.6 26.8 11.8 25"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pulse Beacon Spark */}
      <circle cx="25.5" cy="10" r="2" fill="#FFFFFF" />
    </svg>
  );
};
