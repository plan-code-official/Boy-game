const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://learning-platform-1euu.onrender.com/api/v1';
const API_BASE_URL = rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

let latestToken = null;

export const refreshAccessToken = async () => {
  try {
    let refreshRes = await fetch(`${API_BASE_URL}/student/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: "{}"
    });

    if (!refreshRes.ok) {
      refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: "{}"
      });
    }

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const newToken = refreshData?.data?.accessToken || refreshData?.data?.token || refreshData?.accessToken || refreshData?.token;
      if (newToken) {
        console.log("Token refreshed successfully.");
        latestToken = newToken;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('token')) urlParams.set('token', newToken);
        if (urlParams.has('accesstoken')) urlParams.set('accesstoken', newToken);
        const newUrl = window.location.pathname + '?' + urlParams.toString();
        window.history.replaceState(null, '', newUrl);

        return newToken;
      }
    } else {
      console.error("Token refresh failed on both endpoints with status", refreshRes.status);
    }
  } catch (err) {
    console.error("Error during token refresh", err);
  }
  return null;
};

const apiFetch = async (url, options = {}, initialToken = null) => {
  if (!latestToken && initialToken) {
    latestToken = initialToken;
  }
  if (!latestToken && !initialToken) {
    await refreshAccessToken();
  }

  const currentToken = latestToken || initialToken;
  const fetchOptions = { ...options };
  if (currentToken) {
    fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${currentToken}` };
  }

  let res = await fetch(url, fetchOptions);

  if (res.status === 401) {
    console.warn("401 Unauthorized encountered. Attempting to refresh token...");
    const newToken = await refreshAccessToken();
    if (newToken) {
      fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${newToken}` };
      res = await fetch(url, fetchOptions);
    }
  }
  
  return res;
};

export class GameAPI {
  constructor(token) {
    this.initialToken = token;
    if (!token && !latestToken) {
      refreshAccessToken();
    }
  }

  async request(endpoint, options = {}) {
    const response = await apiFetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }, this.initialToken);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API request failed' }));
      throw new Error(error.message || 'API request failed');
    }

    const data = await response.json();
    return data.data || data;
  }

  async getQuestions(gameId, lessonId) {
    const endpoint = lessonId 
      ? `/student/games/${gameId}/questions?lessonId=${lessonId}`
      : `/student/games/${gameId}/questions`;
    return this.request(endpoint);
  }

  async startSession(gameId, lessonId) {
    const endpoint = lessonId 
      ? `/student/games/${gameId}/sessions?lessonId=${lessonId}`
      : `/student/games/${gameId}/sessions`;
    return this.request(endpoint, {
      method: 'POST',
    });
  }

  async submitAnswers(sessionId, answers) {
    return this.request(`/student/games/sessions/${sessionId}/submit-answers`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  async completeSession(sessionId) {
    return this.request(`/student/games/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  }
}

export const BOY_GAME_ID = 4;

// Helper function to convert Arabic word to letters (removing diacritics)
export function wordToLetters(word) {
  // Remove Arabic diacritics (Tashkeel)
  const diacritics = /[\u064B-\u065F\u0670]/g;
  const cleanWord = word.replace(diacritics, '');
  
  // Split into individual characters
  return Array.from(cleanWord);
}
