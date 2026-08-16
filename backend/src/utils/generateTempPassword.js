const crypto = require('crypto');

/**
 * Generates a cryptographically random temporary password.
 * Format: Uppercase + lowercase + digits + special chars, 12 characters.
 */
const generateTempPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';

  const getRandom = (str) => str[crypto.randomInt(0, str.length)];

  const parts = [
    getRandom(upper),
    getRandom(upper),
    getRandom(lower),
    getRandom(lower),
    getRandom(digits),
    getRandom(digits),
    getRandom(special),
  ];

  const remaining = 5;
  const all = upper + lower + digits + special;
  for (let i = 0; i < remaining; i++) {
    parts.push(getRandom(all));
  }

  // Shuffle the array to avoid predictable positions
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join('');
};

module.exports = { generateTempPassword };
