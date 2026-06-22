const attempts = JSON.parse(localStorage.getItem("dashboardAttempts")) || [];
const missedQuestions = JSON.parse(localStorage.getItem("missedQuestions")) || [];

const alphaFlags = JSON.parse(localStorage.getItem("alphaFlags")) || [];
const bravoFlags = JSON.parse(localStorage.getItem("bravoFlags")) || [];
const studyFlags = JSON.parse(localStorage.getItem("studyFlags")) || [];

const allFlags = [...new Set([...alphaFlags, ...bravoFlags, ...studyFlags])];

function avg(list) {
  if (!list.length) return 0;
  return list.reduce((sum, n) => sum + n, 0) / list.length;
}

function getReadiness(score) {
  if (score < 70) return "Needs Work";
  if (score < 80) return "Borderline";
  if (score < 85) return "Ready";
  if (score < 90) return "Exam Ready";
  return "800-Level Ready";
}

function calculateDashboard() {
  const totalAttempts = attempts.length;
  const scores = attempts.map(a => Number(a.percent) || 0);
  const averageScore = Math.round(avg(scores));
  const bestScore = scores.length ? Math.max(...scores) : 0;

  const questionsCompleted = attempts.reduce((sum, a) => {
    return sum + (Number(a.total) || 0);
  }, 0);

  let domainTotals = {};

  attempts.forEach(attempt => {
    if (!attempt.domains) return;

    Object.keys(attempt.domains).forEach(domain => {
      if (!domainTotals[domain]) {
        domainTotals[domain] = { correct: 0, total: 0 };
      }

      domainTotals[domain].correct += attempt.domains[domain].correct;
      domainTotals[domain].total += attempt.domains[domain].total;
    });
  });

  const domainRows = Object.keys(domainTotals).map(domain => {
    const d = domainTotals[domain];

    return {
      domain,
      percent: d.total ? Math.round((d.correct / d.total) * 100) : 0,
      correct: d.correct,
      total: d.total
    };
  });

  const overallProgress = averageScore || 0;

  updateText("overallProgress", `${overallProgress}%`);
  updateText("questionsCompleted", questionsCompleted);
  updateText("averageScore", `${averageScore}%`);
  updateText("studyStreak", calculateStudyStreak());
  updateText("timeSpent", estimateTimeSpent(questionsCompleted));

  updateWidth("overallProgressBar", `${overallProgress}%`);
  updateText("goalRing", `${overallProgress}%`);

  updateRecentActivity();
  updateDomainMastery(domainRows);
  updatePerformanceList(domainRows);

  const readiness = getReadiness(averageScore);
  updateText("goalStatus", readiness);
}

function updateText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function updateWidth(id, value) {
  const el = document.getElementById(id);
  if (el) el.style.width = value;
}

function estimateTimeSpent(questionsCompleted) {
  const minutes = Math.round(questionsCompleted * 1.25);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return `${hours}h ${remaining}m`;
}

function calculateStudyStreak() {
  if (!attempts.length) return 0;

  const uniqueDates = [
    ...new Set(
      attempts.map(a => new Date(a.date).toDateString())
    )
  ];

  return uniqueDates.length;
}

function updateRecentActivity() {
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

      const dot =
        a.percent >= 85 ? "green" :
        a.percent >= 75 ? "orange" :
        a.percent >= 65 ? "purple" :
        "blue";

      return `
        <div>
          <span class="dot ${dot}"></span>
          <p><b>${label} Completed</b><small>Score: ${a.percent}%</small></p>
          <em>${a.date}</em>
        </div>
      `;
    })
    .join("");
}

function updateDomainMastery(domainRows) {
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
    .sort((a, b) => a.domain.localeCompare(b.domain))
    .map(d => `
      <div>
        <p>${d.domain}<b>${d.percent}%</b></p>
        <span><i style="width:${d.percent}%"></i></span>
      </div>
    `)
    .join("");
}

function updatePerformanceList(domainRows) {
  const container = document.getElementById("performanceScoreList");
  if (!container) return;

  const shortNames = ["AC", "IA", "MP", "PE", "SC", "SI"];

  container.innerHTML = shortNames.map(short => {
    const found = domainRows.find(d =>
      d.domain.toUpperCase().includes(short)
    );

    const percent = found ? found.percent : 0;

    return `
      <p><b>${short}</b><strong>${percent}%</strong></p>
    `;
  }).join("");
}

calculateDashboard();