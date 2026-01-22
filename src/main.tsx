import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debounced viewport height setter to prevent forced reflows
let resizeTimeout: number | null = null;
const setViewportHeight = () => {
  if (resizeTimeout) {
    cancelAnimationFrame(resizeTimeout);
  }
  resizeTimeout = requestAnimationFrame(() => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  });
};

// Initial set with RAF to avoid blocking
requestAnimationFrame(setViewportHeight);

// Debounced resize listener
let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
const handleResize = () => {
  if (resizeDebounce) clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(setViewportHeight, 100);
};

window.addEventListener('resize', handleResize, { passive: true });
window.visualViewport?.addEventListener('resize', handleResize, { passive: true });

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('PWA: Service Worker registered successfully', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('PWA: New content available, please refresh');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('PWA: Service Worker registration failed:', error);
      });
  });
}

// Prevent double-tap zoom on iOS (passive for performance)
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// Handle app visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    window.dispatchEvent(new CustomEvent('app-foreground'));
  }
}, { passive: true });

createRoot(document.getElementById("root")!).render(<App />);
