// ITパスポート冒険記 - ゲームロジック(RPG成長 + すごろくマップ)
const Game = (() => {
  const QUESTIONS_PER_NODE = 5;
  const QUESTIONS_PER_BOSS = 8;
  const REVIEW_MAX = 10;

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
      totalCorrect: state.totalCorrect,
      totalAnswered: state.totalAnswered,
      accuracy: state.totalAnswered ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0,
    };
  }

  // Adds xp, applies level-ups (possibly multiple). Mutates state. Returns {leveledUp, levelsGained, newLevel}
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

  // Weighted sampling without replacement (Efraimidis-Spirakis).
  function weightedSample(pool, weightFn, n) {
    const keyed = pool.map(item => ({ item, key: Math.pow(Math.random(), 1 / Math.max(weightFn(item), 0.01)) }));
    keyed.sort((a, b) => b.key - a.key);
    return keyed.slice(0, n).map(k => k.item);
  }

  function worldKeys() {
    return Object.keys(WORLD_META).sort((a, b) => WORLD_META[a].order - WORLD_META[b].order);
  }

  // Builds the full sugoroku map: for every world, a list of topic-nodes plus a trailing boss node.
  function getMapData(state) {
    const worlds = worldKeys();
    let prevWorldBossCleared = true; // first world always unlocked
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

  function withShuffledChoices(q) {
    const order = shuffle(q.choices.map((_, i) => i));
    const choices = order.map(i => q.choices[i]);
    const answer = order.indexOf(q.answer);
    return { ...q, choices, answer, _origAnswerText: q.choices[q.answer] };
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
    const picked = sorted.slice(0, REVIEW_MAX);
    return shuffle(picked).map(withShuffledChoices);
  }

  function starsForRatio(ratio) {
    if (ratio >= 0.999) return 3;
    if (ratio >= 0.8) return 2;
    if (ratio >= 0.6) return 1;
    return 0;
  }

  // results: [{id, correct}]. Returns a summary and mutates+saves state.
  function finishTopicBattle(state, topicKey, results) {
    results.forEach(r => {
      if (r.correct) {
        state.correctCounts[r.id] = (state.correctCounts[r.id] || 0) + 1;
        state.totalCorrect += 1;
      } else {
        state.wrongCounts[r.id] = (state.wrongCounts[r.id] || 0) + 1;
      }
      state.totalAnswered += 1;
    });

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

  function finishBossBattle(state, worldKey, results) {
    results.forEach(r => {
      if (r.correct) {
        state.correctCounts[r.id] = (state.correctCounts[r.id] || 0) + 1;
        state.totalCorrect += 1;
      } else {
        state.wrongCounts[r.id] = (state.wrongCounts[r.id] || 0) + 1;
      }
      state.totalAnswered += 1;
    });

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

  function finishReviewBattle(state, results) {
    // Review doesn't unlock anything; it's purely for XP + reducing wrong-counts.
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
    const correctCount = results.filter(r => r.correct).length;
    const xpGained = correctCount * 8;
    const levelResult = addXp(state, xpGained);
    Storage.touchStreak(state);
    Storage.save(state);
    return { correctCount, total: results.length, xpGained, ...levelResult };
  }

  function weakTopicSummary(state) {
    // For the status screen: topics with attempts but low star rating.
    return Object.keys(state.clearedTopics)
      .map(topicKey => ({ topicKey, label: TOPIC_LABELS[topicKey], ...state.clearedTopics[topicKey] }))
      .sort((a, b) => a.stars - b.stars || b.attempts - a.attempts);
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
    getCharacterInfo, addXp, getMapData, startTopicBattle, startBossBattle, startReviewBattle,
    finishTopicBattle, finishBossBattle, finishReviewBattle, weakTopicSummary, overallProgress,
    worldKeys, xpNeeded,
  };
})();
