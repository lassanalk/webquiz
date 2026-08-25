// ============================================================
// WEBQUIZ — SCRIPT COMPLET
// XP + SCORE + HISTORIQUE + QUESTIONS MYSQL
// ============================================================

let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let questionsActive = false;
let selectedOption = null;
let currentTopic = "";
let correctAnswers = 0;
let wrongAnswers = 0;
let timer = null;
let timeLeft = 30;
const QUESTION_TIME = 30;

function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function isLoggedIn() {
    return !!localStorage.getItem("webquiz_token");
}

function getCurrentUser() {
    try {
        const user = localStorage.getItem("webquiz_user");
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.error("Erreur utilisateur :", error);
        return null;
    }
}

// ============================================================
// QUESTIONS MYSQL
// ============================================================

async function loadQuestions() {
    try {
        const response = await fetch("/questions");

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const questions = await response.json();

        if (!Array.isArray(questions)) {
            throw new Error("Le serveur n'a pas renvoyé une liste de questions.");
        }

        console.log("Questions MySQL récupérées :", questions);
        return questions;
    } catch (error) {
        console.error("Erreur questions :", error);
        alert(
            "Impossible de récupérer les questions.\n\n" +
            "Vérifie que Node.js est lancé avec :\n" +
            "node server.js"
        );
        return null;
    }
}

// ============================================================
// DÉMARRER QUIZ
// ============================================================

async function startQuiz(topic) {
    const allQuestions = await loadQuestions();

    if (!allQuestions) return;

    const category = String(topic).trim().toLowerCase();

    const filteredQuestions = allQuestions.filter(question =>
        question.category &&
        String(question.category).trim().toLowerCase() === category
    );

    if (filteredQuestions.length === 0) {
        const categories = [
            ...new Set(allQuestions.map(question => question.category).filter(Boolean))
        ];

        console.warn("Catégories disponibles :", categories);
        alert(`Aucune question disponible pour ${topic}.`);
        return;
    }

    currentTopic = topic;

    currentQuestions = shuffle(filteredQuestions).map(question => {
        const answers = question.options.map((option, index) => ({
            text: option,
            correct: index === question.answer
        }));

        const shuffledAnswers = shuffle(answers);

        return {
            ...question,
            options: shuffledAnswers.map(answer => answer.text),
            answer: shuffledAnswers.findIndex(answer => answer.correct)
        };
    });

    currentIndex = 0;
    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    selectedOption = null;
    questionsActive = true;

    ["saveScoreBox", "registerResultButton", "loginResultButton"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = "none";
    });

    showScreen("quizScreen");
    updateScore();
    updateCategory();
    updateProgress();
    displayQuestion();
}

// ============================================================
// CHANGER D'ÉCRAN
// ============================================================

function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.add("hidden");
    });

    const screen = document.getElementById(screenId);
    if (screen) screen.classList.remove("hidden");
}

// ============================================================
// AFFICHER QUESTION
// ============================================================

function displayQuestion() {
    stopTimer();

    if (currentIndex >= currentQuestions.length) {
        showResult();
        return;
    }

    const questionText = document.getElementById("questionText");
    const answerChoices = document.getElementById("answerChoices");
    const nextButton = document.getElementById("nextButton");
    const questionCounter = document.getElementById("questionCounter");
    const currentQuestion = currentQuestions[currentIndex];

    if (questionText) questionText.textContent = currentQuestion.question;

    if (questionCounter) {
        questionCounter.textContent =
            `Question ${currentIndex + 1} / ${currentQuestions.length}`;
    }

    if (answerChoices) answerChoices.innerHTML = "";

    selectedOption = null;

    if (nextButton) {
        nextButton.disabled = true;
        nextButton.innerHTML =
            currentIndex === currentQuestions.length - 1
                ? "Terminer ✓"
                : "Suivant →";
    }

    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "answer-button";
        button.textContent = option;

        button.addEventListener("click", () => {
            selectAnswer(index, button);
        });

        if (answerChoices) answerChoices.appendChild(button);
    });

    updateProgress();
    updateCategory();
    startTimer();
}

// ============================================================
// SÉLECTION RÉPONSE
// ============================================================

function selectAnswer(index, button) {
    if (!questionsActive) return;

    selectedOption = index;

    document.querySelectorAll(".answer-button").forEach(btn => {
        btn.classList.remove("selected");
    });

    button.classList.add("selected");

    const nextButton = document.getElementById("nextButton");
    if (nextButton) nextButton.disabled = false;
}

// ============================================================
// VALIDER RÉPONSE
// ============================================================

