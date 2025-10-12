import os
import psycopg2
import logging
import json
from contextlib import contextmanager

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL')

@contextmanager
def get_db_connection():
    """
    Context manager for database connections
    """
    conn = None
    try:
        if not DATABASE_URL:
            raise Exception("DATABASE_URL environment variable is not set")
        conn = psycopg2.connect(DATABASE_URL)
        yield conn
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()

def get_next_pending_job():
    """
    Get the next pending job from exam_jobs table and update status to 'in_progress'
    Returns: dict with id, queue_id, category, and level, or None if no jobs available
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Use SELECT FOR UPDATE to prevent race conditions
                cur.execute("""
                    SELECT ej.id, ej.queue_id, ej.category, re.level
                    FROM exam_jobs ej
                    JOIN read_exam re ON ej.queue_id = re.queue_id
                    WHERE ej.status = 'not_started'
                    LIMIT 1
                    FOR UPDATE
                """)

                result = cur.fetchone()
                if result:
                    job_id, queue_id, category, level = result

                    # Update exam_jobs status to in_progress
                    cur.execute(
                        "UPDATE exam_jobs SET status = 'in_progress' WHERE id = %s",
                        (job_id,)
                    )

                    logger.info(f"Retrieved and marked job as in_progress: id={job_id}, queue_id={queue_id}, category={category}, level={level}")
                    return {"id": job_id, "queue_id": queue_id, "category": category, "level": level}
                else:
                    logger.debug("No pending jobs found")
                    return None

    except Exception as e:
        logger.error(f"Failed to get next pending job: {e}")
        raise

def update_job_completed(queue_id, payload):
    """
    Update exam_jobs status to 'done' and store the generated payload in read_exam
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update exam_jobs status to done
                cur.execute(
                    "UPDATE exam_jobs SET status = 'done' WHERE queue_id = %s",
                    (queue_id,)
                )

                # Update read_exam with the generated payload
                payload_json = json.dumps(payload) if isinstance(payload, (dict, list)) else payload
                cur.execute(
                    "UPDATE read_exam SET payload = %s WHERE queue_id = %s",
                    (payload_json, queue_id)
                )

                conn.commit()
                logger.info(f"Successfully updated job to completed: queue_id={queue_id}")

    except Exception as e:
        logger.error(f"Failed to update job to completed: {e}")
        raise

def update_job_failed(queue_id, error_message):
    """
    Update exam_jobs status to 'failed' and store error message in read_exam
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update exam_jobs status to failed
                cur.execute(
                    "UPDATE exam_jobs SET status = 'failed' WHERE queue_id = %s",
                    (queue_id,)
                )
                conn.commit()
                logger.info(f"Successfully updated job to failed: queue_id={queue_id}")

    except Exception as e:
        logger.error(f"Failed to update job to failed: {e}")
        raise