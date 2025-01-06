'use client';
import React from 'react';

import { EpsSpinnerStrings } from '@/constants/ui-strings/EpsSpinnerStrings';


function Spinner({
  radius = 100,
  thickness = 12,
  fraction = 0.2, // The fraction of the hoop that is green
  speed = 1       // The speed (in seconds) for one full rotation
}) {
  const circumference = 2 * Math.PI * radius;
  
  // The portion that should appear green is defined by "fraction"
  // If fraction = 0.25, then 25% of the hoop is green and 75% is grey
  const offset = circumference * (1 - fraction);

  return (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
    <div
      className="spinner-container"
      style={{
        // Ensures the container is exactly the size of the spinner
        width: radius * 2,
        height: radius * 2,
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        style={{
          // Do NOT animate the entire SVG (so text remains static)
          overflow: 'visible',
        }}
      >
        {/* Grey base circle (non-spinning) */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - thickness / 2}
          fill="none"
          stroke="#ccc"
          strokeWidth={thickness}
        />

        {/* Spinning arc group */}
        <g
          style={{
            transformOrigin: '50% 50%',
            animation: `spin ${speed}s linear infinite`
          }}
        >
          <circle
            cx={radius}
            cy={radius}
            r={radius - thickness / 2}
            fill="none"
            stroke="green"
            strokeWidth={thickness}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </g>

        {/* "Loading..." text in the center */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="1.5rem"
        >
          {EpsSpinnerStrings.loading}
        </text>
      </svg>

      {/* Inline keyframes for the spin animation */}
      <style>
        {`
          @keyframes spin {
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
    </div>
  );
}

export default Spinner;
