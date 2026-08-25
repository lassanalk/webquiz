const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const JWT_SECRET =
    process.env.JWT_SECRET || "webquiz-secret-dev";


// =========================================================
// CRÉER UN TOKEN JWT
// =========================================================

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}


// =========================================================
// MIDDLEWARE JWT
// =========================================================

function authenticateToken(req, res, next) {

    try {

        const authorization =
            req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                message: "Authentification requise."
            });
        }

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Format du token invalide."
            });
        }

        const token =
            authorization.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                message: "Token manquant."
            });
        }

        const decoded =
            jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        console.error(
            "❌ Erreur JWT :",
            error.message
        );

        return res.status(401).json({
            message: "Session invalide ou expirée."
        });
    }
}


// =========================================================
// INSCRIPTION
// POST /auth/register
// =========================================================

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!name || !email || !password) {

            return res.status(400).json({
                message:
                    "Tous les champs sont obligatoires."
            });
        }


        if (password.length < 6) {

            return res.status(400).json({
                message:
                    "Le mot de passe doit contenir au moins 6 caractères."
            });
        }


        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedName =
            name.trim();


        // -------------------------------------------------
        // VÉRIFIER EMAIL
        // -------------------------------------------------

        const [existingUsers] =
            await db.execute(
                `
                SELECT id
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [normalizedEmail]
            );


        if (existingUsers.length > 0) {

            return res.status(409).json({
                message:
                    "Cette adresse email est déjà utilisée."
            });
        }


        // -------------------------------------------------
        // HASH MOT DE PASSE
        // -------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(password, 10);


        // -------------------------------------------------
        // CRÉER UTILISATEUR
        // -------------------------------------------------

        const [result] =
            await db.execute(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password,
                    role,
                    xp,
                    level,
                    premium,
                    premium_until
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    normalizedName,
                    normalizedEmail,
                    hashedPassword,
                    "free",
                    0,
                    1,
                    false,
                    null
                ]
            );


        const userId =
            result.insertId;


        console.log(
            `✅ Nouveau compte créé : ${normalizedEmail}`
        );

        console.log(
            `🆔 ID utilisateur : ${userId}`
        );


        // -------------------------------------------------
        // RÉPONSE
        // -------------------------------------------------

        return res.status(201).json({

            message:
                "Compte créé avec succès.",

            user: {
                id: userId,
                name: normalizedName,
                email: normalizedEmail,
                role: "free",
                xp: 0,
                level: 1,
                premium: false,
                premiumUntil: null
            }
        });


    } catch (error) {

        console.error(
            "❌ Erreur inscription :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la création du compte."
        });
    }
});


// =========================================================
// CONNEXION
// POST /auth/login
// =========================================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!email || !password) {

            return res.status(400).json({
                message:
                    "Email et mot de passe obligatoires."
            });
        }


        const normalizedEmail =
            email.trim().toLowerCase();


        // -------------------------------------------------
        // CHERCHER UTILISATEUR
        // -------------------------------------------------

        const [users] =
            await db.execute(
                `
                SELECT
                    id,
                    name,
                    email,
                    password,
                    role,
                    xp,
                    level,
                    premium,
                    premium_until,
                    created_at
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [normalizedEmail]
            );


        if (users.length === 0) {

            return res.status(401).json({
                message:
                    "Email ou mot de passe incorrect."
            });
        }


        const user = users[0];


        // -------------------------------------------------
        // VÉRIFIER MOT DE PASSE
        // -------------------------------------------------

        const passwordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordCorrect) {

            return res.status(401).json({
                message:
                    "Email ou mot de passe incorrect."
            });
        }


        // -------------------------------------------------
        // VÉRIFIER PREMIUM
        // -------------------------------------------------

        let premium =
            Boolean(user.premium);

        let premiumUntil =
            user.premium_until;


        if (premium && premiumUntil) {

            const expiration =
                new Date(premiumUntil);


            if (expiration <= new Date()) {

                premium = false;
                premiumUntil = null;


                await db.execute(
                    `
                    UPDATE users
                    SET
                        premium = ?,
                        premium_until = ?
                    WHERE id = ?
                    `,
                    [
                        false,
                        null,
                        user.id
                    ]
                );
            }
        }


        // -------------------------------------------------
        // CRÉER TOKEN JWT
        // -------------------------------------------------

        const token =
            createToken({
                id: user.id,
                email: user.email,
                role: user.role
            });


        console.log(
            `✅ Connexion : ${user.email}`
        );

        console.log(
            `🆔 ID utilisateur : ${user.id}`
        );


        // -------------------------------------------------
        // RÉPONSE
        // -------------------------------------------------

        return res.json({

            message:
                "Connexion réussie.",

            token: token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,

                xp:
                    Number(user.xp) || 0,

                level:
                    Number(user.level) || 1,

                premium:
                    premium,

                premiumUntil:
                    premiumUntil,

                createdAt:
                    user.created_at
            }
        });


    } catch (error) {

        console.error(
            "❌ Erreur connexion :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la connexion."
        });
    }
});


// =========================================================
// PROFIL CONNECTÉ
// GET /auth/me
// =========================================================

router.get(
    "/me",
    authenticateToken,
    async (req, res) => {

        try {

            // -------------------------------------------------
            // RÉCUPÉRER UTILISATEUR
            // -------------------------------------------------

            const [users] =
                await db.execute(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        role,
                        xp,
                        level,
                        premium,
                        premium_until,
                        created_at
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [req.user.id]
                );


            if (users.length === 0) {

                return res.status(404).json({
                    message:
                        "Utilisateur introuvable."
                });
            }


            const user = users[0];


            // -------------------------------------------------
            // VÉRIFIER PREMIUM
            // -------------------------------------------------

            let premium =
                Boolean(user.premium);

            let premiumUntil =
                user.premium_until;


            if (premium && premiumUntil) {

                const expiration =
                    new Date(premiumUntil);


                if (expiration <= new Date()) {

                    premium = false;
                    premiumUntil = null;


                    await db.execute(
                        `
                        UPDATE users
                        SET
                            premium = ?,
                            premium_until = ?
                        WHERE id = ?
                        `,
                        [
                            false,
                            null,
                            user.id
                        ]
                    );
                }
            }


            // -------------------------------------------------
            // RÉPONSE
            // -------------------------------------------------

            return res.json({

                user: {

                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role,

                    xp:
                        Number(user.xp) || 0,

                    level:
                        Number(user.level) || 1,

                    premium:
                        premium,

                    premiumUntil:
                        premiumUntil,

                    createdAt:
                        user.created_at
                }
            });


        } catch (error) {

            console.error(
                "❌ Erreur /auth/me :",
                error.message
            );

            return res.status(500).json({
                message:
                    "Erreur lors de la récupération du profil."
            });
        }
    }
);


// =========================================================
// EXPORT
// =========================================================

module.exports = router;