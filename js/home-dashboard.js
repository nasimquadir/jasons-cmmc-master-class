const attempts = JSON.parse(localStorage.getItem("dashboardAttempts")) || [];
const missedQuestions = JSON.parse(localStorage.getItem("missedQuestions")) || [];

const alphaFlags = JSON.parse(localStorage.getItem("alphaFlags")) || [];
const bravoFlags = JSON.parse(localStorage.getItem("bravoFlags")) || [];
const studyFlags = JSON.parse(localStorage.getItem("studyFlags")) || [];

const allFlags = [...new Set([...alphaFlags, ...bravoFlags, ...studyFlags])];

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function setWidth(id, value) {
  const el = document.getElementById(id);
  if (el) el.style.width = value;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readiness(score) {
  if (score < 70) return "Needs Work";
  if (score < 80) return "Borderline";
  if (score < 85) return "Ready";
  if (score < 90) return "Exam Ready";
  return "800-Level Ready";
}

function estimateTime(totalQuestions) {
  const minutes = Math.round(totalQuestions * 1.25);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

function calculateDomainRows() {
  const totals = {};

  attempts.forEach(attempt => {
    if (!attempt.domains) return;

    Object.keys(attempt.domains).forEach(domain => {
      if (!totals[domain]) {
        totals[domain] = { correct: 0, total: 0 };
      }

      totals[domain].correct += attempt.domains[domain].correct;
      totals[domain].total += attempt.domains[domain].total;
    });
  });

  return Object.keys(totals).map(domain => {
    const d = totals[domain];
    return {
      domain,
      correct: d.correct,
      total: d.total,
      percent: d.total ? Math.round((d.correct / d.total) * 100) : 0
    };
  });
}

function calculateStudyDays() {
  if (!attempts.length) return 0;

  const days = attempts.map(a =>
    new Date(a.date).toDateString()
  );

  return [...new Set(days)].length;
}

function renderRecentActivity() {
  const container = document.getElementById("recentActivityList");
  if (!container) return;

  if (!attempts.length) {
    container.innerHTML = `
      <div>
        <span class="dot blue"></span>
        <p><b>No attempts yet</b><small>Start Alpha, Bravo, Sim, or Study Bank</small></p>
        <em>Today</em>
      </div>
    `;
    return;
  }

  container.innerHTML = attempts
    .slice(-4)
    .reverse()
    .map(a => {
      const label =
        a.examType === "alpha" ? "Alpha Exam" :
        a.examType === "bravo" ? "Bravo Exam" :
        a.examType === "study" ? "Study Bank" :
        "Exam";

      const color =
        a.percent >= 85 ? "green" :
        a.percent >= 75 ? "orange" :
        a.percent >= 65 ? "purple" :
        "blue";

      return `
        <div>
          <span class="dot ${color}"></span>
          <p><b>${label} Completed</b><small>Score: ${a.percent}%</small></p>
          <em>${a.date}</em>
        </div>
      `;
    })
    .join("");
}

function renderDomainMastery(domainRows) {
  const container = document.getElementById("domainMasteryList");
  if (!container) return;

  if (!domainRows.length) {
    container.innerHTML = `
      <div>
        <p>No domain data yet<b>0%</b></p>
        <span><i style="width:0%"></i></span>
      </div>
    `;
    return;
  }

  container.innerHTML = domainRows
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 6)
    .map(d => `
      <div>
        <p>${d.domain}<b>${d.percent}%</b></p>
        <span><i style="width:${d.percent}%"></i></span>
      </div>
    `)
    .join("");
}

function renderPerformanceList(domainRows) {
  const container = document.getElementById("performanceScoreList");
  if (!container) return;

  const families = ["AC", "IA", "MP", "PE", "SC", "SI"];

  container.innerHTML = families.map(family => {
    const match = domainRows.find(d =>
      d.domain.toUpperCase().includes(family)
    );

    const percent = match ? match.percent : 0;

    return `
      <p>
        <b>${family}</b>
        <strong>${percent}%</strong>
      </p>
    `;
  }).join("");
}

function updateHomeDashboard() {
  const scores = attempts.map(a => Number(a.percent) || 0);
  const avgScore = Math.round(average(scores));

  const totalQuestions = attempts.reduce((sum, a) => {
    return sum + (Number(a.total) || 0);
  }, 0);

  const domainRows = calculateDomainRows();
  const progress = avgScore || 0;

  setText("overallProgress", `${progress}%`);
  setText("questionsCompleted", totalQuestions);
  setText("averageScore", `${avgScore}%`);
  setText("studyStreak", calculateStudyDays());
  setText("timeSpent", estimateTime(totalQuestions));
  setText("goalStatus", readiness(avgScore));
  setText("goalRing", `${progress}%`);

  setWidth("overallProgressBar", `${progress}%`);

  renderRecentActivity();
  renderDomainMastery(domainRows);
  renderPerformanceList(domainRows);
  renderNotifications(avgScore);
}

function renderNotifications(avgScore) {
  const container = document.getElementById("notificationContent");
  if (!container) return;

  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : null;

  container.innerHTML = `
    <p><strong>Missed Questions:</strong> ${missedQuestions.length}</p>
    <p><strong>Flagged Questions:</strong> ${allFlags.length}</p>
    <p><strong>Study Days:</strong> ${calculateStudyDays()}</p>
    <p><strong>Readiness:</strong> ${readiness(avgScore)}</p>
    <p><strong>Last Score:</strong> ${lastAttempt ? lastAttempt.percent + "%" : "No attempts yet"}</p>
  `;
}

function setupThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const savedTheme = localStorage.getItem("themeMode");

  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
  }

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("themeMode", isLight ? "light" : "dark");
  });
}

function setupNotificationBell() {
  const bell = document.getElementById("notificationBell");
  const panel = document.getElementById("notificationPanel");

  if (!bell || !panel) return;

  bell.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });
}

updateHomeDashboard();
setupThemeToggle();
setupNotificationBell();