function submitAnswer() {
    if (selectedOption === null) {
        alert("Veuillez sélectionner une réponse.");
        return;
    }

    stopTimer();

    const currentQuestion = currentQuestions[currentIndex];

    if (selectedOption === currentQuestion.answer) {
        score++;
        correctAnswers++;
    } else {
        wrongAnswers++;
    }

    updateScore();
    currentIndex++;

    if (currentIndex < currentQuestions.length) {
        displayQuestion();
    } else {
        showResult();
    }
}

// ============================================================
// CHRONOMÈTRE
// ============================================================

function startTimer() {
    stopTimer();
    timeLeft = QUESTION_TIME;
    updateTimerDisplay();

    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            stopTimer();
            handleTimeOut();
        }
    }, 1000);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function updateTimerDisplay() {
    const timerElement = document.getElementById("quizTimer");
    if (!timerElement) return;

    timerElement.textContent = `⏱ ${timeLeft}s`;
    timerElement.classList.toggle("danger", timeLeft <= 10);
}

function handleTimeOut() {
    if (!questionsActive) return;

    wrongAnswers++;
    currentIndex++;

    if (currentIndex < currentQuestions.length) {
        displayQuestion();
    } else {
        showResult();
    }
}

// ============================================================
// SCORE
// ============================================================

function updateScore() {
    const scoreDisplay = document.getElementById("scoreDisplay");

    if (scoreDisplay) {
        scoreDisplay.innerHTML = `Score : <strong>${score}</strong>`;
    }
}

function updateCategory() {
    const categoryDisplay = document.getElementById("categoryDisplay");
    if (categoryDisplay) categoryDisplay.textContent = currentTopic;
}

function updateProgress() {
    const progressBar = document.getElementById("progressBar");

    if (!progressBar || currentQuestions.length === 0) return;

    const progress =
        (currentIndex / currentQuestions.length) * 100;

    progressBar.style.width = `${progress}%`;
}

// ============================================================
// XP
// ============================================================

function calculateXP() {
    const baseXP = score * 10;
    const perfectBonus =
        score === currentQuestions.length ? 50 : 0;
    const speedBonus = Math.max(
        0,
        Math.floor(correctAnswers * 2)
    );

    return baseXP + perfectBonus + speedBonus;
}

// ============================================================
// SAUVEGARDER SCORE
// ============================================================

async function saveScore() {
    const token = localStorage.getItem("webquiz_token");

    if (!token || currentQuestions.length <= 0) return false;

    const total = currentQuestions.length;
    const xp = calculateXP();

    try {
        const response = await fetch("/scores", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                quiz: currentTopic,
                score,
                total,
                correctAnswers,
                wrongAnswers,
                xp
            })
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            console.warn("Réponse serveur non JSON.");
        }

        if (response.status === 401) {
            localStorage.removeItem("webquiz_token");
            localStorage.removeItem("webquiz_user");
            return false;
        }

        if (!response.ok) {
            console.error("Erreur sauvegarde :", data.message);
            return false;
        }

        console.log("✅ Score sauvegardé !", data.score);
        console.log("⭐ XP gagnée :", data.xp);

        return true;
    } catch (error) {
        console.error("❌ Impossible de sauvegarder le score :", error);
        return false;
    }
}

// ============================================================
// SCORE EN ATTENTE
// ============================================================

function savePendingResult() {
    const result = {
        quiz: currentTopic,
        score,
        total: currentQuestions.length,
        correctAnswers,
        wrongAnswers,
        xp: calculateXP()
    };

    localStorage.setItem(
        "webquiz_pending_result",
        JSON.stringify(result)
    );
}

// ============================================================
// AFFICHER RÉSULTAT
// ============================================================

async function showResult() {
    stopTimer();
    questionsActive = false;

    const total = currentQuestions.length;
    const percentage = total > 0
        ? Math.round((score / total) * 100)
        : 0;

    const xp = calculateXP();

    showScreen("resultScreen");

    const resultScore = document.getElementById("resultScore");
    const resultText = document.getElementById("resultText");

    if (resultScore) resultScore.textContent = `${score} / ${total}`;

    let message;

    if (percentage === 100) {
        message = "Parfait ! Tu maîtrises ce sujet. 🔥";
    } else if (percentage >= 80) {
        message = "Excellent travail ! 🚀";
    } else if (percentage >= 60) {
        message = "Très bon résultat ! 💪";
    } else if (percentage >= 40) {
        message = "Bon début. Continue à pratiquer ! 📚";
    } else {
        message = "Continue à apprendre, tu vas progresser ! 💡";
    }

    if (resultText) {
        resultText.innerHTML = `
            <p>${message}</p>
            <strong>${percentage}% de réussite</strong>
            <br><br>
            ⭐ <strong>+${xp} XP</strong>
            <br><br>
            ✅ ${correctAnswers} bonne(s) réponse(s)
            <br>
            ❌ ${wrongAnswers} mauvaise(s) réponse(s)
        `;
    }

    if (isLoggedIn()) {
        const saved = await saveScore();

        if (saved) {
            showLoggedResult();
        } else {
            showGuestResult();
        }
    } else {
        savePendingResult();
        showGuestResult();
    }
}

