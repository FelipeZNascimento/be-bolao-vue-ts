export const getPasswordResetEmailTemplate = (name: string, resetUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinir Senha</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background: #007bff;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Olá,</h1>
    <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo para redefini-la:</p>

    <a href="${resetUrl}" class="button">Redefinir Senha</a>

    <p>Ou copie e cole este link no seu navegador:</p>
    <p>${resetUrl}</p>

    <p>Este link expirará em 1 hora.</p>

    <div class="footer">
        <p>Se você não solicitou isso, por favor ignore este e-mail.</p>
        <p>Sua senha permanecerá inalterada.</p>
    </div>
</body>
</html>
`;
