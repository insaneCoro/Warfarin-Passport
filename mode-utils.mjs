/** Demo is the default. Connected mode still requires server authentication. */
export function usesConnectedApi(enabled, search='') {
  return enabled === true && new URLSearchParams(search).get('mode') === 'connected';
}
