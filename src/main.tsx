import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set dynamic viewport height for mobile keyboards
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.visualViewport?.addEventListener('resize', setViewportHeight);

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
                // New content available, show update notification
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

// Prevent double-tap zoom on iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// Prevent pinch zoom
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
}, { passive: false });

// Handle app visibility changes (for refreshing data when app comes to foreground)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Dispatch event to refresh data when app becomes visible
    window.dispatchEvent(new CustomEvent('app-foreground'));
  }
});

createRoot(document.getElementById("root")!).render(<App />);
