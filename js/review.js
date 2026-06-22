let reviewQuestions = [];
let filteredReviews = [];
let currentReviewIndex = 0;
let currentFilter = "all";

const lastExamType =
  localStorage.getItem("lastExamType") || "alpha";

const reviewConfig = {
  alpha: {
    dataFile: "data/alpha_questions.json",
    answersKey: "alphaAnswers",
    flagsKey: "alphaFlags"
  },
  bravo: {
    dataFile: "data/bravo_questions.json",
    answersKey: "bravoAnswers",
    flagsKey: "bravoFlags"
  },
  study: {
    dataFile: "data/study_bank.json",
    answersKey: "studyAnswers",
    flagsKey: "studyFlags"
  }
};

const activeReview = reviewConfig[lastExamType];

let reviewAnswers =
  JSON.parse(localStorage.getItem(activeReview.answersKey)) || {};

let reviewFlags =
  JSON.parse(localStorage.getItem(activeReview.flagsKey)) || [];

fetch(activeReview.dataFile)
  .then(response => response.json())
  .then(data => {
    reviewQuestions = data.filter(q => reviewAnswers[q.id]);
    filteredReviews = [...reviewQuestions];
    showReviewQuestion();
  })
  .catch(error => {
    document.getElementById("reviewContainer").innerHTML =
      "<p>Error loading review data.</p>";
    console.error(error);
  });

function showReviewQuestion() {
  const q = filteredReviews[currentReviewIndex];

  if (!q) {
    document.getElementById("reviewContainer").innerHTML =
      "<h2>No questions match this review filter.</h2>";

    document.getElementById("reviewCounter").innerText = "";
    return;
  }

  const userAnswer = reviewAnswers[q.id] || "Not Answered";
  const correctAnswer = q.answer;
  const isCorrect = userAnswer === correctAnswer;
  const isFlagged = reviewFlags.includes(q.id);

  document.getElementById("reviewCounter").innerText =
    `Review ${currentReviewIndex + 1} of ${filteredReviews.length}`;

  document.getElementById("reviewContainer").innerHTML = `
    <div class="review-card ${isCorrect ? "correct-review" : "incorrect-review"}">

      <div class="review-header">
        <h2>${q.id} ${isFlagged ? "⚑" : ""}</h2>
        <span class="${isCorrect ? "status-correct" : "status-incorrect"}">
          ${isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>

      <div class="review-meta">
        <span><strong>Domain:</strong> ${q.domain}</span>
        <span><strong>Difficulty:</strong> ${q.difficulty}</span>
        <span><strong>Exam:</strong> ${lastExamType.toUpperCase()}</span>
      </div>

      <hr>

      <h3>Question</h3>
      <p>${q.question}</p>

      <div class="review-answer-grid">
        <div class="answer-box ${isCorrect ? "answer-good" : "answer-bad"}">
          <h3>Your Answer</h3>
          <p><strong>${userAnswer}</strong> ${isCorrect ? "✅" : "❌"}</p>
          <p>${q.choices[userAnswer] || "Not Answered"}</p>
        </div>

        <div class="answer-box answer-good">
          <h3>Correct Answer</h3>
          <p><strong>${correctAnswer}</strong> ✅</p>
          <p>${q.choices[correctAnswer]}</p>
        </div>
      </div>

      <hr>

      <h3>Explanation</h3>
      <p>${q.explanation}</p>

      <h3>Reference</h3>
      <p>${q.reference}</p>

      <h3>Tags</h3>
      <p>${q.tags ? q.tags.join(", ") : "None"}</p>

    </div>
  `;
}

function nextReview() {
  if (currentReviewIndex < filteredReviews.length - 1) {
    currentReviewIndex++;
    showReviewQuestion();
  }
}

function previousReview() {
  if (currentReviewIndex > 0) {
    currentReviewIndex--;
    showReviewQuestion();
  }
}

function showMissedOnly() {
  currentFilter = "missed";

  filteredReviews = reviewQuestions.filter(q => {
    const userAnswer = reviewAnswers[q.id] || "Not Answered";
    return userAnswer !== q.answer;
  });

  currentReviewIndex = 0;
  showReviewQuestion();
}

function showFlaggedOnly() {
  currentFilter = "flagged";

  filteredReviews = reviewQuestions.filter(q =>
    reviewFlags.includes(q.id)
  );

  currentReviewIndex = 0;
  showReviewQuestion();
}

function showAllReviews() {
  currentFilter = "all";
  filteredReviews = [...reviewQuestions];
  currentReviewIndex = 0;
  showReviewQuestion();
}

function searchReview() {
  const term =
    document.getElementById("reviewSearch").value.trim().toLowerCase();

  let base = [...reviewQuestions];

  if (currentFilter === "missed") {
    base = base.filter(q => {
      const userAnswer = reviewAnswers[q.id] || "Not Answered";
      return userAnswer !== q.answer;
    });
  }

  if (currentFilter === "flagged") {
    base = base.filter(q => reviewFlags.includes(q.id));
  }

  if (!term) {
    filteredReviews = base;
  } else {
    filteredReviews = base.filter(q => {
      const tagText = q.tags ? q.tags.join(" ").toLowerCase() : "";

      return (
        q.id.toLowerCase().includes(term) ||
        q.domain.toLowerCase().includes(term) ||
        q.difficulty.toLowerCase().includes(term) ||
        q.question.toLowerCase().includes(term) ||
        tagText.includes(term)
      );
    });
  }

  currentReviewIndex = 0;
  showReviewQuestion();
}