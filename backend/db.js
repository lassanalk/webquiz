const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testDatabase() {
    try {
        const connection = await db.getConnection();

        console.log("======================================");
        console.log("✅ Connexion réussie à MySQL");
        console.log(`🗄️ Base de données : ${process.env.DB_NAME}`);
        console.log("======================================");

        connection.release();

    } catch (error) {
        console.error(
            "❌ Erreur de connexion MySQL :",
            error.message
        );
    }
}

testDatabase();

module.exports = db;