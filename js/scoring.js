function submitExam() {
  let score = 0;
  let domainStats = {};

  let missedQuestions =
    JSON.parse(localStorage.getItem("missedQuestions")) || [];

  questions.forEach(q => {
    const domain = q.domain;

    if (!domainStats[domain]) {
      domainStats[domain] = {
        correct: 0,
        total: 0
      };
    }

    domainStats[domain].total++;

    if (userAnswers[q.id] === q.answer) {
      score++;
      domainStats[domain].correct++;

      missedQuestions =
        missedQuestions.filter(id => id !== q.id);
    } else {
      if (!missedQuestions.includes(q.id)) {
        missedQuestions.push(q.id);
      }
    }
  });

  localStorage.setItem(
    "missedQuestions",
    JSON.stringify(missedQuestions)
  );

  const percent =
    Number(((score / questions.length) * 100).toFixed(1));

  let readiness = "";

  if (percent < 70) readiness = "Needs Work";
  else if (percent < 80) readiness = "Borderline";
  else if (percent < 85) readiness = "Ready";
  else readiness = "Exam Ready";

  const attempt = {
    examType: examType,
    date: new Date().toLocaleString(),
    score: score,
    total: questions.length,
    percent: percent,
    readiness: readiness,
    domains: domainStats
  };

  let attempts =
    JSON.parse(localStorage.getItem("dashboardAttempts")) || [];

  attempts.push(attempt);

  localStorage.setItem(
    "dashboardAttempts",
    JSON.stringify(attempts)
  );

  let domainReport = "<h2>Domain Performance</h2>";

  Object.keys(domainStats).forEach(domain => {
    const d = domainStats[domain];

    const domainPercent =
      ((d.correct / d.total) * 100).toFixed(1);

    const weakClass =
      Number(domainPercent) < 80
        ? "weak-domain"
        : "strong-domain";

    domainReport += `
      <p class="${weakClass}">
        <strong>${domain}</strong>:
        ${d.correct}/${d.total}
        (${domainPercent}%)
      </p>
    `;
  });

  const report = `
    <h1>Exam Results</h1>

    <h2>${active.title}</h2>

    <h2>Score</h2>
    <h1>${score}/${questions.length}</h1>
    <h2>${percent}%</h2>
    <h2>${readiness}</h2>

    <hr>

    <p><strong>Answered Questions:</strong> ${Object.keys(userAnswers).length}</p>
    <p><strong>Flagged Questions:</strong> ${flaggedQuestions.length}</p>
    <p><strong>Total Missed Questions Stored:</strong> ${missedQuestions.length}</p>

    <hr>

    ${domainReport}

    <br>

    <a href="review.html"><button>Review Exam</button></a>
    <a href="dashboard.html"><button>Statistics Dashboard</button></a>
    <a href="index.html"><button>Main Menu</button></a>
  `;

  localStorage.setItem("results", report);
  localStorage.setItem("lastExamType", examType);

  localStorage.removeItem(active.timerKey);

  window.location.href = "results.html";
}