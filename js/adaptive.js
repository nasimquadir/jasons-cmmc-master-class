function startStudy(questionCount) {
  let mode =
    document.querySelector('input[name="mode"]:checked').value;

  localStorage.setItem("studyQuestionCount", questionCount);
  localStorage.setItem("studyMode", mode);

  document.querySelector(".dashboard-card").style.display = "none";
  document.getElementById("studyLaunchArea").style.display = "block";

  if (typeof loadStudyQuestions === "function") {
    loadStudyQuestions();
  } else {
    location.reload();
  }
}