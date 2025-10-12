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
    Get the next pending job from read_exam table and update status to 'in_progress'
    Returns: dict with gen_id and level, or None if no jobs available
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Use SELECT FOR UPDATE to prevent race conditions
                cur.execute("""
                    SELECT gen_id, level
                    FROM read_exam
                    WHERE gen_status = 'not_started'
                    LIMIT 1
                    FOR UPDATE
                """)

                result = cur.fetchone()
                if result:
                    gen_id, level = result

                    # Update status to in_progress
                    cur.execute(
                        "UPDATE read_exam SET gen_status = 'in_progress' WHERE gen_id = %s",
                        (gen_id,)
                    )
                    conn.commit()

                    logger.info(f"Retrieved and marked job as in_progress: gen_id={gen_id}, level={level}")
                    return {"gen_id": gen_id, "level": level}
                else:
                    logger.debug("No pending jobs found")
                    return None

    except Exception as e:
        logger.error(f"Failed to get next pending job: {e}")
        raise

def update_job_completed(gen_id, payload):
    """
    Update job status to 'done' and store the generated payload
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE read_exam SET gen_status = 'done', payload = %s WHERE gen_id = %s",
                    (json.dumps(payload), gen_id)
                )
                conn.commit()
                logger.info(f"Successfully updated job to completed: gen_id={gen_id}")

    except Exception as e:
        logger.error(f"Failed to update job to completed: {e}")
        raise

def update_job_failed(gen_id, error_message):
    """
    Update job status to 'failed' and store error message
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                error_payload = {"error": str(error_message)}
                cur.execute(
                    "UPDATE read_exam SET gen_status = 'failed', payload = %s WHERE gen_id = %s",
                    (json.dumps(error_payload), gen_id)
                )
                conn.commit()
                logger.info(f"Successfully updated job to failed: gen_id={gen_id}")

    except Exception as e:
        logger.error(f"Failed to update job to failed: {e}")
        raise