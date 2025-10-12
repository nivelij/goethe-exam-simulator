import os
import psycopg2
import logging
import json
from contextlib import contextmanager

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ["DATABASE_URL"]

@contextmanager
def get_db_connection():
    """
    Context manager for database connections
    """
    conn = None
    try:
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

def insert_read_exam(queue_id, level):
    """
    Insert a new record into the read_exam table
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO read_exam(queue_id, level) VALUES (%s, %s)",
                    (queue_id, level)
                )
                conn.commit()
                logger.info(f"Successfully inserted read_exam record: queue_id={queue_id}, level={level}")
    except Exception as e:
        logger.error(f"Failed to insert read_exam record: {e}")
        raise

def get_job_result(queue_id):
    """
    Retrieve job result by queue_id from read_exam table
    Returns: dict with payload, or None if not found
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT payload FROM read_exam WHERE queue_id = %s AND payload IS NOT NULL",
                    (queue_id,)
                )
                result = cur.fetchone()

                if result:
                    payload = result[0]

                    # Parse JSON payload if it exists and is a string
                    parsed_payload = None
                    if payload:
                        try:
                            # Check if payload is already a dict or if it's a JSON string
                            if isinstance(payload, str):
                                parsed_payload = json.loads(payload)
                            else:
                                parsed_payload = payload  # Already parsed
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse payload JSON: {e}")
                            parsed_payload = payload  # Return raw payload if JSON parsing fails

                    return {
                        'payload': parsed_payload
                    }
                else:
                    logger.info(f"No job found for queue_id: {queue_id}")
                    return None

    except Exception as e:
        logger.error(f"Failed to get job result: {e}")
        raise

def insert_exam_job(queue_id, category):
    """
    Insert a new record into the exam_jobs table

    Args:
        queue_id (str): The queue/job ID
        category (str): The category of the exam job (e.g., 'read', 'write')
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO exam_jobs(queue_id, category, status) VALUES (%s, %s, 'not_started')",
                    (queue_id, category)
                )
                conn.commit()
                logger.info(f"Successfully inserted exam_job record: queue_id={queue_id}, category={category}")
    except Exception as e:
        logger.error(f"Failed to insert exam_job record: {e}")
        raise

def update_participant_results(queue_id, participant_answers, score, is_pass):
    """
    Update participant results in the read_exam table

    Args:
        queue_id (str): The queue ID
        participant_answers (list): Array of participant answers
        score (int/float): The participant's score
        is_pass (bool): Whether the participant passed
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Convert participant_answers to JSON string if it's not already
                answers_json = json.dumps(participant_answers) if isinstance(participant_answers, (list, dict)) else participant_answers

                cur.execute("""
                    UPDATE read_exam
                    SET participant_answers = %s, score = %s, is_pass = %s
                    WHERE queue_id = %s
                """, (answers_json, score, is_pass, queue_id))

                if cur.rowcount == 0:
                    logger.warning(f"No record found to update for queue_id: {queue_id}")
                    return False

                conn.commit()
                logger.info(f"Successfully updated participant results for queue_id={queue_id}, score={score}, is_pass={is_pass}")
                return True

    except Exception as e:
        logger.error(f"Failed to update participant results: {e}")
        raise