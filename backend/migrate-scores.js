const fs = require("fs");
const path = require("path");
const db = require("./db");

const usersFile = path.join(__dirname, "data", "users.json");

async function migrateScores() {
    let connection;

    try {
        console.log("======================================");
        console.log("🔄 Migration users.json → MySQL");
        console.log("======================================");

        // Vérifier users.json
        if (!fs.existsSync(usersFile)) {
            console.error("❌ Fichier users.json introuvable :");
            console.error(usersFile);
            return;
        }

        // Lire users.json
        const users = JSON.parse(
            fs.readFileSync(usersFile, "utf-8")
        );

        if (!Array.isArray(users)) {
            console.error("❌ users.json doit contenir un tableau.");
            return;
        }

        console.log(`👥 ${users.length} utilisateur(s) trouvé(s).`);

        connection = await db.getConnection();

        let usersFound = 0;
        let scoresInserted = 0;
        let scoresSkipped = 0;

        for (const oldUser of users) {

            if (!oldUser.email) {
                console.log("⚠️ Utilisateur sans email ignoré.");
                continue;
            }

            const email = oldUser.email.trim().toLowerCase();

            // Chercher l'utilisateur MySQL par email
            const [mysqlUsers] = await connection.execute(
                `
                SELECT id, email, xp, level
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [email]
            );

            if (mysqlUsers.length === 0) {
                console.log(
                    `⚠️ Utilisateur MySQL introuvable : ${email}`
                );
                continue;
            }

            const mysqlUser = mysqlUsers[0];

            usersFound++;

            console.log(
                `\n👤 ${email} → MySQL ID ${mysqlUser.id}`
            );

            // Vérifier les anciens scores
            if (!Array.isArray(oldUser.scores)) {
                console.log("   ℹ️ Aucun ancien score.");
                continue;
            }

            console.log(
                `   🏆 ${oldUser.scores.length} ancien(s) score(s)`
            );

            for (const oldScore of oldUser.scores) {

                if (!oldScore.quiz) {
                    console.log("   ⚠️ Score sans nom de quiz ignoré.");
                    scoresSkipped++;
                    continue;
                }

                const score = Number(
                    oldScore.score ?? 0
                );

                const totalQuestions = Number(
                    oldScore.total ??
                    oldScore.total_questions ??
                    0
                );

                if (
                    !Number.isFinite(score) ||
                    !Number.isFinite(totalQuestions) ||
                    totalQuestions <= 0
                ) {
                    console.log(
                        `   ⚠️ Score invalide pour "${oldScore.quiz}"`
                    );

                    scoresSkipped++;
                    continue;
                }

                const percentage = Number(
                    oldScore.percentage ??
                    ((score / totalQuestions) * 100).toFixed(2)
                );

                const xpEarned = Number(
                    oldScore.xpGained ??
                    oldScore.xp_earned ??
                    0
                );

                /*
                 * Éviter les doublons.
                 *
                 * On considère qu'un doublon est un score
                 * avec le même utilisateur, quiz, score,
                 * total et date.
                 */
                let createdAt = null;

                if (oldScore.date) {
                    const date = new Date(oldScore.date);

                    if (!isNaN(date.getTime())) {
                        createdAt = date;
                    }
                }

                let duplicateQuery;
                let duplicateParams;

                if (createdAt) {
                    duplicateQuery = `
                        SELECT id
                        FROM scores
                        WHERE user_id = ?
                          AND quiz = ?
                          AND score = ?
                          AND total_questions = ?
                          AND created_at = ?
                        LIMIT 1
                    `;

                    duplicateParams = [
                        mysqlUser.id,
                        String(oldScore.quiz),
                        score,
                        totalQuestions,
                        createdAt
                    ];
                } else {
                    duplicateQuery = `
                        SELECT id
                        FROM scores
                        WHERE user_id = ?
                          AND quiz = ?
                          AND score = ?
                          AND total_questions = ?
                        LIMIT 1
                    `;

                    duplicateParams = [
                        mysqlUser.id,
                        String(oldScore.quiz),
                        score,
                        totalQuestions
                    ];
                }

                const [duplicates] = await connection.execute(
                    duplicateQuery,
                    duplicateParams
                );

                if (duplicates.length > 0) {
                    console.log(
                        `   ⏭️ Déjà présent : ${oldScore.quiz}`
                    );

                    scoresSkipped++;
                    continue;
                }

                // Insérer le score
                if (createdAt) {
                    await connection.execute(
                        `
                        INSERT INTO scores
                        (
                            user_id,
                            quiz,
                            score,
                            total_questions,
                            percentage,
                            xp_earned,
                            created_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            mysqlUser.id,
                            String(oldScore.quiz),
                            score,
                            totalQuestions,
                            percentage,
                            xpEarned,
                            createdAt
                        ]
                    );
                } else {
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
                            mysqlUser.id,
                            String(oldScore.quiz),
                            score,
                            totalQuestions,
                            percentage,
                            xpEarned
                        ]
                    );
                }

                console.log(
                    `   ✅ Migré : ${oldScore.quiz} (${score}/${totalQuestions})`
                );

                scoresInserted++;
            }
        }

        console.log("\n======================================");
        console.log("🎉 MIGRATION TERMINÉE");
        console.log("======================================");
        console.log(`👥 Utilisateurs trouvés : ${usersFound}`);
        console.log(`🏆 Scores ajoutés : ${scoresInserted}`);
        console.log(`⏭️ Scores ignorés : ${scoresSkipped}`);
        console.log("======================================");

    } catch (error) {

        console.error("\n❌ ERREUR MIGRATION");
        console.error(error);

    } finally {

        if (connection) {
            connection.release();
        }

        await db.end();

        console.log("🔌 Connexion MySQL fermée.");
    }
}

migrateScores();