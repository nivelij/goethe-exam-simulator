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
                # Get next pending job (simplified to avoid FOR UPDATE issues with LEFT JOINs)
                cur.execute("""
                    SELECT ej.id, ej.queue_id, ej.category
                    FROM exam_jobs ej
                    WHERE ej.status = 'not_started'
                    ORDER BY ej.id ASC
                    LIMIT 1
                    FOR UPDATE OF ej
                """)

                job_result = cur.fetchone()
                if job_result:
                    job_id, queue_id, category = job_result

                    # Get the level based on category
                    if category == 'read':
                        cur.execute(
                            "SELECT level FROM read_exam WHERE queue_id = %s",
                            (queue_id,)
                        )
                    else:  # write_generation or write_evaluation
                        cur.execute(
                            "SELECT level FROM write_exam WHERE queue_id = %s",
                            (queue_id,)
                        )

                    level_result = cur.fetchone()
                    if level_result:
                        level = level_result[0]
                    else:
                        logger.error(f"No level found for queue_id: {queue_id}, category: {category}")
                        return None

                    # Update exam_jobs status to in_progress
                    cur.execute(
                        "UPDATE exam_jobs SET status = 'in_progress' WHERE id = %s",
                        (job_id,)
                    )
                    conn.commit()

                    logger.info(f"Retrieved and marked job as in_progress: id={job_id}, queue_id={queue_id}, category={category}, level={level}")
                    return {"id": job_id, "queue_id": queue_id, "category": category, "level": level}
                else:
                    logger.debug("No pending jobs found")
                    return None

    except Exception as e:
        logger.error(f"Failed to get next pending job: {e}")
        raise

def update_job_completed(queue_id, payload, job_id):
    """
    Update exam_jobs status to 'done' and store the generated payload in appropriate table
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update exam_jobs status to done
                if job_id:
                    cur.execute(
                        "UPDATE exam_jobs SET status = 'done' WHERE id = %s",
                        (job_id,)
                    )
                else:
                    cur.execute(
                        "UPDATE exam_jobs SET status = 'done' WHERE queue_id = %s",
                        (queue_id,)
                    )

                # Update appropriate exam table with the generated payload
                payload_json = json.dumps(payload) if isinstance(payload, (dict, list)) else payload

                # Get the category using job_id if available, otherwise fallback to queue_id
                cur.execute(
                        "SELECT category FROM exam_jobs WHERE id = %s AND status = 'done'",
                        (job_id,)
                    )
                category_result = cur.fetchone()

                if category_result:
                    category = category_result[0]
                    if category == 'read':
                        cur.execute(
                            "UPDATE read_exam SET payload = %s WHERE queue_id = %s",
                            (payload_json, queue_id)
                        )
                    elif category == 'write_generation':
                        cur.execute(
                            "UPDATE write_exam SET payload = %s WHERE queue_id = %s",
                            (payload_json, queue_id)
                        )
                    elif category == 'write_evaluation':
                        cur.execute(
                            "UPDATE write_exam SET evaluation = %s WHERE queue_id = %s",
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

def get_write_exam_for_evaluation(queue_id):
    """
    Get write exam payload and participant answers for evaluation

    Args:
        queue_id (str): The queue ID

    Returns:
        dict: Contains payload and participant_answers, or None if not found
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT payload, participant_answers FROM write_exam WHERE queue_id = %s",
                    (queue_id,)
                )
                result = cur.fetchone()

                if result:
                    payload, participant_answers = result

                    # Parse JSON payload if it's a string
                    parsed_payload = None
                    if payload:
                        try:
                            if isinstance(payload, str):
                                parsed_payload = json.loads(payload)
                            else:
                                parsed_payload = payload
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse payload JSON: {e}")
                            parsed_payload = payload

                    return {
                        'payload': parsed_payload,
                        'participant_answers': participant_answers
                    }
                else:
                    logger.info(f"No write exam found for evaluation: queue_id={queue_id}")
                    return None

    except Exception as e:
        logger.error(f"Failed to get write exam for evaluation: {e}")
        raise

def update_write_exam_score(queue_id, score, is_pass):
    """
    Update score and is_pass in the write_exam table

    Args:
        queue_id (str): The queue ID
        score (int): The score from evaluation
        is_pass (bool): Whether the participant passed
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE write_exam
                    SET score = %s, is_pass = %s
                    WHERE queue_id = %s
                """, (score, is_pass, queue_id))

                if cur.rowcount == 0:
                    logger.warning(f"No record found to update score for queue_id: {queue_id}")
                    return False

                conn.commit()
                logger.info(f"Successfully updated write exam score: queue_id={queue_id}, score={score}, is_pass={is_pass}")
                return True

    except Exception as e:
        logger.error(f"Failed to update write exam score: {e}")
        raise