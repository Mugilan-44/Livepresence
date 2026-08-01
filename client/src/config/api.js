const RENDER_BACKEND_URL = 'https://prolynclivepresence.onrender.com';

export const API_BASE = (import.meta.env.VITE_API_URL || '').trim() || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? ''
    : RENDER_BACKEND_URL
);

export function getApiUrl(path) {
  if (!path) return API_BASE || RENDER_BACKEND_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE || RENDER_BACKEND_URL;
  return `${base}${cleanPath}`;
}
