const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const router = express.Router();

const usersFile = path.join(
    __dirname,
    "../data/users.json"
);

const JWT_SECRET =
    process.env.JWT_SECRET || "webquiz-secret-dev";


/* =========================================================
   UTILISATEURS
========================================================= */

function readUsers() {
    try {
        return JSON.parse(
            fs.readFileSync(usersFile, "utf-8")
        );
    } catch (error) {
        console.error(
            "Erreur lecture users.json :",
            error
        );

        return [];
    }
}


function saveUsers(users) {

    fs.writeFileSync(
        usersFile,
        JSON.stringify(users, null, 2),
        "utf-8"
    );
}


/* =========================================================
   AUTHENTIFICATION
========================================================= */

function authenticateToken(req, res, next) {

    try {

        const authorization =
            req.headers.authorization;

        if (!authorization) {

            return res.status(401).json({
                message:
                    "Authentification requise."
            });
        }


        if (
            !authorization.startsWith(
                "Bearer "
            )
        ) {

            return res.status(401).json({
                message:
                    "Token invalide."
            });
        }


        const token =
            authorization.substring(7);


        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        req.user = decoded;

        next();


    } catch (error) {

        return res.status(401).json({
            message:
                "Session invalide ou expirée."
        });
    }
}


/* =========================================================
   PLANS
========================================================= */

const PLANS = {

    monthly: {

        name: "Premium Mensuel",

        price: 1000,

        currency: "XOF",

        durationDays: 30
    },


    yearly: {

        name: "Premium Annuel",

        price: 10000,

        currency: "XOF",

        durationDays: 365
    }

};


/* =========================================================
   CRÉER UNE DEMANDE DE PAIEMENT
========================================================= */

router.post(
    "/subscribe",
    authenticateToken,
    (req, res) => {

        try {

            const {
                plan
            } = req.body;


            /* -------------------------
               Vérifier le plan
            ------------------------- */

            if (
                !plan ||
                !PLANS[plan]
            ) {

                return res.status(400).json({
                    message:
                        "Formule Premium invalide."
                });
            }


            const selectedPlan =
                PLANS[plan];


            const users =
                readUsers();


            const userIndex =
                users.findIndex(
                    user =>
                        user.id ===
                        req.user.id
                );


            if (userIndex === -1) {

                return res.status(404).json({
                    message:
                        "Utilisateur introuvable."
                });
            }


            /*
             * Pour l'instant, nous créons
             * seulement une demande.
             *
             * Le Premium ne doit PAS être
             * activé ici.
             */

            const paymentId =
                `PAY-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)
                    .toUpperCase()}`;


            if (
                !Array.isArray(
                    users[userIndex].payments
                )
            ) {

                users[userIndex].payments = [];
            }


            const payment = {

                id: paymentId,

                plan,

                name:
                    selectedPlan.name,

                amount:
                    selectedPlan.price,

                currency:
                    selectedPlan.currency,

                durationDays:
                    selectedPlan.durationDays,

                status:
                    "pending",

                createdAt:
                    new Date().toISOString()
            };


            users[userIndex]
                .payments
                .push(payment);


            saveUsers(users);


            console.log(
                "Nouvelle demande Premium :",
                payment
            );


            /*
             * Ici nous brancherons le vrai
             * prestataire de paiement.
             */

            return res.status(201).json({

                message:
                    "Demande de paiement créée.",

                paymentId,

                plan: {

                    id: plan,

                    name:
                        selectedPlan.name,

                    amount:
                        selectedPlan.price,

                    currency:
                        selectedPlan.currency
                },

                paymentUrl:
                    null
            });


        } catch (error) {

            console.error(
                "Erreur Premium :",
                error
            );


            return res.status(500).json({

                message:
                    "Erreur lors de la création du paiement."
            });
        }
    }
);


/* =========================================================
   STATUT PREMIUM
========================================================= */

router.get(
    "/status",
    authenticateToken,
    (req, res) => {

        try {

            const users =
                readUsers();


            const user =
                users.find(
                    user =>
                        user.id ===
                        req.user.id
                );


            if (!user) {

                return res.status(404).json({
                    message:
                        "Utilisateur introuvable."
                });
            }


            const now =
                new Date();


            let premium =
                user.premium === true;


            let premiumUntil =
                user.premiumUntil || null;


            /*
             * Vérifier l'expiration.
             */

            if (
                premium &&
                premiumUntil
            ) {

                const expiration =
                    new Date(
                        premiumUntil
                    );


                if (
                    expiration <= now
                ) {

                    premium = false;

                    premiumUntil = null;

                    user.premium = false;

                    user.premiumUntil = null;

                    saveUsers(users);
                }
            }


            return res.json({

                premium,

                premiumUntil
            });


        } catch (error) {

            console.error(
                "Erreur statut Premium :",
                error
            );


            return res.status(500).json({

                message:
                    "Impossible de récupérer le statut Premium."
            });
        }
    }
);


module.exports = router;