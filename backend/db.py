import os
import psycopg2
import logging
import json
import uuid
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

def _insert_read_exam(queue_id, level):
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

def _insert_exam_job(queue_id, category):
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

def _insert_write_exam(queue_id, level):
    """
    Insert a new record into the write_exam table
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO write_exam(queue_id, level) VALUES (%s, %s)",
                    (queue_id, level)
                )
                conn.commit()
                logger.info(f"Successfully inserted write_exam record: queue_id={queue_id}, level={level}")
    except Exception as e:
        logger.error(f"Failed to insert write_exam record: {e}")
        raise

def get_write_job_result(queue_id):
    """
    Retrieve write job result by queue_id from write_exam table
    Returns: dict with payload, or None if not found
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT payload FROM write_exam WHERE queue_id = %s AND payload IS NOT NULL",
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
                    logger.info(f"No write job found for queue_id: {queue_id}")
                    return None

    except Exception as e:
        logger.error(f"Failed to get write job result: {e}")
        raise

def update_write_participant_answers(queue_id, participant_answers):
    """
    Update participant answers in the write_exam table

    Args:
        queue_id (str): The queue ID
        participant_answers (list/dict/str): The participant's answers - can be any format
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Convert to JSON string if it's not already a string
                if isinstance(participant_answers, (list, dict)):
                    answers_json = json.dumps(participant_answers)
                else:
                    answers_json = participant_answers

                cur.execute("""
                    UPDATE write_exam
                    SET participant_answers = %s
                    WHERE queue_id = %s
                """, (answers_json, queue_id))

                if cur.rowcount == 0:
                    logger.warning(f"No record found to update for queue_id: {queue_id}")
                    return False

                conn.commit()
                logger.info(f"Successfully updated write participant answers for queue_id={queue_id}")
                return True

    except Exception as e:
        logger.error(f"Failed to update write participant answers: {e}")
        raise

def get_write_exam_data(queue_id, modus):
    """
    Retrieve write exam data by queue_id and modus

    Args:
        queue_id (str): The queue ID
        modus (str): Either 'generate' for payload or 'evaluate' for evaluation

    Returns:
        dict with data, or None if not found
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if modus == 'generate':
                    cur.execute(
                        "SELECT payload FROM write_exam WHERE queue_id = %s AND payload IS NOT NULL",
                        (queue_id,)
                    )
                elif modus == 'evaluate':
                    cur.execute(
                        "SELECT evaluation FROM write_exam WHERE queue_id = %s AND evaluation IS NOT NULL",
                        (queue_id,)
                    )
                else:
                    return None

                result = cur.fetchone()

                if result:
                    data = result[0]

                    # Parse JSON if it's a string
                    parsed_data = None
                    if data:
                        try:
                            if isinstance(data, str):
                                parsed_data = json.loads(data)
                            else:
                                parsed_data = data
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse JSON data: {e}")
                            parsed_data = data

                    return {
                        'data': parsed_data
                    }
                else:
                    logger.info(f"No write exam data found for queue_id: {queue_id}, modus: {modus}")
                    return None

    except Exception as e:
        logger.error(f"Failed to get write exam data: {e}")
        raise

def _insert_listen_exam(queue_id, level):
    """
    Insert a new record into the listen_exam table
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO listen_exam(queue_id, level) VALUES (%s, %s)",
                    (queue_id, level)
                )
                conn.commit()
                logger.info(f"Successfully inserted listen_exam record: queue_id={queue_id}, level={level}")
    except Exception as e:
        logger.error(f"Failed to insert listen_exam record: {e}")
        raise

def get_listen_job_result(queue_id):
    """
    Retrieve listen job result by queue_id from listen_exam table
    Returns: dict with payload, or None if not found
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT payload FROM listen_exam WHERE queue_id = %s AND payload IS NOT NULL",
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
                    logger.info(f"No listen job found for queue_id: {queue_id}")
                    return None

    except Exception as e:
        logger.error(f"Failed to get listen job result: {e}")
        raise

def create_exam_job(exam_type, level, queue_id=None):
    """
    Common logic for creating exam jobs

    Args:
        exam_type (str): Type of exam ('read', 'write_generation', 'write_evaluation', 'listen')
        level (str): CEFR level (required for generation jobs, None for evaluation jobs)
        queue_id (str, optional): Existing queue ID for evaluation jobs

    Returns:
        str: queue_id
    """
    if queue_id is None:
        queue_id = str(uuid.uuid4())

    if exam_type == 'read':
        _insert_read_exam(queue_id, level)
        _insert_exam_job(queue_id, 'read')
    elif exam_type == 'write_generation':
        _insert_write_exam(queue_id, level)
        _insert_exam_job(queue_id, 'write_generation')
    elif exam_type == 'write_evaluation':
        _insert_exam_job(queue_id, 'write_evaluation')
    elif exam_type == 'listen':
        _insert_listen_exam(queue_id, level)
        _insert_exam_job(queue_id, 'listen')
    else:
        raise ValueError(f"Invalid exam type: {exam_type}")

    return queue_id