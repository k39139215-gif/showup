import React from 'react';

interface ShowUpLogoProps {
  size?: number;
  className?: string;
}

export const ShowUpLogo: React.FC<ShowUpLogoProps> = ({ size = 32, className = '' }) => {
  const radius = Math.round(size * 0.25);
  return (
    <div
      className={`shrink-0 inline-flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: `${radius}px`,
        background: 'linear-gradient(135deg, #FF702E 0%, #DE4205 100%)',
        boxShadow: '0 2px 6px rgba(222, 66, 5, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      }}
      aria-label="ShowUp Logo"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full pointer-events-none"
      >
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
    </div>
  );
};
