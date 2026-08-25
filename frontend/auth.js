document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // CONFIGURATION API
    // =========================================================

    const API_URL = "http://localhost:3000";

    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");


    // =========================================================
    // INSCRIPTION
    // =========================================================

    if (registerForm) {

        registerForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("registerEmail");
            const passwordInput = document.getElementById("registerPassword");
            const confirmPasswordInput =
                document.getElementById("confirmPassword");

            const terms = document.getElementById("terms");
            const message = document.getElementById("registerMessage");

            const name = nameInput ? nameInput.value.trim() : "";
            const email = emailInput ? emailInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";
            const confirmPassword =
                confirmPasswordInput
                    ? confirmPasswordInput.value
                    : "";


            // =====================================================
            // VALIDATION
            // =====================================================

            if (!name || !email || !password || !confirmPassword) {

                message.textContent =
                    "Veuillez remplir tous les champs.";

                message.className =
                    "auth-message error";

                return;
            }


            if (password.length < 6) {

                message.textContent =
                    "Le mot de passe doit contenir au moins 6 caractères.";

                message.className =
                    "auth-message error";

                return;
            }


            if (password !== confirmPassword) {

                message.textContent =
                    "Les mots de passe ne correspondent pas.";

                message.className =
                    "auth-message error";

                return;
            }


            if (terms && !terms.checked) {

                message.textContent =
                    "Tu dois accepter les conditions d'utilisation.";

                message.className =
                    "auth-message error";

                return;
            }


            // =====================================================
            // ENVOI AU SERVEUR
            // =====================================================

            try {

                message.textContent =
                    "Création du compte...";

                message.className =
                    "auth-message";


                const response = await fetch(
                    `${API_URL}/auth/register`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            name,
                            email,
                            password
                        })
                    }
                );


                // =================================================
                // RÉCUPÉRER LA RÉPONSE
                // =================================================

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
                        "Réponse serveur non JSON :",
                        text
                    );

                    throw new Error(
                        "Le serveur n'a pas renvoyé du JSON."
                    );
                }


                console.log(
                    "Réponse inscription :",
                    data
                );


                // =================================================
                // ERREUR
                // =================================================

                if (!response.ok) {

                    message.textContent =
                        data.message ||
                        "Impossible de créer le compte.";

                    message.className =
                        "auth-message error";

                    return;
                }


                // =================================================
                // SUCCÈS
                // =================================================

                message.textContent =
                    "✅ Compte créé avec succès !";

                message.className =
                    "auth-message success";


                registerForm.reset();


                // Redirection vers connexion

                setTimeout(() => {

                    window.location.href =
                        "login.html";

                }, 1000);


            } catch (error) {

                console.error(
                    "❌ Erreur inscription :",
                    error
                );

                message.textContent =
                    "❌ Impossible de contacter le serveur.";

                message.className =
                    "auth-message error";
            }
        });
    }


    // =========================================================
    // CONNEXION
    // =========================================================

    if (loginForm) {

        loginForm.addEventListener("submit", async (event) => {

            event.preventDefault();


            const emailElement =
                document.getElementById("email");

            const passwordElement =
                document.getElementById("password");

            const message =
                document.getElementById("loginMessage");


            const email =
                emailElement
                    ? emailElement.value.trim()
                    : "";

            const password =
                passwordElement
                    ? passwordElement.value
                    : "";


            // =====================================================
            // VALIDATION
            // =====================================================

            if (!email || !password) {

                message.textContent =
                    "Email et mot de passe obligatoires.";

                message.className =
                    "auth-message error";

                return;
            }


            try {

                message.textContent =
                    "Connexion...";

                message.className =
                    "auth-message";


                // =================================================
                // APPEL API
                // =================================================

                const response = await fetch(
                    `${API_URL}/auth/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );


                // =================================================
                // RÉPONSE JSON
                // =================================================

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
                        "Réponse serveur non JSON :",
                        text
                    );

                    throw new Error(
                        "Le serveur n'a pas renvoyé du JSON."
                    );
                }


                console.log(
                    "Réponse connexion :",
                    data
                );


                // =================================================
                // ERREUR
                // =================================================

                if (!response.ok) {

                    message.textContent =
                        data.message ||
                        "Email ou mot de passe incorrect.";

                    message.className =
                        "auth-message error";

                    return;
                }


                // =================================================
                // VÉRIFIER LE TOKEN
                // =================================================

                if (!data.token) {

                    console.error(
                        "❌ Aucun token reçu :",
                        data
                    );

                    message.textContent =
                        "Le serveur n'a pas envoyé de token.";

                    message.className =
                        "auth-message error";

                    return;
                }


                // =================================================
                // NETTOYER LES ANCIENNES SESSIONS
                // =================================================

                localStorage.removeItem("token");
                localStorage.removeItem("user");


                // =================================================
                // SAUVEGARDER LE JWT
                // =================================================

                localStorage.setItem(
                    "webquiz_token",
                    data.token
                );


                // =================================================
                // SAUVEGARDER L'UTILISATEUR
                // =================================================

                if (data.user) {

                    localStorage.setItem(
                        "webquiz_user",
                        JSON.stringify(data.user)
                    );
                }


                console.log(
                    "✅ Token sauvegardé correctement."
                );

                console.log(
                    "Utilisateur :",
                    data.user
                );


                // =================================================
                // SUCCÈS
                // =================================================

                message.textContent =
                    "✅ Connexion réussie !";

                message.className =
                    "auth-message success";


                // =================================================
                // REDIRECTION SELON LE RÔLE
                // =================================================

                setTimeout(() => {

                    /*
                     * ADMIN
                     * -----
                     * Si le serveur renvoie :
                     *
                     * data.user.role = "admin"
                     *
                     * alors → admin.html
                     */

                    if (
                        data.user &&
                        data.user.role &&
                        data.user.role.toLowerCase() === "admin"
                    ) {

                        window.location.href =
                            "admin.html";

                        return;
                    }


                    /*
                     * AUTRES UTILISATEURS
                     */

                    window.location.href =
                        "dashboard.html";

                }, 800);


            } catch (error) {

                console.error(
                    "❌ Erreur connexion :",
                    error
                );

                message.textContent =
                    "❌ Impossible de contacter le serveur.";

                message.className =
                    "auth-message error";
            }
        });
    }


    // =========================================================
    // AFFICHER / CACHER MOT DE PASSE INSCRIPTION
    // =========================================================

    const toggleRegisterPassword =
        document.getElementById(
            "toggleRegisterPassword"
        );

    if (toggleRegisterPassword) {

        toggleRegisterPassword.addEventListener(
            "click",
            () => {

                const password =
                    document.getElementById(
                        "registerPassword"
                    );

                if (!password) {
                    return;
                }


                if (password.type === "password") {

                    password.type = "text";

                    toggleRegisterPassword.textContent =
                        "🙈";

                } else {

                    password.type = "password";

                    toggleRegisterPassword.textContent =
                        "👁️";
                }
            }
        );
    }


    // =========================================================
    // AFFICHER / CACHER CONFIRMATION
    // =========================================================

    const toggleConfirmPassword =
        document.getElementById(
            "toggleConfirmPassword"
        );

    if (toggleConfirmPassword) {

        toggleConfirmPassword.addEventListener(
            "click",
            () => {

                const password =
                    document.getElementById(
                        "confirmPassword"
                    );

                if (!password) {
                    return;
                }


                if (password.type === "password") {

                    password.type = "text";

                    toggleConfirmPassword.textContent =
                        "🙈";

                } else {

                    password.type = "password";

                    toggleConfirmPassword.textContent =
                        "👁️";
                }
            }
        );
    }

});