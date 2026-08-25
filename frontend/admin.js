document.addEventListener(
    "DOMContentLoaded",
    () => {

        const token =
            localStorage.getItem(
                "webquiz_token"
            );

        const savedUser =
            localStorage.getItem(
                "webquiz_user"
            );


        /* =====================================================
           VÉRIFICATION SESSION
        ===================================================== */

        if (!token) {

            window.location.href =
                "login.html";

            return;
        }


        let currentUser = null;

        try {

            currentUser =
                JSON.parse(savedUser);

        } catch {

            currentUser = null;
        }


        if (
            !currentUser ||
            currentUser.role !== "admin"
        ) {

            alert(
                "Accès réservé aux administrateurs."
            );

            window.location.href =
                "dashboard.html";

            return;
        }


        const adminName =
            document.getElementById(
                "adminName"
            );


        if (adminName) {

            adminName.textContent =
                currentUser.name ||
                "Administrateur";
        }


        /* =====================================================
           REQUÊTE API ADMIN
        ===================================================== */

        async function adminFetch(
            url,
            options = {}
        ) {

            options.headers = {

                ...(options.headers || {}),

                Authorization:
                    `Bearer ${token}`,

                "Content-Type":
                    "application/json"
            };


            const response =
                await fetch(
                    url,
                    options
                );


            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    "webquiz_token"
                );

                localStorage.removeItem(
                    "webquiz_user"
                );

                window.location.href =
                    "login.html";

                throw new Error(
                    "Accès refusé"
                );
            }


            return response;
        }


        /* =====================================================
           NAVIGATION
        ===================================================== */

        const navItems =
            document.querySelectorAll(
                ".nav-item"
            );

        const sections =
            document.querySelectorAll(
                ".section"
            );

        const pageTitle =
            document.getElementById(
                "pageTitle"
            );


        const titles = {

            dashboard:
                "Dashboard",

            users:
                "Utilisateurs",

            scores:
                "Scores",

            ranking:
                "Classement",

            questions:
                "Questions",

            premium:
                "Premium"
        };


        navItems.forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const sectionName =
                            item.dataset.section;


                        navItems.forEach(
                            nav =>
                                nav.classList.remove(
                                    "active"
                                )
                        );


                        item.classList.add(
                            "active"
                        );


                        sections.forEach(
                            section =>
                                section.classList.remove(
                                    "active"
                                )
                        );


                        const section =
                            document.getElementById(
                                sectionName +
                                "Section"
                            );


                        if (section) {

                            section.classList.add(
                                "active"
                            );
                        }


                        if (pageTitle) {

                            pageTitle.textContent =
                                titles[
                                sectionName
                                ];
                        }


                        if (
                            sectionName ===
                            "dashboard"
                        ) {

                            loadStats();

                        } else if (
                            sectionName ===
                            "users"
                        ) {

                            loadUsers();

                        } else if (
                            sectionName ===
                            "scores"
                        ) {

                            loadScores();

                        } else if (
                            sectionName ===
                            "ranking"
                        ) {

                            loadRanking();

                        } else if (
                            sectionName ===
                            "questions"
                        ) {

                            loadQuestions();

                        } else if (
                            sectionName ===
                            "premium"
                        ) {

                            loadPremium();
                        }
                    }
                );
            }
        );


        /* =====================================================
           DASHBOARD
        ===================================================== */

        async function loadStats() {

            try {

                const response =
                    await adminFetch(
                        "/admin/stats"
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message
                    );
                }


                document.getElementById(
                    "totalUsers"
                ).textContent =
                    data.totalUsers;


                document.getElementById(
                    "totalScores"
                ).textContent =
                    data.totalScores;


                document.getElementById(
                    "premiumUsers"
                ).textContent =
                    data.premiumUsers;


                document.getElementById(
                    "totalXP"
                ).textContent =
                    data.totalXP;


                document.getElementById(
                    "averageSuccess"
                ).textContent =
                    data.averageSuccess +
                    "%";


                document.getElementById(
                    "successProgress"
                ).style.width =
                    data.averageSuccess +
                    "%";


            } catch (error) {

                console.error(
                    error
                );
            }
        }


        /* =====================================================
           UTILISATEURS
        ===================================================== */

        async function loadUsers() {

            try {

                const response =
                    await adminFetch(
                        "/admin/users"
                    );


                const data =
                    await response.json();


                const table =
                    document.getElementById(
                        "usersTable"
                    );


                table.innerHTML = "";


                data.users.forEach(
                    user => {

                        const tr =
                            document.createElement(
                                "tr"
                            );


                        tr.innerHTML = `

                            <td>
                                ${escapeHTML(user.name)}
                            </td>

                            <td>
                                ${escapeHTML(user.email)}
                            </td>

                            <td>
                                ${escapeHTML(user.role)}
                            </td>

                            <td>
                                ${user.level}
                            </td>

                            <td>
                                ${user.xp}
                            </td>

                            <td>
                                ${user.premium
                                ? "💎 Oui"
                                : "❌ Non"
                            }
                            </td>

                            <td>
                                ${user.scoresCount}
                            </td>

                            <td>

                                ${user.role !== "admin"
                                ? `
                                        <button
                                            class="danger-btn"
                                            onclick="deleteUser('${user.id}')"
                                        >
                                            🗑️
                                        </button>
                                    `
                                : "👑"
                            }

                            </td>
                        `;


                        table.appendChild(
                            tr
                        );
                    }
                );


            } catch (error) {

                console.error(
                    error
                );
            }
        }


        window.deleteUser =
            async function (id) {

                if (
                    !confirm(
                        "Supprimer cet utilisateur ?"
                    )
                ) {
                    return;
                }


                try {

                    const response =
                        await adminFetch(
                            `/admin/users/${id}`,
                            {
                                method:
                                    "DELETE"
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            data.message
                        );

                        return;
                    }


                    alert(
                        "Utilisateur supprimé."
                    );


                    loadUsers();
                    loadStats();


                } catch (error) {

                    console.error(
                        error
                    );
                }
            };


        /* =====================================================
           SCORES
        ===================================================== */

        async function loadScores() {

            try {

                const response =
                    await adminFetch(
                        "/admin/scores"
                    );


                const data =
                    await response.json();


                const table =
                    document.getElementById(
                        "scoresTable"
                    );


                table.innerHTML = "";


                data.scores.forEach(
                    score => {

                        const tr =
                            document.createElement(
                                "tr"
                            );


                        const date =
                            score.date
                                ? new Date(
                                    score.date
                                ).toLocaleString(
                                    "fr-FR"
                                )
                                : "-";


                        tr.innerHTML = `

                            <td>
                                ${escapeHTML(
                            score.userName
                        )}
                            </td>

                            <td>
                                ${escapeHTML(
                            score.quiz
                        )}
                            </td>

                            <td>
                                ${score.score}
                                /
                                ${score.total}
                            </td>

                            <td>
                                ${score.percentage}%
                            </td>

                            <td>
                                ⭐ ${score.xpGained}
                            </td>

                            <td>
                                ${date}
                            </td>

                        `;


                        table.appendChild(
                            tr
                        );
                    }
                );


            } catch (error) {

                console.error(
                    error
                );
            }
        }


        /* =====================================================
           CLASSEMENT
        ===================================================== */

        async function loadRanking() {

            try {

                const response =
                    await adminFetch(
                        "/admin/ranking"
                    );


                const data =
                    await response.json();


                const container =
                    document.getElementById(
                        "rankingContainer"
                    );


                container.innerHTML = "";


                data.ranking.forEach(
                    (user, index) => {

                        const div =
                            document.createElement(
                                "div"
                            );


                        div.className =
                            "ranking-item";


                        let medal =
                            index + 1;


                        if (index === 0) {
                            medal = "🥇";
                        } else if (
                            index === 1
                        ) {
                            medal = "🥈";
                        } else if (
                            index === 2
                        ) {
                            medal = "🥉";
                        }


                        div.innerHTML = `

                            <strong>
                                ${medal}
                            </strong>

                            <span>
                                ${escapeHTML(
                            user.name
                        )}
                            </span>

                            <span>
                                Niveau ${user.level}
                            </span>

                            <strong>
                                ⭐ ${user.xp} XP
                            </strong>

                        `;


                        container.appendChild(
                            div
                        );
                    }
                );


            } catch (error) {

                console.error(
                    error
                );
            }
        }


        /* =====================================================
           QUESTIONS
        ===================================================== */

        let allQuestions = [];


        async function loadQuestions() {

            try {

                const response =
                    await adminFetch(
                        "/admin/questions"
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message
                    );
                }


                allQuestions =
                    data.questions || [];


                displayQuestions(
                    allQuestions
                );


            } catch (error) {

                console.error(
                    "Erreur questions :",
                    error
                );
            }
        }


        function displayQuestions(
            questions
        ) {

            const table =
                document.getElementById(
                    "questionsTable"
                );


            table.innerHTML = "";


            questions.forEach(
                question => {

                    const tr =
                        document.createElement(
                            "tr"
                        );


                    const options =
                        Array.isArray(
                            question.options
                        )
                            ? question.options
                            : [];


                    tr.innerHTML = `

                        <td>
                            ${question.id}
                        </td>

                        <td>
                            ${escapeHTML(
                        question.question
                    )}
                        </td>

                        <td>
                            ${escapeHTML(
                        question.category ||
                        "Général"
                    )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                        question.answer
                    )}
                            </strong>
                        </td>

                        <td>

                            <button
                                class="edit-btn"
                                onclick="editQuestion('${question.id}')"
                            >
                                ✏️
                            </button>

                            <button
                                class="danger-btn"
                                onclick="deleteQuestion('${question.id}')"
                            >
                                🗑️
                            </button>

                        </td>
                    `;


                    table.appendChild(
                        tr
                    );
                }
            );
        }


        /* =====================================================
           RECHERCHE QUESTIONS
        ===================================================== */

        const questionSearch =
            document.getElementById(
                "questionSearch"
            );


        if (questionSearch) {

            questionSearch.addEventListener(
                "input",
                () => {

                    const search =
                        questionSearch.value
                            .toLowerCase()
                            .trim();


                    const filtered =
                        allQuestions.filter(
                            question =>

                                String(
                                    question.question
                                )
                                    .toLowerCase()
                                    .includes(search)

                                ||

                                String(
                                    question.category ||
                                    ""
                                )
                                    .toLowerCase()
                                    .includes(search)
                        );


                    displayQuestions(
                        filtered
                    );
                }
            );
        }


        /* =====================================================
           FORMULAIRE QUESTION
        ===================================================== */

        const addQuestionBtn =
            document.getElementById(
                "addQuestionBtn"
            );


        const formContainer =
            document.getElementById(
                "questionFormContainer"
            );


        const questionForm =
            document.getElementById(
                "questionForm"
            );


        const cancelQuestionBtn =
            document.getElementById(
                "cancelQuestionBtn"
            );


        if (addQuestionBtn) {

            addQuestionBtn.addEventListener(
                "click",
                () => {

                    resetQuestionForm();

                    formContainer.style.display =
                        "block";
                }
            );
        }


        if (cancelQuestionBtn) {

            cancelQuestionBtn.addEventListener(
                "click",
                () => {

                    resetQuestionForm();

                    formContainer.style.display =
                        "none";
                }
            );
        }


        if (questionForm) {

            questionForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const id =
                        document.getElementById(
                            "questionId"
                        ).value;


                    const options = [

                        document.getElementById(
                            "optionA"
                        ).value.trim(),

                        document.getElementById(
                            "optionB"
                        ).value.trim(),

                        document.getElementById(
                            "optionC"
                        ).value.trim(),

                        document.getElementById(
                            "optionD"
                        ).value.trim()
                    ].filter(
                        option =>
                            option.length > 0
                    );


                    const questionData = {

                        question:
                            document.getElementById(
                                "questionText"
                            ).value.trim(),

                        category:
                            document.getElementById(
                                "questionCategory"
                            ).value.trim(),

                        options,

                        answer:
                            document.getElementById(
                                "correctAnswer"
                            ).value
                    };


                    try {

                        let url =
                            "/admin/questions";

                        let method =
                            "POST";


                        if (id) {

                            url =
                                `/admin/questions/${id}`;

                            method =
                                "PUT";
                        }


                        const response =
                            await adminFetch(
                                url,
                                {
                                    method,

                                    body:
                                        JSON.stringify(
                                            questionData
                                        )
                                }
                            );


                        const data =
                            await response.json();


                        if (!response.ok) {

                            alert(
                                data.message ||
                                "Erreur."
                            );

                            return;
                        }


                        alert(
                            data.message
                        );


                        resetQuestionForm();

                        formContainer.style.display =
                            "none";


                        loadQuestions();

                        loadStats();


                    } catch (error) {

                        console.error(
                            error
                        );

                        alert(
                            "Erreur serveur."
                        );
                    }
                }
            );
        }


        /* =====================================================
           MODIFIER QUESTION
        ===================================================== */

        window.editQuestion =
            function (id) {

                const question =
                    allQuestions.find(
                        q =>
                            String(q.id) ===
                            String(id)
                    );


                if (!question) {
                    return;
                }


                document.getElementById(
                    "questionFormTitle"
                ).textContent =
                    "Modifier la question";


                document.getElementById(
                    "questionId"
                ).value =
                    question.id;


                document.getElementById(
                    "questionText"
                ).value =
                    question.question || "";


                document.getElementById(
                    "questionCategory"
                ).value =
                    question.category || "";


                const options =
                    question.options || [];


                document.getElementById(
                    "optionA"
                ).value =
                    options[0] || "";


                document.getElementById(
                    "optionB"
                ).value =
                    options[1] || "";


                document.getElementById(
                    "optionC"
                ).value =
                    options[2] || "";


                document.getElementById(
                    "optionD"
                ).value =
                    options[3] || "";


                document.getElementById(
                    "correctAnswer"
                ).value =
                    question.answer || "";


                formContainer.style.display =
                    "block";


                formContainer.scrollIntoView({
                    behavior:
                        "smooth"
                });
            };


        /* =====================================================
           SUPPRIMER QUESTION
        ===================================================== */

        window.deleteQuestion =
            async function (id) {

                if (
                    !confirm(
                        "Supprimer définitivement cette question ?"
                    )
                ) {
                    return;
                }


                try {

                    const response =
                        await adminFetch(
                            `/admin/questions/${id}`,
                            {
                                method:
                                    "DELETE"
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            data.message
                        );

                        return;
                    }


                    alert(
                        "Question supprimée."
                    );


                    loadQuestions();
                    loadStats();


                } catch (error) {

                    console.error(
                        error
                    );
                }
            };


        function resetQuestionForm() {

            if (!questionForm) {
                return;
            }


            questionForm.reset();


            document.getElementById(
                "questionId"
            ).value = "";


            document.getElementById(
                "questionFormTitle"
            ).textContent =
                "Ajouter une question";
        }


        /* =====================================================
           PREMIUM
        ===================================================== */

        async function loadPremium() {

            try {

                const response =
                    await adminFetch(
                        "/admin/premium"
                    );


                const data =
                    await response.json();


                const table =
                    document.getElementById(
                        "premiumTable"
                    );


                table.innerHTML = "";


                data.premiumUsers.forEach(
                    user => {

                        const tr =
                            document.createElement(
                                "tr"
                            );


                        const expiration =
                            user.premiumUntil
                                ? new Date(
                                    user.premiumUntil
                                ).toLocaleDateString(
                                    "fr-FR"
                                )
                                : "Aucune";


                        tr.innerHTML = `

                            <td>
                                ${escapeHTML(
                            user.name
                        )}
                            </td>

                            <td>
                                ${escapeHTML(
                            user.email
                        )}
                            </td>

                            <td>
                                ⭐ ${user.xp}
                            </td>

                            <td>
                                ${user.level}
                            </td>

                            <td>
                                ${expiration}
                            </td>

                        `;


                        table.appendChild(
                            tr
                        );
                    }
                );


            } catch (error) {

                console.error(
                    error
                );
            }
        }


        /* =====================================================
           DÉCONNEXION
        ===================================================== */

        const logoutBtn =
            document.getElementById(
                "logoutBtn"
            );


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                () => {

                    localStorage.removeItem(
                        "webquiz_token"
                    );

                    localStorage.removeItem(
                        "webquiz_user"
                    );

                    window.location.href =
                        "login.html";
                }
            );
        }


        /* =====================================================
           SÉCURITÉ HTML
        ===================================================== */

        function escapeHTML(value) {

            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }


            return String(value)
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );
        }


        /* =====================================================
           CHARGEMENT INITIAL
        ===================================================== */

        loadStats();

    }
);