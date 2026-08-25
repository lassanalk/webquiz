const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET || "webquiz-secret-dev";

function requireAdmin(req, res, next) {
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

        if (decoded.role !== "admin") {
            return res.status(403).json({
                message:
                    "Accès refusé. Réservé aux administrateurs."
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
            message:
                "Session invalide ou expirée."
        });
    }
}

module.exports = requireAdmin;