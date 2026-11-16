/**
 * Environment detection for GitHub Preview vs Local Desktop / Live mode
 */
export const isPreviewEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  const search = window.location.search;
  if (search.includes('live=true')) return false;
  if (search.includes('demo=true')) return true;
  return window.location.hostname.includes('github.io');
};
