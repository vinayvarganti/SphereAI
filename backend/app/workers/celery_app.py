from celery import Celery

from app.core.config import get_settings


settings = get_settings()

celery_app = Celery(
    "agentsphere",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.workflow_worker"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    task_eager_propagates=False,
)
