// ITパスポート冒険記 - ゲームロジック(RPG成長 + すごろくマップ + 模擬試験)
const Game = (() => {
  const QUESTIONS_PER_NODE = 6;
  const QUESTIONS_PER_BOSS = 10;
  const REVIEW_MAX = 10;

  // 本番のITパスポート試験は100問/120分、
  // 総合600点以上かつ3分野すべて300点以上(=総合60%・各分野30%)で合格。
  const EXAM_MODES = {
    full: {
      key: "full",
      label: "本番形式",
      total: 100,
      minutes: 120,
      dist: { strategy: 35, management: 20, technology: 45 },
    },
    mini: {
      key: "mini",
      label: "短縮版",
      total: 50,
      minutes: 60,
      dist: { strategy: 18, management: 10, technology: 22 },
    },
  };
  const EXAM_PASS_OVERALL = 0.6;
  const EXAM_PASS_FIELD = 0.3;

  const AVATAR_TIERS = [
    { min: 1, max: 2, emoji: "🥚", title: "ITの卵" },
    { min: 3, max: 5, emoji: "🐣", title: "IT見習い" },
    { min: 6, max: 9, emoji: "🐥", title: "ITアシスタント" },
    { min: 10, max: 14, emoji: "🧑‍💻", title: "ITナビゲーター" },
    { min: 15, max: 19, emoji: "🦸", title: "ITエキスパート" },
    { min: 20, max: 24, emoji: "🧙", title: "ITマスター" },
    { min: 25, max: Infinity, emoji: "🐉", title: "ITパスポート賢者" },
  ];

  function xpNeeded(level) {
    return 40 + (level - 1) * 20;
  }

  function getCharacterInfo(state) {
    const tier = AVATAR_TIERS.find(t => state.level >= t.min && state.level <= t.max) || AVATAR_TIERS[0];
    const need = xpNeeded(state.level);
    return {
      level: state.level,
      xp: state.xp,
      xpNeeded: need,
      xpPercent: Math.min(100, Math.round((state.xp / need) * 100)),
      emoji: tier.emoji,
      title: tier.title,
      streak: state.streak,
      maxCombo: state.maxCombo || 0,
      totalCorrect: state.totalCorrect,
      totalAnswered: state.totalAnswered,
      accuracy: state.totalAnswered ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0,
    };
  }

  // XPを加算しレベルアップを処理する(複数レベル上がる場合にも対応)
  function addXp(state, amount) {
    state.xp += amount;
    let levelsGained = 0;
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
      levelsGained += 1;
    }
    return { leveledUp: levelsGained > 0, levelsGained, newLevel: state.level };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 重み付き非復元抽出(Efraimidis-Spirakis)。間違えた問題ほど出やすくする。
  function weightedSample(pool, weightFn, n) {
    const keyed = pool.map(item => ({ item, key: Math.pow(Math.random(), 1 / Math.max(weightFn(item), 0.01)) }));
    keyed.sort((a, b) => b.key - a.key);
    return keyed.slice(0, n).map(k => k.item);
  }

  function worldKeys() {
    return Object.keys(WORLD_META).sort((a, b) => WORLD_META[a].order - WORLD_META[b].order);
  }

  // すごろくマップを構築する。各ワールドはトピックノードの列 + 末尾のボスノード。
  function getMapData(state) {
    const worlds = worldKeys();
    let prevWorldBossCleared = true; // 最初のワールドは常に解放
    return worlds.map(worldKey => {
      const topics = TOPIC_ORDER[worldKey];
      let prevCleared = prevWorldBossCleared;
      const nodes = topics.map((topicKey, idx) => {
        const progress = state.clearedTopics[topicKey];
        const cleared = !!(progress && progress.stars > 0);
        const node = {
          type: "topic",
          world: worldKey,
          topic: topicKey,
          label: TOPIC_LABELS[topicKey],
          index: idx,
          unlocked: prevCleared,
          cleared,
          stars: progress ? progress.stars : 0,
        };
        prevCleared = cleared;
        return node;
      });
      const allTopicsCleared = nodes.every(n => n.cleared);
      const bossCleared = !!state.clearedBoss[worldKey];
      nodes.push({
        type: "boss",
        world: worldKey,
        topic: null,
        label: `${WORLD_META[worldKey].label} ボス`,
        index: nodes.length,
        unlocked: allTopicsCleared,
        cleared: bossCleared,
        stars: bossCleared ? 3 : 0,
      });
      const worldUnlocked = prevWorldBossCleared;
      prevWorldBossCleared = bossCleared;
      return {
        world: worldKey,
        label: WORLD_META[worldKey].label,
        color: WORLD_META[worldKey].color,
        unlocked: worldUnlocked,
        bossCleared,
        clearedCount: nodes.filter(n => n.type === "topic" && n.cleared).length,
        topicCount: nodes.filter(n => n.type === "topic").length,
        nodes,
      };
    });
  }

  function questionsForTopic(topicKey) {
    return QUESTIONS.filter(q => q.topic === topicKey);
  }

  function questionsForWorld(worldKey) {
    return QUESTIONS.filter(q => q.field === worldKey);
  }

  function netWrongWeight(state, q) {
    const wrong = state.wrongCounts[q.id] || 0;
    const correct = state.correctCounts[q.id] || 0;
    return 1 + Math.max(0, wrong - correct) * 1.5;
  }

  // 選択肢の並びを実行時にシャッフルする。解説も同じ並びに追従させる。
  function withShuffledChoices(q) {
    const order = shuffle(q.choices.map((_, i) => i));
    const choices = order.map(i => q.choices[i]);
    const answer = order.indexOf(q.answer);
    const choiceExplains = q.choiceExplains ? order.map(i => q.choiceExplains[i] || "") : null;
    return { ...q, choices, answer, choiceExplains };
  }

  function startTopicBattle(state, topicKey) {
    const pool = questionsForTopic(topicKey);
    const n = Math.min(QUESTIONS_PER_NODE, pool.length);
    const picked = weightedSample(pool, q => netWrongWeight(state, q), n);
    return shuffle(picked).map(withShuffledChoices);
  }

  function startBossBattle(state, worldKey) {
    const pool = questionsForWorld(worldKey);
    const n = Math.min(QUESTIONS_PER_BOSS, pool.length);
    const picked = weightedSample(pool, q => netWrongWeight(state, q), n);
    return shuffle(picked).map(withShuffledChoices);
  }

  function startReviewBattle(state) {
    const attempted = QUESTIONS.filter(q => (state.wrongCounts[q.id] || 0) > 0);
    const sorted = attempted.sort((a, b) => (state.wrongCounts[b.id] || 0) - (state.wrongCounts[a.id] || 0));
    return shuffle(sorted.slice(0, REVIEW_MAX)).map(withShuffledChoices);
  }

  // 模擬試験。本番の分野別出題数に近い比率でランダムに抽出する(苦手重み付けはしない)。
  function startExam(modeKey) {
    const mode = EXAM_MODES[modeKey] || EXAM_MODES.full;
    let picked = [];
    Object.keys(mode.dist).forEach(field => {
      const pool = questionsForWorld(field);
      const want = Math.min(mode.dist[field], pool.length);
      picked = picked.concat(shuffle(pool).slice(0, want));
    });
    return shuffle(picked).map(withShuffledChoices);
  }

  function getExamModes() {
    return EXAM_MODES;
  }

  function recordAnswers(state, results) {
    results.forEach(r => {
      if (r.correct) {
        state.correctCounts[r.id] = (state.correctCounts[r.id] || 0) + 1;
        state.totalCorrect += 1;
      } else {
        state.wrongCounts[r.id] = (state.wrongCounts[r.id] || 0) + 1;
      }
      state.totalAnswered += 1;
    });
  }

  function starsForRatio(ratio) {
    if (ratio >= 0.999) return 3;
    if (ratio >= 0.8) return 2;
    if (ratio >= 0.6) return 1;
    return 0;
  }

  function updateMaxCombo(state, combo) {
    if (combo > (state.maxCombo || 0)) state.maxCombo = combo;
  }

  // results: [{id, correct}]
  function finishTopicBattle(state, topicKey, results, maxCombo) {
    recordAnswers(state, results);
    updateMaxCombo(state, maxCombo || 0);

    const correctCount = results.filter(r => r.correct).length;
    const ratio = correctCount / results.length;
    const stars = starsForRatio(ratio);
    const prev = state.clearedTopics[topicKey];
    const isFirstClear = stars > 0 && !(prev && prev.stars > 0);
    const improved = !prev || stars > prev.stars;

    if (improved) {
      state.clearedTopics[topicKey] = {
        stars,
        bestCorrect: correctCount,
        bestTotal: results.length,
        attempts: (prev ? prev.attempts : 0) + 1,
      };
    } else if (prev) {
      prev.attempts += 1;
    }

    let xpGained = correctCount * 10;
    if (isFirstClear) xpGained += 20;
    if (ratio === 1) xpGained += 15;

    const levelResult = addXp(state, xpGained);
    Storage.touchStreak(state);
    Storage.save(state);

    return { correctCount, total: results.length, ratio, stars, cleared: stars > 0, isFirstClear, xpGained, ...levelResult };
  }

  function finishBossBattle(state, worldKey, results, maxCombo) {
    recordAnswers(state, results);
    updateMaxCombo(state, maxCombo || 0);

    const correctCount = results.filter(r => r.correct).length;
    const ratio = correctCount / results.length;
    const cleared = ratio >= 0.7;
    const wasAlreadyCleared = !!state.clearedBoss[worldKey];
    if (cleared) state.clearedBoss[worldKey] = true;

    let xpGained = correctCount * 12;
    if (cleared && !wasAlreadyCleared) xpGained += 60;
    if (ratio === 1) xpGained += 30;

    const levelResult = addXp(state, xpGained);
    Storage.touchStreak(state);
    Storage.save(state);

    return { correctCount, total: results.length, ratio, cleared, isFirstClear: cleared && !wasAlreadyCleared, xpGained, ...levelResult };
  }

  function finishReviewBattle(state, results, maxCombo) {
    // 復習は解放条件に影響しない。XP獲得と苦手カウントの解消が目的。
    results.forEach(r => {
      if (r.correct) {
        state.correctCounts[r.id] = (state.correctCounts[r.id] || 0) + 1;
        state.totalCorrect += 1;
        state.wrongCounts[r.id] = Math.max(0, (state.wrongCounts[r.id] || 0) - 1);
      } else {
        state.wrongCounts[r.id] = (state.wrongCounts[r.id] || 0) + 1;
      }
      state.totalAnswered += 1;
    });
    updateMaxCombo(state, maxCombo || 0);

    const correctCount = results.filter(r => r.correct).length;
    const xpGained = correctCount * 8;
    const levelResult = addXp(state, xpGained);
    Storage.touchStreak(state);
    Storage.save(state);
    return { correctCount, total: results.length, xpGained, ...levelResult };
  }

  // results: [{id, field, correct}] 未回答は correct:false として渡す
  function finishExam(state, modeKey, results, elapsedSec) {
    const mode = EXAM_MODES[modeKey] || EXAM_MODES.full;
    recordAnswers(state, results);

    const correctCount = results.filter(r => r.correct).length;
    const percent = results.length ? correctCount / results.length : 0;

    const fields = {};
    worldKeys().forEach(f => {
      const inField = results.filter(r => r.field === f);
      const c = inField.filter(r => r.correct).length;
      fields[f] = {
        correct: c,
        total: inField.length,
        percent: inField.length ? c / inField.length : 0,
        passed: inField.length ? c / inField.length >= EXAM_PASS_FIELD : true,
      };
    });

    const passed = percent >= EXAM_PASS_OVERALL && Object.values(fields).every(f => f.passed);

    let xpGained = correctCount * 5;
    if (passed) xpGained += 100;
    const levelResult = addXp(state, xpGained);

    state.examHistory.unshift({
      date: Storage.todayStr(),
      mode: mode.key,
      modeLabel: mode.label,
      correct: correctCount,
      total: results.length,
      percent,
      fields,
      passed,
      elapsedSec,
    });
    state.examHistory = state.examHistory.slice(0, 30); // 直近30件だけ保持

    Storage.touchStreak(state);
    Storage.save(state);

    return { correctCount, total: results.length, percent, fields, passed, xpGained, elapsedSec, mode, ...levelResult };
  }

  function weakTopicSummary(state) {
    return Object.keys(state.clearedTopics)
      .map(topicKey => ({ topicKey, label: TOPIC_LABELS[topicKey], ...state.clearedTopics[topicKey] }))
      .sort((a, b) => a.stars - b.stars || b.attempts - a.attempts);
  }

  // 分野別の正答率(これまでの累計)
  function fieldAccuracy(state) {
    return worldKeys().map(field => {
      const qs = questionsForWorld(field);
      let correct = 0, answered = 0;
      qs.forEach(q => {
        const c = state.correctCounts[q.id] || 0;
        const w = state.wrongCounts[q.id] || 0;
        correct += c;
        answered += c + w;
      });
      return {
        field,
        label: WORLD_META[field].label,
        color: WORLD_META[field].color,
        correct,
        answered,
        percent: answered ? Math.round((correct / answered) * 100) : 0,
      };
    });
  }

  // 間違えたまま克服できていない問題の一覧
  function wrongQuestions(state) {
    return QUESTIONS
      .filter(q => (state.wrongCounts[q.id] || 0) > 0)
      .map(q => ({ q, wrong: state.wrongCounts[q.id], correct: state.correctCounts[q.id] || 0 }))
      .sort((a, b) => b.wrong - a.wrong);
  }

  function overallProgress(state) {
    const allTopics = Object.values(TOPIC_ORDER).flat();
    const clearedCount = allTopics.filter(t => state.clearedTopics[t] && state.clearedTopics[t].stars > 0).length;
    const bossCount = Object.keys(WORLD_META).filter(w => state.clearedBoss[w]).length;
    return {
      clearedTopics: clearedCount,
      totalTopics: allTopics.length,
      clearedBosses: bossCount,
      totalBosses: Object.keys(WORLD_META).length,
      percent: Math.round((clearedCount / allTopics.length) * 100),
    };
  }

  return {
    getCharacterInfo, addXp, getMapData,
    startTopicBattle, startBossBattle, startReviewBattle, startExam,
    finishTopicBattle, finishBossBattle, finishReviewBattle, finishExam,
    weakTopicSummary, fieldAccuracy, wrongQuestions, overallProgress,
    worldKeys, xpNeeded, getExamModes,
    EXAM_PASS_OVERALL, EXAM_PASS_FIELD,
  };
})();
