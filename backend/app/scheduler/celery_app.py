"""
Celery application configuration.
"""

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "nse_intelligence",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.scheduler.jobs"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3000,
    worker_max_tasks_per_child=100,
    worker_prefetch_multiplier=1,
    broker_transport_options={
        'redis_conn_kwargs': {
            'protocol': 2
        }
    },
    redis_backend_transport_options={
        'protocol': 2
    },
)

# Parse cron expression from settings
cron_parts = settings.ingestion_cron.split()
celery_app.conf.beat_schedule = {
    "daily-data-ingestion": {
        "task": "app.scheduler.jobs.run_daily_pipeline",
        "schedule": crontab(
            minute=cron_parts[0],
            hour=cron_parts[1],
            day_of_week=cron_parts[4] if len(cron_parts) > 4 else "*",
            day_of_month=cron_parts[2] if len(cron_parts) > 2 else "*",
            month_of_year=cron_parts[3] if len(cron_parts) > 3 else "*",
        ),
    },
    "weekly-model-retrain": {
        "task": "app.scheduler.jobs.retrain_models",
        "schedule": crontab(
            minute="0",
            hour="3",
            day_of_week="sat",  # Saturday 3 AM IST
        ),
    },
}
