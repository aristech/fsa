import nodemailer from 'nodemailer';

// ----------------------------------------------------------------------

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

// ----------------------------------------------------------------------

function getEmailConfig(): EmailConfig {
  const config = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
  };

  // Log configuration status (without sensitive data)
  console.log('📧 Email Service Configuration:');
  console.log('  SMTP_HOST:', config.host);
  console.log('  SMTP_PORT:', config.port);
  console.log('  SMTP_USER:', config.user ? '✅ Set' : '❌ Missing');
  console.log('  SMTP_PASS:', config.pass ? '✅ Set' : '❌ Missing');
  console.log('  SMTP_FROM:', config.from);

  return config;
}

// ----------------------------------------------------------------------

export async function createEmailTransporter() {
  const config = getEmailConfig();
  const requestId = Math.random().toString(36).substr(2, 9);

  console.log(`🔧 [${requestId}] Creating email transporter...`);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
    // Add connection timeout and retry settings
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  });

  console.log(`🔧 [${requestId}] Transporter created, verifying connection...`);

  // Verify connection configuration
  try {
    const startTime = Date.now();
    await transporter.verify();
    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] Email server connection verified in ${duration}ms`);
  } catch (error: any) {
    console.error(`❌ [${requestId}] Email server connection failed:`, {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new Error(`Email server configuration is invalid: ${error.message}`);
  }

  return transporter;
}

// ----------------------------------------------------------------------

export interface PersonnelInvitationEmailData {
  to: string;
  personnelName: string;
  companyName: string;
  loginUrl: string;
  temporaryPassword: string;
}

// ----------------------------------------------------------------------

export async function sendPersonnelInvitation(data: PersonnelInvitationEmailData) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);

  console.log(`📧 [${requestId}] Starting personnel invitation email process`);
  console.log(`📧 [${requestId}] Recipient: ${data.to}`);
  console.log(`📧 [${requestId}] Personnel: ${data.personnelName}`);
  console.log(`📧 [${requestId}] Company: ${data.companyName}`);

  // Validate required fields
  const requiredFields = {
    to: data.to,
    personnelName: data.personnelName,
    companyName: data.companyName,
    loginUrl: data.loginUrl,
    temporaryPassword: data.temporaryPassword,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    const error = `Missing required fields: ${missingFields.join(', ')}`;
    console.error(`❌ [${requestId}] ${error}`);
    return { success: false, error };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.to)) {
    const error = `Invalid email format: ${data.to}`;
    console.error(`❌ [${requestId}] ${error}`);
    return { success: false, error };
  }

  console.log(`📧 [${requestId}] Creating email transporter...`);
  const transporter = await createEmailTransporter();
  const config = getEmailConfig();

  console.log(`📧 [${requestId}] Preparing mail options...`);
  const mailOptions = {
    from: config.from,
    to: data.to,
    subject: `Welcome to ${data.companyName} - Field Service Automation`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${data.companyName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #1976d2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background-color: #1976d2;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              margin: 20px 0;
            }
            .credentials {
              background-color: #e3f2fd;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to ${data.companyName}</h1>
            <p>Field Service Automation Platform</p>
          </div>

          <div class="content">
            <h2>Hello ${data.personnelName}!</h2>

            <p>You have been invited to join the ${data.companyName} Field Service Automation platform. This system will help you manage your work assignments, track projects, and collaborate with your team.</p>

            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${data.to}</p>
              <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
            </div>

            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>

            <div style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Login to Your Account</a>
            </div>

            <h3>What you can do:</h3>
            <ul>
              <li>View and manage your assigned tasks</li>
              <li>Track project progress</li>
              <li>Update your availability and skills</li>
              <li>Communicate with your team</li>
              <li>Access important company resources</li>
            </ul>

            <p>If you have any questions or need assistance, please contact your supervisor or the system administrator.</p>

            <p>Welcome aboard!</p>
          </div>

          <div class="footer">
            <p>This is an automated message from ${data.companyName} Field Service Automation System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to ${data.companyName} - Field Service Automation Platform

      Hello ${data.personnelName}!

      You have been invited to join the ${data.companyName} Field Service Automation platform.

      Your Login Credentials:
      Email: ${data.to}
      Temporary Password: ${data.temporaryPassword}

      Important: Please change your password after your first login for security purposes.

      Login URL: ${data.loginUrl}

      What you can do:
      - View and manage your assigned tasks
      - Track project progress
      - Update your availability and skills
      - Communicate with your team
      - Access important company resources

      If you have any questions or need assistance, please contact your supervisor or the system administrator.

      Welcome aboard!

      ---
      This is an automated message from ${data.companyName} Field Service Automation System.
      Please do not reply to this email.
    `,
  };

  console.log(`📧 [${requestId}] Mail options prepared:`, {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    htmlLength: mailOptions.html.length,
    textLength: mailOptions.text.length,
  });

  try {
    console.log(`📧 [${requestId}] Attempting to send email...`);
    const result = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    console.log(`✅ [${requestId}] Personnel invitation email sent successfully in ${duration}ms`);
    console.log(`📧 [${requestId}] Message ID: ${result.messageId}`);
    console.log(`📧 [${requestId}] Response: ${result.response}`);

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      `❌ [${requestId}] Failed to send personnel invitation email after ${duration}ms:`,
      {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
      }
    );

    // Enhanced error handling
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'SMTP connection failed. Please check your host and port settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'SMTP connection timed out. Please check your network connection.';
    }

    return {
      success: false,
      error: errorMessage,
      code: error.code,
      duration,
    };
  }
}

