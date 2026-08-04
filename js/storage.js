// ITパスポート冒険記 - 永続化(localStorage)
const Storage = (() => {
  const KEY = "itpass-adventure-save-v1";
  const SAVE_VERSION = 3;

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

      // --- コイン・ガチャ・コレクション ---
      coins: 0,
      totalCoinsEarned: 0,
      ownedItems: {},      // itemId -> 所持数(重複含む)
      unseenItems: [],     // 図鑑で未確認の新規アイテムID(NEWバッジ用)
      gachaCount: 0,
      equippedCharm: null, // お守りとして装備中のアイテムID
      avatarItemId: null,  // アバターに設定中のアイテムID
      openedChests: {},    // マップ上の宝箱マスの開封状況(chestKey -> true)
      streakChestDate: null, // 継続報酬の宝箱を受け取った日付

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
