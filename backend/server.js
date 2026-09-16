const express = require("express");
const path = require("path");
const adminRoute =require("./routes/admin");
const questionsRoute = require("./routes/questions");
const authRoute = require("./routes/auth");
const scoresRoute = require("./routes/scores");
const premiumRoute = require("./routes/premium");

const app = express();

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 3000;
/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);

app.use(
    "/admin",
    adminRoute
);
/* =========================================================
   API QUESTIONS
========================================================= */

app.use(
    "/questions",
    questionsRoute
);


/* =========================================================
   API AUTHENTIFICATION
========================================================= */

app.use(
    "/auth",
    authRoute
);


/* =========================================================
   API SCORES
========================================================= */

app.use(
    "/scores",
    scoresRoute
);


/* =========================================================
   API PREMIUM
========================================================= */

app.use(
    "/premium",
    premiumRoute
);


/* =========================================================
   PAGE D'ACCUEIL
   → LOGIN
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/login.html"
            )
        );

    }
);


/* =========================================================
   PAGE DASHBOARD
========================================================= */

app.get(
    "/dashboard",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/dashboard.html"
            )
        );

    }
);


/* =========================================================
   PAGE PREMIUM
========================================================= */

app.get(
    "/premium",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/premium.html"
            )
        );

    }
);


/* =========================================================
   PAGE LOGIN
========================================================= */

app.get(
    "/login",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/login.html"
            )
        );

    }
);


/* =========================================================
   PAGE INSCRIPTION
========================================================= */

app.get(
    "/register",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/register.html"
            )
        );

    }
);


/* =========================================================
   ROUTE 404 API
========================================================= */

app.use(
    (req, res, next) => {

        const apiRoutes = [
            "/auth",
            "/scores",
            "/questions",
            "/premium",
            "/admin"
        ];

        const isApiRoute =
            apiRoutes.some(
                route =>
                    req.path.startsWith(route)
            );


        if (isApiRoute) {

            return res.status(404).json({

                message:
                    "Route API introuvable."

            });

        }


        next();

    }
);


/* =========================================================
   404 PAGE
========================================================= */

app.use(
    (req, res) => {

        res.status(404).send(
            `
            <!DOCTYPE html>

            <html lang="fr">

            <head>

                <meta charset="UTF-8">

                <title>404 - WebQuiz</title>

                <style>

                    body {
                        font-family:
                            Arial,
                            sans-serif;

                        background: #f5f7fb;

                        min-height: 100vh;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        text-align: center;
                    }

                    .box {
                        background: white;

                        padding: 40px;

                        border-radius: 20px;

                        box-shadow:
                            0 20px 50px
                            rgba(0,0,0,0.1);
                    }

                    h1 {
                        font-size: 60px;

                        color: #2563eb;

                        margin: 0;
                    }

                    a {
                        display: inline-block;

                        margin-top: 20px;

                        padding: 12px 20px;

                        background: #2563eb;

                        color: white;

                        text-decoration: none;

                        border-radius: 10px;

                        font-weight: bold;
                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>404</h1>

                    <h2>Page introuvable</h2>

                    <p>
                        Cette page n'existe pas.
                    </p>

                    <a href="/">
                        Retour à WebQuiz
                    </a>

                </div>

            </body>

            </html>
            `
        );

    }
);


/* =========================================================
   GESTION DES ERREURS
========================================================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "======================================"
        );

        console.error(
            "❌ ERREUR SERVEUR"
        );

        console.error(
            error
        );

        console.error(
            "======================================"
        );


        if (res.headersSent) {

            return next(error);

        }


        res.status(500).json({

            message:
                "Erreur interne du serveur."

        });

    }
);


/* =========================================================
   SERVEUR
========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "🧠 WEBQUIZ"
        );

        console.log(
            "======================================"
        );

        console.log(
            `🚀 Serveur : http://localhost:${PORT}`
        );

        console.log(
            "📚 Questions : /questions"
        );

        console.log(
            "🔐 Auth : /auth"
        );

        console.log(
            "🏆 Scores : /scores"
        );

        console.log(
            "⭐ Premium : /premium"
        );

        console.log(
            "📊 Dashboard : /dashboard"
        );

        console.log(
            "======================================"
        );

    }
);