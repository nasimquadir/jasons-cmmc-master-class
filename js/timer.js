// Load saved timer or start at 210 minutes (3.5 hours)
let seconds =
  parseInt(localStorage.getItem("alphaTimer")) ||
  (210 * 60);

// Update timer display
function updateTimerDisplay() {

  let hours =
    Math.floor(seconds / 3600);

  let minutes =
    Math.floor((seconds % 3600) / 60);

  let secs =
    seconds % 60;

  document.getElementById("timer").innerHTML =

    String(hours).padStart(2, "0")
    + ":"
    + String(minutes).padStart(2, "0")
    + ":"
    + String(secs).padStart(2, "0");

}

// Countdown function
function countdown() {

  // Time expired
  if (seconds <= 0) {

    clearInterval(timerInterval);

    localStorage.removeItem("alphaTimer");

    alert("Time expired. Exam will be submitted.");

    submitExam();

    return;

  }

  seconds--;

  // Save timer value
  localStorage.setItem(
    "alphaTimer",
    seconds
  );

  updateTimerDisplay();

}

// Show initial value immediately
updateTimerDisplay();

// Start timer
const timerInterval =
  setInterval(
    countdown,
    1000
  );