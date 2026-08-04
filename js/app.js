// ITパスポート冒険記 - UI制御
(() => {
  let state = Storage.load();
  let currentWorldTab = null;
  let battle = null;   // { mode, world, topic, questions, index, results, answered, combo, maxCombo }
  let exam = null;     // { modeKey, mode, questions, answers, index, remainingSec, startedAt }
  let examTimerId = null;

  const el = id => document.getElementById(id);
  const MARKS = ["ア", "イ", "ウ", "エ"];

  // 画面名 -> 下部ナビでハイライトするタブ
  const NAV_PARENT = {
    home: "home", map: "map", battle: "map", result: "map",
    exam: "exam", "exam-battle": "exam", "exam-result": "exam",
    review: "review", wrong: "review", status: "status",
  };
  // 回答に集中させたい画面ではナビを隠す
  const HIDE_NAV = ["battle", "exam-battle"];

  // ---------------- 汎用ヘルパ ----------------
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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
  }

  function renderTopbar() {
    const c = Game.getCharacterInfo(state);
    el("topbar-emoji").textContent = c.emoji;
    el("topbar-title").textContent = c.title;
    el("topbar-level").textContent = `Lv.${c.level}`;
    el("topbar-xp-fill").style.width = `${c.xpPercent}%`;
    el("topbar-streak").textContent = c.streak;
  }

  function goto(name) {
    if (name === "home") renderHome();
    if (name === "map") renderMap();
    if (name === "exam") renderExamTop();
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
    el("home-level").textContent = `Lv.${c.level}`;
    el("home-progress").textContent = `踏破率 ${prog.percent}%(${prog.clearedTopics}/${prog.totalTopics}ノード)`;
  }

  // ---------------- マップ ----------------
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

  function renderMap() {
    const mapData = Game.getMapData(state);
    const current = findCurrentNode(mapData);
    if (!currentWorldTab) currentWorldTab = current.world;
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
      if (!node.unlocked) cls += " locked";
      else if (node.cleared) cls += " cleared";
      const nodeEl = make("div", cls);

      const isCurrent = current.world === world.world && current.topic === node.topic && current.type === node.type;
      if (isCurrent && node.unlocked) {
        nodeEl.classList.add("current");
        nodeEl.appendChild(make("div", "player-token", "🧍"));
      }

      nodeEl.appendChild(make("div", "map-node-icon", node.type === "boss" ? "👹" : (node.unlocked ? "📘" : "🔒")));
      nodeEl.appendChild(make("div", "map-node-label", node.label));
      if (node.cleared) nodeEl.appendChild(make("div", "map-node-stars", "⭐".repeat(node.stars)));

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

  // ---------------- 練習バトル ----------------
  function startBattle(mode, world, topic) {
    let questions;
    if (mode === "topic") questions = Game.startTopicBattle(state, topic);
    else if (mode === "boss") questions = Game.startBossBattle(state, world);
    else questions = Game.startReviewBattle(state);

    if (!questions.length) return;

    battle = { mode, world, topic, questions, index: 0, results: [], answered: false, combo: 0, maxCombo: 0 };
    showScreen("battle");
    renderQuestion();
  }

  function battleLabel() {
    if (battle.mode === "boss") return `${WORLD_META[battle.world].label} ボス戦`;
    if (battle.mode === "review") return "復習ダンジョン";
    return TOPIC_LABELS[battle.topic];
  }

  function renderQuestion() {
    const q = battle.questions[battle.index];
    el("battle-progress").textContent = `問 ${battle.index + 1}/${battle.questions.length}`;
    el("battle-topic").textContent = battleLabel();
    el("battle-bar-fill").style.width = `${(battle.index / battle.questions.length) * 100}%`;
    el("battle-question").textContent = q.q;

    const choicesEl = el("battle-choices");
    choicesEl.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const item = make("div", "choice-item");
      const btn = make("button", "choice-btn");
      btn.appendChild(make("span", "choice-mark", MARKS[i]));
      btn.appendChild(make("span", null, choice));
      btn.addEventListener("click", () => handleChoice(i));
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
    } else {
      battle.combo = 0;
      vibrate([50, 45, 50]);
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
    else summary = Game.finishReviewBattle(state, battle.results, battle.maxCombo);

    renderTopbar();
    renderResult(summary, battle.mode);
    showScreen("result");
    if (summary.leveledUp) showLevelUp();
  }

  function renderResult(summary, mode) {
    el("result-heading").textContent = mode === "boss" ? "👹 ボス戦の結果" : mode === "review" ? "📖 復習の結果" : "⚔️ バトル結果";
    el("result-score").textContent = `${summary.correctCount} / ${summary.total} 正解`;
    el("result-xp").textContent = `+${summary.xpGained} XP`;
    el("result-combo").textContent = battle.maxCombo >= 2 ? `🔥 最大 ${battle.maxCombo} コンボ` : "";

    if (mode === "review") el("result-stars").textContent = summary.correctCount === summary.total ? "🎉" : "📚";
    else if (mode === "boss") el("result-stars").textContent = summary.cleared ? "🏆" : "💤";
    else el("result-stars").textContent = summary.stars > 0 ? "⭐".repeat(summary.stars) : "😢";

    let msg = "";
    if (mode === "boss") {
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
    if (summary.leveledUp) showLevelUp();
  }

  function renderExamResult(summary) {
    const verdict = el("exam-verdict");
    verdict.textContent = summary.passed ? "合格" : "不合格";
    verdict.className = `exam-verdict ${summary.passed ? "pass" : "fail"}`;
    el("exam-result-score").textContent = `${summary.correctCount} / ${summary.total} 正解`;
    el("exam-result-percent").textContent = `総合 ${Math.round(summary.percent * 100)}%(合格ライン60%)`;
    el("exam-result-xp").textContent = `+${summary.xpGained} XP`;
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

  // ---------------- ステータス ----------------
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
    el("status-combo").textContent = c.maxCombo;
    el("setting-vibration").checked = !!(state.settings && state.settings.vibration);

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
      btn.addEventListener("click", () => goto(btn.dataset.nav));
    });
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
      startBattle(battle.mode, battle.world, battle.topic);
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

    el("levelup-overlay").addEventListener("click", () => {
      el("levelup-overlay").classList.add("hidden");
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