// ============================================================
// RÉSULTAT VISITEUR
// ============================================================

function showGuestResult() {
    const saveScoreBox = document.getElementById("saveScoreBox");
    const registerButton = document.getElementById("registerResultButton");
    const loginButton = document.getElementById("loginResultButton");

    if (saveScoreBox) saveScoreBox.style.display = "flex";

    if (registerButton) {
        registerButton.style.display = "inline-flex";
        registerButton.href = "register.html";
    }

    if (loginButton) {
        loginButton.style.display = "inline-flex";
        loginButton.href = "login.html";
    }
}

// ============================================================
// RÉSULTAT CONNECTÉ
// ============================================================

function showLoggedResult() {
    const saveScoreBox = document.getElementById("saveScoreBox");
    const registerButton = document.getElementById("registerResultButton");
    const loginButton = document.getElementById("loginResultButton");

    if (saveScoreBox) {
        saveScoreBox.innerHTML = `
            <div class="save-score-icon">🏆</div>
            <div class="save-score-content">
                <strong>Score enregistré !</strong>
                <p>Ton résultat et tes XP ont été ajoutés à ton compte.</p>
            </div>
        `;
        saveScoreBox.style.display = "flex";
    }

    if (registerButton) {
        registerButton.textContent = "📊 Mon dashboard";
        registerButton.href = "dashboard.html";
        registerButton.style.display = "inline-flex";
    }

    if (loginButton) {
        loginButton.textContent = "🔄 Rejouer";
        loginButton.removeAttribute("href");
        loginButton.style.display = "inline-flex";
        loginButton.onclick = event => {
            event.preventDefault();
            restartQuiz();
        };
    }
}

// ============================================================
// NAVIGATION
// ============================================================

function goToRegister() {
    window.location.href = "register.html";
}

function goToLogin() {
    window.location.href = "login.html";
}

function goToDashboard() {
    window.location.href = "dashboard.html";
}

// ============================================================
// SCORE EN ATTENTE APRÈS CONNEXION
// ============================================================

async function savePendingResultAfterLogin() {
    const token = localStorage.getItem("webquiz_token");

    if (!token) return;

    const pending = localStorage.getItem("webquiz_pending_result");

    if (!pending) return;

    try {
        const result = JSON.parse(pending);

        const response = await fetch("/scores", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(result)
        });

        if (response.ok) {
            console.log("✅ Score + XP sauvegardés !");
            localStorage.removeItem("webquiz_pending_result");
        }
    } catch (error) {
        console.error("Erreur score en attente :", error);
    }
}

// ============================================================
// RECOMMENCER
// ============================================================

function restartQuiz() {
    stopTimer();

    currentQuestions = [];
    currentIndex = 0;
    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    selectedOption = null;
    currentTopic = "";
    questionsActive = false;

    const saveScoreBox = document.getElementById("saveScoreBox");
    const registerButton = document.getElementById("registerResultButton");
    const loginButton = document.getElementById("loginResultButton");

    if (saveScoreBox) saveScoreBox.style.display = "none";
    if (registerButton) registerButton.style.display = "none";
    if (loginButton) loginButton.style.display = "none";

    showScreen("ecranAcceuil");
}

function goHome() {
    restartQuiz();
}

// ============================================================
// INITIALISATION
// ============================================================

window.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("#choices .choice").forEach(button => {

        button.addEventListener("click", () => {

            const topic =
                button.dataset.category ||
                button.textContent.trim();

            startQuiz(topic);
        });
    });

    const nextButton = document.getElementById("nextButton");
    if (nextButton) nextButton.addEventListener("click", submitAnswer);

    const homeButton = document.getElementById("homeButton");
    if (homeButton) homeButton.addEventListener("click", goHome);

    const restartButton = document.getElementById("restartButton");
    if (restartButton) restartButton.addEventListener("click", restartQuiz);

    const resultHomeButton = document.getElementById("resultHomeButton");
    if (resultHomeButton) resultHomeButton.addEventListener("click", goHome);

    const registerResultButton =
        document.getElementById("registerResultButton");

    if (registerResultButton) {
        registerResultButton.addEventListener("click", goToRegister);
    }

    const loginResultButton =
        document.getElementById("loginResultButton");

    if (loginResultButton) {
        loginResultButton.addEventListener("click", () => {
            if (!isLoggedIn()) goToLogin();
        });
    }

    showScreen("ecranAcceuil");

    if (isLoggedIn()) {
        savePendingResultAfterLogin();
    }
});