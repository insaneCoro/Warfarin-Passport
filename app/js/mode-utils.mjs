/**
 * The app always uses the shared, signed-in clinic workspace. The local fictional demo mode
 * (?mode=demo) only works when the app runs on this computer (localhost), where the automated
 * browser tests use it; it is switched off on the published website.
 */
export function usesConnectedApi(enabled, search = '', hostname = globalThis.location?.hostname || '') {
  const local = ['localhost', '127.0.0.1', ''].includes(hostname);
  return enabled === true && !(local && new URLSearchParams(search).get('mode') === 'demo');
}
