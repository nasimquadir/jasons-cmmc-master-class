let reviewQuestions = [];
let filteredReviews = [];
let currentReviewIndex = 0;

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
      "<h2>No questions to review.</h2>";

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
    <div class="review-card ${isCorrect ? "correct" : "incorrect"}">

      <h2>${q.id} ${isFlagged ? "⚑" : ""}</h2>

      <p><strong>Domain:</strong> ${q.domain}</p>
      <p><strong>Difficulty:</strong> ${q.difficulty}</p>

      <hr>

      <p><strong>Question:</strong></p>
      <p>${q.question}</p>

      <hr>

      <p>
        <strong>Your Answer:</strong>
        ${userAnswer}
        ${isCorrect ? "✅" : "❌"}
      </p>

      <p>
        <strong>Your Answer Text:</strong>
        ${q.choices[userAnswer] || "Not Answered"}
      </p>

      <p>
        <strong>Correct Answer:</strong>
        ${correctAnswer}
        ✅
      </p>

      <p>
        <strong>Correct Answer Text:</strong>
        ${q.choices[correctAnswer]}
      </p>

      <hr>

      <p><strong>Explanation:</strong></p>
      <p>${q.explanation}</p>

      <p><strong>Reference:</strong> ${q.reference}</p>

      <p><strong>Tags:</strong> ${q.tags ? q.tags.join(", ") : ""}</p>

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
  filteredReviews = reviewQuestions.filter(q => {
    const userAnswer = reviewAnswers[q.id] || "Not Answered";
    return userAnswer !== q.answer;
  });

  currentReviewIndex = 0;
  showReviewQuestion();
}

function showAllReviews() {
  filteredReviews = [...reviewQuestions];
  currentReviewIndex = 0;
  showReviewQuestion();
}