import { ENV } from "#utils/envParser.ts";
import { createTransport, Transporter, TransportOptions } from "nodemailer";

// import { logger } from "@/config/logger";
import { getPasswordResetEmailTemplate } from "./reset.template.ts";

export class MailerService {
  private readonly fromAddress: string;
  private transporter!: Transporter;

  constructor() {
    // Production SMTP setup
    console.log(ENV.SMTP_USER, ENV.SMTP_PASSWORD, ENV.SMTP_HOST, ENV.SMTP_PORT);
    this.transporter = createTransport({
      auth: {
        pass: ENV.SMTP_PASSWORD ?? "",
        user: ENV.SMTP_USER ?? "",
      },
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT ?? 465,
      secure: true,
      tls: {
        rejectUnauthorized: true,
      },
    } as TransportOptions);
    this.fromAddress = process.env.SMTP_FROM ?? "bolao@omegafox.me";

    // logger.info("Using SMTP configuration", {
    //   context: "EmailService.constructor",
    //   host: ENV.SMTP_HOST,
    // });

    // Add email template precompilation
    this.precompileTemplates();

    // Add connection testing
    void this.testConnection();
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string) {
    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    const resetUrl = `${process.env.BASE_URL}/reset-password/${resetToken}`; // TODO: Change this to frontend URL

    await this.transporter.sendMail({
      from: this.fromAddress,
      html: getPasswordResetEmailTemplate(name, resetUrl),
      subject: "[BolaoNFL] Redefinir sua senha",
      to,
    });

    //   logger.info("Password reset email sent", {
    //     context: "EmailService.sendPasswordResetEmail",
    //     to,
    //   });
  }

  //   async sendVerificationEmail(to: string, name: string, verificationToken: string): Promise<void> {
  //     const verificationUrl = `${ENV.SERVER_URL}/api/auth/verify-email/${verificationToken}`; // TODO: Change this to frontend URL

  //     try {
  //       const info = await this.transporter.sendMail({
  //         from: this.fromAddress,
  //         html: getVerificationEmailTemplate(name, verificationUrl),
  //         subject: "Verify your email address",
  //         to,
  //       });

  //       //   logger.info("Verification email sent", {
  //       //     context: "EmailService.sendVerificationEmail",
  //       //     messageId: info.messageId,
  //       //     to,
  //       //   });
  //     } catch (error) {
  //       //   logger.error("Failed to send verification email", {
  //       //     context: "EmailService.sendVerificationEmail",
  //       //     error: error instanceof Error ? error.message : "Unknown error",
  //       //     to,
  //       //   });
  //       throw error;
  //     }
  //   }

  private precompileTemplates() {
    try {
      // getVerificationEmailTemplate("test", "test"); // Pre-compile by running once
      getPasswordResetEmailTemplate("test", "test"); // Pre-compile by running once
      console.info("Email templates precompiled successfully");
    } catch (error) {
      console.error("Failed to precompile email templates", { error });
    }
  }

  private async testConnection() {
    console.log(this.transporter);
    try {
      await this.transporter.verify();
      console.info("SMTP connection verified");
    } catch (error) {
      console.error("SMTP connection failed", { error });
    }
  }
}
