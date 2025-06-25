const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Gửi email OTP bằng SendGrid
 * @param {string} to - Địa chỉ email nhận
 * @param {string} otp - Mã OTP
 * @returns {Promise}
 */
async function sendOTP(to, otp) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM || process.env.SENDGRID_DEFAULT_FROM,
    subject: 'Mã xác thực OTP đăng nhập',
    text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`,
  };

  try {
    return await sgMail.send(msg);
  } catch (error) {
    console.error('Lỗi khi gửi email xác thực:', error.message);
    throw error;
  }
}

module.exports = { sendOTP }; 