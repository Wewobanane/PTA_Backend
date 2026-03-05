const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Configure SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid email service configured');
}

// Create nodemailer transporter as fallback (if SendGrid not configured)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Use STARTTLS (false for port 587, true for port 465)
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS
  },
  // Force IPv4 to avoid IPv6 connectivity issues on some hosting platforms
  family: 4,
  // Additional options for better reliability
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
});

// Helper function to send email via SendGrid or Nodemailer
const sendEmail = async (mailOptions) => {
  // Use SendGrid if configured
  if (process.env.SENDGRID_API_KEY) {
    const msg = {
      to: mailOptions.to,
      from: process.env.SENDGRID_FROM_EMAIL || mailOptions.from,
      subject: mailOptions.subject,
      html: mailOptions.html
    };
    
    const info = await sgMail.send(msg);
    console.log('✅ Email sent via SendGrid');
    return { success: true, messageId: info[0].headers['x-message-id'] };
  } else {
    // Fallback to Nodemailer (Gmail SMTP)
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via SMTP');
    return { success: true, messageId: info.messageId };
  }
};

// Send activation email
exports.sendActivationEmail = async (email, name, token, role) => {
  const activationLink = `${process.env.FRONTEND_URL}/activate?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER,
    to: email,
    subject: 'Activate Your Account - PTA Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content { 
            background: #f9f9f9; 
            padding: 30px; 
            border-radius: 0 0 10px 10px;
          }
          .button { 
            display: inline-block; 
            background: #667eea; 
            color: white !important; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { 
            text-align: center; 
            color: #888; 
            font-size: 12px; 
            margin-top: 30px; 
            padding: 20px;
          }
          .warning {
            color: #d32f2f;
            font-weight: bold;
            background: #ffebee;
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 PTA Management System</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}!</h2>
            <p>Your account has been created as a <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong> in our PTA Management System.</p>
            <p>To get started, please click the button below to set your password and activate your account:</p>
            <center>
              <a href="${activationLink}" class="button">Activate My Account</a>
            </center>
            <p style="color: #888; font-size: 14px; word-break: break-all;">
              Or copy and paste this link into your browser:<br>
              <a href="${activationLink}">${activationLink}</a>
            </p>
            <div class="warning">
              ⏰ This link will expire in 72 hours.
            </div>
            <p>If you did not request this account, please contact the school administrator.</p>
          </div>
          <div class="footer">
            <p>© 2026 PTA Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await sendEmail(mailOptions);
    console.log('✅ Activation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending activation email:', error);
    throw new Error('Failed to send activation email');
  }
};

// Send password reset email (for future use)
exports.sendPasswordResetEmail = async (email, name, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER,
    to: email,
    subject: 'Reset Your Password - PTA Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content { 
            background: #f9f9f9; 
            padding: 30px; 
            border-radius: 0 0 10px 10px;
          }
          .button { 
            display: inline-block; 
            background: #667eea; 
            color: white !important; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { 
            text-align: center; 
            color: #888; 
            font-size: 12px; 
            margin-top: 30px; 
            padding: 20px;
          }
          .warning {
            color: #d32f2f;
            font-weight: bold;
            background: #ffebee;
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello, ${name}!</h2>
            <p>We received a request to reset your password for your PTA Management System account.</p>
            <p>Click the button below to reset your password:</p>
            <center>
              <a href="${resetLink}" class="button">Reset My Password</a>
            </center>
            <p style="color: #888; font-size: 14px; word-break: break-all;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetLink}">${resetLink}</a>
            </p>
            <div class="warning">
              ⏰ This link will expire in 1 hour.
            </div>
            <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>© 2026 PTA Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await sendEmail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
