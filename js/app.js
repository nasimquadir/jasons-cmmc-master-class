let questions = [];
let allQuestions = [];
let currentQuestion = 0;

const examType = window.examType || "alpha";

const config = {
  alpha: {
    dataFile: "data/alpha_questions.json",
    answersKey: "alphaAnswers",
    flagsKey: "alphaFlags",
    timerKey: "alphaTimer",
    orderKey: "alphaAnswerOrders",
    questionOrderKey: "alphaQuestionOrder",
    resultsKey: "results",
    title: "Exam Alpha"
  },
  bravo: {
    dataFile: "data/bravo_questions.json",
    answersKey: "bravoAnswers",
    flagsKey: "bravoFlags",
    timerKey: "bravoTimer",
    orderKey: "bravoAnswerOrders",
    questionOrderKey: "bravoQuestionOrder",
    resultsKey: "results",
    title: "Exam Bravo"
  },
  study: {
    dataFile: "data/study_bank.json",
    answersKey: "studyAnswers",
    flagsKey: "studyFlags",
    timerKey: "studyTimer",
    orderKey: "studyAnswerOrders",
    questionOrderKey: "studyQuestionOrder",
    resultsKey: "results",
    title: "Study Bank"
  }
};

const active = config[examType];

let userAnswers =
  JSON.parse(localStorage.getItem(active.answersKey)) || {};

let flaggedQuestions =
  JSON.parse(localStorage.getItem(active.flagsKey)) || [];

let answerOrders =
  JSON.parse(localStorage.getItem(active.orderKey)) || {};

let savedQuestionOrder =
  JSON.parse(localStorage.getItem(active.questionOrderKey)) || null;

fetch(active.dataFile)
  .then(response => response.json())
  .then(data => {
    allQuestions = data;

    showLoadedQuestionCount();

    if (examType === "study") {
      prepareStudyQuiz();
    } else {
      questions = restoreOrCreateQuestionOrder(allQuestions);
    }

    initializeAnswerOrders();

    if (questions.length > 0) {
      showQuestion();
    }
  })
  .catch(error => {
    document.getElementById("questionContainer").innerHTML =
      "<p>Error loading questions. Check the JSON data file.</p>";
    console.error(error);
  });

function showLoadedQuestionCount() {
  const counter = document.getElementById("questionCount");

  if (counter) {
    counter.innerText =
      `Study Bank Loaded: ${allQuestions.length} Questions`;
  }
}

function prepareStudyQuiz() {
  const count =
    Number(localStorage.getItem("studyQuestionCount")) || 10;

  const mode =
    localStorage.getItem("studyMode") || "random";

  let selected = [];

  if (mode === "missed") {
    selected = getMissedQuestions(allQuestions);
  } else if (mode === "weak") {
    selected = getWeakDomainQuestions(allQuestions);
  } else if (mode === "adaptive") {
    selected = buildAdaptiveQuiz(allQuestions, count);
  } else {
    selected = shuffleArray(allQuestions);
  }

  if (selected.length === 0) {
    selected = shuffleArray(allQuestions);
  }

  questions =
    domainAwareShuffle(selected).slice(0, count);
updateModeIndicator(
  mode,
  selected.length,
  questions.length
);
  localStorage.setItem(
    active.questionOrderKey,
    JSON.stringify(questions.map(q => q.id))
  );
}

function restoreOrCreateQuestionOrder(pool) {
  if (savedQuestionOrder) {
    const restored = savedQuestionOrder
      .map(id => pool.find(q => q.id === id))
      .filter(Boolean);

    if (restored.length === pool.length) {
      return restored;
    }
  }

  const ordered = domainAwareShuffle(pool);

  localStorage.setItem(
    active.questionOrderKey,
    JSON.stringify(ordered.map(q => q.id))
  );

  return ordered;
}

