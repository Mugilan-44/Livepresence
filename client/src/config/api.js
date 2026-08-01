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

export function calculateDynamicProfileScore(user, documents = []) {
  if (!user) return 0;
  
  // Base profile details completion (25%)
  let baseScore = 0;
  if (user.name && user.email) baseScore += 10;
  if (user.phone && user.designation) baseScore += 10;
  if (user.department && user.branch) baseScore += 5;
  
  const userDocs = documents.filter(d => d.user_id === user.id || d.user_id === user.employee_id);

  const getItemStatus = (typeKeywords) => {
    const doc = userDocs.find(d => typeKeywords.some(k => (d.document_type || '').toLowerCase().includes(k)));
    if (!doc) return false;
    const s = (doc.status || '').toLowerCase();
    return s.includes('approve') || s.includes('verified');
  };

  const aadhaar = getItemStatus(['aadhaar', 'identity']);
  const pan = getItemStatus(['pan']);
  const mark10 = getItemStatus(['10th']);
  const mark12 = getItemStatus(['12th']);
  const passport = getItemStatus(['passport', 'license']);
  const bank = getItemStatus(['bank', 'cheque']);

  const verifiedCount = [aadhaar, pan, mark10, mark12, passport, bank].filter(Boolean).length;
  const docScore = Math.round((verifiedCount / 6) * 75);

  return Math.min(100, baseScore + docScore);
}
