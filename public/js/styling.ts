/**
 * styling.ts - centralized styling utilities
 * applies consistent styling across the entire frontend
 */

import { 
  BACKGROUND_DIM, 
  GLASS_BLUR, 
  GLASS_BACKGROUND_OPACITY, 
  GLASS_BORDER_OPACITY 
} from './constants-loader.js';

/**
 * applies glass morphism effect to an element
 */
export function applyGlassEffect(element: HTMLElement): void {
  element.style.backdropFilter = `blur(${GLASS_BLUR})`;
  element.style.background = GLASS_BACKGROUND_OPACITY;
  element.style.border = `1px solid ${GLASS_BORDER_OPACITY}`;
}

/**
 * applies background dimming to an element
 */
export function applyBackgroundDim(element: HTMLElement): void {
  element.style.background = BACKGROUND_DIM;
}

/**
 * initializes styling for all homescreen glass elements
 */
export function initializeHomescreenStyling(): void {
  // wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHomescreenStyling);
  } else {
    applyHomescreenStyling();
  }
}

/**
 * creates and returns the HTML dimming overlay for menu screens
 */
export function createMenuDimmer(): HTMLElement {
  const dimmer = document.createElement('div');
  dimmer.id = 'menu-dimmer';
  dimmer.className = 'fixed inset-0 z-30 pointer-events-none';
  applyBackgroundDim(dimmer);
  return dimmer;
}

/**
 * shows the menu dimmer overlay
 */
export function showMenuDimmer(): void {
  let dimmer = document.getElementById('menu-dimmer');
  if (!dimmer) {
    dimmer = createMenuDimmer();
    document.body.appendChild(dimmer);
  }
  dimmer.style.display = 'block';
}

/**
 * hides the menu dimmer overlay
 */
export function hideMenuDimmer(): void {
  const dimmer = document.getElementById('menu-dimmer');
  if (dimmer) {
    dimmer.style.display = 'none';
  }
}

/**
 * applies centralized styling to homescreen elements
 */
function applyHomescreenStyling(): void {
  // find all elements with glass-effect class
  const glassElements = document.querySelectorAll('.glass-effect') as NodeListOf<HTMLElement>;
  
  // apply consistent glass effect to each element
  glassElements.forEach(element => {
    applyGlassEffect(element);
  });
  
  // create the menu dimmer (initially hidden)
  const dimmer = createMenuDimmer();
  dimmer.style.display = 'none';
  document.body.appendChild(dimmer);
  
  console.log(`🎨 Applied glass effects to ${glassElements.length} homescreen elements`);
} 