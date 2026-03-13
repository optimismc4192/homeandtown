import React from 'react';

export default function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 550 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(10, 10)">
        {/* Outer border */}
        <rect x="0" y="0" width="160" height="100" stroke="#22282C" strokeWidth="8" />
        
        {/* Corners */}
        <path d="M 15 30 L 15 15 L 30 15" stroke="#22282C" strokeWidth="4" fill="none" />
        <path d="M 145 30 L 145 15 L 130 15" stroke="#22282C" strokeWidth="4" fill="none" />
        <path d="M 15 70 L 15 85 L 30 85" stroke="#22282C" strokeWidth="4" fill="none" />
        <path d="M 145 70 L 145 85 L 130 85" stroke="#22282C" strokeWidth="4" fill="none" />
        
        {/* Base line */}
        <rect x="25" y="80" width="110" height="5" fill="#22282C" />
        
        {/* Left building */}
        <path d="M 40 80 L 40 50 L 55 44 L 55 80 Z" fill="#22282C" />
        
        {/* Right building */}
        <path d="M 60 80 L 60 45 L 95 31 L 120 45 L 120 80 L 105 80 L 105 55 L 85 55 L 85 80 Z" fill="#22282C" />
        
        {/* Roof */}
        <path d="M 35 45 L 100 19 L 100 26 L 40 52 Z" fill="#22282C" />
      </g>
      
      <text x="190" y="85" fontFamily="sans-serif" fontWeight="900" fontSize="68" fill="#22282C" letterSpacing="-3">
        타운앤전원
      </text>
    </svg>
  );
}