function buildAdaptiveQuiz(pool, count) {
  const weakPool = getWeakDomainQuestions(pool);
  const missedPool = getMissedQuestions(pool);
  const flaggedPool = pool.filter(q => flaggedQuestions.includes(q.id));
  const randomPool = shuffleArray(pool);

  const weakCount = Math.ceil(count * 0.4);
  const missedCount = Math.ceil(count * 0.3);
  const flaggedCount = Math.ceil(count * 0.1);
  const randomCount = count;

  let selected = [];

  selected = selected.concat(
    shuffleArray(weakPool).slice(0, weakCount)
  );

  selected = selected.concat(
    shuffleArray(missedPool).slice(0, missedCount)
  );

  selected = selected.concat(
    shuffleArray(flaggedPool).slice(0, flaggedCount)
  );

  selected = selected.concat(
    shuffleArray(randomPool).slice(0, randomCount)
  );

  selected = removeDuplicateQuestions(selected);

  if (selected.length < count) {
    const remaining = pool.filter(q =>
      !selected.some(s => s.id === q.id)
    );

    selected = selected.concat(
      shuffleArray(remaining).slice(0, count - selected.length)
    );
  }

  return selected;
}

function removeDuplicateQuestions(list) {
  const seen = new Set();

  return list.filter(q => {
    if (seen.has(q.id)) {
      return false;
    }

    seen.add(q.id);
    return true;
  });
}

function getMissedQuestions(pool) {
  const missed =
    JSON.parse(localStorage.getItem("missedQuestions")) || [];

  return pool.filter(q => missed.includes(q.id));
}

function getWeakDomainQuestions(pool) {
  const dashboardAttempts =
    JSON.parse(localStorage.getItem("dashboardAttempts")) || [];

  let domainTotals = {};

  dashboardAttempts.forEach(attempt => {
    Object.keys(attempt.domains).forEach(domain => {
      if (!domainTotals[domain]) {
        domainTotals[domain] = {
          correct: 0,
          total: 0
        };
      }

      domainTotals[domain].correct += attempt.domains[domain].correct;
      domainTotals[domain].total += attempt.domains[domain].total;
    });
  });

  const weakDomains = Object.keys(domainTotals).filter(domain => {
    const d = domainTotals[domain];
    return (d.correct / d.total) * 100 < 80;
  });

  return pool.filter(q =>
    weakDomains.includes(q.domain)
  );
}

function domainAwareShuffle(pool) {
  let remaining = shuffleArray(pool);
  let ordered = [];

  while (remaining.length > 0) {
    let nextIndex = remaining.findIndex(q =>
      !wouldCreateCluster(ordered, q)
    );

    if (nextIndex === -1) {
      nextIndex = remaining.findIndex(q =>
        !wouldCreateDomainClusterOnly(ordered, q)
      );
    }

    if (nextIndex === -1) {
      nextIndex = 0;
    }

    ordered.push(remaining[nextIndex]);
    remaining.splice(nextIndex, 1);
  }

  return ordered;
}

function wouldCreateCluster(ordered, candidate) {
  if (ordered.length < 2) {
    return false;
  }

  const lastOne = ordered[ordered.length - 1];
  const lastTwo = ordered[ordered.length - 2];

  const candidateFamily = getQuestionFamily(candidate);
  const lastOneFamily = getQuestionFamily(lastOne);
  const lastTwoFamily = getQuestionFamily(lastTwo);

  const candidateDifficulty = candidate.difficulty || "";
  const lastOneDifficulty = lastOne.difficulty || "";
  const lastTwoDifficulty = lastTwo.difficulty || "";

  const candidatePhase = getCapPhase(candidate);
  const lastOnePhase = getCapPhase(lastOne);
  const lastTwoPhase = getCapPhase(lastTwo);

  const candidateAssetType = getAssetType(candidate);
  const lastOneAssetType = getAssetType(lastOne);
  const lastTwoAssetType = getAssetType(lastTwo);

  if (
    lastOne.domain === candidate.domain &&
    lastTwo.domain === candidate.domain
  ) {
    return true;
  }

  if (
    candidateFamily &&
    lastOneFamily === candidateFamily &&
    lastTwoFamily === candidateFamily
  ) {
    return true;
  }

  if (
    candidateDifficulty &&
    lastOneDifficulty === candidateDifficulty &&
    lastTwoDifficulty === candidateDifficulty
  ) {
    return true;
  }

  if (
    candidatePhase &&
    lastOnePhase === candidatePhase &&
    lastTwoPhase === candidatePhase
  ) {
    return true;
  }

  if (
    candidateAssetType &&
    lastOneAssetType === candidateAssetType &&
    lastTwoAssetType === candidateAssetType
  ) {
    return true;
  }

  return false;
}

