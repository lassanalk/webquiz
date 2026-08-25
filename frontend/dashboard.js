document.addEventListener("DOMContentLoaded", async () => {

    // =========================================================
    // CONFIGURATION
    // =========================================================

    const API_URL = "http://localhost:3000";

    const TOKEN_KEY = "webquiz_token";
    const USER_KEY = "webquiz_user";


    // =========================================================
    // RÉCUPÉRER LA SESSION
    // =========================================================

    const token = localStorage.getItem(TOKEN_KEY);
    const userData = localStorage.getItem(USER_KEY);


    // =========================================================
    // VÉRIFICATION LOCALE
    // =========================================================

    if (!token) {

        console.warn("Aucun token trouvé.");

        window.location.href = "login.html";

        return;
    }


    let user = null;


    if (userData) {

        try {

            user = JSON.parse(userData);

        } catch (error) {

            console.error(
                "Utilisateur local invalide :",
                error
            );

            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);

            window.location.href = "login.html";

            return;
        }
    }


    // =========================================================
    // FONCTION DÉCONNEXION
    // =========================================================

    function logout() {

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        window.location.href = "login.html";
    }


    // =========================================================
    // VÉRIFIER JWT AVEC /AUTH/ME
    // =========================================================

    try {

        console.log("🔐 Vérification de la session...");


        const response = await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );


        const contentType =
            response.headers.get("content-type") || "";


        let data = {};


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data = await response.json();

        } else {

            const text = await response.text();

            console.error(
                "Réponse /auth/me non JSON :",
                text
            );

            logout();

            return;
        }


        console.log(
            "Réponse /auth/me :",
            data
        );


        // =====================================================
        // TOKEN INVALIDE / EXPIRÉ
        // =====================================================

        if (response.status === 401) {

            console.error(
                "❌ Token invalide ou expiré."
            );

            logout();

            return;
        }


        if (!response.ok) {

            console.error(
                "❌ Erreur /auth/me :",
                data
            );

            logout();

            return;
        }


        // =====================================================
        // UTILISATEUR SERVEUR
        // =====================================================

        if (data.user) {

            user = data.user;


            localStorage.setItem(
                USER_KEY,
                JSON.stringify(user)
            );
        }


        console.log(
            "✅ Session valide :",
            user
        );


    } catch (error) {

        console.error(
            "❌ Impossible de vérifier la session :",
            error
        );

        return;
    }


    // =========================================================
    // AFFICHER NOM
    // =========================================================

    const welcome =
        document.getElementById("welcome");


    if (welcome && user) {

        welcome.textContent =
            `Bonjour ${user.name || "Utilisateur"} 👋`;
    }


    // =========================================================
    // AFFICHER EMAIL
    // =========================================================

    const userEmail =
        document.getElementById("userEmail");


    if (userEmail && user) {

        userEmail.textContent =
            user.email || "";
    }


    // =========================================================
    // AFFICHER XP
    // =========================================================

    const xpElement =
        document.getElementById("xp");


    if (xpElement && user) {

        xpElement.textContent =
            Number(user.xp || 0);
    }


    const xpDisplay =
        document.getElementById("xpDisplay");


    if (xpDisplay && user) {

        xpDisplay.textContent =
            `${Number(user.xp || 0)} XP`;
    }


    // =========================================================
    // AFFICHER NIVEAU
    // =========================================================

    const levelElement =
        document.getElementById("level");


    if (levelElement && user) {

        levelElement.textContent =
            Number(user.level || 1);
    }


    const levelDisplay =
        document.getElementById("levelDisplay");


    if (levelDisplay && user) {

        levelDisplay.textContent =
            `Niveau ${Number(user.level || 1)}`;
    }


    // =========================================================
    // PREMIUM
    // =========================================================

    const premiumElement =
        document.getElementById("premium");


    if (premiumElement && user) {

        if (user.premium) {

            premiumElement.textContent =
                "⭐ Premium";

        } else {

            premiumElement.textContent =
                "Compte gratuit";
        }
    }


    // =========================================================
    // BOUTON COMMENCER QUIZ
    // =========================================================

    const startQuizButton =
        document.getElementById(
            "startQuizButton"
        );


    if (startQuizButton) {

        startQuizButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "index.html";
            }
        );
    }


    // =========================================================
    // CHARGER LES SCORES
    // =========================================================

    try {

        console.log(
            "📊 Chargement des scores..."
        );


        const response = await fetch(
            `${API_URL}/scores`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"
                }
            }
        );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let data = {};


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();

            console.error(
                "Réponse /scores non JSON :",
                text
            );

            return;
        }


        console.log(
            "📊 Réponse scores :",
            data
        );


        // =====================================================
        // SESSION EXPIRÉE
        // =====================================================

        if (response.status === 401) {

            console.error(
                "❌ Session expirée."
            );

            logout();

            return;
        }


        // =====================================================
        // AUTRE ERREUR
        // =====================================================

        if (!response.ok) {

            console.error(
                "❌ Erreur récupération scores :",
                data
            );

            return;
        }


        // =====================================================
        // SCORES
        // =====================================================

        const scores =
            Array.isArray(data.scores)
                ? data.scores
                : [];


        console.log(
            `✅ ${scores.length} score(s) récupéré(s).`
        );


        // =====================================================
        // XP SERVEUR
        // =====================================================

        const xp =
            Number(
                data.xp ??
                user.xp ??
                0
            );


        user.xp = xp;


        // =====================================================
        // NIVEAU SERVEUR
        // =====================================================

        if (data.level !== undefined) {

            user.level =
                Number(data.level);

        } else {

            user.level =
                Number(user.level || 1);
        }


        // =====================================================
        // METTRE À JOUR LOCALSTORAGE
        // =====================================================

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(user)
        );


        // =====================================================
        // AFFICHER XP
        // =====================================================

        if (xpElement) {

            xpElement.textContent =
                xp;
        }


        if (xpDisplay) {

            xpDisplay.textContent =
                `${xp} XP`;
        }


        // =====================================================
        // AFFICHER NIVEAU
        // =====================================================

        if (levelElement) {

            levelElement.textContent =
                user.level;
        }


        if (levelDisplay) {

            levelDisplay.textContent =
                `Niveau ${user.level}`;
        }


        // =====================================================
        // STATISTIQUES
        // =====================================================

        const totalQuiz =
            scores.length;


        // -----------------------------------------------------
        // MEILLEUR SCORE
        // -----------------------------------------------------

        const bestScore =
            totalQuiz > 0
                ? Math.max(
                    ...scores.map(
                        item =>
                            Number(
                                item.percentage ??
                                calculatePercentage(item)
                            )
                    )
                )
                : 0;


        // -----------------------------------------------------
        // MOYENNE
        // -----------------------------------------------------

        const average =
            totalQuiz > 0
                ? Math.round(
                    scores.reduce(
                        (
                            sum,
                            item
                        ) => {

                            const percentage =
                                Number(
                                    item.percentage ??
                                    calculatePercentage(item)
                                );

                            return sum +
                                percentage;
                        },
                        0
                    ) /
                    totalQuiz
                )
                : 0;


        // -----------------------------------------------------
        // TOTAL BONNES RÉPONSES
        // -----------------------------------------------------

        const totalCorrect =
            scores.reduce(
                (
                    sum,
                    item
                ) => {

                    const correct =
                        Number(
                            item.correctAnswers ??
                            item.score ??
                            0
                        );

                    return sum + correct;
                },
                0
            );


        // =====================================================
        // AFFICHER TOTAL QUIZ
        // =====================================================

        const totalQuizElement =
            document.getElementById(
                "totalQuiz"
            );


        if (totalQuizElement) {

            totalQuizElement.textContent =
                totalQuiz;
        }


        // =====================================================
        // AFFICHER MEILLEUR SCORE
        // =====================================================

        const bestScoreElement =
            document.getElementById(
                "bestScore"
            );


        if (bestScoreElement) {

            bestScoreElement.textContent =
                `${bestScore}%`;
        }


        // =====================================================
        // AFFICHER MOYENNE
        // =====================================================

        const averageScoreElement =
            document.getElementById(
                "averageScore"
            );


        if (averageScoreElement) {

            averageScoreElement.textContent =
                `${average}%`;
        }


        // =====================================================
        // AFFICHER TOTAL BONNES RÉPONSES
        // =====================================================

        const totalCorrectElement =
            document.getElementById(
                "totalCorrect"
            );


        if (totalCorrectElement) {

            totalCorrectElement.textContent =
                totalCorrect;
        }


        // =====================================================
        // HISTORIQUE
        // =====================================================

        displayHistory(scores);


    } catch (error) {

        console.error(
            "❌ Erreur chargement dashboard :",
            error
        );
    }


    // =========================================================
    // DÉCONNEXION
    // =========================================================

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {

                console.log(
                    "👋 Déconnexion..."
                );

                logout();
            }
        );
    }

});


