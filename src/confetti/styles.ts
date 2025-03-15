import React from 'react';
import round from 'lodash/round';
import { coinFlip, mapRange, rotate, rotationTransforms, shouldBeCircle } from './utils';

const ROTATION_SPEED_MIN = 200; // minimum possible duration of single particle full rotation
const ROTATION_SPEED_MAX = 800; // maximum possible duration of single particle full rotation
const CRAZY_PARTICLES_FREQUENCY = 0.1; // 0-1 frequency of crazy curvy unpredictable particles
const CRAZY_PARTICLE_CRAZINESS = 0.25; // 0-1 how crazy these crazy particles are
const BEZIER_MEDIAN = 0.5; // utility for mid-point bezier curves, to ensure smooth motion paths

export interface IStyleClasses {
  container: string;
  screen: string;
  particle: string;
}

export interface IParticle {
  color: string; // color of particle
  degree: number; // vector direction, between 0-360 (0 being straight up ↑)
}

interface IParticlesProps {
  particles: IParticle[];
  duration: number;
  particleSize: number;
  force: number;
  height: number | string;
  width: number;
}

// Create a unique ID for each confetti instance
const generateInstanceId = (() => {
  let count = 0;
  return () => `${count++}`;
})();

// Create a function to generate the CSS keyframes and styles
const generateStyles = (instanceId: string, { particles, duration, height, width, force, particleSize }: IParticlesProps) => {
  // Create rotation keyframes
  const rotationKeyframesRules = rotationTransforms.map((xyz, i) => {
    return `
      @keyframes rotation-${instanceId}-${i} {
        50% {
          transform: rotate3d(${xyz.map(v => v / 2).join()}, 180deg);
        }
        100% {
          transform: rotate3d(${xyz.join()}, 360deg);
        }
      }
    `;
  }).join('\n');

  // Create confetti keyframes
  const y = typeof height === 'string' ? height : `${height}px`;
  const yAxisKeyframe = `
    @keyframes y-axis-${instanceId} {
      to {
        transform: translateY(${y});
      }
    }
  `;

  const xAxisKeyframes = particles.map((particle, i) => {
    const landingPoint = mapRange(
      Math.abs(rotate(particle.degree, 90) - 180),
      0,
      180,
      -width / 2,
      width / 2
    );
    
    return `
      @keyframes x-axis-${instanceId}-${i} {
        to {
          transform: translateX(${landingPoint}px);
        }
      }
    `;
  }).join('\n');

  // Create particle styles
  const particleStyles = particles.map((particle, i) => {
    const rotation = Math.round(Math.random() * (ROTATION_SPEED_MAX - ROTATION_SPEED_MIN) + ROTATION_SPEED_MIN);
    const rotationIndex = Math.round(Math.random() * (rotationTransforms.length - 1));
    const durationChaos = duration - Math.round(Math.random() * 1000);
    const shouldBeCrazy = Math.random() < CRAZY_PARTICLES_FREQUENCY;
    const isCircle = shouldBeCircle(rotationIndex);

    // x-axis disturbance
    const x1 = shouldBeCrazy ? round(Math.random() * CRAZY_PARTICLE_CRAZINESS, 2) : 0;
    const x2 = x1 * -1;
    const x3 = x1;
    const x4 = round(Math.abs(mapRange(Math.abs(rotate(particle.degree, 90) - 180), 0, 180, -1, 1)), 4);

    // y-axis parameters
    const y1 = round(Math.random() * BEZIER_MEDIAN, 4);
    const y2 = round(Math.random() * force * (coinFlip() ? 1 : -1), 4);
    const y3 = BEZIER_MEDIAN;
    const y4 = round(Math.max(mapRange(Math.abs(particle.degree - 180), 0, 180, force, -force), 0), 4);

    return `
      .confetti-explosion-particle-${instanceId}-${i} {
        animation: x-axis-${instanceId}-${i} ${durationChaos}ms forwards cubic-bezier(${x1}, ${x2}, ${x3}, ${x4});
      }
      
      .confetti-explosion-particle-${instanceId}-${i} > div {
        width: ${isCircle ? particleSize : Math.round(Math.random() * 4) + particleSize / 2}px;
        height: ${isCircle ? particleSize : Math.round(Math.random() * 2) + particleSize}px;
        animation: y-axis-${instanceId} ${durationChaos}ms forwards cubic-bezier(${y1}, ${y2}, ${y3}, ${y4});
      }
      
      .confetti-explosion-particle-${instanceId}-${i} > div:after {
        background-color: ${particle.color};
        animation: rotation-${instanceId}-${rotationIndex} ${rotation}ms infinite linear;
        ${isCircle ? 'border-radius: 50%;' : ''}
      }
    `;
  }).join('\n');

  // Create base styles
  const baseStyles = `
    .confetti-explosion-container-${instanceId} {
      width: 0;
      height: 0;
      position: relative;
    }
    
    .confetti-explosion-screen-${instanceId} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      pointer-events: none;
    }
    
    .confetti-explosion-particle-${instanceId} > div {
      position: absolute;
      left: 0;
      top: 0;
    }
    
    .confetti-explosion-particle-${instanceId} > div:after {
      content: '';
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  // Combine all styles
  return `
    ${rotationKeyframesRules}
    ${yAxisKeyframe}
    ${xAxisKeyframes}
    ${baseStyles}
    ${particleStyles}
  `;
};

// Function to append styles to document head
const appendStyles = (styles: string, id: string) => {
  const styleElement = document.createElement('style');
  styleElement.id = id;
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  return styleElement;
};

// Main hook to replace useStyles
const useConfettiStyles = (props: IParticlesProps) => {
  const instanceIdRef = React.useRef(generateInstanceId());
  const instanceId = instanceIdRef.current;
  
  React.useEffect(() => {
    const styleId = `confetti-style-${instanceId}`;
    const styleElement = appendStyles(generateStyles(instanceId, props), styleId);
    
    return () => {
      // Clean up only this instance's style element when component unmounts
      const elementToRemove = document.getElementById(styleId);
      if (elementToRemove) {
        document.head.removeChild(elementToRemove);
      }
    };
  }, [props.particles, props.duration, props.height, props.width, props.force, props.particleSize, instanceId]);

  return {
    container: `confetti-explosion-container-${instanceId}`,
    screen: `confetti-explosion-screen-${instanceId}`,
    particle: (index: number) => `confetti-explosion-particle-${instanceId} confetti-explosion-particle-${instanceId}-${index}`,
  };
};

export default useConfettiStyles;
