// ITパスポート冒険記 - UI制御
(() => {
  let state = Storage.load();
  let currentWorldTab = null;
  let battle = null;   // { mode, world, topic, questions, index, results, answered, combo, maxCombo }
  let exam = null;     // { modeKey, mode, questions, answers, index, remainingSec, startedAt }
  let examTimerId = null;

  const el = id => document.getElementById(id);
  const MARKS = ["ア", "イ", "ウ", "エ"];

  let overlayQueue = [];   // レベルアップと宝箱が重なった時に順番に見せる
  let rarityFilter = 0;    // 図鑑のレアリティ絞り込み(0 = すべて)
  let collectionTab = "catalog";
  let detailItemId = null;
  let pendingCompletion = null; // ガチャ結果を閉じたあとに出すコンプリート演出

  // 画面名 -> 下部ナビでハイライトするタブ
  const NAV_PARENT = {
    home: "home", map: "map", battle: "map", result: "map",
    exam: "exam", "exam-battle": "exam", "exam-result": "exam",
    collection: "collection", review: "review", wrong: "review", status: "status",
  };
  // 回答に集中させたい画面ではナビを隠す
  const HIDE_NAV = ["battle", "exam-battle"];

  // ---------------- 隠しコマンド(開発者用・+5000コイン) ----------------
  const CHEAT_COIN_AMOUNT = 5000;
  const CHEAT_COOLDOWN_MS = 2500;      // 連続発動を防ぐクールダウン
  const CHEAT_NAV_SEQUENCE = ["home", "status", "map", "review", "exam", "collection"];
  const CHEAT_NAV_GAP_MS = 4000;       // タップ間がこれを超えたら数え直し
  const CHEAT_LOGO_TAPS = 7;
  const CHEAT_LOGO_GAP_MS = 1500;
  const CHEAT_HOLD_MS = 3000;

  let cheatCooldownUntil = 0;
  let cheatNavBuffer = [];
  let cheatNavLastTap = 0;
  let cheatLogoCount = 0;
  let cheatLogoTimer = null;
  let cheatHoldTimer = null;

  function triggerCheatCoins() {
    const now = Date.now();
    if (now < cheatCooldownUntil) return;
    cheatCooldownUntil = now + CHEAT_COOLDOWN_MS;
    Game.grantCheatCoins(state, CHEAT_COIN_AMOUNT);
    renderTopbar();
    // 開いている画面のコイン表示があれば更新しておく
    if (document.getElementById("screen-collection").classList.contains("active")) renderCollection();
    showCheatToast(CHEAT_COIN_AMOUNT);
    Sound.play("cheat");
    vibrate([0, 40, 40, 40, 40, 90]);
  }

  function showCheatToast(amount) {
    const toast = el("cheat-toast");
    toast.textContent = `🪙 +${amount}`;
    toast.classList.remove("hidden");
    toast.classList.remove("show");
    void toast.offsetWidth; // アニメーションを毎回リセットするための再フロー
    toast.classList.add("show");
    clearTimeout(showCheatToast._hideTimer);
    showCheatToast._hideTimer = setTimeout(() => toast.classList.add("hidden"), 1800);
  }

  // 隠しコマンド1: 下部ナビをホーム→状況→マップ→復習→試験→図鑑の順にタップ
  function trackCheatNavTap(navKey) {
    const now = Date.now();
    if (now - cheatNavLastTap > CHEAT_NAV_GAP_MS) cheatNavBuffer = [];
    cheatNavLastTap = now;
    cheatNavBuffer.push(navKey);
    if (cheatNavBuffer.length > CHEAT_NAV_SEQUENCE.length) cheatNavBuffer.shift();
    if (
      cheatNavBuffer.length === CHEAT_NAV_SEQUENCE.length &&
      cheatNavBuffer.every((v, i) => v === CHEAT_NAV_SEQUENCE[i])
    ) {
      cheatNavBuffer = [];
      triggerCheatCoins();
    }
  }

  // 隠しコマンド2: ホーム画面のロゴを短時間に7回連打
  function trackCheatLogoTap() {
    cheatLogoCount += 1;
    clearTimeout(cheatLogoTimer);
    cheatLogoTimer = setTimeout(() => { cheatLogoCount = 0; }, CHEAT_LOGO_GAP_MS);
    if (cheatLogoCount >= CHEAT_LOGO_TAPS) {
      cheatLogoCount = 0;
      triggerCheatCoins();
    }
  }

  // 隠しコマンド3: コイン表示を3秒長押し
  function startCheatHold() {
    clearTimeout(cheatHoldTimer);
    cheatHoldTimer = setTimeout(triggerCheatCoins, CHEAT_HOLD_MS);
  }
  function cancelCheatHold() {
    clearTimeout(cheatHoldTimer);
  }

  // ---------------- 汎用ヘルパ ----------------
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // 表計算の表・擬似言語コードを描画する。どちらも無い問題では領域を隠す。
  // container は要素ID(document内に存在する固定要素向け)、または未接続でもよいDOM要素そのもの。
  function renderFigure(container, q) {
    const box = typeof container === "string" ? el(container) : container;
    box.innerHTML = "";
    const hasTable = q.table && q.table.rows && q.table.rows.length;
    const hasCode = !!q.code;
    box.classList.toggle("hidden", !hasTable && !hasCode);
    if (!hasTable && !hasCode) return;

    if (hasTable) {
      const wrap = make("div", "figure-scroll");
      const table = make("table", "ss-table");
      if (q.table.headers && q.table.headers.length) {
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        q.table.headers.forEach(h => tr.appendChild(make("th", null, h)));
        thead.appendChild(tr);
        table.appendChild(thead);
      }
      const tbody = document.createElement("tbody");
      q.table.rows.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => tr.appendChild(make("td", null, cell)));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      box.appendChild(wrap);
    }

    if (hasCode) {
      box.appendChild(make("pre", "code-block", q.code));
    }
  }

  function vibrate(pattern) {
    if (!state.settings || !state.settings.vibration) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* 未対応端末では無視 */ }
    }
  }

  function fmtClock(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${String(m).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function fmtDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  }

  // ---------------- 画面遷移 ----------------
  function showScreen(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    el(`screen-${name}`).classList.add("active");
    el("bottomnav").classList.toggle("hidden", HIDE_NAV.includes(name));
    el("topbar").classList.remove("hidden");
    const parent = NAV_PARENT[name];
    document.querySelectorAll(".nav-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.nav === parent);
    });
    window.scrollTo(0, 0);
    updateBgmForScreen(name);
  }

  // 画面に応じてBGMを切り替える。ボス戦だけ専用の緊迫した曲にする。
  function updateBgmForScreen(name) {
    if (name === "battle" && battle && battle.mode === "boss") Sound.startBgm("boss");
    else if (name === "battle" || name === "exam-battle") Sound.startBgm("battle");
    else Sound.startBgm("map");
  }

  function renderTopbar() {
    const c = Game.getCharacterInfo(state);
    el("topbar-emoji").textContent = c.emoji;
    el("topbar-title").textContent = c.title;
    el("topbar-level").textContent = `Lv.${c.level}`;
    el("topbar-xp-fill").style.width = `${c.xpPercent}%`;
    el("topbar-streak").textContent = c.streak;
    el("topbar-coins").textContent = c.coins;
    renderNavBadge();
    applyTheme();
  }

  // 図鑑を完成させた人だけ金色テーマになる(設定でオフにできる)
  function applyTheme() {
    document.body.classList.toggle("gold-theme", Game.isGoldTheme(state));
  }

  // 図鑑タブに未確認アイテムの件数を出す
  function renderNavBadge() {
    const badge = el("nav-badge-collection");
    const n = (state.unseenItems || []).length;
    badge.textContent = n > 9 ? "9+" : n;
    badge.classList.toggle("hidden", n === 0);
  }

  // ---------------- オーバーレイの順番待ち ----------------
  function enqueueOverlay(fn) {
    overlayQueue.push(fn);
    if (overlayQueue.length === 1) fn();
  }

  // 宝箱を見せ、その中身で図鑑が完成したならコンプリート演出も続けて出す
  function enqueueChest(chest) {
    if (!chest) return;
    enqueueOverlay(() => showChest(chest));
    if (chest.completion) enqueueOverlay(showCompletion);
  }

  function dismissOverlay(overlayId) {
    el(overlayId).classList.add("hidden");
    overlayQueue.shift();
    if (overlayQueue.length) overlayQueue[0]();
  }

  function goto(name) {
    if (name === "home") renderHome();
    if (name === "map") renderMap();
    if (name === "exam") renderExamTop();
    if (name === "collection") renderCollection();
    if (name === "review") renderReview();
    if (name === "wrong") renderWrongList();
    if (name === "status") renderStatus();
    renderTopbar();
    showScreen(name);
  }

  // ---------------- ホーム ----------------
  function renderHome() {
    const c = Game.getCharacterInfo(state);
    const prog = Game.overallProgress(state);
    el("home-emoji").textContent = c.emoji;
    el("home-title").textContent = c.title;
    el("home-level").textContent = c.avatarName ? `Lv.${c.level} ・ ${c.avatarName}` : `Lv.${c.level}`;
    el("home-progress").textContent = `踏破率 ${prog.percent}%(${prog.clearedTopics}/${prog.totalTopics}ノード)`;
    // 今日まだ受け取っていなければ継続の宝箱を出す
    el("btn-streak-chest").classList.toggle("hidden", !Game.hasStreakChestReady(state));
  }

  // ---------------- マップ ----------------
  function findCurrentNode(mapData) {
    for (const w of mapData) {
      for (const n of w.nodes) {
        if (n.type === "chest") continue; // 宝箱は進行位置の判定に含めない
        if (n.unlocked && !n.cleared) return { world: w.world, topic: n.topic, type: n.type };
      }
    }
    const lastWorld = mapData[mapData.length - 1];
    const lastNode = lastWorld.nodes[lastWorld.nodes.length - 1];
    return { world: lastWorld.world, topic: lastNode.topic, type: lastNode.type };
  }

  function renderWorldTabs(mapData) {
    const tabs = el("world-tabs");
    tabs.innerHTML = "";
    mapData.forEach(w => {
      const tab = make("div", "world-tab" + (w.world === currentWorldTab ? " active" : "") + (!w.unlocked ? " locked" : ""));
      tab.appendChild(make("span", null, w.label));
      tab.appendChild(make("span", "world-tab-sub", w.unlocked ? `${w.clearedCount}/${w.topicCount}` : "🔒"));
      tab.addEventListener("click", () => {
        if (!w.unlocked) return;
        currentWorldTab = w.world;
        renderMap();
      });
      tabs.appendChild(tab);
    });
  }

  // 図鑑の収集数で解放される特別ステージ。次に解放されるものだけ予告として見せる。
  function renderSpecialStages() {
    const box = el("special-stages");
    box.innerHTML = "";
    const stages = Game.getSpecialStages(state);
    const unlocked = stages.filter(s => s.unlocked);
    const nextLocked = stages.find(s => !s.unlocked);
    const show = nextLocked ? unlocked.concat([nextLocked]) : unlocked;
    if (!show.length) return;

    show.forEach(s => {
      const card = make("button", "special-card" + (!s.unlocked ? " locked" : s.cleared ? " cleared" : ""));
      card.appendChild(make("div", "special-emoji", s.unlocked ? s.emoji : "🔒"));
      const body = make("div", "special-body");
      const name = make("div", "special-name");
      name.appendChild(make("span", null, s.name));
      if (s.cleared) name.appendChild(make("span", "special-badge", "突破済"));
      body.appendChild(name);
      body.appendChild(make("div", "special-desc", s.desc));
      if (s.unlocked) {
        const best = s.best ? ` ・ 最高 ${s.best.correct}/${s.best.total}` : "";
        body.appendChild(make("div", "special-req", `${s.questions}問 ・ 正答率${Math.round(s.clearRatio * 100)}%で突破${best}`));
      } else {
        body.appendChild(make("div", "special-req locked-req", `図鑑をあと${s.remaining}種集めると解放(${s.ownedItems}/${s.requireItems})`));
      }
      card.appendChild(body);
      if (s.unlocked) card.appendChild(make("div", "special-go", "▶"));

      if (s.unlocked) {
        card.addEventListener("click", () => startBattle("special", null, null, s.id));
      } else {
        card.disabled = true;
      }
      box.appendChild(card);
    });
  }

  function renderMap() {
    const mapData = Game.getMapData(state);
    const current = findCurrentNode(mapData);
    if (!currentWorldTab) currentWorldTab = current.world;
    renderSpecialStages();
    renderWorldTabs(mapData);

    const world = mapData.find(w => w.world === currentWorldTab);
    const container = el("map-container");
    container.innerHTML = "";

    if (!world.unlocked) {
      container.appendChild(make("div", "map-boss-lock-hint", "前のワールドのボスを倒すと解放されます"));
      return;
    }

    const path = make("div", "map-path");
    world.nodes.forEach((node, i) => {
      if (i > 0) {
        path.appendChild(make("div", "map-connector" + (world.nodes[i - 1].cleared ? " done" : "")));
      }
      const wrap = make("div", "map-node-wrap");
      let cls = "map-node";
      if (node.type === "boss") cls += " boss";
      if (node.type === "chest") cls += " chest";
      if (!node.unlocked) cls += " locked";
      else if (node.cleared) cls += " cleared";
      const nodeEl = make("div", cls);

      const isCurrent = current.world === world.world && current.topic === node.topic && current.type === node.type;
      if (isCurrent && node.unlocked) {
        nodeEl.classList.add("current");
        nodeEl.appendChild(make("div", "player-token", "🧍"));
      }

      let icon;
      if (node.type === "boss") icon = "👹";
      else if (node.type === "chest") icon = node.cleared ? "📭" : (node.unlocked ? "🎁" : "🔒");
      else icon = node.unlocked ? "📘" : "🔒";
      nodeEl.appendChild(make("div", "map-node-icon", icon));
      nodeEl.appendChild(make("div", "map-node-label", node.type === "chest" ? (node.cleared ? "開封済" : "宝箱") : node.label));
      if (node.cleared && node.type !== "chest") nodeEl.appendChild(make("div", "map-node-stars", "⭐".repeat(node.stars)));

      nodeEl.addEventListener("click", () => {
        if (!node.unlocked) return;
        if (node.type === "chest") {
          if (node.cleared) return;
          const chest = Game.openChest(state, "map", node.chestKey);
          if (chest) {
            vibrate([0, 40, 40, 60]);
            renderTopbar();
            renderMap();
            enqueueChest(chest);
          }
        } else if (node.type === "boss") {
          startBattle("boss", world.world, null);
        } else {
          startBattle("topic", world.world, node.topic);
        }
      });

      wrap.appendChild(nodeEl);
      path.appendChild(wrap);
    });
    container.appendChild(path);
  }

  // ---------------- 練習バトル ----------------
  function startBattle(mode, world, topic, stageId) {
    let questions;
    if (mode === "topic") questions = Game.startTopicBattle(state, topic);
    else if (mode === "boss") questions = Game.startBossBattle(state, world);
    else if (mode === "special") questions = Game.startSpecialBattle(state, stageId);
    else questions = Game.startReviewBattle(state);

    if (!questions.length) return;

    battle = { mode, world, topic, stageId, questions, index: 0, results: [], answered: false, combo: 0, maxCombo: 0 };
    showScreen("battle");
    renderQuestion();
  }

  function battleLabel() {
    if (battle.mode === "boss") return `${WORLD_META[battle.world].label} ボス戦`;
    if (battle.mode === "review") return "復習ダンジョン";
    if (battle.mode === "special") {
      const stage = Game.getSpecialStage(battle.stageId);
      return stage ? `${stage.emoji} ${stage.name}` : "特別ステージ";
    }
    return TOPIC_LABELS[battle.topic];
  }

  function renderQuestion() {
    const q = battle.questions[battle.index];
    el("battle-progress").textContent = `問 ${battle.index + 1}/${battle.questions.length}`;
    el("battle-topic").textContent = battleLabel();
    el("battle-bar-fill").style.width = `${(battle.index / battle.questions.length) * 100}%`;
    el("battle-question").textContent = q.q;
    renderFigure("battle-figure", q);

    const choicesEl = el("battle-choices");
    choicesEl.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const item = make("div", "choice-item");
      const btn = make("button", "choice-btn");
      btn.appendChild(make("span", "choice-mark", MARKS[i]));
      btn.appendChild(make("span", null, choice));
      btn.addEventListener("click", () => { Sound.play("select"); handleChoice(i); });
      item.appendChild(btn);
      choicesEl.appendChild(item);
    });

    const oldBanner = document.querySelector("#screen-battle .answer-banner");
    if (oldBanner) oldBanner.remove();
    el("btn-next-question").classList.add("hidden");
    updateComboBadge();
    battle.answered = false;
  }

  function updateComboBadge() {
    const badge = el("combo-badge");
    if (battle && battle.combo >= 2) {
      badge.textContent = `🔥 ${battle.combo} コンボ`;
      badge.classList.remove("hidden");
      // アニメーションを付け直して毎回弾ませる
      badge.style.animation = "none";
      void badge.offsetWidth;
      badge.style.animation = "";
    } else {
      badge.classList.add("hidden");
    }
  }

  function handleChoice(selectedIndex) {
    if (battle.answered) return;
    battle.answered = true;

    const q = battle.questions[battle.index];
    const correct = selectedIndex === q.answer;
    battle.results.push({ id: q.id, correct });

    if (correct) {
      battle.combo += 1;
      if (battle.combo > battle.maxCombo) battle.maxCombo = battle.combo;
      vibrate(35);
      if (battle.combo >= 2) Sound.play("combo", battle.combo);
      else Sound.play("correct");
    } else {
      battle.combo = 0;
      vibrate([50, 45, 50]);
      Sound.play("incorrect");
    }

    // 各選択肢に正誤マークとインライン解説を付ける
    const items = el("battle-choices").querySelectorAll(".choice-item");
    items.forEach((item, i) => {
      const btn = item.querySelector(".choice-btn");
      btn.classList.add("disabled");
      if (i === q.answer) btn.classList.add("correct");
      else if (i === selectedIndex) btn.classList.add("incorrect");

      if (i === q.answer || i === selectedIndex) {
        btn.appendChild(make("span", "choice-result", i === q.answer ? "⭕" : "❌"));
      }
      if (q.choiceExplains && q.choiceExplains[i]) {
        item.appendChild(make("div", "choice-explain" + (i === q.answer ? " is-correct" : ""), q.choiceExplains[i]));
      }
    });

    const banner = make("div", `answer-banner ${correct ? "is-correct" : "is-incorrect"}`);
    banner.textContent = correct
      ? (battle.combo >= 3 ? `✅ 正解！ ${battle.combo}連続正解中！` : "✅ 正解！")
      : "❌ 不正解…";
    if (!q.choiceExplains) banner.textContent += ` ${q.explain}`;
    el("battle-choices").parentNode.insertBefore(banner, el("battle-choices"));

    updateComboBadge();

    const nextBtn = el("btn-next-question");
    nextBtn.textContent = battle.index + 1 < battle.questions.length ? "次へ ▶" : "結果を見る 🏁";
    nextBtn.classList.remove("hidden");
  }

  function advanceBattle() {
    if (battle.index + 1 < battle.questions.length) {
      battle.index += 1;
      renderQuestion();
    } else {
      finishBattle();
    }
  }

  function finishBattle() {
    let summary;
    if (battle.mode === "topic") summary = Game.finishTopicBattle(state, battle.topic, battle.results, battle.maxCombo);
    else if (battle.mode === "boss") summary = Game.finishBossBattle(state, battle.world, battle.results, battle.maxCombo);
    else if (battle.mode === "special") summary = Game.finishSpecialBattle(state, battle.stageId, battle.results, battle.maxCombo);
    else summary = Game.finishReviewBattle(state, battle.results, battle.maxCombo);

    renderTopbar();
    renderResult(summary, battle.mode);
    showScreen("result");
    if (summary.leveledUp) enqueueOverlay(showLevelUp);
    enqueueChest(summary.chest);
  }

  function renderResult(summary, mode) {
    el("result-heading").textContent = mode === "boss" ? "👹 ボス戦の結果"
      : mode === "review" ? "📖 復習の結果"
      : mode === "special" ? `${summary.stage.emoji} ${summary.stage.name}の結果`
      : "⚔️ バトル結果";
    el("result-score").textContent = `${summary.correctCount} / ${summary.total} 正解`;
    el("result-xp").textContent = `+${summary.xpGained} XP ・ 🪙 +${summary.coinsGained}`;
    el("result-combo").textContent = battle.maxCombo >= 2 ? `🔥 最大 ${battle.maxCombo} コンボ` : "";

    if (mode === "review") el("result-stars").textContent = summary.correctCount === summary.total ? "🎉" : "📚";
    else if (mode === "boss") el("result-stars").textContent = summary.cleared ? "🏆" : "💤";
    else if (mode === "special") el("result-stars").textContent = summary.cleared ? summary.stage.emoji : "😵";
    else el("result-stars").textContent = summary.stars > 0 ? "⭐".repeat(summary.stars) : "😢";

    let msg = "";
    if (mode === "special") {
      const need = Math.round(summary.stage.clearRatio * 100);
      msg = summary.cleared
        ? (summary.isFirstClear ? `${summary.stage.name}を初突破！特別な宝箱を獲得！` : `${summary.stage.name}を再突破。何度でも挑戦できます。`)
        : `正答率${need}%以上で突破できます(今回は${Math.round(summary.ratio * 100)}%)。復習して再挑戦しよう。`;
    } else if (mode === "boss") {
      msg = summary.cleared ? "ボスを撃破！次のワールドが解放された！" : "正答率70%以上でボスを撃破できます。復習してから再挑戦しよう。";
    } else if (mode === "topic") {
      msg = summary.cleared
        ? (summary.isFirstClear ? "このノードを初クリア！ボーナスXPを獲得！" : "クリア済みのノードを再挑戦したよ。全問正解で⭐3つ。")
        : "正答率60%以上でノードをクリアできます。もう一度挑戦してみよう。";
    } else {
      msg = "復習おつかれさま！正解した問題は苦手リストから減っていくよ。";
    }
    el("result-message").textContent = msg;
  }

  // ---------------- 模擬試験 ----------------
  function renderExamTop() {
    const modes = Game.getExamModes();
    const list = el("exam-mode-list");
    list.innerHTML = "";
    Object.values(modes).forEach(mode => {
      const card = make("button", "exam-mode-card");
      card.appendChild(make("div", "exam-mode-icon", mode.key === "full" ? "🎓" : "⏱️"));
      const textWrap = make("div");
      textWrap.appendChild(make("div", "exam-mode-name", mode.label));
      textWrap.appendChild(make("div", "exam-mode-detail", `${mode.total}問 / ${mode.minutes}分`));
      card.appendChild(textWrap);
      card.appendChild(make("div", "exam-mode-go", "▶"));
      card.addEventListener("click", () => startExam(mode.key));
      list.appendChild(card);
    });

    const hist = el("exam-history");
    hist.innerHTML = "";
    if (!state.examHistory.length) {
      hist.appendChild(make("div", "review-empty", "まだ受験履歴がありません。まずは短縮版から挑戦してみましょう。"));
      return;
    }
    state.examHistory.forEach(h => {
      const row = make("div", "exam-history-row");
      row.appendChild(make("span", `exam-history-verdict ${h.passed ? "pass" : "fail"}`, h.passed ? "合格" : "不合格"));
      const info = make("div");
      info.appendChild(make("div", null, h.modeLabel || "模擬試験"));
      info.appendChild(make("div", "exam-history-date", h.date));
      row.appendChild(info);
      row.appendChild(make("span", "exam-history-score", `${h.correct}/${h.total}(${Math.round(h.percent * 100)}%)`));
      hist.appendChild(row);
    });
  }

  function startExam(modeKey) {
    const mode = Game.getExamModes()[modeKey];
    const questions = Game.startExam(modeKey);
    if (!questions.length) return;
    exam = {
      modeKey,
      mode,
      questions,
      answers: new Array(questions.length).fill(null),
      index: 0,
      remainingSec: mode.minutes * 60,
      startedAt: Date.now(),
    };
    showScreen("exam-battle");
    renderExamQuestion();
    startExamTimer();
  }

  function startExamTimer() {
    stopExamTimer();
    updateExamTimer();
    examTimerId = setInterval(() => {
      exam.remainingSec -= 1;
      updateExamTimer();
      if (exam.remainingSec <= 0) submitExam(true);
    }, 1000);
  }

  function stopExamTimer() {
    if (examTimerId) { clearInterval(examTimerId); examTimerId = null; }
  }

  function updateExamTimer() {
    const t = el("exam-timer");
    t.textContent = fmtClock(exam.remainingSec);
    t.classList.toggle("warning", exam.remainingSec <= 600 && exam.remainingSec > 120);
    t.classList.toggle("danger", exam.remainingSec <= 120);
  }

  function renderExamQuestion() {
    const q = exam.questions[exam.index];
    const total = exam.questions.length;
    el("exam-count").textContent = `${exam.index + 1} / ${total}`;
    el("exam-bar-fill").style.width = `${((exam.index + 1) / total) * 100}%`;
    el("exam-field-label").textContent = WORLD_META[q.field].label;
    el("exam-question").textContent = q.q;
    renderFigure("exam-figure", q);

    const choicesEl = el("exam-choices");
    choicesEl.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const item = make("div", "choice-item");
      const btn = make("button", "choice-btn" + (exam.answers[exam.index] === i ? " selected" : ""));
      btn.appendChild(make("span", "choice-mark", MARKS[i]));
      btn.appendChild(make("span", null, choice));
      btn.addEventListener("click", () => {
        // 同じ選択肢をもう一度押したら選択解除
        exam.answers[exam.index] = exam.answers[exam.index] === i ? null : i;
        vibrate(15);
        renderExamQuestion();
      });
      item.appendChild(btn);
      choicesEl.appendChild(item);
    });

    el("btn-exam-prev").disabled = exam.index === 0;
    el("btn-exam-next").disabled = exam.index === total - 1;
    const unanswered = exam.answers.filter(a => a === null).length;
    el("exam-unanswered").textContent = unanswered ? `未回答 ${unanswered}問` : "すべて回答済み";
    el("btn-exam-jump").classList.toggle("hidden", unanswered === 0);
  }

  // 未回答の問題へ移動する(現在位置より後ろを優先し、なければ先頭から探す)
  function jumpToUnanswered() {
    const n = exam.questions.length;
    for (let step = 1; step <= n; step++) {
      const i = (exam.index + step) % n;
      if (exam.answers[i] === null) {
        exam.index = i;
        renderExamQuestion();
        window.scrollTo(0, 0);
        return;
      }
    }
  }

  function moveExam(delta) {
    const next = exam.index + delta;
    if (next < 0 || next >= exam.questions.length) return;
    exam.index = next;
    renderExamQuestion();
    window.scrollTo(0, 0);
  }

  function submitExam(auto) {
    const unanswered = exam.answers.filter(a => a === null).length;
    if (!auto) {
      const msg = unanswered
        ? `未回答が${unanswered}問あります。このまま採点しますか？`
        : "採点しますか？";
      if (!confirm(msg)) return;
    }
    stopExamTimer();

    const elapsedSec = Math.min(
      exam.mode.minutes * 60,
      Math.round((Date.now() - exam.startedAt) / 1000)
    );
    const results = exam.questions.map((q, i) => ({
      id: q.id,
      field: q.field,
      correct: exam.answers[i] === q.answer,
    }));

    const summary = Game.finishExam(state, exam.modeKey, results, elapsedSec);
    renderTopbar();
    renderExamResult(summary);
    showScreen("exam-result");
    if (summary.leveledUp) enqueueOverlay(showLevelUp);
    enqueueChest(summary.chest);
  }

  function renderExamResult(summary) {
    const verdict = el("exam-verdict");
    verdict.textContent = summary.passed ? "合格" : "不合格";
    verdict.className = `exam-verdict ${summary.passed ? "pass" : "fail"}`;
    el("exam-result-score").textContent = `${summary.correctCount} / ${summary.total} 正解`;
    el("exam-result-percent").textContent = `総合 ${Math.round(summary.percent * 100)}%(合格ライン60%)`;
    el("exam-result-xp").textContent = `+${summary.xpGained} XP ・ 🪙 +${summary.coinsGained}`;
    el("exam-result-elapsed").textContent = `所要時間 ${fmtDuration(summary.elapsedSec)}`;

    const breakdown = el("exam-field-breakdown");
    breakdown.innerHTML = "";
    Game.worldKeys().forEach(f => {
      const fd = summary.fields[f];
      breakdown.appendChild(buildFieldRow({
        label: WORLD_META[f].label,
        color: WORLD_META[f].color,
        percent: Math.round(fd.percent * 100),
        scoreText: `${fd.correct}/${fd.total}`,
        flag: fd.passed ? "ok" : "ng",
        flagText: fd.passed ? "基準クリア" : "30%未満",
      }));
    });

    // 間違えた問題を、選んだ選択肢つきで振り返れるようにする
    const wrongBox = el("exam-wrong-list");
    wrongBox.innerHTML = "";
    const wrongItems = exam.questions
      .map((q, i) => ({ q, picked: exam.answers[i] }))
      .filter(w => w.picked !== w.q.answer);
    if (!wrongItems.length) {
      wrongBox.appendChild(make("div", "review-empty", "全問正解です。文句なしの完璧な結果！"));
      return;
    }
    wrongItems.forEach(w => wrongBox.appendChild(buildWrongItem(w.q, w.picked, null)));
  }

  function buildFieldRow({ label, color, percent, scoreText, flag, flagText }) {
    const row = make("div", "field-row");
    const head = make("div", "field-row-head");
    head.appendChild(make("span", "field-row-name", label));
    if (flag) head.appendChild(make("span", `field-row-flag ${flag}`, flagText));
    head.appendChild(make("span", "field-row-score", scoreText));
    row.appendChild(head);
    const bar = make("div", "field-bar");
    const fill = make("div", "field-bar-fill");
    fill.style.width = `${percent}%`;
    fill.style.background = color;
    bar.appendChild(fill);
    row.appendChild(bar);
    return row;
  }

  // ---------------- 復習 ----------------
  function renderReview() {
    const wrongs = Game.wrongQuestions(state);
    el("review-count").textContent = wrongs.length;
    const hasWrong = wrongs.length > 0;
    el("review-empty").classList.toggle("hidden", hasWrong);
    el("btn-start-review").classList.toggle("hidden", !hasWrong);
    el("btn-goto-wrong").classList.toggle("hidden", !hasWrong);

    const box = el("review-field-accuracy");
    box.innerHTML = "";
    Game.fieldAccuracy(state).forEach(f => {
      box.appendChild(buildFieldRow({
        label: f.label,
        color: f.color,
        percent: f.percent,
        scoreText: f.answered ? `${f.percent}%(${f.correct}/${f.answered})` : "未挑戦",
      }));
    });
  }

  function renderWrongList() {
    const box = el("wrong-list");
    box.innerHTML = "";
    const wrongs = Game.wrongQuestions(state);
    if (!wrongs.length) {
      box.appendChild(make("div", "review-empty", "間違えた問題はありません。"));
      return;
    }
    wrongs.forEach(w => box.appendChild(buildWrongItem(w.q, null, w.wrong)));
  }

  // 折りたたみ式の誤答カード。pickedIndex を渡すと選んだ選択肢も色分けする。
  function buildWrongItem(q, pickedIndex, wrongCount) {
    const item = make("div", "wrong-item");
    const head = make("button", "wrong-item-head");
    head.appendChild(make("span", "wrong-item-q", q.q));
    if (wrongCount) head.appendChild(make("span", "wrong-item-badge", `${wrongCount}回`));
    const caret = make("span", "wrong-item-caret", "▼");
    head.appendChild(caret);
    item.appendChild(head);

    const body = make("div", "wrong-item-body hidden");
    if (q.table || q.code) {
      const fig = make("div", "battle-figure");
      renderFigure(fig, q); // まだdocumentに接続前の要素なのでIDではなく要素自体を渡す
      body.appendChild(fig);
    }
    q.choices.forEach((choice, i) => {
      let cls = "wrong-choice";
      if (i === q.answer) cls += " is-answer";
      else if (pickedIndex === i) cls += " is-picked";
      const row = make("div", cls);
      const label = make("span", "wrong-choice-label",
        `${MARKS[i]} ${i === q.answer ? "【正解】" : (pickedIndex === i ? "【あなたの回答】" : "")}`);
      row.appendChild(label);
      row.appendChild(make("span", "wrong-choice-text", ` ${choice}`));
      if (q.choiceExplains && q.choiceExplains[i]) {
        row.appendChild(make("div", "wrong-choice-explain", q.choiceExplains[i]));
      }
      body.appendChild(row);
    });
    if (q.explain) body.appendChild(make("div", "wrong-item-source", `💡 ${q.explain}`));
    item.appendChild(body);

    head.addEventListener("click", () => {
      const hidden = body.classList.toggle("hidden");
      caret.textContent = hidden ? "▼" : "▲";
    });
    return item;
  }

  // ---------------- 宝箱 ----------------
  function showChest(chest) {
    Sound.play("chest");
    el("chest-emoji").textContent = chest.emoji;
    el("chest-label").textContent = chest.label;
    el("chest-coins").textContent = `🪙 +${chest.coins}`;
    const box = el("chest-item");
    if (chest.drop) {
      const { item, isNew, refund } = chest.drop;
      box.className = `chest-item r${item.rarity}`;
      el("chest-item-emoji").textContent = item.emoji;
      el("chest-item-stars").textContent = "★".repeat(item.rarity);
      el("chest-item-name").textContent = item.name;
      const tag = el("chest-item-tag");
      tag.textContent = isNew ? "NEW" : `重複 🪙+${refund}`;
      tag.className = `chest-item-tag${isNew ? "" : " dupe"}`;
    } else {
      box.classList.add("hidden");
    }
    el("chest-overlay").classList.remove("hidden");
    vibrate([0, 50, 50, 80]);
    renderTopbar();
  }

  // ---------------- ガチャ ----------------
  // レアリティごとの必要タップ回数。★1・★2は1回、レアは2回、超レアは3回、伝説は4回。
  function stagesForRarity(rarity) {
    if (rarity <= 2) return 1;
    if (rarity === 3) return 2;
    if (rarity === 4) return 3;
    return 4; // 5以上(伝説・蒐集王の証)
  }
  const GACHA_STAGE_PROMPTS = {
    1: ["🔮 タップして結果を見る"],
    2: ["🔮 タップして占う", "✨ 何かが見えてきた…もう一度タップ"],
    3: ["🔮 タップして占う", "✨ 気配が強まる…タップで続ける", "🌟 光が集まっていく…タップで見る"],
    4: ["🔮 タップして占う", "✨ 気配が強まる…タップで続ける", "🌟 光が渦を巻く…タップで進む", "💫 何かが降りてくる…タップで見る"],
  };
  const GACHA_STAGE_ORBS = ["🔮", "✨", "🌟", "💫"];
  const GACHA_STAGE_OMENS = ["", "気配が強まっていく…", "光が渦を巻いていく…", "何かが降りてくる…"];

  function doGacha(multi) {
    if (!Game.canPull(state, multi)) return;
    const pull = Game.gachaPull(state, multi);
    if (!pull) return;
    // コンプリートした場合はガチャ結果を閉じたあとに演出を出す
    pendingCompletion = pull.completion || null;
    renderTopbar();
    renderCollection();
    playGachaAnimation(pull);
  }

  // 抽選演出。タイマーでは自動進行させず、レアリティに応じた回数だけタップさせて開示する。
  // レアリティが高いほどタップ回数が多く、タップごとに演出(オーラ・玉・音)が強くなる。
  function playGachaAnimation(pull) {
    const best = pull.results.reduce((m, r) => Math.max(m, r.item.rarity), 0);
    const totalStages = stagesForRarity(best);
    const overlay = el("gacha-anim-overlay");
    const orb = el("gacha-orb");
    const aura = el("gacha-aura");
    const omen = el("gacha-omen");
    const prompt = el("gacha-prompt");

    let stage = 0;    // これまでのタップ回数
    let locked = false; // 1タップで二重に進行しないための短い連打防止

    orb.className = "";
    orb.textContent = GACHA_STAGE_ORBS[0];
    aura.className = "gacha-aura";
    aura.style.width = "";
    aura.style.height = "";
    aura.style.filter = "";
    omen.classList.add("hidden");
    omen.textContent = "";
    prompt.textContent = GACHA_STAGE_PROMPTS[totalStages][0];
    overlay.classList.remove("hidden");
    vibrate(20);

    function showIntermediateStage() {
      // レアリティに応じた色のオーラを、タップの度に大きく・明るくしていく
      if (best >= 3) aura.classList.add(`r${Math.min(best, 5)}`);
      const baseSize = best >= 5 ? 260 : best >= 4 ? 230 : 220;
      const ratio = 0.55 + 0.15 * stage; // 1タップ目0.7 → 2タップ目0.85 → 3タップ目1.0
      aura.style.width = `${Math.round(baseSize * ratio)}px`;
      aura.style.height = `${Math.round(baseSize * ratio)}px`;
      aura.style.filter = `brightness(${(1 + stage * 0.12).toFixed(2)})`;
      orb.textContent = GACHA_STAGE_ORBS[Math.min(stage, GACHA_STAGE_ORBS.length - 1)];
      omen.textContent = GACHA_STAGE_OMENS[Math.min(stage, GACHA_STAGE_OMENS.length - 1)];
      omen.classList.remove("hidden");
      Sound.play("gachaPulse", stage);
      vibrate([0, 25 + stage * 10]);
    }

    function reveal() {
      overlay.onclick = null;
      orb.classList.add("bursting");
      Sound.play("reveal", best);
      vibrate(best >= 5 ? [0, 60, 40, 60, 40, 120] : [0, 60, 60, 90]);
      setTimeout(() => {
        overlay.classList.add("hidden");
        showGachaResult(pull);
      }, 260);
    }

    overlay.onclick = () => {
      if (locked) return;
      locked = true;
      setTimeout(() => { locked = false; }, 200);

      stage += 1;
      if (stage >= totalStages) {
        reveal();
      } else {
        showIntermediateStage();
        prompt.textContent = GACHA_STAGE_PROMPTS[totalStages][stage];
      }
    };
  }

  // ---------------- 図鑑コンプリート演出 ----------------
  function showCompletion() {
    el("complete-overlay").classList.remove("hidden");
    vibrate([0, 80, 60, 80, 60, 120]);
    renderTopbar();
  }

  function showGachaResult(pull) {
    const list = el("gacha-result-list");
    list.innerHTML = "";
    const best = pull.results.reduce((m, r) => Math.max(m, r.item.rarity), 0);
    el("gacha-result-title").textContent = best >= 5 ? "🎉 伝説のアイテム！" : best >= 4 ? "✨ 超レア出現！" : "✨ ガチャ結果";

    pull.results.forEach((r, i) => {
      const row = make("div", `gacha-result-row r${r.item.rarity}`);
      row.style.animationDelay = `${i * 60}ms`;
      row.appendChild(make("div", "gacha-result-emoji", r.item.emoji));
      const info = make("div", "gacha-result-info");
      info.appendChild(make("div", "gacha-result-name", r.item.name));
      info.appendChild(make("div", "gacha-result-meta", `${"★".repeat(r.item.rarity)} ${Game.rarityLabel(r.item.rarity)}・${r.item.category}`));
      row.appendChild(info);
      row.appendChild(make("div", `gacha-result-tag ${r.isNew ? "is-new" : "is-dupe"}`, r.isNew ? "NEW" : `🪙+${r.refund}`));
      list.appendChild(row);
    });

    const newCount = pull.results.filter(r => r.isNew).length;
    const refundTotal = pull.results.reduce((s, r) => s + r.refund, 0);
    let foot = `新しいアイテム ${newCount}個`;
    if (refundTotal > 0) foot += ` ・ 重複の還元 🪙${refundTotal}`;
    el("gacha-result-foot").textContent = foot;
    el("gacha-overlay").classList.remove("hidden");
  }

  // ---------------- 図鑑 ----------------
  function renderCollection() {
    const c = Game.getCharacterInfo(state);
    const g = Game.getGachaInfo();
    el("collection-coins").textContent = c.coins;
    el("gacha-single-cost").textContent = g.singleCost;
    el("gacha-multi-cost").textContent = g.multiCost;
    el("gacha-count").textContent = `これまで${state.gachaCount || 0}回`;

    const summary = Game.collectionSummary(state);
    const hasItems = summary.total > 0;
    el("btn-gacha-single").disabled = !Game.canPull(state, false);
    el("btn-gacha-multi").disabled = !Game.canPull(state, true);

    let hint;
    if (!hasItems) hint = "アイテムを準備中です";
    else if (c.coins < g.singleCost) hint = `あと 🪙${g.singleCost - c.coins} で1回引けます`;
    else if (summary.owned === summary.total) hint = "図鑑コンプリート！おめでとう🎉";
    else hint = "重複したアイテムはコインに還元されます";
    el("gacha-hint").textContent = hint;

    const rates = el("gacha-rates-body");
    rates.innerHTML = "";
    [5, 4, 3, 2, 1].forEach(r => {
      rates.appendChild(make("div", null, `★${r} ${Game.rarityLabel(r)} … ${Math.round(g.rates[r] * 100)}%`));
    });
    rates.appendChild(make("div", null, `10回引きは★3以上が1つ以上出ます。`));
    rates.appendChild(make("div", null, `重複時の還元 … ★1:${g.dupeRefund[1]} / ★3:${g.dupeRefund[3]} / ★5:${g.dupeRefund[5]} コイン`));

    el("collection-progress").textContent = `${summary.owned} / ${summary.total}(${summary.percent}%)`;
    el("collection-bar").style.width = `${summary.percent}%`;

    const rarityBox = el("collection-rarity");
    rarityBox.innerHTML = "";
    [1, 2, 3, 4, 5].forEach(r => {
      const d = summary.byRarity[r];
      if (!d.total) return;
      rarityBox.appendChild(make("span", `collection-rarity-chip r${r}`, `★${r} ${d.owned}/${d.total}`));
    });

    renderRarityFilter();
    renderItemGrid();
    renderSeries();
    setCollectionTab(collectionTab);
  }

  function renderRarityFilter() {
    const box = el("rarity-filter");
    box.innerHTML = "";
    const opts = [{ v: 0, label: "すべて" }, { v: 5, label: "★5" }, { v: 4, label: "★4" }, { v: 3, label: "★3" }, { v: 2, label: "★2" }, { v: 1, label: "★1" }];
    opts.forEach(o => {
      const btn = make("button", "rarity-filter-btn" + (rarityFilter === o.v ? " active" : ""), o.label);
      btn.addEventListener("click", () => {
        rarityFilter = o.v;
        renderRarityFilter();
        renderItemGrid();
      });
      box.appendChild(btn);
    });
  }

  function renderItemGrid() {
    const grid = el("item-grid");
    grid.innerHTML = "";
    let list = Game.itemsForCatalog(state);
    if (rarityFilter) list = list.filter(x => x.item.rarity === rarityFilter);
    if (!list.length) {
      const empty = make("div", "review-empty item-grid-empty", "まだアイテムがありません。");
      grid.appendChild(empty);
      return;
    }
    list.forEach(({ item, owned, count, unseen }) => {
      const cell = make("button", `item-cell r${item.rarity} ${owned ? "owned" : "locked"}`);
      cell.appendChild(make("div", "item-cell-emoji", owned ? item.emoji : "❓"));
      cell.appendChild(make("div", "item-cell-stars", "★".repeat(item.rarity)));
      if (owned && count > 1) cell.appendChild(make("div", "item-cell-count", `×${count}`));
      if (unseen) cell.appendChild(make("em", "item-cell-new", "NEW"));
      if (owned) {
        cell.addEventListener("click", () => openItemDetail(item.id));
      } else {
        cell.disabled = true;
      }
      grid.appendChild(cell);
    });
  }

  function renderSeries() {
    const box = el("collection-series");
    box.innerHTML = "";
    const list = Game.seriesProgress(state);
    if (!list.length) {
      box.appendChild(make("div", "review-empty", "ストーリーを準備中です。"));
      return;
    }
    list.forEach(s => {
      const card = make("div", "series-card" + (s.isComplete ? " complete" : ""));
      const head = make("div", "series-head");
      head.appendChild(make("div", "series-emoji", s.emoji));
      head.appendChild(make("div", "series-name", s.name));
      head.appendChild(make("div", "series-progress", `${s.ownedCount}/${s.total}`));
      card.appendChild(head);

      const chips = make("div", "series-items");
      s.items.forEach(item => {
        const owned = Game.ownsItem(state, item.id);
        const chip = make("div", `series-chip${owned ? "" : " locked"}`, owned ? item.emoji : "❓");
        chip.title = owned ? item.name : "未入手";
        chips.appendChild(chip);
      });
      card.appendChild(chips);

      const story = make("div", "series-story");
      s.unlockedStory.forEach(line => story.appendChild(make("div", "series-story-line", line)));
      if (s.isComplete && s.completeStory) {
        story.appendChild(make("div", "series-story-line complete-line", s.completeStory));
      }
      if (s.ownedCount < s.total) {
        story.appendChild(make("div", "series-story-locked", `あと${s.total - s.ownedCount}個集めると続きが読めます`));
      }
      card.appendChild(story);
      box.appendChild(card);
    });

    // 6シリーズすべて完成で読める終章
    const finale = Game.getFinale(state);
    const fcard = make("div", "finale-card" + (finale.unlocked ? "" : " locked"));
    const fhead = make("div", "finale-head");
    fhead.appendChild(make("div", "finale-emoji", finale.unlocked ? finale.emoji : "🔒"));
    fhead.appendChild(make("div", "finale-name", finale.unlocked ? finale.name : "終章"));
    fhead.appendChild(make("div", "finale-progress", `${finale.completedSeries}/${finale.totalSeries}`));
    fcard.appendChild(fhead);
    const fbody = make("div", "finale-body");
    if (finale.unlocked) {
      finale.paragraphs.forEach(p => fbody.appendChild(make("div", "finale-para", p)));
    } else {
      fbody.appendChild(make("div", "finale-locked-note",
        `6つのストーリーをすべて完成させると、それらをつなぐ終章が読めます。(残り${finale.totalSeries - finale.completedSeries}シリーズ)`));
    }
    fcard.appendChild(fbody);
    box.appendChild(fcard);
  }

  function setCollectionTab(tab) {
    collectionTab = tab;
    document.querySelectorAll(".collection-tab").forEach(b => b.classList.toggle("active", b.dataset.ctab === tab));
    el("collection-catalog").classList.toggle("hidden", tab !== "catalog");
    el("collection-series").classList.toggle("hidden", tab !== "series");
  }

  // ---------------- アイテム詳細 ----------------
  function openItemDetail(itemId) {
    const item = Game.getItem(itemId);
    if (!item) return;
    detailItemId = itemId;

    const card = document.querySelector("#item-overlay .item-detail-card");
    card.className = `item-detail-card r${item.rarity}`;
    el("item-detail-emoji").textContent = item.emoji;
    el("item-detail-stars").textContent = "★".repeat(item.rarity);
    el("item-detail-name").textContent = item.name;
    el("item-detail-cat").textContent = `${Game.rarityLabel(item.rarity)}・${item.category}`;
    el("item-detail-flavor").textContent = item.flavor;

    const effectEl = el("item-detail-effect");
    if (item.effect) {
      effectEl.textContent = `お守り効果: ${item.effect.label}`;
      effectEl.classList.remove("hidden");
    } else {
      effectEl.classList.add("hidden");
    }

    const seriesEl = el("item-detail-series");
    const series = Game.seriesProgress(state).find(s => s.itemIds.includes(item.id));
    if (series) {
      seriesEl.textContent = `${series.emoji} ${series.name}(${series.ownedCount}/${series.total})`;
      seriesEl.classList.remove("hidden");
    } else {
      seriesEl.classList.add("hidden");
    }

    el("item-detail-count").textContent = `所持数 ${state.ownedItems[item.id] || 0}`;

    const avatarBtn = el("btn-set-avatar");
    if (item.avatar) {
      const isCurrent = state.avatarItemId === item.id;
      avatarBtn.textContent = isCurrent ? "アバター設定中" : "アバターにする";
      avatarBtn.classList.toggle("is-active", isCurrent);
      avatarBtn.classList.remove("hidden");
    } else {
      avatarBtn.classList.add("hidden");
    }

    const charmBtn = el("btn-set-charm");
    if (item.effect) {
      const isCurrent = state.equippedCharm === item.id;
      charmBtn.textContent = isCurrent ? "お守り装備中" : "お守りにする";
      charmBtn.classList.toggle("is-active", isCurrent);
      charmBtn.classList.remove("hidden");
    } else {
      charmBtn.classList.add("hidden");
    }

    // 開いたら NEW バッジを消す
    if ((state.unseenItems || []).includes(item.id)) {
      Game.markItemsSeen(state, [item.id]);
      renderTopbar();
      renderItemGrid();
    }
    el("item-overlay").classList.remove("hidden");
  }

  function closeItemDetail() {
    el("item-overlay").classList.add("hidden");
    detailItemId = null;
  }

  // ---------------- ステータス ----------------
  function renderStatus() {
    const c = Game.getCharacterInfo(state);
    el("status-emoji").textContent = c.emoji;
    el("status-title").textContent = c.isCollector ? `👑 ${c.title}` : c.title;
    el("status-level").textContent = c.isCollector ? `Lv.${c.level}(${c.levelTitle})` : `Lv.${c.level}`;
    el("setting-gold-row").classList.toggle("hidden", !c.isCollector);
    el("setting-gold").checked = !(state.settings && state.settings.goldTheme === false);
    el("status-xp-fill").style.width = `${c.xpPercent}%`;
    el("status-xp-text").textContent = `${c.xp} / ${c.xpNeeded} XP`;
    el("status-accuracy").textContent = `${c.accuracy}%`;
    el("status-answered").textContent = c.totalAnswered;
    el("status-streak").textContent = c.streak;
    el("status-combo").textContent = c.maxCombo;
    el("setting-vibration").checked = !!(state.settings && state.settings.vibration);
    el("setting-bgm").checked = !!(state.settings && state.settings.bgm);
    el("setting-se").checked = !!(state.settings && state.settings.se);

    const avatarItem = state.avatarItemId ? Game.getItem(state.avatarItemId) : null;
    el("equip-avatar").textContent = avatarItem && Game.ownsItem(state, avatarItem.id)
      ? `${avatarItem.emoji} ${avatarItem.name}` : "レベルに応じた姿";
    const charmItem = state.equippedCharm ? Game.getItem(state.equippedCharm) : null;
    el("equip-charm").textContent = charmItem && Game.ownsItem(state, charmItem.id)
      ? `${charmItem.emoji} ${charmItem.effect.label}` : "なし";
    el("btn-clear-avatar").classList.toggle("hidden", !avatarItem);
    el("btn-clear-charm").classList.toggle("hidden", !charmItem);

    const fieldBox = el("status-field-accuracy");
    fieldBox.innerHTML = "";
    Game.fieldAccuracy(state).forEach(f => {
      fieldBox.appendChild(buildFieldRow({
        label: f.label,
        color: f.color,
        percent: f.percent,
        scoreText: f.answered ? `${f.percent}%(${f.correct}/${f.answered})` : "未挑戦",
      }));
    });

    const list = Game.weakTopicSummary(state);
    const box = el("status-topics");
    box.innerHTML = "";
    if (!list.length) {
      box.appendChild(make("div", "review-empty", "まだ挑戦したノードがありません。マップから始めよう。"));
      return;
    }
    list.forEach(t => {
      const row = make("div", "status-topic-row");
      row.appendChild(make("span", null, t.label));
      row.appendChild(make("span", "status-topic-stars",
        `${t.stars > 0 ? "⭐".repeat(t.stars) : "未クリア"}(${t.bestCorrect}/${t.bestTotal})`));
      box.appendChild(row);
    });
  }

  // ---------------- レベルアップ演出 ----------------
  function showLevelUp() {
    Sound.play("levelup");
    const c = Game.getCharacterInfo(state);
    el("levelup-emoji").textContent = c.emoji;
    el("levelup-level").textContent = c.level;
    el("levelup-title").textContent = c.title;
    el("levelup-overlay").classList.remove("hidden");
    vibrate([0, 60, 60, 60]);
  }

  // ---------------- 初期化 ----------------
  function init() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        trackCheatNavTap(btn.dataset.nav);
        goto(btn.dataset.nav);
      });
    });

    // 隠しコマンド: ホーム画面のロゴ連打
    el("home-logo").addEventListener("click", trackCheatLogoTap);
    // 隠しコマンド: コイン表示の長押し(マウス/タッチ両対応)
    const coinBox = el("topbar-coins-box");
    ["pointerdown"].forEach(ev => coinBox.addEventListener(ev, startCheatHold));
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => coinBox.addEventListener(ev, cancelCheatHold));
    el("btn-goto-map").addEventListener("click", () => goto("map"));
    el("btn-goto-exam").addEventListener("click", () => goto("exam"));
    el("btn-goto-review").addEventListener("click", () => goto("review"));
    el("btn-goto-wrong").addEventListener("click", () => goto("wrong"));
    el("btn-wrong-back").addEventListener("click", () => goto("review"));

    el("btn-start-review").addEventListener("click", () => startBattle("review", null, null));
    el("btn-next-question").addEventListener("click", advanceBattle);
    el("btn-battle-quit").addEventListener("click", () => {
      if (confirm("バトルを中断しますか？ここまでの成績は記録されません。")) {
        goto(battle && battle.mode === "review" ? "review" : "map");
      }
    });
    el("btn-result-map").addEventListener("click", () => goto(battle && battle.mode === "review" ? "review" : "map"));
    el("btn-result-retry").addEventListener("click", () => {
      if (!battle) return goto("map");
      startBattle(battle.mode, battle.world, battle.topic, battle.stageId);
    });

    el("btn-exam-prev").addEventListener("click", () => moveExam(-1));
    el("btn-exam-next").addEventListener("click", () => moveExam(1));
    el("btn-exam-jump").addEventListener("click", jumpToUnanswered);
    el("btn-exam-submit").addEventListener("click", () => submitExam(false));
    el("btn-exam-quit").addEventListener("click", () => {
      if (confirm("模擬試験を中断しますか？ここまでの回答は記録されません。")) {
        stopExamTimer();
        goto("exam");
      }
    });
    el("btn-exam-result-back").addEventListener("click", () => goto("exam"));

    el("setting-vibration").addEventListener("change", e => {
      state.settings.vibration = e.target.checked;
      Storage.save(state);
      if (e.target.checked) vibrate(30);
    });
    el("setting-bgm").addEventListener("change", e => {
      state.settings.bgm = e.target.checked;
      Storage.save(state);
      Sound.setSettings(state.settings);
      updateBgmForScreen(document.querySelector(".screen.active").id.replace("screen-", ""));
    });
    el("setting-se").addEventListener("change", e => {
      state.settings.se = e.target.checked;
      Storage.save(state);
      Sound.setSettings(state.settings);
      if (e.target.checked) Sound.play("select");
    });

    el("levelup-overlay").addEventListener("click", () => dismissOverlay("levelup-overlay"));
    el("chest-overlay").addEventListener("click", () => dismissOverlay("chest-overlay"));

    el("btn-goto-collection").addEventListener("click", () => goto("collection"));
    el("btn-streak-chest").addEventListener("click", () => {
      const chest = Game.claimStreakChest(state);
      if (!chest) return;
      renderTopbar();
      renderHome();
      enqueueChest(chest);
    });

    el("btn-gacha-single").addEventListener("click", () => doGacha(false));
    el("btn-gacha-multi").addEventListener("click", () => doGacha(true));
    el("btn-gacha-close").addEventListener("click", () => {
      el("gacha-overlay").classList.add("hidden");
      renderCollection();
      if (pendingCompletion) {
        pendingCompletion = null;
        enqueueOverlay(showCompletion);
      }
    });
    el("complete-overlay").addEventListener("click", () => {
      dismissOverlay("complete-overlay");
      renderCollection();
    });
    el("setting-gold").addEventListener("change", e => {
      state.settings.goldTheme = e.target.checked;
      Storage.save(state);
      applyTheme();
    });
    document.querySelectorAll(".collection-tab").forEach(btn => {
      btn.addEventListener("click", () => setCollectionTab(btn.dataset.ctab));
    });

    el("btn-item-close").addEventListener("click", closeItemDetail);
    el("item-overlay").addEventListener("click", e => {
      if (e.target === el("item-overlay")) closeItemDetail();
    });
    el("btn-set-avatar").addEventListener("click", () => {
      if (!detailItemId) return;
      const next = state.avatarItemId === detailItemId ? null : detailItemId;
      Game.setAvatar(state, next);
      renderTopbar();
      openItemDetail(detailItemId);
    });
    el("btn-set-charm").addEventListener("click", () => {
      if (!detailItemId) return;
      const next = state.equippedCharm === detailItemId ? null : detailItemId;
      Game.setCharm(state, next);
      openItemDetail(detailItemId);
    });
    el("btn-clear-avatar").addEventListener("click", () => {
      Game.setAvatar(state, null);
      renderTopbar();
      renderStatus();
    });
    el("btn-clear-charm").addEventListener("click", () => {
      Game.setCharm(state, null);
      renderStatus();
    });

    el("btn-reset").addEventListener("click", () => {
      if (confirm("セーブデータを削除して最初からやり直しますか？この操作は取り消せません。")) {
        state = Storage.reset();
        currentWorldTab = null;
        goto("home");
      }
    });

    // ブラウザの自動再生制限を回避するため、最初のタップでAudioContextを起動する
    Sound.setSettings(state.settings);
    el("setting-bgm").checked = !!(state.settings && state.settings.bgm);
    el("setting-se").checked = !!(state.settings && state.settings.se);
    const unlockOnce = () => {
      Sound.unlock();
      updateBgmForScreen(document.querySelector(".screen.active").id.replace("screen-", ""));
      document.removeEventListener("pointerdown", unlockOnce);
    };
    document.addEventListener("pointerdown", unlockOnce);

    Storage.touchStreak(state);
    // 起動時にもコンプリート判定をしておく(保存データを引き継いだ場合の取りこぼし防止)
    const completionOnBoot = Game.checkCompletion(state);
    Storage.save(state);
    goto("home");
    if (completionOnBoot) enqueueOverlay(showCompletion);

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
