import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ampel.ai',
  appName: 'Ampel',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  }
};

export default config;
