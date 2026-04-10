const nodemailer = require('nodemailer');

/**
 * Send a welcome email after signup.
 * Uses Gmail SMTP with an App Password.
 */
const sendWelcomeEmail = async (toEmail, userName) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    const mailOptions = {
      from: `"Notice Display System" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🎉 Welcome to the Notice Display System!',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e0e0e0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px 30px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;">Welcome, ${userName}! 🚀</h1>
          </div>
          <div style="padding:30px;">
            <p style="font-size:16px;line-height:1.6;">Your account has been created successfully. You can now:</p>
            <ul style="font-size:15px;line-height:2;">
              <li>📝 Create text, image, video & audio notices</li>
              <li>📺 Display notices on any screen</li>
              <li>📱 Share via QR code</li>
              <li>⚡ Real-time updates across all devices</li>
            </ul>
            <p style="font-size:14px;color:#888;margin-top:20px;">— The Notice Display System Team</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email sent to ${toEmail}`);
  } catch (err) {
    console.error('📧 Email send error:', err.message);
    // Don't throw — email failure shouldn't block signup
  }
};

module.exports = { sendWelcomeEmail };
