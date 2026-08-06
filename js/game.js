// ITパスポート冒険記 - ゲームロジック(RPG成長 + すごろくマップ + 模擬試験 + コイン/ガチャ/図鑑)
const Game = (() => {
  const QUESTIONS_PER_NODE = 6;
  const QUESTIONS_PER_BOSS = 10;
  const REVIEW_MAX = 10;

  // 本番のITパスポート試験は100問/120分、
  // 総合600点以上かつ3分野すべて300点以上(=総合60%・各分野30%)で合格。
  const EXAM_MODES = {
    full: { key: "full", label: "本番形式", total: 100, minutes: 120, dist: { strategy: 35, management: 20, technology: 45 } },
    mini: { key: "mini", label: "短縮版", total: 50, minutes: 60, dist: { strategy: 18, management: 10, technology: 22 } },
  };
  const EXAM_PASS_OVERALL = 0.6;
  const EXAM_PASS_FIELD = 0.3;

  // --- コイン設計 ---
  // 1バトル(6問)でおよそ33〜48コイン。ガチャ1回120コインなので、だいたい3〜4回のバトルで1回引ける。
  const COIN = {
    perCorrect: 3,
    perCorrectReview: 3,
    perCorrectExam: 1,
    topicClear: 15,
    topicFirstClear: 30,
    bossClear: 60,
    bossFirstClear: 100,
    examPass: 200,
  };

  // --- ガチャ設計 ---
  const GACHA = {
    singleCost: 100,
    multiCost: 1000,   // 10連(★3以上が1枠確定)
    multiCount: 10,
    rates: { 1: 0.40, 2: 0.30, 3: 0.20, 4: 0.08, 5: 0.02 },
    dupeRefund: { 1: 20, 2: 35, 3: 70, 4: 130, 5: 260 },
  };
  const RARITY_LABELS = { 1: "ふつう", 2: "めずらしい", 3: "レア", 4: "超レア", 5: "伝説", 6: "蒐集王の証" };

  // --- 宝箱設計 ---
  const CHESTS = {
    battle:  { label: "バトルの宝箱", emoji: "🎁", coins: [30, 70], itemChance: 0.25, minRarity: 1 },
    map:     { label: "マップの宝箱", emoji: "💎", coins: [80, 150], itemChance: 0.50, minRarity: 2 },
    streak:  { label: "継続の宝箱", emoji: "🔥", coins: [50, 100], itemChance: 0.35, minRarity: 2 },
    exam:    { label: "合格の宝箱", emoji: "🏆", coins: [200, 350], itemChance: 1.00, minRarity: 3 },
    special: { label: "書庫の宝箱", emoji: "🗝️", coins: [150, 300], itemChance: 0.85, minRarity: 3 },
  };

  // --- 特別ステージ ---
  // 図鑑の収集数で解放される、全分野ミックスの総復習ステージ。
  // 苦手な問題が優先的に出るので、集めるほど弱点をまとめて潰せる作りにしている。
  const SPECIAL_STAGES = [
    {
      id: "sp-library", name: "収集家の書庫", emoji: "📚", requireItems: 12,
      questions: 8, clearRatio: 0.7,
      desc: "3分野をまたいだ総復習。集めた知識の腕試し。",
      xpPerCorrect: 14, coinPerCorrect: 5, firstClearCoins: 150, firstClearXp: 80,
    },
    {
      id: "sp-corridor", name: "好古家の回廊", emoji: "🏛️", requireItems: 30,
      questions: 10, clearRatio: 0.75,
      desc: "取りこぼした問題が集まる回廊。正答率75%以上で突破。",
      xpPerCorrect: 16, coinPerCorrect: 6, firstClearCoins: 250, firstClearXp: 120,
    },
    {
      id: "sp-throne", name: "蒐集王の玉座", emoji: "👑", requireItems: 54,
      questions: 12, clearRatio: 0.8,
      desc: "難関。正答率80%以上で玉座にたどり着ける。",
      xpPerCorrect: 20, coinPerCorrect: 8, firstClearCoins: 400, firstClearXp: 200,
    },
    {
      id: "sp-dream", name: "蒐集家の夢", emoji: "🌌", requireItems: 72,
      questions: 20, clearRatio: 0.9,
      desc: "図鑑を完成させた者だけが見る夢。全20問・正答率90%の最終試練。",
      xpPerCorrect: 25, coinPerCorrect: 10, firstClearCoins: 800, firstClearXp: 400,
    },
  ];
  const BATTLE_CHEST_CHANCE = 0.25;      // バトルクリア時の基本ドロップ率
  const BATTLE_CHEST_PERFECT_BONUS = 0.15; // 全問正解ならさらに上乗せ

  // --- 図鑑コンプリート報酬 ---
  // ガチャからは絶対に出ない★6。72種すべて集めた時だけ手に入る。
  const COLLECTIBLE_MAX_RARITY = 5;
  const TROPHY_ITEM = {
    id: "trophy-collector",
    name: "金の認定証",
    emoji: "🏅",
    rarity: 6,
    category: "コンプリート報酬",
    flavor: "72種すべてを集めた者にだけ渡される認定証。ここに並んだ道具のどれ一つも、意味のない回り道ではなかったという証明。",
    series: null,
    seriesOrder: null,
    effect: { type: "xp", value: 0.25, label: "獲得XP +25%" },
    avatar: true,
    gachaExcluded: true,
  };
  const TROPHY_TITLE = "蒐集王";

  // 6つのシリーズをすべて完成させると読める、全体を締める物語。
  const FINALE_STORY = {
    id: "finale",
    name: "終章 ― すべてはつながっている",
    emoji: "🌅",
    paragraphs: [
      "手のひらに収まる円盤が、いつのまにか空の向こうへ消えた。つなぐたびに鳴っていた音も、静けさに変わった。道具の形はこんなにも変わったのに、変わらなかったものが一つある。動かしていたのは、いつも人の手だった。",
      "誰かが深夜のログを読み、誰かが手帳の暗証を書き写し、誰かが「これでいいのか」と立ち止まった。計画し、動かし、確かめ、直す。その四つの足取りは、精霊の物語ではなく、あの長い夜そのものだった。",
      "秘密を守る目隠しと、記録を違えないための重い足取りと、眠らずに灯りを守る目。三本の柱のあいだには、いつも隙間がある。影はそこから入る。だから柱は、立てたあとも見張り続けなければならない。",
      "ここに並んだ72の道具は、便利になった歴史ではない。誰かが困り、誰かが工夫し、誰かが引き継いだ跡だ。あなたが覚えた用語のひとつひとつに、その跡がついている。次に困る誰かのために、この続きを書くのは、あなたの番だ。",
    ],
  };

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

  // ---------------- アイテム関連 ----------------
  function allItems() {
    const base = typeof ITEMS !== "undefined" ? ITEMS : [];
    return base.concat([TROPHY_ITEM]);
  }
  // ガチャ・宝箱で入手できるアイテム(★1〜5)。コンプリート判定の母数もこれ。
  function collectibleItems() {
    return allItems().filter(i => i.rarity <= COLLECTIBLE_MAX_RARITY);
  }
  function allSeries() {
    return typeof ITEM_SERIES !== "undefined" ? ITEM_SERIES : [];
  }
  function getItem(id) {
    return allItems().find(i => i.id === id) || null;
  }
  function ownsItem(state, id) {
    return (state.ownedItems[id] || 0) > 0;
  }
  function rarityLabel(r) {
    return RARITY_LABELS[r] || "";
  }

  // 装備中のお守りの効果量(該当タイプでなければ0)
  function charmBonus(state, type) {
    if (!state.equippedCharm) return 0;
    const item = getItem(state.equippedCharm);
    if (!item || !item.effect || item.effect.type !== type) return 0;
    if (!ownsItem(state, item.id)) return 0;
    return item.effect.value || 0;
  }

  function getCharacterInfo(state) {
    const tier = AVATAR_TIERS.find(t => state.level >= t.min && state.level <= t.max) || AVATAR_TIERS[0];
    const need = xpNeeded(state.level);
    // アバターにアイテムを設定していればその絵文字を優先する
    let emoji = tier.emoji;
    const avatarItem = state.avatarItemId ? getItem(state.avatarItemId) : null;
    if (avatarItem && ownsItem(state, avatarItem.id)) emoji = avatarItem.emoji;
    // 図鑑を完成させた人は称号が「蒐集王」になる
    const isCollector = ownsItem(state, TROPHY_ITEM.id);
    return {
      level: state.level,
      xp: state.xp,
      xpNeeded: need,
      xpPercent: Math.min(100, Math.round((state.xp / need) * 100)),
      emoji,
      tierEmoji: tier.emoji,
      avatarName: avatarItem && ownsItem(state, avatarItem.id) ? avatarItem.name : null,
      title: isCollector ? TROPHY_TITLE : tier.title,
      levelTitle: tier.title,
      isCollector,
      streak: state.streak,
      maxCombo: state.maxCombo || 0,
      coins: state.coins || 0,
      totalCorrect: state.totalCorrect,
      totalAnswered: state.totalAnswered,
      accuracy: state.totalAnswered ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : 0,
    };
  }

  // XPを加算しレベルアップを処理する(複数レベル上がる場合にも対応)
  function addXp(state, amount) {
    const bonus = charmBonus(state, "xp");
    const gained = Math.round(amount * (1 + bonus));
    state.xp += gained;
    let levelsGained = 0;
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
      levelsGained += 1;
    }
    return { leveledUp: levelsGained > 0, levelsGained, newLevel: state.level, xpGained: gained, xpBonusApplied: bonus > 0 };
  }

  function addCoins(state, amount) {
    const bonus = charmBonus(state, "coin");
    const gained = Math.round(amount * (1 + bonus));
    state.coins = (state.coins || 0) + gained;
    state.totalCoinsEarned = (state.totalCoinsEarned || 0) + gained;
    return { coinsGained: gained, coinBonusApplied: bonus > 0 };
  }

  // 開発者用の隠しコマンド。お守りボーナスの影響を受けず、指定額をそのまま加算する。
  function grantCheatCoins(state, amount) {
    state.coins = (state.coins || 0) + amount;
    state.totalCoinsEarned = (state.totalCoinsEarned || 0) + amount;
    Storage.save(state);
    return amount;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

  // ---------------- マップ ----------------
  // トピックノードの列 + 3トピックごとの宝箱マス + 末尾のボスノード。
  // 宝箱は進行の妨げにならないよう、次のトピックの解放条件には影響させない。
  function getMapData(state) {
    const worlds = worldKeys();
    // 3ワールドとも最初から自由に選べる(ワールド間の解放条件はなし)。
    // ワールド内のノードは引き続き順番にクリアが必要。
    return worlds.map(worldKey => {
      const topics = TOPIC_ORDER[worldKey];
      let prevTopicCleared = true;
      const nodes = [];

      topics.forEach((topicKey, idx) => {
        const progress = state.clearedTopics[topicKey];
        const cleared = !!(progress && progress.stars > 0);
        nodes.push({
          type: "topic",
          world: worldKey,
          topic: topicKey,
          label: TOPIC_LABELS[topicKey],
          unlocked: prevTopicCleared,
          cleared,
          stars: progress ? progress.stars : 0,
        });
        prevTopicCleared = cleared;

        if ((idx + 1) % 3 === 0 && idx + 1 < topics.length) {
          const chestKey = `${worldKey}-${idx + 1}`;
          nodes.push({
            type: "chest",
            world: worldKey,
            topic: null,
            chestKey,
            label: "宝箱",
            unlocked: cleared,
            cleared: !!state.openedChests[chestKey],
            stars: 0,
          });
        }
      });

      const allTopicsCleared = nodes.filter(n => n.type === "topic").every(n => n.cleared);
      const bossCleared = !!state.clearedBoss[worldKey];
      nodes.push({
        type: "boss",
        world: worldKey,
        topic: null,
        label: `${WORLD_META[worldKey].label} ボス`,
        unlocked: allTopicsCleared,
        cleared: bossCleared,
        stars: bossCleared ? 3 : 0,
      });

      return {
        world: worldKey,
        label: WORLD_META[worldKey].label,
        color: WORLD_META[worldKey].color,
        unlocked: true,
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
    return shuffle(weightedSample(pool, q => netWrongWeight(state, q), n)).map(withShuffledChoices);
  }

  function startBossBattle(state, worldKey) {
    const pool = questionsForWorld(worldKey);
    const n = Math.min(QUESTIONS_PER_BOSS, pool.length);
    return shuffle(weightedSample(pool, q => netWrongWeight(state, q), n)).map(withShuffledChoices);
  }

  function startReviewBattle(state) {
    const attempted = QUESTIONS.filter(q => (state.wrongCounts[q.id] || 0) > 0);
    const sorted = attempted.sort((a, b) => (state.wrongCounts[b.id] || 0) - (state.wrongCounts[a.id] || 0));
    return shuffle(sorted.slice(0, REVIEW_MAX)).map(withShuffledChoices);
  }

  // 特別ステージ。全分野をまたいで、苦手な問題を優先的に出す。
  function getSpecialStages(state) {
    const owned = collectibleItems().filter(i => ownsItem(state, i.id)).length;
    return SPECIAL_STAGES.map(s => ({
      ...s,
      ownedItems: owned,
      unlocked: owned >= s.requireItems,
      remaining: Math.max(0, s.requireItems - owned),
      cleared: !!(state.clearedSpecials && state.clearedSpecials[s.id]),
      best: (state.specialBest && state.specialBest[s.id]) || null,
    }));
  }

  function getSpecialStage(stageId) {
    return SPECIAL_STAGES.find(s => s.id === stageId) || null;
  }

  function startSpecialBattle(state, stageId) {
    const stage = getSpecialStage(stageId);
    if (!stage) return [];
    const n = Math.min(stage.questions, QUESTIONS.length);
    return shuffle(weightedSample(QUESTIONS, q => netWrongWeight(state, q), n)).map(withShuffledChoices);
  }

  function finishSpecialBattle(state, stageId, results, maxCombo) {
    const stage = getSpecialStage(stageId);
    recordAnswers(state, results);
    updateMaxCombo(state, maxCombo || 0);

    const correctCount = results.filter(r => r.correct).length;
    const ratio = results.length ? correctCount / results.length : 0;
    const cleared = ratio >= stage.clearRatio;
    const wasCleared = !!(state.clearedSpecials && state.clearedSpecials[stageId]);

    if (!state.clearedSpecials) state.clearedSpecials = {};
    if (!state.specialBest) state.specialBest = {};
    if (cleared) state.clearedSpecials[stageId] = true;
    const prevBest = state.specialBest[stageId];
    if (!prevBest || correctCount > prevBest.correct) {
      state.specialBest[stageId] = { correct: correctCount, total: results.length };
    }

    let baseXp = correctCount * stage.xpPerCorrect;
    let baseCoins = correctCount * stage.coinPerCorrect;
    if (cleared && !wasCleared) {
      baseXp += stage.firstClearXp;
      baseCoins += stage.firstClearCoins;
    }
    if (ratio === 1) baseXp += 30;

    const levelResult = addXp(state, baseXp);
    const coinResult = addCoins(state, baseCoins);
    // 突破したら必ず豪華な宝箱が出る
    const chest = cleared ? openChest(state, "special") : null;

    Storage.touchStreak(state);
    Storage.save(state);
    return {
      correctCount, total: results.length, ratio, cleared,
      isFirstClear: cleared && !wasCleared, stage, chest,
      ...levelResult, ...coinResult,
    };
  }

  // 模擬試験。本番の分野別出題数に近い比率でランダムに抽出する(苦手重み付けはしない)。
  function startExam(modeKey) {
    const mode = EXAM_MODES[modeKey] || EXAM_MODES.full;
    let picked = [];
    Object.keys(mode.dist).forEach(field => {
      const pool = questionsForWorld(field);
      picked = picked.concat(shuffle(pool).slice(0, Math.min(mode.dist[field], pool.length)));
    });
    return shuffle(picked).map(withShuffledChoices);
  }

  function getExamModes() { return EXAM_MODES; }

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

  // ---------------- 宝箱 ----------------
  function grantItem(state, minRarity) {
    const pool = allItems().filter(i => i.rarity >= minRarity);
    if (!pool.length) return null;
    // レアリティ重みは通常のガチャ確率を流用しつつ、下限レアリティで絞る
    const rarity = rollRarity(minRarity);
    const candidates = pool.filter(i => i.rarity === rarity);
    const item = (candidates.length ? candidates : pool)[Math.floor(Math.random() * (candidates.length ? candidates.length : pool.length))];
    const isNew = !ownsItem(state, item.id);
    state.ownedItems[item.id] = (state.ownedItems[item.id] || 0) + 1;
    let refund = 0;
    if (!isNew) {
      refund = GACHA.dupeRefund[item.rarity] || 0;
      addCoins(state, refund);
    } else if (!state.unseenItems.includes(item.id)) {
      state.unseenItems.push(item.id);
    }
    return { item, isNew, refund };
  }

  // 宝箱を開ける。coins と(確率で)アイテムが手に入る。
  function openChest(state, kind, chestKey) {
    const def = CHESTS[kind] || CHESTS.battle;
    if (kind === "map" && chestKey) {
      if (state.openedChests[chestKey]) return null; // 二重開封を防ぐ
      state.openedChests[chestKey] = true;
    }
    const baseCoins = randInt(def.coins[0], def.coins[1]);
    const { coinsGained } = addCoins(state, baseCoins);
    let drop = null;
    if (Math.random() < def.itemChance) {
      drop = grantItem(state, def.minRarity);
    }
    const completion = checkCompletion(state);
    Storage.save(state);
    return { kind, label: def.label, emoji: def.emoji, coins: coinsGained, drop, completion };
  }

  function battleChestChance(state, perfect) {
    return BATTLE_CHEST_CHANCE + (perfect ? BATTLE_CHEST_PERFECT_BONUS : 0) + charmBonus(state, "chest");
  }

  // 連続学習日数のご褒美。1日1回だけ受け取れる。
  function claimStreakChest(state) {
    const today = Storage.todayStr();
    if (state.streakChestDate === today) return null;
    state.streakChestDate = today;
    return openChest(state, "streak");
  }

  function hasStreakChestReady(state) {
    return state.streakChestDate !== Storage.todayStr();
  }

  // ---------------- ガチャ ----------------
  function rollRarity(minRarity) {
    const min = minRarity || 1;
    const entries = Object.keys(GACHA.rates)
      .map(Number)
      .filter(r => r >= min && allItems().some(i => i.rarity === r));
    if (!entries.length) return min;
    const total = entries.reduce((s, r) => s + GACHA.rates[r], 0);
    let x = Math.random() * total;
    for (const r of entries) {
      x -= GACHA.rates[r];
      if (x <= 0) return r;
    }
    return entries[entries.length - 1];
  }

  function pullOne(state, minRarity) {
    const rarity = rollRarity(minRarity);
    const pool = allItems().filter(i => i.rarity === rarity);
    if (!pool.length) return null;
    const item = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !ownsItem(state, item.id);
    state.ownedItems[item.id] = (state.ownedItems[item.id] || 0) + 1;
    let refund = 0;
    if (!isNew) {
      refund = GACHA.dupeRefund[item.rarity] || 0;
      state.coins += refund; // 還元分にお守りボーナスは掛けない
    } else if (!state.unseenItems.includes(item.id)) {
      state.unseenItems.push(item.id);
    }
    return { item, isNew, refund };
  }

  function canPull(state, multi) {
    const cost = multi ? GACHA.multiCost : GACHA.singleCost;
    return (state.coins || 0) >= cost && allItems().length > 0;
  }

  function gachaPull(state, multi) {
    const cost = multi ? GACHA.multiCost : GACHA.singleCost;
    if ((state.coins || 0) < cost) return null;
    state.coins -= cost;
    state.gachaCount = (state.gachaCount || 0) + 1;

    const count = multi ? GACHA.multiCount : 1;
    const results = [];
    for (let i = 0; i < count; i++) results.push(pullOne(state, 1));
    const valid = results.filter(Boolean);

    // 10連は★3以上を1つ確定にする
    if (multi && valid.length && !valid.some(r => r.item.rarity >= 3)) {
      const replaced = pullOne(state, 3);
      if (replaced) valid[valid.length - 1] = replaced;
    }

    const completion = checkCompletion(state);
    Storage.save(state);
    return { cost, results: valid, completion };
  }

  function getGachaInfo() {
    return {
      singleCost: GACHA.singleCost,
      multiCost: GACHA.multiCost,
      multiCount: GACHA.multiCount,
      rates: GACHA.rates,
      dupeRefund: GACHA.dupeRefund,
    };
  }

  // ---------------- バトル終了処理 ----------------
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
      state.clearedTopics[topicKey] = { stars, bestCorrect: correctCount, bestTotal: results.length, attempts: (prev ? prev.attempts : 0) + 1 };
    } else if (prev) {
      prev.attempts += 1;
    }

    let baseXp = correctCount * 10;
    if (isFirstClear) baseXp += 20;
    if (ratio === 1) baseXp += 15;

    let baseCoins = correctCount * COIN.perCorrect;
    if (stars > 0) baseCoins += isFirstClear ? COIN.topicFirstClear : COIN.topicClear;

    const levelResult = addXp(state, baseXp);
    const coinResult = addCoins(state, baseCoins);
    const chest = (stars > 0 && Math.random() < battleChestChance(state, ratio === 1)) ? openChest(state, "battle") : null;

    Storage.touchStreak(state);
    Storage.save(state);
    return { correctCount, total: results.length, ratio, stars, cleared: stars > 0, isFirstClear, chest, ...levelResult, ...coinResult };
  }

  function finishBossBattle(state, worldKey, results, maxCombo) {
    recordAnswers(state, results);
    updateMaxCombo(state, maxCombo || 0);

    const correctCount = results.filter(r => r.correct).length;
    const ratio = correctCount / results.length;
    const cleared = ratio >= 0.7;
    const wasAlreadyCleared = !!state.clearedBoss[worldKey];
    if (cleared) state.clearedBoss[worldKey] = true;

    let baseXp = correctCount * 12;
    if (cleared && !wasAlreadyCleared) baseXp += 60;
    if (ratio === 1) baseXp += 30;

    let baseCoins = correctCount * COIN.perCorrect;
    if (cleared) baseCoins += wasAlreadyCleared ? COIN.bossClear : COIN.bossFirstClear;

    const levelResult = addXp(state, baseXp);
    const coinResult = addCoins(state, baseCoins);
    // ボスを倒したら宝箱は確定でドロップする
    const chest = cleared ? openChest(state, "battle") : null;

    Storage.touchStreak(state);
    Storage.save(state);
    return { correctCount, total: results.length, ratio, cleared, isFirstClear: cleared && !wasAlreadyCleared, chest, ...levelResult, ...coinResult };
  }

  function finishReviewBattle(state, results, maxCombo) {
    // 復習は解放条件に影響しない。XP/コイン獲得と苦手カウントの解消が目的。
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
    const levelResult = addXp(state, correctCount * 8);
    const coinResult = addCoins(state, correctCount * COIN.perCorrectReview);
    const chest = Math.random() < battleChestChance(state, correctCount === results.length) ? openChest(state, "battle") : null;

    Storage.touchStreak(state);
    Storage.save(state);
    return { correctCount, total: results.length, chest, ...levelResult, ...coinResult };
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

    let baseXp = correctCount * 5;
    if (passed) baseXp += 100;
    let baseCoins = correctCount * COIN.perCorrectExam;
    if (passed) baseCoins += COIN.examPass;

    const levelResult = addXp(state, baseXp);
    const coinResult = addCoins(state, baseCoins);
    const chest = passed ? openChest(state, "exam") : null;

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
    return { correctCount, total: results.length, percent, fields, passed, elapsedSec, mode, chest, ...levelResult, ...coinResult };
  }

  // ---------------- 集計 ----------------
  function weakTopicSummary(state) {
    return Object.keys(state.clearedTopics)
      .map(topicKey => ({ topicKey, label: TOPIC_LABELS[topicKey], ...state.clearedTopics[topicKey] }))
      .sort((a, b) => a.stars - b.stars || b.attempts - a.attempts);
  }

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

  // 図鑑の集計。カテゴリ別・レアリティ別の入手状況を返す。
  function collectionSummary(state) {
    // 母数は★1〜5のみ。★6の認定証はコンプリートのご褒美なので数に入れない。
    const items = collectibleItems();
    const owned = items.filter(i => ownsItem(state, i.id));
    const byRarity = {};
    [1, 2, 3, 4, 5].forEach(r => {
      const all = items.filter(i => i.rarity === r);
      byRarity[r] = { total: all.length, owned: all.filter(i => ownsItem(state, i.id)).length, label: RARITY_LABELS[r] };
    });
    return {
      total: items.length,
      owned: owned.length,
      percent: items.length ? Math.round((owned.length / items.length) * 100) : 0,
      byRarity,
      unseenCount: (state.unseenItems || []).length,
      isComplete: items.length > 0 && owned.length === items.length,
      hasTrophy: ownsItem(state, TROPHY_ITEM.id),
    };
  }

  // 図鑑を完成させた瞬間に★6の認定証を渡す。すでに持っていれば何もしない。
  function checkCompletion(state) {
    const items = collectibleItems();
    if (!items.length) return null;
    if (!items.every(i => ownsItem(state, i.id))) return null;
    if (ownsItem(state, TROPHY_ITEM.id)) return null;
    state.ownedItems[TROPHY_ITEM.id] = 1;
    if (!state.unseenItems) state.unseenItems = [];
    if (!state.unseenItems.includes(TROPHY_ITEM.id)) state.unseenItems.push(TROPHY_ITEM.id);
    state.collectionCompletedAt = Storage.todayStr();
    return { trophy: TROPHY_ITEM, title: TROPHY_TITLE };
  }

  // 6つのシリーズをすべて完成させたら終章が読める
  function getFinale(state) {
    const series = allSeries();
    const done = series.length > 0 && series.every(s =>
      s.itemIds.every(id => ownsItem(state, id))
    );
    return {
      ...FINALE_STORY,
      unlocked: done,
      completedSeries: series.filter(s => s.itemIds.every(id => ownsItem(state, id))).length,
      totalSeries: series.length,
    };
  }

  function isGoldTheme(state) {
    if (!state.settings || state.settings.goldTheme === false) return false;
    return ownsItem(state, TROPHY_ITEM.id);
  }

  // シリーズごとの進捗と、解放済みの物語を返す
  function seriesProgress(state) {
    return allSeries().map(s => {
      const items = s.itemIds.map(id => getItem(id)).filter(Boolean);
      const ownedItemsInSeries = items.filter(i => ownsItem(state, i.id));
      const ownedCount = ownedItemsInSeries.length;
      return {
        ...s,
        items,
        ownedCount,
        total: items.length,
        isComplete: ownedCount === items.length && items.length > 0,
        completeStory: s.complete || "", // JSON側の complete は「完成時の締めの文章」
        // 集めた数の分だけ物語が解放される
        unlockedStory: (s.story || []).slice(0, ownedCount),
      };
    });
  }

  function itemsForCatalog(state) {
    return allItems()
      .slice()
      .sort((a, b) => b.rarity - a.rarity || a.id.localeCompare(b.id))
      .map(i => ({ item: i, owned: ownsItem(state, i.id), count: state.ownedItems[i.id] || 0, unseen: (state.unseenItems || []).includes(i.id) }));
    }

  function avatarCandidates(state) {
    return allItems().filter(i => i.avatar && ownsItem(state, i.id));
  }

  function charmCandidates(state) {
    return allItems().filter(i => i.effect && ownsItem(state, i.id));
  }

  function setAvatar(state, itemId) {
    state.avatarItemId = itemId;
    Storage.save(state);
  }

  function setCharm(state, itemId) {
    state.equippedCharm = itemId;
    Storage.save(state);
  }

  function markItemsSeen(state, ids) {
    state.unseenItems = (state.unseenItems || []).filter(id => !ids.includes(id));
    Storage.save(state);
  }

  return {
    getCharacterInfo, addXp, addCoins, grantCheatCoins, getMapData,
    startTopicBattle, startBossBattle, startReviewBattle, startExam,
    finishTopicBattle, finishBossBattle, finishReviewBattle, finishExam,
    weakTopicSummary, fieldAccuracy, wrongQuestions, overallProgress,
    worldKeys, xpNeeded, getExamModes,
    // 特別ステージ
    getSpecialStages, getSpecialStage, startSpecialBattle, finishSpecialBattle,
    // コイン/宝箱/ガチャ/図鑑
    openChest, claimStreakChest, hasStreakChestReady, gachaPull, canPull, getGachaInfo,
    collectionSummary, seriesProgress, itemsForCatalog, avatarCandidates, charmCandidates,
    checkCompletion, getFinale, isGoldTheme, collectibleItems,
    setAvatar, setCharm, markItemsSeen, getItem, ownsItem, rarityLabel, charmBonus,
    EXAM_PASS_OVERALL, EXAM_PASS_FIELD,
  };
})();
