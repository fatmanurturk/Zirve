from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr
from app.core.config import get_settings
from pathlib import Path

settings = get_settings()

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.SMTP_FROM,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=settings.SMTP_STARTTLS,
    MAIL_SSL_TLS=settings.SMTP_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

async def send_reset_password_email(email_to: EmailStr, token: str):
    # In a real app, this would be a URL pointing to your frontend
    reset_url = f"http://localhost:3000/reset-password?token={token}"
    
    message_body = f"""
    <html>
    <body>
        <h2>Şifre Sıfırlama İsteği</h2>
        <p>Merhaba,</p>
        <p>Hesabınız için şifre sıfırlama isteği aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
        <p>
            <a href="{reset_url}" style="background-color: #047857; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Şifremi Sıfırla
            </a>
        </p>
        <p>Eğer bu isteği siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
        <p>Bu bağlantı 15 dakika geçerlidir.</p>
        <br>
        <p>Zirve Ekibi</p>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Zirve - Şifre Sıfırlama İsteği",
        recipients=[email_to],
        body=message_body,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)
