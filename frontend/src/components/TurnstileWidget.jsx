import React, { useEffect, useRef, useState } from 'react';

const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile could not load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = scriptUrl; script.async = true; script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('Turnstile could not load.'));
    document.head.appendChild(script);
  });
}

export default function TurnstileWidget({ onToken, resetKey = 0, enabled = true }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const container = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !siteKey || !container.current) return undefined;
    let active = true;
    onToken(''); setError('');
    loadTurnstile().then((turnstile) => {
      if (!active || !turnstile || !container.current) return;
      container.current.replaceChildren();
      turnstile.render(container.current, {
        sitekey: siteKey,
        action: 'login',
        theme: 'light',
        size: 'flexible',
        callback: token => active && onToken(token),
        'expired-callback': () => active && onToken(''),
        'error-callback': () => { if (active) { onToken(''); setError('Security check could not load. Please refresh and try again.'); } }
      });
    }).catch(() => active && setError('Security check could not load. Please refresh and try again.'));
    return () => { active = false; };
  }, [siteKey, resetKey, onToken, enabled]);

  if (!enabled || !siteKey) return null;
  return <div className="mt-5"><div ref={container} className="min-h-[65px]" />{error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}</div>;
}
