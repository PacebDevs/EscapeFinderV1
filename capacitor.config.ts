import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.escapefinder.app',
  appName: 'EscapeFinderV1',
  webDir: 'www',
  server: {
    // → carga la app sobre HTTP en vez de HTTPS
    androidScheme: 'http'
  },
  android: {
    // → permite peticiones HTTP y WS desde página HTTP
    allowMixedContent: true
  },
  plugins: {
    EdgeToEdge: {
      backgroundColor: "#ffffff",
    },
    App: {
      appUrlOpen: {
        enabled: true
      }
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1060771506181-mip0aj3oiaomgoebp2ajkpqtk9p4l3ca.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
};

export default config;
