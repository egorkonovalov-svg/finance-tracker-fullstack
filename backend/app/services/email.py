import logging

import aiosmtplib
from email.message import EmailMessage

from app.config import settings
from app.exceptions import EmailDeliveryError

logger = logging.getLogger(__name__)

# _PLACEHOLDER_VALUES = {"", "your-email@gmail.com", "your-app-password"}
_PLACEHOLDER_VALUES = {"", "", ""}


def _smtp_configured() -> bool:
    """Return True if SMTP credentials are set to non-placeholder values.

    Checks both ``settings.SMTP_USER`` and ``settings.SMTP_PASSWORD`` against
    the known placeholder set. Used as a guard before attempting to send email.

    Returns:
        ``True`` when both values are non-empty and non-placeholder.
    """
    return (
        settings.SMTP_USER not in _PLACEHOLDER_VALUES
        and settings.SMTP_PASSWORD not in _PLACEHOLDER_VALUES
    )


async def send_verification_email(to: str, code: str) -> None:
    """Send a verification code email via SMTP (aiosmtplib).

    Behaviour varies by environment:
    - ``local`` + SMTP not configured: logs a warning and returns silently
      (dev workflow relies on reading the code from server logs).
    - Non-local + SMTP not configured: logs an error and returns silently.
    - SMTP configured: sends the email over STARTTLS with a 10-second timeout.

    Args:
        to: Recipient email address.
        code: The 6-digit verification code to include in the body.

    Raises:
        EmailDeliveryError: If ``aiosmtplib`` raises ``SMTPException`` or
            ``OSError`` during delivery. The caller should catch this and decide
            whether to surface the error to the user.
    """
    # In local dev, always print the code to the terminal so you can log in without SMTP
    if settings.ENVIRONMENT == "local":
        if not _smtp_configured():
            logger.warning(
                "SMTP not configured -- skipping verification email for %s", to
            )
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
    except (aiosmtplib.SMTPException, OSError) as exc:
        raise EmailDeliveryError(
            f"Failed to send verification email to {to}: {type(exc).__name__}: {exc}"
        ) from exc
