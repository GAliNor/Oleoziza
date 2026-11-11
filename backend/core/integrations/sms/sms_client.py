import logging
from functools import lru_cache


logger = logging.getLogger(__name__)


class SimulatedSmsClient:
    """
    Stands in for the Moroccan SMS gateway until one is chosen: every SMS is written to the worker log.
    """

    def send(self, phone: str, text: str) -> None:
        """
        Log one SMS instead of sending it.

        Args:
            phone (str): Destination phone in E.164.
            text (str): Message text.
        """
        logger.warning("SMS (simulated) to %s: %s", phone, text)


@lru_cache
def get_sms_client() -> SimulatedSmsClient:
    """
    Build the SMS client once.

    Returns:
        SimulatedSmsClient: Shared SMS client.
    """
    return SimulatedSmsClient()