// ----------------------------------------------------------------------

export async function sendPasswordResetEmail(email: string, resetUrl: string, userName: string) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);

  console.log(`📧 [${requestId}] Starting password reset email process`);
  console.log(`📧 [${requestId}] Recipient: ${email}`);
  console.log(`📧 [${requestId}] User: ${userName}`);

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const error = `Invalid email format: ${email}`;
    console.error(`❌ [${requestId}] ${error}`);
    return { success: false, error };
  }

  console.log(`📧 [${requestId}] Creating email transporter...`);
  const transporter = await createEmailTransporter();
  const config = getEmailConfig();

  const mailOptions = {
    from: config.from,
    to: email,
    subject: 'Password Reset - Field Service Automation',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #d32f2f;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background-color: #d32f2f;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>

          <div class="content">
            <h2>Hello ${userName}!</h2>

            <p>You have requested to reset your password for the Field Service Automation platform.</p>

            <p>Click the button below to reset your password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>

            <p>If you did not request this password reset, please ignore this email and contact your system administrator.</p>
          </div>

          <div class="footer">
            <p>This is an automated message from Field Service Automation System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `,
  };

  console.log(`📧 [${requestId}] Mail options prepared:`, {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    htmlLength: mailOptions.html.length,
  });

  try {
    console.log(`📧 [${requestId}] Attempting to send password reset email...`);
    const result = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    console.log(`✅ [${requestId}] Password reset email sent successfully in ${duration}ms`);
    console.log(`📧 [${requestId}] Message ID: ${result.messageId}`);
    console.log(`📧 [${requestId}] Response: ${result.response}`);

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${requestId}] Failed to send password reset email after ${duration}ms:`, {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });

    // Enhanced error handling
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'SMTP connection failed. Please check your host and port settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'SMTP connection timed out. Please check your network connection.';
    }

    return {
      success: false,
      error: errorMessage,
      code: error.code,
      duration,
    };
  }
}

// ----------------------------------------------------------------------

// Test email function for debugging
export async function sendTestEmail(
  to: string = 'test@example.com'
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🧪 [${requestId}] Sending test email to: ${to}`);

  try {
    const result = await sendPersonnelInvitation({
      to,
      personnelName: 'Test User',
      companyName: 'Test Company',
      loginUrl: 'http://localhost:8082/auth/sign-in',
      temporaryPassword: 'test123',
    });

    if (result.success) {
      console.log(`✅ [${requestId}] Test email sent successfully`);
    } else {
      console.error(`❌ [${requestId}] Test email failed:`, result.error);
    }

    return result;
  } catch (error: any) {
    console.error(`❌ [${requestId}] Test email error:`, error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------

// Email service health check
export async function checkEmailServiceHealth(): Promise<{
  healthy: boolean;
  config: {
    host: string;
    port: number;
    user: string;
    from: string;
    hasPassword: boolean;
  };
  connection: {
    verified: boolean;
    error?: string;
    duration?: number;
  };
}> {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🏥 [${requestId}] Checking email service health...`);

  const config = getEmailConfig();
  const healthCheck = {
    healthy: false,
    config: {
      host: config.host,
      port: config.port,
      user: config.user,
      from: config.from,
      hasPassword: !!config.pass,
    },
    connection: {
      verified: false,
      error: undefined as string | undefined,
      duration: undefined as number | undefined,
    },
  };

  try {
    const startTime = Date.now();
    const transporter = await createEmailTransporter();
    const duration = Date.now() - startTime;

    healthCheck.connection.verified = true;
    healthCheck.connection.duration = duration;
    healthCheck.healthy = true;

    console.log(`✅ [${requestId}] Email service is healthy`);
  } catch (error: any) {
    healthCheck.connection.error = error.message;
    console.error(`❌ [${requestId}] Email service health check failed:`, error.message);
  }

  return healthCheck;
}
