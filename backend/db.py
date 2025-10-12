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

def insert_read_exam(gen_id, level):
    """
    Insert a new record into the read_exam table
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO read_exam(gen_id, level, gen_status) VALUES (%s, %s, 'not_started')",
                    (gen_id, level)
                )
                conn.commit()
                logger.info(f"Successfully inserted read_exam record: gen_id={gen_id}, level={level}")
    except Exception as e:
        logger.error(f"Failed to insert read_exam record: {e}")
        raise

def get_job_result(gen_id):
    """
    Retrieve job result by gen_id from read_exam table
    Returns: dict with gen_status and payload, or None if not found
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT gen_status, payload FROM read_exam WHERE gen_id = %s AND gen_status = 'done'",
                    (gen_id,)
                )
                result = cur.fetchone()

                if result:
                    gen_status, payload = result

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
                        'gen_status': gen_status,
                        'payload': parsed_payload
                    }
                else:
                    logger.info(f"No job found for gen_id: {gen_id}")
                    return None

    except Exception as e:
        logger.error(f"Failed to get job result: {e}")
        raise