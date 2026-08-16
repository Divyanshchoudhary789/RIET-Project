const authService = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/response');

const REFRESH_COOKIE_NAME = 'riet_refresh_token';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

    return sendSuccess(res, 200, 'Login successful.', {
      user,
      accessToken,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (!incomingToken) {
      return sendError(res, 401, 'Refresh token not provided.');
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.rotateRefreshToken(incomingToken);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getCookieOptions());

    return sendSuccess(res, 200, 'Token refreshed.', { accessToken });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    await authService.logoutUser(req.user._id, incomingToken);

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    return sendSuccess(res, 200, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user._id, currentPassword, newPassword);

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    return sendSuccess(res, 200, 'Password changed successfully. Please log in with your new password.');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.initiateForgotPassword(email);
    // Always return success — prevents user enumeration
    return sendSuccess(
      res,
      200,
      'If an account with that email exists, a password reset OTP has been sent.'
    );
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    await authService.resetPasswordWithOtp(email, otp, newPassword);
    return sendSuccess(res, 200, 'Password has been reset successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    // req.user is populated by authenticate middleware with sensitive fields already excluded
    // via .select(). Convert to plain object and explicitly remove any fields that may have
    // slipped through, then return.
    const user = req.user.toObject ? req.user.toObject() : { ...req.user };

    delete user.passwordHash;
    delete user.refreshTokens;
    delete user.passwordResetToken;
    delete user.passwordResetExpiry;
    delete user.loginAttempts;
    delete user.lockedUntil;

    return sendSuccess(res, 200, 'User profile retrieved.', user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
};
