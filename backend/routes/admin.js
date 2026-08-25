const express = require("express");
const pool = require("../db");
const requireAdmin = require("../middleware/admin");

const router = express.Router();

/* ============================================================
   STATISTIQUES
============================================================ */

router.get("/stats", requireAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT COUNT(*) AS totalUsers
            FROM users
        `);

        const [scores] = await pool.query(`
            SELECT
                COUNT(*) AS totalScores,
                COALESCE(SUM(score), 0) AS totalCorrect,
                COALESCE(SUM(total_questions), 0) AS totalQuestionsPlayed,
                COALESCE(SUM(xp_earned), 0) AS totalXP
            FROM scores
        `);

        const [premium] = await pool.query(`
            SELECT COUNT(*) AS premiumUsers
            FROM users
            WHERE premium = 1
        `);

        const [questions] = await pool.query(`
            SELECT COUNT(*) AS totalQuestions
            FROM questions
        `);

        let averageSuccess = 0;

        if (Number(scores[0].totalQuestionsPlayed) > 0) {
            averageSuccess = Math.round(
                (
                    Number(scores[0].totalCorrect) /
                    Number(scores[0].totalQuestionsPlayed)
                ) * 100
            );
        }

        res.json({
            totalUsers: Number(users[0].totalUsers),
            totalScores: Number(scores[0].totalScores),
            premiumUsers: Number(premium[0].premiumUsers),
            totalXP: Number(scores[0].totalXP),
            totalQuestions: Number(questions[0].totalQuestions),
            averageSuccess
        });

    } catch (error) {
        console.error("Erreur statistiques :", error);

        res.status(500).json({
            message:
                "Erreur récupération statistiques."
        });
    }
});


/* ============================================================
   UTILISATEURS
============================================================ */

router.get("/users", requireAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.level,
                u.xp,
                u.premium,
                u.premium_until,
                u.created_at,
                COUNT(s.id) AS scoresCount
            FROM users u
            LEFT JOIN scores s
                ON s.user_id = u.id
            GROUP BY
                u.id,
                u.name,
                u.email,
                u.role,
                u.level,
                u.xp,
                u.premium,
                u.premium_until,
                u.created_at
            ORDER BY u.created_at DESC
        `);

        res.json({
            users
        });

    } catch (error) {
        console.error("Erreur utilisateurs :", error);

        res.status(500).json({
            message:
                "Erreur récupération utilisateurs."
        });
    }
});


/* ============================================================
   SUPPRIMER UTILISATEUR
============================================================ */

router.delete(
    "/users/:id",
    requireAdmin,
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const userId = Number(req.params.id);

            if (!Number.isInteger(userId)) {
                return res.status(400).json({
                    message: "ID utilisateur invalide."
                });
            }

            const [users] = await connection.query(
                `SELECT id, role FROM users WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    message:
                        "Utilisateur introuvable."
                });
            }

            if (users[0].role === "admin") {
                return res.status(403).json({
                    message:
                        "Impossible de supprimer un administrateur."
                });
            }

            await connection.beginTransaction();

            await connection.query(
                `DELETE FROM scores WHERE user_id = ?`,
                [userId]
            );

            await connection.query(
                `DELETE FROM users WHERE id = ?`,
                [userId]
            );

            await connection.commit();

            res.json({
                message:
                    "Utilisateur supprimé avec succès."
            });

        } catch (error) {
            await connection.rollback();

            console.error(
                "Erreur suppression utilisateur :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur suppression utilisateur."
            });

        } finally {
            connection.release();
        }
    }
);


/* ============================================================
   SCORES
============================================================ */

router.get("/scores", requireAdmin, async (req, res) => {
    try {
        const [scores] = await pool.query(`
            SELECT
                s.id,
                s.user_id AS userId,
                u.name AS userName,
                u.email,
                s.quiz,
                s.score,
                s.total_questions AS total,
                s.percentage,
                s.xp_earned AS xpGained,
                s.created_at AS date
            FROM scores s
            INNER JOIN users u
                ON u.id = s.user_id
            ORDER BY s.created_at DESC
        `);

        res.json({
            scores
        });

    } catch (error) {
        console.error("Erreur scores :", error);

        res.status(500).json({
            message:
                "Erreur récupération scores."
        });
    }
});


/* ============================================================
   CLASSEMENT
============================================================ */
router.get(
    "/ranking",
    requireAdmin,
    async (req, res) => {
        try {
            const [ranking] = await pool.query(`
                SELECT
                    id,
                    name,
                    xp,
                    FLOOR(xp / 500) + 1 AS level,
                    premium
                FROM users
                WHERE role != 'admin'
                ORDER BY xp DESC
            `);

            res.json({
                ranking
            });

        } catch (error) {
            console.error(
                "Erreur classement :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur récupération classement."
            });
        }
    }
);
/* ============================================================
   QUESTIONS - GET
============================================================ */

router.get(
    "/questions",
    requireAdmin,
    async (req, res) => {
        try {
            const [questions] = await pool.query(`
                SELECT
                    id,
                    question,
                    category,
                    option_a AS optionA,
                    option_b AS optionB,
                    option_c AS optionC,
                    option_d AS optionD,
                    correct_answer AS correctAnswer,
                    created_at AS createdAt
                FROM questions
                ORDER BY id DESC
            `);

            res.json({
                questions
            });

        } catch (error) {
            console.error(
                "Erreur récupération questions :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur récupération questions."
            });
        }
    }
);


/* ============================================================
   QUESTIONS - AJOUTER
============================================================ */

router.post(
    "/questions",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                question,
                options,
                answer,
                category
            } = req.body;

            if (
                !question ||
                !Array.isArray(options) ||
                options.length !== 4 ||
                answer === undefined ||
                answer === null
            ) {
                return res.status(400).json({
                    message:
                        "Question, 4 options et bonne réponse obligatoires."
                });
            }

            const answerIndex = Number(answer);

            if (
                !Number.isInteger(answerIndex) ||
                answerIndex < 0 ||
                answerIndex > 3
            ) {
                return res.status(400).json({
                    message:
                        "La bonne réponse doit être comprise entre 0 et 3."
                });
            }

            const letters = ["A", "B", "C", "D"];

            const correctAnswer =
                letters[answerIndex];

            const finalCategory =
                category &&
                String(category).trim()
                    ? String(category).trim()
                    : "Général";

            const [result] = await pool.query(
                `
                INSERT INTO questions
                (
                    question,
                    category,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    correct_answer
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    String(question).trim(),
                    finalCategory,
                    String(options[0]).trim(),
                    String(options[1]).trim(),
                    String(options[2]).trim(),
                    String(options[3]).trim(),
                    correctAnswer
                ]
            );

            res.status(201).json({
                message:
                    "Question ajoutée avec succès.",

                question: {
                    id: result.insertId,
                    question:
                        String(question).trim(),
                    category: finalCategory,
                    options: options.map(
                        option =>
                            String(option).trim()
                    ),
                    answer: answerIndex
                }
            });

        } catch (error) {
            console.error(
                "Erreur ajout question :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur ajout question."
            });
        }
    }
);


