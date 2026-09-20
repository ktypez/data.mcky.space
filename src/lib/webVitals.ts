// Web Vitals reporting utility
// Sends LCP, FID, CLS, INP, TTFB, andFCP to analytics endpoint

import { onCLS, onFID, onLCP, onTTFB, onFCP, onINP } from 'web-vitals';

// Helper to send data to analytics
const sendToAnalytics = (data: {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
}) => {
  // Custom implementation based on your analytics setup
  // For now, just log to console in dev
  if (import.meta.env.DEV) {
    console.log(`Web Vitals: ${data.name} = ${data.value} (${data.rating})`);
  }
  
  // Example: send to your analytics endpoint
  // navigator.sendBeacon('/api/vitals', JSON.stringify(data));
};

export function getWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onFCP(sendToAnalytics);
  onINP(sendToAnalytics);
  
  return null;
}
