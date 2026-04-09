const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

async function sendWelcomeEmail(to, username, password) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: to,
    subject: 'Your PMO Dashboard Account',
    html: `
      <h2>Welcome to PMO Dashboard</h2>
      <p>Hi ${username},</p>
      <p>Your account has been created successfully.</p>
      <p><strong>Login Details:</strong></p>
      <ul>
        <li>Username: ${username}</li>
        <li>Password: ${password}</li>
      </ul>
      <p>Login at: <a href="http://pmotest.zapcom.ai/login</a></p>
      <p>Please change your password after your first login.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendWelcomeEmail };
