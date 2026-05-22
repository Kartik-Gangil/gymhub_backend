const { VerifyToken } = require('@kartikgangil/watchman_js');
// const dotenv = require('dotenv');
// dotenv.config();
// const secret = process.env.JWT_SECRET

function tokenVerifier(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : req.body?.token || req.query?.token;

    if (!token) {
        return res.status(401).json({ error: 'Token missing' });
    }

    try {
        const payload = await VerifyToken(token);
        console.log(payload)
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = tokenVerifier;
