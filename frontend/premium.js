document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadPremiumStatus();

    }
);


/* =========================================================
   TOKEN
========================================================= */

const token =
    localStorage.getItem(
        "webquiz_token"
    );


/* =========================================================
   PROTECTION
========================================================= */

if (!token) {

    window.location.href =
        "login.html";
}


/* =========================================================
   CHARGER STATUT PREMIUM
========================================================= */

async function loadPremiumStatus() {

    const status =
        document.getElementById(
            "premiumStatus"
        );

    const button =
        document.getElementById(
            "premiumButton"
        );


    try {

        const response =
            await fetch(
                "/premium/status",
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


        const data =
            await response.json();


        /* =========================================
           SESSION EXPIRÉE
        ========================================= */

        if (
            response.status === 401
        ) {

            logout();

            return;
        }


        /* =========================================
           ERREUR
        ========================================= */

        if (!response.ok) {

            status.textContent =
                data.message ||
                "Impossible de vérifier le statut Premium.";

            return;
        }


        /* =========================================
           PREMIUM ACTIF
        ========================================= */

        if (
            data.premium === true
        ) {

            status.innerHTML = `

                ⭐ <strong>
                    Tu es Premium !
                </strong>

                <br><br>

                Ton abonnement est actif.

                ${
                    data.premiumUntil
                    ?
                    `<br>
                     Expire le :
                     ${formatDate(
                         data.premiumUntil
                     )}`
                    :
                    ""
                }

            `;


            status.style.background =
                "#fff3cd";


            button.disabled = true;

            button.textContent =
                "⭐ Premium actif";


            return;
        }


        /* =========================================
           GRATUIT
        ========================================= */

        status.innerHTML = `

            🆓 <strong>
                Compte gratuit
            </strong>

            <br><br>

            Passe Premium pour débloquer
            les fonctionnalités avancées.

        `;


    } catch (error) {

        console.error(
            "Erreur Premium :",
            error
        );


        status.textContent =
            "Impossible de contacter le serveur.";
    }
}


/* =========================================================
   COMMENCER PREMIUM
========================================================= */

function startPremium() {

    const message =
        document.getElementById(
            "premiumMessage"
        );


    /*
     * POUR L'INSTANT :
     * on ne lance pas encore le paiement.
     */

    message.innerHTML = `

        ⭐ <strong>
            Offre Premium sélectionnée !
        </strong>

        <br><br>

        Le système de paiement sera connecté
        à cette étape.

    `;


    /*
     * Plus tard :
     *
     * window.location.href =
     * "payment.html";
     */

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateString) {

    try {

        const date =
            new Date(
                dateString
            );


        return date.toLocaleDateString(
            "fr-FR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch (error) {

        return dateString;
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

function goDashboard() {

    window.location.href =
        "dashboard.html";
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    localStorage.removeItem(
        "webquiz_token"
    );

    localStorage.removeItem(
        "webquiz_user"
    );


    window.location.href =
        "login.html";
}