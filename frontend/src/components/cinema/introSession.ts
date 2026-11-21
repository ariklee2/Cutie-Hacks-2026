/**
 * The intro plays once per browser session. Kept in a plain module (not a
 * 'use client' file) so the server layout can read these values too.
 */
export const INTRO_SEEN_KEY = 'snapshot-intro-seen';
export const INTRO_SEEN_ATTR = 'data-intro-seen';

/**
 * Inline script for <head>: marks <html> before first paint when the intro
 * has already played this session, so CSS hides it without a flash.
 */
export const introSeenScript = `try{if(sessionStorage.getItem('${INTRO_SEEN_KEY}'))document.documentElement.setAttribute('${INTRO_SEEN_ATTR}','')}catch(e){}`;

export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // Storage blocked (private mode etc.): the intro just plays again next load.
  }
}
