// Web Vitals reporting utility
// Sends LCP, CLS, INP, TTFB, FCP to analytics endpoint
// Note: FID (First Input Delay) was deprecated in v5, replaced by INP

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

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
  onFCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  
  return null;
}
