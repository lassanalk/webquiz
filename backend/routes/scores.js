const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const JWT_SECRET =
    process.env.JWT_SECRET || "webquiz-secret-dev";

/* =========================================================
   AUTHENTIFICATION JWT
========================================================= */

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
            authorization.substring(7);

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
            message:
                "Session invalide ou expirée."
        });
    }
}


/* =========================================================
   CALCUL XP
========================================================= */

function calculateXP(
    score,
    totalQuestions
) {
    if (totalQuestions <= 0) {
        return 0;
    }

    const percentage =
        (score / totalQuestions) * 100;

    // 10 XP par bonne réponse
    let xp = score * 10;

    // Bonus
    if (percentage === 100) {
        xp += 50;
    } else if (percentage >= 80) {
        xp += 30;
    } else if (percentage >= 60) {
        xp += 20;
    } else if (percentage >= 40) {
        xp += 10;
    }

    return xp;
}


/* =========================================================
   CALCUL DU NIVEAU
========================================================= */

function calculateLevel(xp) {

    // Chaque niveau demande 500 XP
    return Math.floor(xp / 100) + 1;
}


/* =========================================================
   POST /scores
   SAUVEGARDER UN SCORE
========================================================= */

router.post(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                quiz,
                score,
                total,
                total_questions,
                correctAnswers
            } = req.body;


            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (!quiz) {
                return res.status(400).json({
                    message:
                        "Le nom du quiz est obligatoire."
                });
            }

            const numericScore =
                Number(score);

            const numericTotal =
                Number(
                    total_questions ??
                    total
                );

            const numericCorrect =
                Number(
                    correctAnswers ??
                    numericScore
                );


            if (
                !Number.isFinite(
                    numericScore
                ) ||
                !Number.isFinite(
                    numericTotal
                )
            ) {
                return res.status(400).json({
                    message:
                        "Le score et le nombre de questions doivent être numériques."
                });
            }


            if (numericTotal <= 0) {
                return res.status(400).json({
                    message:
                        "Le nombre total de questions doit être supérieur à 0."
                });
            }


            if (
                numericScore < 0 ||
                numericScore > numericTotal
            ) {
                return res.status(400).json({
                    message:
                        "Score invalide."
                });
            }


            /* -------------------------------------------------
               POURCENTAGE
            ------------------------------------------------- */

            const percentage =
                Number(
                    (
                        numericScore /
                        numericTotal
                    ) * 100
                ).toFixed(2);


            /* -------------------------------------------------
               XP
            ------------------------------------------------- */

            const xpGained =
                calculateXP(
                    numericCorrect,
                    numericTotal
                );


            /* -------------------------------------------------
               RÉCUPÉRER UTILISATEUR
            ------------------------------------------------- */

            const [users] =
                await db.execute(
                    `
                    SELECT
                        id,
                        xp,
                        level,
                        premium,
                        premium_until
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


            /* -------------------------------------------------
               NOUVEL XP
            ------------------------------------------------- */

            const oldXP =
                Number(user.xp) || 0;

            const newXP =
                oldXP + xpGained;


            /* -------------------------------------------------
               NOUVEAU NIVEAU
            ------------------------------------------------- */

            const newLevel =
                calculateLevel(newXP);


            /* -------------------------------------------------
               TRANSACTION
            ------------------------------------------------- */

            const connection =
                await db.getConnection();

            try {

                await connection.beginTransaction();


                /* ---------------------------------------------
                   INSÉRER SCORE
                --------------------------------------------- */

                const [scoreResult] =
                    await connection.execute(
                        `
                        INSERT INTO scores
                        (
                            user_id,
                            quiz,
                            score,
                            total_questions,
                            percentage,
                            xp_earned
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        [
                            user.id,
                            String(quiz),
                            numericScore,
                            numericTotal,
                            percentage,
                            xpGained
                        ]
                    );


                /* ---------------------------------------------
                   METTRE À JOUR UTILISATEUR
                --------------------------------------------- */

                await connection.execute(
                    `
                    UPDATE users
                    SET
                        xp = ?,
                        level = ?
                    WHERE id = ?
                    `,
                    [
                        newXP,
                        newLevel,
                        user.id
                    ]
                );


                await connection.commit();


                /* ---------------------------------------------
                   RÉPONSE
                --------------------------------------------- */

                return res.status(201).json({

                    message:
                        "Score sauvegardé avec succès.",

                    score: {

                        id:
                            scoreResult.insertId,

                        quiz:
                            String(quiz),

                        score:
                            numericScore,

                        total_questions:
                            numericTotal,

                        percentage:
                            Number(percentage),

                        xp_earned:
                            xpGained
                    },

                    xpGained,

                    totalXP:
                        newXP,

                    level:
                        newLevel
                });


            } catch (error) {

                await connection.rollback();

                throw error;

            } finally {

                connection.release();

            }

        } catch (error) {

            console.error(
                "❌ Erreur sauvegarde score :",
                error
            );

            return res.status(500).json({
                message:
                    "Erreur lors de la sauvegarde du score."
            });
        }
    }
);


/* =========================================================
   GET /scores
   HISTORIQUE DE L'UTILISATEUR
========================================================= */

router.get(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const [scores] =
                await db.execute(
                    `
                    SELECT
                        id,
                        quiz,
                        score,
                        total_questions,
                        percentage,
                        xp_earned,
                        created_at
                    FROM scores
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    `,
                    [req.user.id]
                );


            const [users] =
                await db.execute(
                    `
                    SELECT
                        xp,
                        level,
                        premium,
                        premium_until
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


            return res.json({

                scores,

                xp:
                    Number(user.xp) || 0,

                level:
                    Number(user.level) || 1,

                premium:
                    Boolean(user.premium),

                premiumUntil:
                    user.premium_until
            });


        } catch (error) {

            console.error(
                "❌ Erreur récupération historique :",
                error
            );

            return res.status(500).json({
                message:
                    "Erreur lors de la récupération de l'historique."
            });
        }
    }
);


/* =========================================================
   GET /scores/stats
   STATISTIQUES UTILISATEUR
========================================================= */

router.get(
    "/stats",
    authenticateToken,
    async (req, res) => {

        try {

            const [stats] =
                await db.execute(
                    `
                    SELECT

                        COUNT(*) AS total_quiz,

                        COALESCE(
                            SUM(score),
                            0
                        ) AS total_correct,

                        COALESCE(
                            SUM(total_questions),
                            0
                        ) AS total_questions,

                        COALESCE(
                            SUM(xp_earned),
                            0
                        ) AS total_xp,

                        COALESCE(
                            AVG(percentage),
                            0
                        ) AS moyenne

                    FROM scores

                    WHERE user_id = ?
                    `,
                    [req.user.id]
                );


            return res.json({
                stats: stats[0]
            });


        } catch (error) {

            console.error(
                "❌ Erreur statistiques :",
                error
            );

            return res.status(500).json({
                message:
                    "Erreur lors du calcul des statistiques."
            });
        }
    }
);


module.exports = router;