import React from 'react';

interface SmartHomeIconProps {
  className?: string;
}

const SmartHomeIcon: React.FC<SmartHomeIconProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Smartphone Frame */}
      <rect
        x="25"
        y="10"
        width="50"
        height="80"
        rx="8"
        ry="8"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      
      {/* Smartphone Top Bar */}
      <rect
        x="30"
        y="15"
        width="40"
        height="4"
        rx="2"
        fill="currentColor"
      />
      
      {/* Smartphone Bottom Button */}
      <rect
        x="45"
        y="82"
        width="10"
        height="3"
        rx="1.5"
        fill="currentColor"
      />
      
      {/* House Shape */}
      <path
        d="M35 45 L50 35 L65 45 L65 65 L35 65 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      
      {/* House Roof */}
      <path
        d="M32 45 L50 30 L68 45"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Wi-Fi Signals inside house */}
      <path
        d="M42 52 Q50 48 58 52"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M45 55 Q50 52 55 55"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="58"
        r="1.5"
        fill="currentColor"
      />
      
      {/* Connection Lines and Dots */}
      <circle cx="15" cy="30" r="2" fill="currentColor" />
      <line x1="17" y1="30" x2="25" y2="35" stroke="currentColor" strokeWidth="2" />
      
      <circle cx="85" cy="40" r="2" fill="currentColor" />
      <line x1="83" y1="40" x2="75" y2="42" stroke="currentColor" strokeWidth="2" />
      
      <circle cx="10" cy="70" r="2" fill="currentColor" />
      <line x1="12" y1="70" x2="25" y2="75" stroke="currentColor" strokeWidth="2" />
      
      <circle cx="90" cy="75" r="2" fill="currentColor" />
      <line x1="88" y1="75" x2="75" y2="78" stroke="currentColor" strokeWidth="2" />
      
      {/* Additional connecting lines */}
      <line x1="50" y1="25" x2="50" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <line x1="25" y1="50" x2="10" y2="50" stroke="currentColor" strokeWidth="1.5" />
      <line x1="75" y1="60" x2="90" y2="60" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};

export default SmartHomeIcon;