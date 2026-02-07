import Constants from 'expo-constants';

/**
 * Returns the API base URL.
 *
 * In development on a physical device, `localhost` is unreachable because it
 * refers to the device itself. Expo's debugger host contains the dev machine's
 * LAN IP (e.g. "192.168.0.161:8081"), so we extract the hostname from it and
 * build the API URL from that. This means the correct IP is always used
 * regardless of network changes — no manual env var needed during development.
 *
 * In production (or when API_URL is explicitly set to a non-localhost value),
 * the configured value is used as-is.
 */
function getApiUrl(): string {
  const configUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  // If an explicit non-localhost URL was provided, use it directly.
  if (configUrl && !configUrl.includes('localhost')) {
    return configUrl;
  }

  // In dev, derive the URL from the Expo debugger host so physical devices
  // automatically reach the dev machine over the local network.
  if (__DEV__) {
    const debuggerHost =
      Constants.expoGoConfig?.debuggerHost ??
      (Constants as Record<string, unknown>).debuggerHost;

    if (typeof debuggerHost === 'string') {
      const hostname = debuggerHost.split(':')[0];
      return `http://${hostname}:3001`;
    }
  }

  return configUrl ?? 'http://localhost:3001';
}

export const apiUrl = getApiUrl();
