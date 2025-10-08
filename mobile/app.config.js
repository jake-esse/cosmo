/**
 * Expo app configuration
 * This JavaScript config allows us to load environment variables from root .env.local
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from root .env.local
const rootEnvPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    // Skip comments and empty lines
    if (line.trim() && !line.trim().startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      // Only set EXPO_PUBLIC_ variables for client access
      if (key.trim().startsWith('EXPO_PUBLIC_')) {
        process.env[key.trim()] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  });
  console.log('✅ Loaded environment variables from root .env.local');
} else {
  console.warn('⚠️  Root .env.local not found at:', rootEnvPath);
}

module.exports = {
  expo: {
    name: 'Ampel',
    slug: 'ampel-mobile',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'ampel',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#6366F1',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.ampel.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#6366F1',
      },
      package: 'app.ampel.mobile',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'ampel',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: 'ampel-mobile',
      },
    },
    plugins: ['expo-secure-store'],
  },
};