// =============================================================
// CALCUL POURCENTAGE
// =============================================================

function calculatePercentage(score) {

    const correct =
        Number(
            score.correctAnswers ??
            score.score ??
            0
        );


    const total =
        Number(
            score.total ??
            0
        );


    if (total <= 0) {

        return 0;
    }


    return Math.round(
        (correct / total) * 100
    );
}


// =============================================================
// HISTORIQUE
// =============================================================

function displayHistory(scores) {

    const container =
        document.getElementById(
            "historyContainer"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    // =========================================================
    // AUCUN SCORE
    // =========================================================

    if (
        !Array.isArray(scores) ||
        scores.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-history">

                <p>
                    📚 Aucun quiz terminé.
                </p>

                <p>
                    Commence ton premier quiz ! 🚀
                </p>

            </div>

        `;

        return;
    }


    // =========================================================
    // PLUS RÉCENT EN PREMIER
    // =========================================================

    const sortedScores =
        [...scores].sort(
            (a, b) => {

                const dateA =
                    new Date(
                        a.date ||
                        a.createdAt ||
                        0
                    );

                const dateB =
                    new Date(
                        b.date ||
                        b.createdAt ||
                        0
                    );

                return dateB - dateA;
            }
        );


    // =========================================================
    // AFFICHER CHAQUE SCORE
    // =========================================================

    sortedScores.forEach(
        score => {

            // -------------------------------------------------
            // DATE
            // -------------------------------------------------

            const dateValue =
                score.date ||
                score.createdAt;


            const date =
                dateValue
                    ? new Date(dateValue)
                    : new Date();


            const formattedDate =
                date.toLocaleDateString(
                    "fr-FR",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }
                );


            const formattedTime =
                date.toLocaleTimeString(
                    "fr-FR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );


            // -------------------------------------------------
            // DONNÉES SCORE
            // -------------------------------------------------

            const correct =
                Number(
                    score.correctAnswers ??
                    score.score ??
                    0
                );


            const total =
                Number(
                    score.total ??
                    0
                );


            const percentage =
                Number(
                    score.percentage ??
                    calculatePercentage(score)
                );


            const xpGained =
                Number(
                    score.xpGained ??
                    0
                );


            const quizName =
                score.quiz ||
                score.quizName ||
                "Quiz";


            // -------------------------------------------------
            // CARD
            // -------------------------------------------------

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "history-card";


            card.innerHTML = `

                <div class="history-info">

                    <h3>
                        ${escapeHtml(quizName)}
                    </h3>

                    <p>
                        📅 ${formattedDate}
                        à ${formattedTime}
                    </p>

                </div>


                <div class="history-score">

                    <strong>
                        ${correct}
                        /
                        ${total}
                    </strong>

                    <span>
                        ${percentage}%
                    </span>

                    <small>
                        ⭐ +${xpGained} XP
                    </small>

                </div>

            `;


            container.appendChild(
                card
            );
        }
    );
}


// =============================================================
// PROTECTION HTML
// =============================================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(text ?? "");


    return div.innerHTML;
}