function wouldCreateDomainClusterOnly(ordered, candidate) {
  if (ordered.length < 2) {
    return false;
  }

  const lastOne = ordered[ordered.length - 1];
  const lastTwo = ordered[ordered.length - 2];

  return (
    lastOne.domain === candidate.domain &&
    lastTwo.domain === candidate.domain
  );
}

function getQuestionFamily(q) {
  const text =
    `${q.domain || ""} ${q.reference || ""} ${(q.tags || []).join(" ")} ${q.question || ""}`.toUpperCase();

  const families = [
    "AC", "IA", "MP", "PE", "SC", "SI",
    "CAP", "COPC", "GOVERNANCE", "SCOPING"
  ];

  for (let family of families) {
    if (text.includes(family)) {
      return family;
    }
  }

  if (text.includes("ACCESS CONTROL")) return "AC";
  if (text.includes("IDENTIFICATION")) return "IA";
  if (text.includes("MEDIA")) return "MP";
  if (text.includes("PHYSICAL")) return "PE";
  if (text.includes("COMMUNICATION")) return "SC";
  if (text.includes("INTEGRITY")) return "SI";
  if (text.includes("ASSESSMENT PROCESS")) return "CAP";
  if (text.includes("CODE OF PROFESSIONAL")) return "COPC";
  if (text.includes("SCOPE")) return "SCOPING";

  return "";
}

function getCapPhase(q) {
  const text =
    `${(q.tags || []).join(" ")} ${q.question || ""} ${q.explanation || ""}`.toUpperCase();

  if (text.includes("PHASE 1")) return "PHASE 1";
  if (text.includes("PHASE 2")) return "PHASE 2";
  if (text.includes("PHASE 3")) return "PHASE 3";
  if (text.includes("PHASE 4")) return "PHASE 4";
  if (text.includes("POA&M")) return "PHASE 4";

  return "";
}

function getAssetType(q) {
  const text =
    `${(q.tags || []).join(" ")} ${q.question || ""} ${q.explanation || ""}`.toUpperCase();

  if (text.includes("SPA") || text.includes("SECURITY PROTECTION")) {
    return "SPA";
  }

  if (text.includes("CRMA") || text.includes("CONTRACTOR RISK")) {
    return "CRMA";
  }

  if (text.includes("SPECIALIZED")) {
    return "SPECIALIZED";
  }

  if (text.includes("OUT-OF-SCOPE") || text.includes("OUT OF SCOPE")) {
    return "OUT-OF-SCOPE";
  }

  if (text.includes("CUI ASSET")) {
    return "CUI ASSET";
  }

  if (text.includes("ESP") || text.includes("EXTERNAL SERVICE")) {
    return "ESP";
  }

  return "";
}

function initializeAnswerOrders() {
  questions.forEach(q => {
    if (!answerOrders[q.id]) {
      answerOrders[q.id] = createAnswerPlacement();
    }
  });

  localStorage.setItem(
    active.orderKey,
    JSON.stringify(answerOrders)
  );
}

function createAnswerPlacement() {
  const originalLetters =
    shuffleArray(["A", "B", "C", "D"]);

  return {
    A: originalLetters[0],
    B: originalLetters[1],
    C: originalLetters[2],
    D: originalLetters[3]
  };
}

function shuffleArray(array) {
  let copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j =
      Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] =
      [copy[j], copy[i]];
  }

  return copy;
}

