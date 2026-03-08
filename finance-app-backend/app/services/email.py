import logging

import aiosmtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)

# _PLACEHOLDER_VALUES = {"", "your-email@gmail.com", "your-app-password"}
_PLACEHOLDER_VALUES = {"", "", ""}


def _smtp_configured() -> bool:
    return (
        settings.SMTP_USER not in _PLACEHOLDER_VALUES
        and settings.SMTP_PASSWORD not in _PLACEHOLDER_VALUES
    )


async def send_verification_email(to: str, code: str) -> None:
    # In local dev, always print the code to the terminal so you can log in without SMTP
    if settings.ENVIRONMENT == "local":
        logger.warning(">>> FinTrack verification code for %s: %s <<<", to, code)
        if not _smtp_configured():
            logger.warning("SMTP not configured -- use the code above to verify")
            return

    if not _smtp_configured():
        logger.error(
            "SMTP not configured in %s environment. "
            "Verification email for %s could not be sent.",
            settings.ENVIRONMENT,
            to,
        )
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    message["To"] = to
    message["Subject"] = "FinTrack - Your verification code"
    message.set_content(
        f"Your verification code is: {code}\n\n"
        f"This code expires in {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutes.\n\n"
        "If you did not request this code, please ignore this email."
    )

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
            timeout=10,
        )
    except Exception:
        logger.exception("Failed to send verification email to %s", to)
