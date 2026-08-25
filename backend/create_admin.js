
const bcrypt = require("bcryptjs");
const db = require("./db");

async function createAdmin() {
    try {
        const name = "Administrateur";
        const email = "admin@webquiz.com";
        const password = "Admin123456";

        // Vérifier si l'admin existe déjà
        const [existingUsers] = await db.execute(
            `
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        if (existingUsers.length > 0) {
            console.log("❌ Cet utilisateur existe déjà.");
            return;
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Créer l'administrateur dans MySQL
        const [result] = await db.execute(
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
                name,
                email,
                hashedPassword,
                "admin",
                0,
                1,
                false,
                null
            ]
        );

        console.log("======================================");
        console.log("✅ ADMIN CRÉÉ DANS MYSQL");
        console.log("======================================");
        console.log("ID :", result.insertId);
        console.log("Nom :", name);
        console.log("Email :", email);
        console.log("Mot de passe :", password);
        console.log("Rôle : admin");
        console.log("Base : webquiz");
        console.log("Table : users");
        console.log("======================================");

    } catch (error) {
        console.error("❌ Erreur création admin :", error);
    } finally {
        process.exit();
    }
}

createAdmin();