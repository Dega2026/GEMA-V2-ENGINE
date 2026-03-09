const express = require('express');
const { loginRateLimiter, loginHandler, refreshTokenHandler } = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginRateLimiter, loginHandler);
router.post('/refresh', refreshTokenHandler);

module.exports = router;
