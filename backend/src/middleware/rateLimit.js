const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.CONTACT_RATE_LIMIT_PER_HOUR || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent from this network. Please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads in a short time. Please slow down.' },
});

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, contactLimiter, uploadLimiter, generalApiLimiter };
