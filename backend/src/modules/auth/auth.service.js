const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { sendEmail } = require('../../utils/email/emailService');
const { welcomeEmail, passwordResetEmail } = require('../../utils/email/emailTemplates');
const { generateTempPassword } = require('../../utils/generateTempPassword');
const { MAX_LOGIN_ATTEMPTS, LOCK_TIME_MS, TOKEN_EXPIRY, ROLE_LABELS } = require('../../config/constants');

const BCRYPT_ROUNDS = 12;

const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: TOKEN_EXPIRY.ACCESS,
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: TOKEN_EXPIRY.REFRESH,
  });
};

const hashPassword = async (plaintext) => {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
};

const comparePasswords = async (plaintext, hash) => {
  return bcrypt.compare(plaintext, hash);
};

/**
 * Creates a new user account, sends welcome email with temporary password.
 * Called by director/chairperson when provisioning accounts.
 */
const provisionUserAccount = async ({ name, email, role, scopeRef, scopeModel, createdBy }) => {
  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    scopeRef: scopeRef || null,
    scopeModel: scopeModel || null,
    isActive: true,
    mustChangePassword: true,
    createdBy,
  });

  if (role === 'center_head' && scopeRef) {
    const Campus = require('../campuses/campus.model');
    await Campus.findByIdAndUpdate(scopeRef, { centerHeadRef: user._id }).catch(() => {});
  }

  const emailContent = welcomeEmail(name, email, tempPassword, ROLE_LABELS[role] || role);
  await sendEmail(email, emailContent.subject, emailContent.html);

  return user;
};

/**
 * Handles user login with account lockout protection.
 */
const loginUser = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordHash +refreshTokens +loginAttempts +lockedUntil'
  );

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account has been deactivated. Contact your administrator.');
    error.statusCode = 403;
    throw error;
  }

  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    const error = new Error(`Account is temporarily locked. Try again in ${minutesLeft} minute(s).`);
    error.statusCode = 423;
    throw error;
  }

  const passwordMatches = await comparePasswords(password, user.passwordHash);

  if (!passwordMatches) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    let isNowLocked = false;

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
      user.loginAttempts = 0;
      isNowLocked = true;
    }

    await user.save();

    const error = new Error(
      isNowLocked
        ? 'Too many failed attempts. Your account has been temporarily locked for 30 minutes.'
        : `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - user.loginAttempts} attempt(s) remaining before lockout.`
    );
    error.statusCode = 401;
    throw error;
  }

  // Reset lockout on successful login
  user.loginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token (keep last 5 sessions)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  await user.save();

  return { user: user.toSafeObject(), accessToken, refreshToken };
};

/**
 * Rotates the refresh token — issues a new access + refresh token pair.
 */
const rotateRefreshToken = async (incomingRefreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token.');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');

  if (!user || !user.refreshTokens.includes(incomingRefreshToken)) {
    // Possible token theft — invalidate all sessions atomically
    if (user) {
      await User.findByIdAndUpdate(user._id, { $set: { refreshTokens: [] } });
    }
    const error = new Error('Session is invalid. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  // Replace old token with new one
  const updatedTokens = user.refreshTokens.filter((t) => t !== incomingRefreshToken);
  updatedTokens.push(newRefreshToken);
  await User.findByIdAndUpdate(user._id, { $set: { refreshTokens: updatedTokens } });

  return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Invalidates the provided refresh token on logout.
 */
const logoutUser = async (userId, refreshToken) => {
  const user = await User.findById(userId).select('+refreshTokens');
  if (user && refreshToken) {
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    await user.save();
  }
};

/**
 * Changes password for an authenticated user (used for first-login forced change too).
 * Uses two targeted updates to avoid partial-select save issues with select:false fields.
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const matches = await comparePasswords(currentPassword, user.passwordHash);
  if (!matches) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error('New password must be different from your current password.');
    error.statusCode = 400;
    throw error;
  }

  const newHash = await hashPassword(newPassword);

  // Use findByIdAndUpdate to atomically update all fields regardless of select:false
  await User.findByIdAndUpdate(userId, {
    $set: {
      passwordHash: newHash,
      mustChangePassword: false,
      refreshTokens: [], // Invalidate all existing sessions
    },
  });
};

/**
 * Initiates the forgot-password flow by generating and emailing a 6-digit OTP.
 */
const initiateForgotPassword = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail })
    .select('+passwordResetToken +passwordResetExpiry +passwordResetAttempts');

  // Always return cleanly if user doesn't exist or is deactivated to prevent enumeration
  if (!user || !user.isActive) return;

  const otp = String(crypto.randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(otp, 10);

  user.passwordResetToken = otpHash;
  user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  user.passwordResetAttempts = 0;
  await user.save();

  const emailContent = passwordResetEmail(user.name, otp);

  try {
    await sendEmail(email, emailContent.subject, emailContent.html);
  } catch (err) {
    // Unset reset token so we don't leave an unreceived token in the DB
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    user.passwordResetAttempts = 0;
    await user.save().catch(() => {});

    const error = new Error(`Failed to send password reset email: ${err.message}. Please verify email settings.`);
    error.statusCode = 500;
    throw error;
  }
};

/**
 * Resets the password using the OTP from email.
 */
const resetPasswordWithOtp = async (email, otp, newPassword) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({
    email: normalizedEmail,
    passwordResetExpiry: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiry +passwordResetAttempts');

  if (!user || !user.passwordResetToken) {
    const error = new Error('OTP is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  if ((user.passwordResetAttempts || 0) >= 5) {
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    user.passwordResetAttempts = 0;
    await user.save();
    const error = new Error('Too many invalid OTP attempts. Please request a new OTP.');
    error.statusCode = 400;
    throw error;
  }

  const otpMatches = await bcrypt.compare(otp, user.passwordResetToken);
  if (!otpMatches) {
    user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
    await user.save();

    const attemptsLeft = 5 - user.passwordResetAttempts;
    const error = new Error(
      attemptsLeft > 0
        ? `OTP is invalid. You have ${attemptsLeft} attempt(s) remaining.`
        : 'Too many invalid OTP attempts. Please request a new OTP.'
    );
    error.statusCode = 400;
    throw error;
  }

  const newHash = await hashPassword(newPassword);

  // Update password, clear reset token, and unlock account if previously locked
  await User.findByIdAndUpdate(user._id, {
    $set: {
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      passwordResetAttempts: 0,
      mustChangePassword: false,
      loginAttempts: 0,
      lockedUntil: null,
      refreshTokens: [],
    },
  });
};

module.exports = {
  provisionUserAccount,
  loginUser,
  rotateRefreshToken,
  logoutUser,
  changePassword,
  initiateForgotPassword,
  resetPasswordWithOtp,
  hashPassword,
};
