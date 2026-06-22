const attempts = JSON.parse(localStorage.getItem("dashboardAttempts")) || [];
const missedQuestions = JSON.parse(localStorage.getItem("missedQuestions")) || [];

const alphaFlags = JSON.parse(localStorage.getItem("alphaFlags")) || [];
const bravoFlags = JSON.parse(localStorage.getItem("bravoFlags")) || [];
const studyFlags = JSON.parse(localStorage.getItem("studyFlags")) || [];

const allFlags = [...new Set([...alphaFlags, ...bravoFlags, ...studyFlags])];

const container = document.getElementById("dashboardContainer");

if (attempts.length === 0) {
  container.innerHTML = `
    <div class="dashboard-card">
      <h2>No Attempts Yet</h2>
      <p>Complete Alpha, Bravo, or Study Bank quizzes to generate analytics.</p>
    </div>
  `;
} else {
  let totalPercent = 0;
  let bestScore = 0;
  let domainTotals = {};
  let examTotals = {};

  attempts.forEach(attempt => {
    totalPercent += attempt.percent;
    bestScore = Math.max(bestScore, attempt.percent);

    if (!examTotals[attempt.examType]) {
      examTotals[attempt.examType] = { total: 0, count: 0 };
    }

    examTotals[attempt.examType].total += attempt.percent;
    examTotals[attempt.examType].count++;

    Object.keys(attempt.domains).forEach(domain => {
      if (!domainTotals[domain]) {
        domainTotals[domain] = { correct: 0, total: 0 };
      }

      domainTotals[domain].correct += attempt.domains[domain].correct;
      domainTotals[domain].total += attempt.domains[domain].total;
    });
  });

  const average = Number((totalPercent / attempts.length).toFixed(1));

  let readiness = "";
  if (average < 70) readiness = "Needs Work";
  else if (average < 80) readiness = "Borderline";
  else if (average < 85) readiness = "Ready";
  else if (average < 90) readiness = "Exam Ready";
  else readiness = "800-Level Ready";

  const domainRows = Object.keys(domainTotals).map(domain => {
    const d = domainTotals[domain];
    const percent = Number(((d.correct / d.total) * 100).toFixed(1));

    return {
      domain,
      percent,
      correct: d.correct,
      total: d.total
    };
  });

  const strongest = [...domainRows].sort((a, b) => b.percent - a.percent).slice(0, 5);
  const weakest = [...domainRows].sort((a, b) => a.percent - b.percent).slice(0, 5);

  const lastTen = attempts.slice(-10);
  const firstHalf = lastTen.slice(0, Math.floor(lastTen.length / 2));
  const secondHalf = lastTen.slice(Math.floor(lastTen.length / 2));

  const avgFirst = firstHalf.length
    ? firstHalf.reduce((sum, a) => sum + a.percent, 0) / firstHalf.length
    : 0;

  const avgSecond = secondHalf.length
    ? secondHalf.reduce((sum, a) => sum + a.percent, 0) / secondHalf.length
    : 0;

  let trend = "Not enough data";
  if (lastTen.length >= 4) {
    trend = avgSecond > avgFirst ? "Improving ↑" : avgSecond < avgFirst ? "Declining ↓" : "Stable →";
  }

  let recommendation = "Use Adaptive Learning mode.";
  if (weakest.length > 0) {
    recommendation =
      `Focus on ${weakest[0].domain}. Use Adaptive Learning with 25-question quizzes.`;
  }

  let html = `
    <div class="dashboard-card">
      <h2>Overall Progress</h2>
      <p><strong>Total Attempts:</strong> ${attempts.length}</p>
      <p><strong>Average Score:</strong> ${average}%</p>
      <p><strong>Best Score:</strong> ${bestScore}%</p>
      <p><strong>Readiness:</strong> ${readiness}</p>
      <p><strong>Trend:</strong> ${trend}</p>
      <p><strong>Missed Questions Stored:</strong> ${missedQuestions.length}</p>
      <p><strong>Flagged Questions:</strong> ${allFlags.length}</p>
    </div>

    <div class="dashboard-card">
      <h2>Recommended Study Plan</h2>
      <p>${recommendation}</p>
    </div>

    <div class="dashboard-card">
      <h2>Domain Heat Map</h2>
  `;

  domainRows
    .sort((a, b) => a.domain.localeCompare(b.domain))
    .forEach(item => {
      let cssClass = "weak-domain";
      if (item.percent >= 90) cssClass = "strong-domain";
      else if (item.percent >= 80) cssClass = "mid-domain";

      html += `
        <p class="${cssClass}">
          <strong>${item.domain}</strong>:
          ${item.percent}% (${item.correct}/${item.total})
        </p>
      `;
    });

  html += `
    </div>

    <div class="dashboard-card">
      <h2>Weakest Areas</h2>
  `;

  weakest.forEach(item => {
    html += `
      <p class="${item.percent < 80 ? "weak-domain" : "mid-domain"}">
        <strong>${item.domain}</strong>:
        ${item.percent}% (${item.correct}/${item.total})
      </p>
    `;
  });

  html += `
    </div>

    <div class="dashboard-card">
      <h2>Strongest Areas</h2>
  `;

  strongest.forEach(item => {
    html += `
      <p class="${item.percent >= 90 ? "strong-domain" : "mid-domain"}">
        <strong>${item.domain}</strong>:
        ${item.percent}% (${item.correct}/${item.total})
      </p>
    `;
  });

  html += `
    </div>

    <div class="dashboard-card">
      <h2>Exam Type Averages</h2>
  `;

  Object.keys(examTotals).forEach(type => {
    const avg = (examTotals[type].total / examTotals[type].count).toFixed(1);

    html += `
      <p>
        <strong>${type.toUpperCase()}:</strong>
        ${avg}% across ${examTotals[type].count} attempt(s)
      </p>
    `;
  });

  html += `
    </div>

    <div class="dashboard-card">
      <h2>Last 10 Scores</h2>
  `;

  attempts.slice(-10).reverse().forEach(attempt => {
    html += `
      <p>
        <strong>${attempt.examType.toUpperCase()}</strong>
        —
        ${attempt.percent}%
        —
        ${attempt.readiness}
        —
        ${attempt.date}
      </p>
    `;
  });

  html += `
    </div>

    <button onclick="clearDashboard()">Clear Dashboard Data</button>
  `;

  container.innerHTML = html;
}

function clearDashboard() {
  if (confirm("Clear all dashboard statistics and missed question history?")) {
    localStorage.removeItem("dashboardAttempts");
    localStorage.removeItem("missedQuestions");
    location.reload();
  }
}