
const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();
const db = require("../db");

const JWT_SECRET =
    process.env.JWT_SECRET || "webquiz-secret-dev";

// ============================================================
// AUTHENTIFICATION ADMIN
// ============================================================

function requireAdmin(req, res, next) {
    try {
        const authorization = req.headers.authorization;

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

        const token = authorization.substring(7);

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== "admin") {
            return res.status(403).json({
                message: "Accès réservé aux administrateurs."
            });
        }

        req.user = decoded;

        next();

    } catch (error) {
        console.error(
            "Erreur authentification admin :",
            error.message
        );

        return res.status(401).json({
            message: "Session invalide ou expirée."
        });
    }
}

// ============================================================
// FORMAT QUESTION
// ============================================================

function formatQuestion(row) {
    return {
        id: row.id,
        question: row.question,
        category: row.category,

        options: [
            row.option_a,
            row.option_b,
            row.option_c,
            row.option_d
        ].filter(option => option !== null),

        // Le frontend utilise l'index de la bonne réponse
        answer: ["A", "B", "C", "D"].indexOf(
            row.correct_answer
        ),

        correct_answer: row.correct_answer,
        created_at: row.created_at
    };
}

// ============================================================
// VALIDATION
// ============================================================

function validateQuestion(question, options, answer) {

    if (
        typeof question !== "string" ||
        !question.trim()
    ) {
        return "La question est obligatoire.";
    }

    if (!Array.isArray(options) || options.length !== 4) {
        return "Il faut exactement 4 réponses.";
    }

    for (const option of options) {
        if (
            typeof option !== "string" ||
            !option.trim()
        ) {
            return "Toutes les réponses sont obligatoires.";
        }
    }

    const validAnswers = ["A", "B", "C", "D"];

    if (
        !validAnswers.includes(
            String(answer).toUpperCase()
        )
    ) {
        return "La réponse correcte doit être A, B, C ou D.";
    }

    return null;
}

// ============================================================
// GET /questions
// PUBLIC
// ============================================================

router.get("/", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id,
                question,
                category,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                created_at
            FROM questions
            ORDER BY id ASC
        `);

        const questions = rows.map(formatQuestion);

        res.json(questions);

    } catch (error) {

        console.error(
            "Erreur récupération questions :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la récupération des questions."
        });
    }
});

// ============================================================
// GET /questions/:category
// PUBLIC
// ============================================================

router.get("/:category", async (req, res) => {

    try {

        const category = req.params.category;

        const [rows] = await db.query(`
            SELECT
                id,
                question,
                category,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                created_at
            FROM questions
            WHERE category = ?
            ORDER BY id ASC
        `, [category]);

        const questions = rows.map(formatQuestion);

        res.json(questions);

    } catch (error) {

        console.error(
            "Erreur récupération catégorie :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la récupération des questions."
        });
    }
});

// ============================================================
// GET /admin/questions
// ADMIN
// ============================================================

router.get("/admin/list", requireAdmin, async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id,
                question,
                category,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                created_at
            FROM questions
            ORDER BY id ASC
        `);

        const questions = rows.map(formatQuestion);

        res.json({
            questions
        });

    } catch (error) {

        console.error(
            "Erreur admin questions :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la récupération des questions."
        });
    }
});

// ============================================================
// POST /admin/questions
// ADMIN
// AJOUTER
// ============================================================

router.post("/admin", requireAdmin, async (req, res) => {

    try {

        const {
            question,
            category,
            options,
            answer
        } = req.body;

        const validationError =
            validateQuestion(
                question,
                options,
                answer
            );

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        if (
            !category ||
            typeof category !== "string"
        ) {
            return res.status(400).json({
                message: "La catégorie est obligatoire."
            });
        }

        const correctAnswer =
            String(answer).toUpperCase();

        const [result] = await db.query(`
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
        `, [
            question.trim(),
            category.trim(),
            options[0].trim(),
            options[1].trim(),
            options[2].trim(),
            options[3].trim(),
            correctAnswer
        ]);

        const [rows] = await db.query(`
            SELECT
                id,
                question,
                category,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                created_at
            FROM questions
            WHERE id = ?
        `, [result.insertId]);

        res.status(201).json({
            message: "Question ajoutée avec succès.",
            question: formatQuestion(rows[0])
        });

    } catch (error) {

        console.error(
            "Erreur ajout question :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de l'ajout de la question."
        });
    }
});

// ============================================================
// PUT /admin/questions/:id
// ADMIN
// MODIFIER
// ============================================================

router.put("/admin/:id", requireAdmin, async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "ID de question invalide."
            });
        }

        const {
            question,
            category,
            options,
            answer
        } = req.body;

        const validationError =
            validateQuestion(
                question,
                options,
                answer
            );

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        if (
            !category ||
            typeof category !== "string"
        ) {
            return res.status(400).json({
                message: "La catégorie est obligatoire."
            });
        }

        const [existing] = await db.query(`
            SELECT id
            FROM questions
            WHERE id = ?
        `, [id]);

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Question introuvable."
            });
        }

        await db.query(`
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
        `, [
            question.trim(),
            category.trim(),
            options[0].trim(),
            options[1].trim(),
            options[2].trim(),
            options[3].trim(),
            String(answer).toUpperCase(),
            id
        ]);

        const [rows] = await db.query(`
            SELECT
                id,
                question,
                category,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                created_at
            FROM questions
            WHERE id = ?
        `, [id]);

        res.json({
            message: "Question modifiée avec succès.",
            question: formatQuestion(rows[0])
        });

    } catch (error) {

        console.error(
            "Erreur modification question :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la modification."
        });
    }
});

// ============================================================
// DELETE /admin/questions/:id
// ADMIN
// SUPPRIMER
// ============================================================

router.delete("/admin/:id", requireAdmin, async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "ID de question invalide."
            });
        }

        const [rows] = await db.query(`
            SELECT
                id,
                question,
                category,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                created_at
            FROM questions
            WHERE id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Question introuvable."
            });
        }

        await db.query(`
            DELETE FROM questions
            WHERE id = ?
        `, [id]);

        res.json({
            message: "Question supprimée avec succès.",
            question: formatQuestion(rows[0])
        });

    } catch (error) {

        console.error(
            "Erreur suppression question :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la suppression."
        });
    }
});

module.exports = router;