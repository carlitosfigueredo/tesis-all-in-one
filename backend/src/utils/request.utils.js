// src/utils/request.utils.js
// Helpers para extraer datos del request HTTP

const getIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

module.exports = { getIp, getUserAgent };
