function checkAnswers() {
  let score = 0;
  const feedback = [];

  // Check each question
  for (const [questionIndex, correctAnswer] of Object.entries(correctAnswers)) {
    const selectedOption = document.querySelector(`input[name="q${questionIndex}"]:checked`);

    if (selectedOption) {
      if (selectedOption.value === correctAnswer) {
        score++;
        feedback.push(`Question ${parseInt(questionIndex) + 1}: Correct!`);
      } else {
        feedback.push(`Question ${parseInt(questionIndex) + 1}: Incorrect. The correct answer is "${correctAnswer}".`);
      }
    } else {
      feedback.push(`Question ${parseInt(questionIndex) + 1}: Not answered. The correct answer is "${correctAnswer}".`);
    }
  }

  // Display results
  document.getElementById('score').textContent = `You scored ${score} out of ${Object.keys(correctAnswers).length}`;


  const createQuizBtn = document.createElement('button');
  createQuizBtn.textContent = 'Create New Quiz';
  createQuizBtn.onclick = function () {
    window.location.href = 'upload.ejs'; // EJS route for upload.ejs
  };

  const homeBtn = document.createElement('button');
  homeBtn.textContent = 'Return to Home Page';
  homeBtn.style.marginLeft = '10px';
  homeBtn.onclick = function () {
    window.location.href = 'index.ejs'; // EJS route for home.ejs
  };


  const feedbackDiv = document.getElementById('feedback');
  feedbackDiv.innerHTML = feedback.map(f => `<p>${f}</p>`).join('');

  document.getElementById('results').style.display = 'block';
  window.scrollTo(0, document.body.scrollHeight);
}