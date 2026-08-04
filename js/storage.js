// ITパスポート冒険記 - 永続化(localStorage)
const Storage = (() => {
  const KEY = "itpass-adventure-save-v1";

  function todayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function defaultState() {
    return {
      version: 1,
      level: 1,
      xp: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      streak: 0,
      lastPlayedDate: null,
      clearedTopics: {},   // topicKey -> { stars, bestCorrect, bestTotal, attempts }
      clearedBoss: {},     // world -> true
      wrongCounts: {},     // qid -> number of times answered incorrectly
      correctCounts: {},   // qid -> number of times answered correctly
      createdAt: todayStr(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // shallow-merge to survive future added fields
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      console.warn("save data corrupted, starting fresh", e);
      return defaultState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("failed to save", e);
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
    return defaultState();
  }

  // Call once per app-open (or once per battle-clear) to update the daily streak.
  function touchStreak(state) {
    const today = todayStr();
    if (state.lastPlayedDate === today) {
      return state; // already counted today
    }
    if (state.lastPlayedDate) {
      const prev = new Date(state.lastPlayedDate);
      const cur = new Date(today);
      const diffDays = Math.round((cur - prev) / 86400000);
      state.streak = diffDays === 1 ? state.streak + 1 : 1;
    } else {
      state.streak = 1;
    }
    state.lastPlayedDate = today;
    return state;
  }

  return { load, save, reset, defaultState, todayStr, touchStreak };
})();
