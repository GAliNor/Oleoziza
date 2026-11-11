import smtplib
from email.message import EmailMessage
from functools import lru_cache

from core.config import get_settings
from core.exceptions import MessageDeliveryError


SMTP_TIMEOUT_IN_SECONDS = 10


class MailClient:
    def __init__(self, server: str, port: int, username: str, password: str, sender: str) -> None:
        """
        Keep the SMTP connection settings; MailHog in development.

        Args:
            server (str): SMTP host.
            port (int): SMTP port.
            username (str): SMTP login, empty when the server needs none.
            password (str): SMTP password.
            sender (str): From address.
        """
        self.server = server
        self.port = port
        self.username = username
        self.password = password
        self.sender = sender

    def send(self, recipient: str, subject: str, body: str) -> None:
        """
        Send one plain-text email.

        Args:
            recipient (str): Destination address.
            subject (str): Subject line.
            body (str): Plain-text body.

        Raises:
            MessageDeliveryError: If the SMTP server refused or could not be reached.
        """
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)
        try:
            with smtplib.SMTP(self.server, self.port, timeout=SMTP_TIMEOUT_IN_SECONDS) as smtp:
                if self.username:
                    smtp.starttls()
                    smtp.login(self.username, self.password)
                smtp.send_message(message)
        except (smtplib.SMTPException, OSError) as error:
            raise MessageDeliveryError(f"email to {recipient}") from error


@lru_cache
def get_mail_client() -> MailClient:
    """
    Build the mail client once from the MAIL_* settings.

    Returns:
        MailClient: Shared SMTP client.
    """
    settings = get_settings()
    return MailClient(settings.MAIL_SERVER, settings.MAIL_PORT, settings.MAIL_USERNAME, settings.MAIL_PASSWORD, settings.MAIL_FROM)
