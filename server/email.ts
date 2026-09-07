import nodemailer from 'nodemailer';

/**
 * Cria um transporter de email.
 * Usa variáveis de ambiente para configuração SMTP.
 * Se não configurado, usa Ethereal (email de teste) em desenvolvimento.
 */
async function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Fallback: Ethereal para testes (não envia email real)
  const testAccount = await nodemailer.createTestAccount();
  console.log('[Email] Usando conta de teste Ethereal:', testAccount.user);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<{ success: boolean; previewUrl?: string }> {
  try {
    const transporter = await createTransporter();

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BTREE Ambiental" <noreply@btreeambiental.com>',
      to,
      subject: 'Recuperação de Senha - BTREE Ambiental',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo img { height: 60px; }
            h2 { color: #065f46; text-align: center; margin-bottom: 10px; }
            p { color: #4b5563; line-height: 1.6; }
            .btn { display: block; width: fit-content; margin: 30px auto; padding: 14px 32px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
            .warning { font-size: 13px; color: #9ca3af; text-align: center; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://btreeambiental.com/icon-btree-512.png" alt="BTREE Ambiental" />
            </div>
            <h2>Recuperação de Senha</h2>
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>BTREE Ambiental</strong>.</p>
            <p>Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.</p>
            <a href="${resetUrl}" class="btn">Redefinir Minha Senha</a>
            <p class="warning">Se você não solicitou a recuperação de senha, ignore este email. Sua senha permanecerá a mesma.</p>
            <div class="footer">
              BTREE Ambiental - Sistema de Gestão de Reflorestamento<br/>
              Desenvolvido por Kobayashi
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Olá ${name},\n\nClique no link abaixo para redefinir sua senha:\n${resetUrl}\n\nEste link expira em 1 hora.\n\nSe não solicitou, ignore este email.`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log('[Email] Preview URL:', previewUrl);
    }

    return { success: true, previewUrl: previewUrl || undefined };
  } catch (error) {
    console.error('[Email] Erro ao enviar email:', error);
    return { success: false };
  }
}