/* ============================================================
   QUESTIONS - MODIFIER
============================================================ */

router.put(
    "/questions/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const {
                question,
                options,
                answer,
                category
            } = req.body;

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    message:
                        "ID question invalide."
                });
            }

            if (
                !question ||
                !Array.isArray(options) ||
                options.length !== 4 ||
                answer === undefined ||
                answer === null
            ) {
                return res.status(400).json({
                    message:
                        "Données de question invalides."
                });
            }

            const answerIndex = Number(answer);

            if (
                !Number.isInteger(answerIndex) ||
                answerIndex < 0 ||
                answerIndex > 3
            ) {
                return res.status(400).json({
                    message:
                        "La bonne réponse doit être comprise entre 0 et 3."
                });
            }

            const letters = ["A", "B", "C", "D"];

            const correctAnswer =
                letters[answerIndex];

            const finalCategory =
                category &&
                String(category).trim()
                    ? String(category).trim()
                    : "Général";

            const [result] = await pool.query(
                `
                UPDATE questions
                SET
                    question = ?,
                    category = ?,
                    option_a = ?,
                    option_b = ?,
                    option_c = ?,
                    option_d = ?,
                    correct_answer = ?
                WHERE id = ?
                `,
                [
                    String(question).trim(),
                    finalCategory,
                    String(options[0]).trim(),
                    String(options[1]).trim(),
                    String(options[2]).trim(),
                    String(options[3]).trim(),
                    correctAnswer,
                    id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message:
                        "Question introuvable."
                });
            }

            res.json({
                message:
                    "Question modifiée avec succès."
            });

        } catch (error) {
            console.error(
                "Erreur modification question :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur modification question."
            });
        }
    }
);


/* ============================================================
   QUESTIONS - SUPPRIMER
============================================================ */

router.delete(
    "/questions/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    message:
                        "ID question invalide."
                });
            }

            const [result] = await pool.query(
                `DELETE FROM questions WHERE id = ?`,
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message:
                        "Question introuvable."
                });
            }

            res.json({
                message:
                    "Question supprimée avec succès."
            });

        } catch (error) {
            console.error(
                "Erreur suppression question :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur suppression question."
            });
        }
    }
);


/* ============================================================
   PREMIUM
============================================================ */

router.get(
    "/premium",
    requireAdmin,
    async (req, res) => {
        try {
            const [premiumUsers] = await pool.query(`
                SELECT
                    id,
                    name,
                    email,
                    premium_until AS premiumUntil,
                    level,
                    xp
                FROM users
                WHERE premium = 1
                ORDER BY premium_until DESC
            `);

            res.json({
                premiumUsers
            });

        } catch (error) {
            console.error(
                "Erreur Premium :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur récupération Premium."
            });
        }
    }
);


module.exports = router;