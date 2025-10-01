import type { FastifyRequest, FastifyReply } from 'fastify';

import { z } from 'zod';

const SubmitSupportRequestSchema = z.object({
  type: z.enum(['bug', 'feature', 'other']),
  title: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  email: z.string().email().optional().or(z.literal('')),
  userInfo: z.object({
    userId: z.string().min(1, 'User ID is required'),
    userName: z.string().min(1, 'User name is required'),
    userEmail: z.string().email('Valid email is required'),
    userRole: z.string().min(1, 'User role is required'),
    tenantId: z.string().min(1, 'Tenant ID is required'),
    tenantName: z.string().min(1, 'Tenant name is required'),
    subscriptionPlan: z.string().optional(),
  }),
});

// Helper function to get support email address
function getSupportEmailAddress(): string {
  let supportEmailAddress = process.env.SUPERADMIN_EMAIL || process.env.SUPPORT_EMAIL;

  // If no single superadmin email, try to get the first one from SUPERADMINS JSON
  if (!supportEmailAddress && process.env.SUPERADMINS) {
    try {
      const superadmins = JSON.parse(process.env.SUPERADMINS);
      if (Array.isArray(superadmins) && superadmins.length > 0) {
        supportEmailAddress = superadmins[0].email;
      }
    } catch (error) {
      console.warn('Failed to parse SUPERADMINS JSON:', error);
    }
  }

  // Fallback to default
  return supportEmailAddress || 'admin@fsa.com';
}

export class SupportController {
  static async submitRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Debug: Log the incoming request body (remove this after testing)
      console.log('Debug - Support request body:', JSON.stringify(request.body, null, 2));

      const body = SubmitSupportRequestSchema.parse(request.body);
      const { type, title, description, email, userInfo } = body;

      // Log the support request for monitoring
      console.log('Support request submitted:', {
        type,
        title,
        userInfo,
        timestamp: new Date().toISOString(),
      });

      // Prepare email content
      const emailSubject = `[${type.toUpperCase()}] ${title}`;
      const emailBody = `
New support request submitted:

Type: ${type.charAt(0).toUpperCase() + type.slice(1)}
Title: ${title}

Description:
${description}

User Information:
- Name: ${userInfo.userName}
- Email: ${userInfo.userEmail}
- Role: ${userInfo.userRole}
- User ID: ${userInfo.userId}

Company Information:
- Company: ${userInfo.tenantName}
- Tenant ID: ${userInfo.tenantId}
- Subscription Plan: ${userInfo.subscriptionPlan || 'Free'}

Contact Email: ${email || userInfo.userEmail}

Submitted at: ${new Date().toISOString()}
      `;

      // Send email notification
      try {
        const nodemailer = require('nodemailer');
        const supportEmailAddress = getSupportEmailAddress();

        // Log SMTP configuration (without password)
        console.log('📧 SMTP Configuration:', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          from: process.env.SMTP_FROM,
          supportEmail: supportEmailAddress,
          hasPassword: !!process.env.SMTP_PASS,
        });

        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          throw new Error('Missing SMTP configuration. Please check SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
        }

        // Create transporter with AWS SES optimized settings
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const isSecure = smtpPort === 465;

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: smtpPort,
          secure: isSecure, // true for 465, false for other ports like 587
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            // AWS SES requires these settings
            ciphers: 'SSLv3',
            rejectUnauthorized: false,
          },
          // AWS SES specific settings
          connectionTimeout: 10000, // 10 seconds
          greetingTimeout: 10000, // 10 seconds
          socketTimeout: 10000, // 10 seconds
        });

        // Test the connection
        console.log('🔍 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');

        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: supportEmailAddress,
          subject: emailSubject,
          text: emailBody,
          replyTo: email || userInfo.userEmail,
        };

        console.log('📧 Sending email with options:', {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          replyTo: mailOptions.replyTo,
        });

        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Email sent successfully:', {
          messageId: info.messageId,
          response: info.response,
        });

        console.log('Support request email sent successfully:', {
          to: supportEmailAddress,
          type,
          title,
          userId: userInfo.userId,
          tenantId: userInfo.tenantId,
        });
      } catch (emailError) {
        console.error('Failed to send support request email:', {
          error: emailError,
          type,
          title,
          userId: userInfo.userId,
          tenantId: userInfo.tenantId,
        });

        // Don't fail the request if email fails, just log it
        console.error('Email sending failed:', emailError);
      }

      // Send success response
      reply.status(200).send({
        success: true,
        message: 'Support request submitted successfully',
        data: {
          type,
          title,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error processing support request:', {
        error,
        requestBody: request.body,
        userId: (request.user as any)?._id,
        tenantId: (request.user as any)?.tenantId,
      });

      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid request data',
          errors: error.issues,
        });
        return;
      }

      reply.status(500).send({
        success: false,
        message: 'Failed to submit support request',
        messageKey: 'support.submission_failed',
      });
    }
  }

  static async testEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const nodemailer = require('nodemailer');
      const supportEmailAddress = getSupportEmailAddress();

      console.log('🧪 Testing email configuration...');
      console.log('📧 SMTP Configuration:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        supportEmail: supportEmailAddress,
        hasPassword: !!process.env.SMTP_PASS,
      });

      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return reply.status(400).send({
          success: false,
          message: 'Missing SMTP configuration. Please check SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
        });
      }

      // Create transporter with AWS SES optimized settings
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const isSecure = smtpPort === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: isSecure, // true for 465, false for other ports like 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          // AWS SES requires these settings
          ciphers: 'SSLv3',
          rejectUnauthorized: false,
        },
        // AWS SES specific settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000, // 10 seconds
        socketTimeout: 10000, // 10 seconds
      });

      // Test connection
      console.log('🔍 Testing SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');

      // Send test email
      const testEmailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: supportEmailAddress,
        subject: '🧪 FSA Support System Test Email',
        text: `This is a test email from the FSA Support System.

Sent at: ${new Date().toISOString()}

SMTP Configuration:
- Host: ${process.env.SMTP_HOST}
- Port: ${process.env.SMTP_PORT}
- User: ${process.env.SMTP_USER}
- From: ${process.env.SMTP_FROM || process.env.SMTP_USER}

If you receive this email, the support system email configuration is working correctly!`,
      };

      console.log('📧 Sending test email to:', supportEmailAddress);
      const info = await transporter.sendMail(testEmailOptions);

      console.log('✅ Test email sent successfully:', {
        messageId: info.messageId,
        response: info.response,
      });

      reply.status(200).send({
        success: true,
        message: 'Test email sent successfully',
        data: {
          to: supportEmailAddress,
          messageId: info.messageId,
          response: info.response,
        },
      });
    } catch (error) {
      console.error('❌ Email test failed:', error);

      reply.status(500).send({
        success: false,
        message: 'Email test failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}