function showQuestion() {
  const q = questions[currentQuestion];

  if (!q) {
    document.getElementById("questionContainer").innerHTML =
      "<p>No questions loaded. Choose a quiz size or check study_bank.json.</p>";
    return;
  }

  const selected =
    userAnswers[q.id] || "";

  const isFlagged =
    flaggedQuestions.includes(q.id);

  const placement =
    answerOrders[q.id] || {
      A: "A",
      B: "B",
      C: "C",
      D: "D"
    };

  document.getElementById("questionContainer").innerHTML = `

<h2>${q.id}</h2>

<p><strong>Domain:</strong> ${q.domain}</p>
<p><strong>Difficulty:</strong> ${q.difficulty}</p>

<p>${q.question}</p>

${["A", "B", "C", "D"].map(displayLetter => {
  const originalLetter = placement[displayLetter];

  return `
<label class="choice">

<input
type="radio"
name="answer"
value="${originalLetter}"
${selected === originalLetter ? "checked" : ""}
onchange="saveAnswer('${q.id}','${originalLetter}')">

<strong>${displayLetter}.</strong>
${q.choices[originalLetter]}

</label>
`;
}).join("")}

<hr>

<p>Question ${currentQuestion + 1} of ${questions.length}</p>
<p>Answered: ${Object.keys(userAnswers).length}</p>
<p>Flagged: ${flaggedQuestions.length}</p>
<p>Remaining: ${questions.length - Object.keys(userAnswers).length}</p>

${isFlagged
  ? "<p><strong>⚑ This question is flagged for review.</strong></p>"
  : ""
}

`;

  updateProgressBar();
  buildQuestionNav();
}

function saveAnswer(questionId, answer) {
  userAnswers[questionId] = answer;

  localStorage.setItem(
    active.answersKey,
    JSON.stringify(userAnswers)
  );

  showQuestion();
}

function nextQuestion() {
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    showQuestion();
  }
}

function previousQuestion() {
  if (currentQuestion > 0) {
    currentQuestion--;
    showQuestion();
  }
}

function flagQuestion() {
  const q = questions[currentQuestion];

  if (!flaggedQuestions.includes(q.id)) {
    flaggedQuestions.push(q.id);
  } else {
    flaggedQuestions =
      flaggedQuestions.filter(id => id !== q.id);
  }

  localStorage.setItem(
    active.flagsKey,
    JSON.stringify(flaggedQuestions)
  );

  showQuestion();
}

function updateProgressBar() {
  let percent =
    questions.length > 0
      ? ((currentQuestion + 1) / questions.length) * 100
      : 0;

  document.getElementById("progressBar").style.width =
    percent + "%";
}

function jumpToQuestion(number) {
  currentQuestion = number;
  showQuestion();
}
function buildQuestionNav() {
  let html = "<h3>Question Navigator</h3>";

  html += `
    <p><strong>Answered:</strong> ${Object.keys(userAnswers).length}</p>
    <p><strong>Flagged:</strong> ${flaggedQuestions.length}</p>
    <p><strong>Remaining:</strong> ${questions.length - Object.keys(userAnswers).length}</p>
    <hr>
    <div class="nav-grid">
  `;

  questions.forEach((q, index) => {
    let classes = "nav-question";

    if (userAnswers[q.id]) {
      classes += " nav-answered";
    }

    if (index === currentQuestion) {
      classes += " nav-current";
    }

    if (flaggedQuestions.includes(q.id)) {
      classes += " nav-flagged";
    }

    html += `
      <button
        class="${classes}"
        onclick="jumpToQuestion(${index})">
        ${index + 1}
      </button>
    `;
  });

  html += "</div>";

  document.getElementById("questionNav").innerHTML = html;
}
function updateModeIndicator(mode, poolSize, selectedSize) {
  const indicator = document.getElementById("modeIndicator");

  if (!indicator) return;

  let label = "";

  if (mode === "random") label = "Random";
  if (mode === "missed") label = "Missed Questions Only";
  if (mode === "weak") label = "Weak Domains Only";
  if (mode === "adaptive") label = "Adaptive Learning";

  indicator.innerText =
    `Mode: ${label} | Pool Used: ${poolSize} questions | Quiz Loaded: ${selectedSize} questions`;
}

function resetExam() {
  let confirmReset = confirm(
    `Reset ${active.title}?\n\nThis will erase answers, flags, results, timer, randomized answer placement, and randomized question order.`
  );

  if (confirmReset) {
    localStorage.removeItem(active.answersKey);
    localStorage.removeItem(active.flagsKey);
    localStorage.removeItem(active.timerKey);
    localStorage.removeItem(active.orderKey);
    localStorage.removeItem(active.questionOrderKey);
    localStorage.removeItem(active.resultsKey);

    location.reload();
  }
}