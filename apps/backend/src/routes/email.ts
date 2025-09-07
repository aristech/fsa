import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import * as nodemailer from "nodemailer";

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

// Get email configuration from environment variables
function getEmailConfig(): EmailConfig {
  const config = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@example.com",
  };

  console.log("📧 Email configuration:");
  console.log("  SMTP_HOST:", config.host);
  console.log("  SMTP_PORT:", config.port);
  console.log("  SMTP_USER:", config.user);
  console.log("  SMTP_FROM:", config.from);

  return config;
}

// Create email transporter
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
    console.log(
      `✅ [${requestId}] Email server connection verified in ${duration}ms`
    );
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

// Personnel invitation email data interface
interface PersonnelInvitationEmailData {
  to: string;
  personnelName: string;
  companyName: string;
  loginUrl: string;
  temporaryPassword: string;
}

// Send personnel invitation email
export async function sendPersonnelInvitation(
  data: PersonnelInvitationEmailData
) {
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
    const error = `Missing required fields: ${missingFields.join(", ")}`;
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
    subject: `Welcome to ${data.companyName} - Field Service Automation Platform`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${data.companyName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .credentials { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .button { display: inline-block; background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${data.companyName}</h1>
              <p>Field Service Automation Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${data.personnelName}!</h2>
              <p>You have been invited to join the ${data.companyName} Field Service Automation platform.</p>

              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${data.to}</p>
                <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
                <p><em>Important: Please change your password after your first login for security purposes.</em></p>
              </div>

              <a href="${data.loginUrl}" class="button">Login to Platform</a>

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
    textLength: mailOptions.text.length,
  });

  try {
    console.log(`📧 [${requestId}] Attempting to send email...`);
    const result = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    console.log(
      `✅ [${requestId}] Personnel invitation email sent successfully in ${duration}ms`
    );
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
    if (error.code === "EAUTH") {
      errorMessage =
        "SMTP authentication failed. Please check your credentials.";
    } else if (error.code === "ECONNECTION") {
      errorMessage =
        "SMTP connection failed. Please check your host and port settings.";
    } else if (error.code === "ETIMEDOUT") {
      errorMessage =
        "SMTP connection timed out. Please check your network connection.";
    }

    return {
      success: false,
      error: errorMessage,
      code: error.code,
      duration,
    };
  }
}

// Check email service health
export async function checkEmailServiceHealth() {
  try {
    const transporter = await createEmailTransporter();
    return {
      success: true,
      message: "Email service is healthy",
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
      },
    };
  }
}

// Send test email
export async function sendTestEmail(to: string) {
  try {
    const transporter = await createEmailTransporter();
    const config = getEmailConfig();

    const mailOptions = {
      from: config.from,
      to: to,
      subject: "Test Email - Field Service Automation",
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from the Field Service Automation system.</p>
        <p>If you received this email, the SMTP configuration is working correctly.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
      text: `
        Test Email

        This is a test email from the Field Service Automation system.

        If you received this email, the SMTP configuration is working correctly.

        Timestamp: ${new Date().toISOString()}
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Email routes
export async function emailRoutes(fastify: FastifyInstance) {
  // GET /api/v1/email/test - Check email service health
  fastify.get("/test", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await checkEmailServiceHealth();
      return reply.send(result);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // POST /api/v1/email/test - Send test email
  fastify.post(
    "/test",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { to } = request.body as { to: string };

        if (!to) {
          return reply.status(400).send({
            success: false,
            error: "Email address is required",
          });
        }

        const result = await sendTestEmail(to);
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // POST /api/v1/email/personnel-invitation - Send personnel invitation
  fastify.post(
    "/personnel-invitation",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { to, personnelName, companyName, loginUrl, temporaryPassword } =
          request.body as PersonnelInvitationEmailData;

        if (
          !to ||
          !personnelName ||
          !companyName ||
          !loginUrl ||
          !temporaryPassword
        ) {
          return reply.status(400).send({
            success: false,
            error: "All fields are required",
          });
        }

        const result = await sendPersonnelInvitation({
          to,
          personnelName,
          companyName,
          loginUrl,
          temporaryPassword,
        });

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );
}
