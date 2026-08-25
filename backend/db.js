const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Lassana123@",
    database: "webquiz",
    port: 3306,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testDatabase() {
    try {
        const connection = await db.getConnection();

        console.log("======================================");
        console.log("✅ Connexion réussie à MySQL");
        console.log("🗄️ Base de données : webquiz");
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