export type Config = {
  key: string; voice: string; liveEnabled: boolean; timeoutMs: number; host: string; port: number;
  dataDir: string; manifestPath: string; webDir: string;
};
export function readConfig(): Config {
  const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS ?? 20000);
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '127.0.0.1';
  if (host !== '127.0.0.1' && host !== '::1') throw new Error('HOST must be a loopback address.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error('Invalid PROVIDER_TIMEOUT_MS.');
  return {
    key: process.env.FISH_API_KEY?.trim() ?? '', voice: process.env.FISH_VOICE_ID?.trim() ?? '',
    liveEnabled: process.env.LIVE_GENERATION_ENABLED === 'true', timeoutMs, host, port,
    dataDir: 'data', manifestPath: 'content/prepared-manifest.json', webDir: 'dist',
  };
}
