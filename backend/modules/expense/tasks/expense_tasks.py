from core.database import SessionLocal
from core.integrations.celery.celery_app import celery_app
from modules.expense.services.expense_payment_services import RecurrenceScheduleService


CREATE_DUE_RECURRENCES_TASK = "expense.create_due_recurrences"

CREATE_DUE_RECURRENCES_EVERY_IN_SECONDS = 3600.0


@celery_app.task(name=CREATE_DUE_RECURRENCES_TASK)
def create_due_recurrences_task() -> None:
    """
    Every hour, add the Recurring Expenses whose due date has come; running it twice adds nothing twice.
    """
    with SessionLocal() as db:
        RecurrenceScheduleService(db).create_due()


celery_app.conf.beat_schedule = {**(celery_app.conf.beat_schedule or {}), CREATE_DUE_RECURRENCES_TASK: {"task": CREATE_DUE_RECURRENCES_TASK, "schedule": CREATE_DUE_RECURRENCES_EVERY_IN_SECONDS}}
