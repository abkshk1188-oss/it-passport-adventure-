// ITパスポート冒険記 - 永続化(localStorage)
const Storage = (() => {
  const KEY = "itpass-adventure-save-v1";
  const SAVE_VERSION = 2;

  function todayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function defaultState() {
    return {
      version: SAVE_VERSION,
      level: 1,
      xp: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      streak: 0,
      maxCombo: 0,
      lastPlayedDate: null,
      clearedTopics: {},   // topicKey -> { stars, bestCorrect, bestTotal, attempts }
      clearedBoss: {},     // world -> true
      wrongCounts: {},     // qid -> 間違えた回数
      correctCounts: {},   // qid -> 正解した回数
      examHistory: [],     // [{ date, mode, correct, total, percent, fields, passed, elapsedSec }]
      settings: { vibration: true },
      createdAt: todayStr(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // 新しいフィールドが増えても既存セーブを壊さないようマージする
      const merged = Object.assign(defaultState(), parsed);
      merged.settings = Object.assign(defaultState().settings, parsed.settings || {});
      merged.version = SAVE_VERSION;
      return merged;
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

  // アプリを開いた日/バトルをクリアした日ごとに1回だけ連続記録を更新する
  function touchStreak(state) {
    const today = todayStr();
    if (state.lastPlayedDate === today) return state;
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
