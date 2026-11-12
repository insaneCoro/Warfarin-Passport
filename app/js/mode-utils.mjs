/** The shared authenticated workspace is primary; explicit demo mode stays isolated. */
export function usesConnectedApi(enabled, search = '') {
  return enabled === true && new URLSearchParams(search).get('mode') !== 'demo';
}
