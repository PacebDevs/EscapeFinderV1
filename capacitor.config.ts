import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
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
  },
};

export default config;
