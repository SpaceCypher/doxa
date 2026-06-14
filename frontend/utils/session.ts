export const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'server';
  let sessionId = localStorage.getItem('doxa_session_id');
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('doxa_session_id', sessionId);
  }
  return sessionId;
};
