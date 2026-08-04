// ITパスポート冒険記 - UI制御
(() => {
  let state = Storage.load();
  let currentWorldTab = null;
  let battle = null; // { mode, world, topic, questions, index, results, answered }

  const el = id => document.getElementById(id);

  // ---------------- Screen / Nav ----------------
  function showScreen(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    el(`screen-${name}`).classList.add("active");
    const focusMode = name === "battle" || name === "result";
    el("bottomnav").classList.toggle("hidden", focusMode);
    el("topbar").classList.remove("hidden");
    document.querySelectorAll(".nav-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.nav === name || (name === "battle" && b.dataset.nav === "map") || (name === "result" && b.dataset.nav === "map"));
    });
    window.scrollTo(0, 0);
  }

  function renderTopbar() {
    const c = Game.getCharacterInfo(state);
    el("topbar-emoji").textContent = c.emoji;
    el("topbar-title").textContent = c.title;
    el("topbar-level").textContent = `Lv.${c.level}`;
    el("topbar-xp-fill").style.width = `${c.xpPercent}%`;
    el("topbar-streak").textContent = c.streak;
  }

  // ---------------- Home ----------------
  function renderHome() {
    const c = Game.getCharacterInfo(state);
    el("home-emoji").textContent = c.emoji;
    el("home-title").textContent = c.title;
    el("home-level").textContent = `Lv.${c.level}`;
  }

  // ---------------- Map ----------------
  function findCurrentNode(mapData) {
    for (const w of mapData) {
      for (const n of w.nodes) {
        if (n.unlocked && !n.cleared) return { world: w.world, topic: n.topic, type: n.type };
      }
    }
    const lastWorld = mapData[mapData.length - 1];
    const lastNode = lastWorld.nodes[lastWorld.nodes.length - 1];
    return { world: lastWorld.world, topic: lastNode.topic, type: lastNode.type };
  }

  function renderWorldTabs(mapData, current) {
    const tabs = el("world-tabs");
    tabs.innerHTML = "";
    mapData.forEach(w => {
      const tab = document.createElement("div");
      tab.className = "world-tab" + (w.world === currentWorldTab ? " active" : "") + (!w.unlocked ? " locked" : "");
      tab.textContent = w.label;
      tab.addEventListener("click", () => {
        if (!w.unlocked) return;
        currentWorldTab = w.world;
        renderMap();
      });
      tabs.appendChild(tab);
    });
  }

  function renderMap() {
    const mapData = Game.getMapData(state);
    const current = findCurrentNode(mapData);
    if (!currentWorldTab) currentWorldTab = current.world;
    renderWorldTabs(mapData, current);

    const world = mapData.find(w => w.world === currentWorldTab);
    const container = el("map-container");
    container.innerHTML = "";

    if (!world.unlocked) {
      container.innerHTML = `<div class="map-boss-lock-hint">前のワールドのボスを倒すと解放されます</div>`;
      return;
    }

    const path = document.createElement("div");
    path.className = "map-path";

    world.nodes.forEach((node, i) => {
      if (i > 0) {
        const connector = document.createElement("div");
        connector.className = "map-connector" + (world.nodes[i - 1].cleared ? " done" : "");
        path.appendChild(connector);
      }
      const wrap = document.createElement("div");
      wrap.className = "map-node-wrap";

      const nodeEl = document.createElement("div");
      let cls = "map-node";
      if (node.type === "boss") cls += " boss";
      if (!node.unlocked) cls += " locked";
      else if (node.cleared) cls += " cleared";
      nodeEl.className = cls;

      const isCurrent = current.world === world.world && current.topic === node.topic && current.type === node.type;
      if (isCurrent && node.unlocked) {
        nodeEl.classList.add("current");
        const token = document.createElement("div");
        token.className = "player-token";
        token.textContent = "🧍";
        nodeEl.appendChild(token);
      }

      const icon = document.createElement("div");
      icon.className = "map-node-icon";
      icon.textContent = node.type === "boss" ? "👹" : (node.unlocked ? "📘" : "🔒");
      nodeEl.appendChild(icon);

      const label = document.createElement("div");
      label.className = "map-node-label";
      label.textContent = node.label;
      nodeEl.appendChild(label);

      if (node.cleared) {
        const stars = document.createElement("div");
        stars.className = "map-node-stars";
        stars.textContent = "⭐".repeat(node.stars);
        nodeEl.appendChild(stars);
      }

      nodeEl.addEventListener("click", () => {
        if (!node.unlocked) return;
        if (node.type === "boss") startBattle("boss", world.world, null);
        else startBattle("topic", world.world, node.topic);
      });

      wrap.appendChild(nodeEl);
      path.appendChild(wrap);
    });

    container.appendChild(path);
  }

  // ---------------- Battle ----------------
  function startBattle(mode, world, topic) {
    let questions;
    if (mode === "topic") questions = Game.startTopicBattle(state, topic);
    else if (mode === "boss") questions = Game.startBossBattle(state, world);
    else questions = Game.startReviewBattle(state);

    if (!questions.length) return;

    battle = { mode, world, topic, questions, index: 0, results: [], answered: false };
    showScreen("battle");
    renderQuestion();
  }

  function renderQuestion() {
    const q = battle.questions[battle.index];
    el("battle-progress").textContent = `問 ${battle.index + 1}/${battle.questions.length}`;
    el("battle-topic").textContent = battle.mode === "boss"
      ? `${Game.getMapData(state).find(w => w.world === battle.world).label} ボス戦`
      : battle.mode === "review" ? "復習ダンジョン" : TOPIC_LABELS[battle.topic];
    el("battle-question").textContent = q.q;

    const marks = ["ア", "イ", "ウ", "エ"];
    const choicesEl = el("battle-choices");
    choicesEl.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = `<span class="choice-mark">${marks[i]}</span><span>${choice}</span>`;
      btn.addEventListener("click", () => handleChoice(i));
      choicesEl.appendChild(btn);
    });

    el("battle-feedback").classList.add("hidden");
    el("btn-next-question").classList.add("hidden");
    battle.answered = false;
  }

  function handleChoice(selectedIndex) {
    if (battle.answered) return;
    battle.answered = true;
    const q = battle.questions[battle.index];
    const correct = selectedIndex === q.answer;
    battle.results.push({ id: q.id, correct });

    const buttons = el("battle-choices").querySelectorAll(".choice-btn");
    buttons.forEach((btn, i) => {
      btn.classList.add("disabled");
      if (i === q.answer) btn.classList.add("correct");
      else if (i === selectedIndex) btn.classList.add("incorrect");
    });

    const fb = el("battle-feedback");
    fb.classList.remove("hidden", "is-correct", "is-incorrect");
    fb.classList.add(correct ? "is-correct" : "is-incorrect");
    fb.textContent = (correct ? "✅ 正解！ " : "❌ 不正解… ") + q.explain;

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
    if (battle.mode === "topic") summary = Game.finishTopicBattle(state, battle.topic, battle.results);
    else if (battle.mode === "boss") summary = Game.finishBossBattle(state, battle.world, battle.results);
    else summary = Game.finishReviewBattle(state, battle.results);

    renderTopbar();
    renderResult(summary, battle.mode);
    showScreen("result");
    battle.lastSummary = summary;
  }

  function renderResult(summary, mode) {
    el("result-heading").textContent = mode === "boss" ? "👹 ボス戦の結果" : mode === "review" ? "📖 復習の結果" : "⚔️ バトル結果";
    el("result-score").textContent = `${summary.correctCount} / ${summary.total} 正解`;
    el("result-xp").textContent = `+${summary.xpGained} XP`;

    if (mode === "review") {
      el("result-stars").textContent = summary.correctCount === summary.total ? "🎉" : "📚";
    } else if (mode === "boss") {
      el("result-stars").textContent = summary.cleared ? "🏆" : "💤";
    } else {
      el("result-stars").textContent = summary.stars > 0 ? "⭐".repeat(summary.stars) : "😢";
    }

    const levelupEl = el("result-levelup");
    if (summary.leveledUp) {
      levelupEl.classList.remove("hidden");
      el("result-newlevel").textContent = summary.newLevel;
    } else {
      levelupEl.classList.add("hidden");
    }

    let msg = "";
    if (mode === "boss") {
      msg = summary.cleared ? "ボスを撃破！次のワールドが解放された！" : "正答率70%以上でボスを撃破できます。復習してから再挑戦しよう。";
    } else if (mode === "topic") {
      msg = summary.cleared ? (summary.isFirstClear ? "このノードを初クリア！ボーナスXPを獲得！" : "クリア済みのノードを再挑戦したよ。") : "正答率60%以上でノードをクリアできます。もう一度挑戦してみよう。";
    } else {
      msg = "復習お疲れさま！間違えた問題はまた出題されるよ。";
    }
    el("result-message").textContent = msg;
  }

  // ---------------- Status ----------------
  function renderStatus() {
    const c = Game.getCharacterInfo(state);
    el("status-emoji").textContent = c.emoji;
    el("status-title").textContent = c.title;
    el("status-level").textContent = `Lv.${c.level}`;
    el("status-xp-fill").style.width = `${c.xpPercent}%`;
    el("status-xp-text").textContent = `${c.xp} / ${c.xpNeeded} XP`;
    el("status-accuracy").textContent = `${c.accuracy}%`;
    el("status-answered").textContent = c.totalAnswered;
    el("status-streak").textContent = c.streak;

    const prog = Game.overallProgress(state);
    el("status-progress").textContent = `${prog.percent}%`;

    const list = Game.weakTopicSummary(state);
    const box = el("status-topics");
    box.innerHTML = "";
    if (!list.length) {
      box.innerHTML = `<div class="review-empty">まだ挑戦したノードがありません。マップから始めよう。</div>`;
      return;
    }
    list.forEach(t => {
      const row = document.createElement("div");
      row.className = "status-topic-row";
      row.innerHTML = `<span>${t.label}</span><span class="status-topic-stars">${t.stars > 0 ? "⭐".repeat(t.stars) : "未クリア"} (${t.bestCorrect}/${t.bestTotal})</span>`;
      box.appendChild(row);
    });
  }

  // ---------------- Review ----------------
  function renderReview() {
    const hasWrong = Object.values(state.wrongCounts).some(v => v > 0);
    el("review-empty").classList.toggle("hidden", hasWrong);
    el("btn-start-review").classList.toggle("hidden", !hasWrong);
  }

  // ---------------- Wiring ----------------
  function goto(name) {
    if (name === "home") renderHome();
    if (name === "map") renderMap();
    if (name === "status") renderStatus();
    if (name === "review") renderReview();
    renderTopbar();
    showScreen(name);
  }

  function init() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => goto(btn.dataset.nav));
    });
    el("btn-goto-map").addEventListener("click", () => goto("map"));
    el("btn-goto-status").addEventListener("click", () => goto("status"));
    el("btn-goto-review").addEventListener("click", () => goto("review"));
    el("btn-start-review").addEventListener("click", () => startBattle("review", null, null));
    el("btn-next-question").addEventListener("click", advanceBattle);
    el("btn-result-map").addEventListener("click", () => goto("map"));
    el("btn-result-retry").addEventListener("click", () => {
      if (!battle) return goto("map");
      startBattle(battle.mode, battle.world, battle.topic);
    });
    el("btn-reset").addEventListener("click", () => {
      if (confirm("セーブデータを削除して最初からやり直しますか？この操作は取り消せません。")) {
        state = Storage.reset();
        currentWorldTab = null;
        goto("home");
      }
    });

    Storage.touchStreak(state);
    Storage.save(state);
    goto("home");

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
