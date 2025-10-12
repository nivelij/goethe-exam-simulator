import os
import time
import json
import logging
import traceback
from openai import OpenAI
from worker_db import get_next_pending_job, update_job_completed, update_job_failed

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# OpenAI Assistant ID
ASSISTANT_ID = "asst_CPMp0f2sognx0GZpqKe1dEF5"

def generate_exam_reading(level):
    """
    Generate reading exam content using OpenAI Assistant

    Args:
        level (str): CEFR level (A1, A2, B1, B2, C1, C2)

    Returns:
        dict: Generated exam content as JSON object
    """
    logger.info(f"Starting exam generation for level: {level}")

    try:
        # Check if OpenAI API key is available
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise Exception("OPENAI_API_KEY environment variable is not set")

        logger.info("OpenAI API key found, initializing client")

        # Create a thread
        logger.info("Creating OpenAI thread")
        thread = client.beta.threads.create()
        logger.info(f"Thread created with ID: {thread.id}")

        # Create a message in the thread
        prompt_content = level
        logger.info(f"Creating message with prompt: {prompt_content}")

        message = client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=prompt_content
        )
        logger.info(f"Message created with ID: {message.id}")

        # Run the assistant
        logger.info(f"Starting assistant run with ID: {ASSISTANT_ID}")
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=ASSISTANT_ID
        )
        logger.info(f"Assistant run created with ID: {run.id}")

        # Wait for the run to complete - polling until finished
        max_wait_time = 300  # 5 minutes maximum wait time
        start_time = time.time()
        poll_count = 0

        logger.info(f"Waiting for assistant run to complete. Initial status: {run.status}")

        while run.status in ['queued', 'in_progress', 'cancelling']:
            elapsed_time = time.time() - start_time
            poll_count += 1

            # Check if we've exceeded maximum wait time
            if elapsed_time > max_wait_time:
                logger.error(f"Assistant run timed out after {max_wait_time} seconds")
                raise Exception(f"Assistant run timed out after {max_wait_time} seconds")

            logger.info(f"Poll #{poll_count}: Run status is '{run.status}', elapsed time: {elapsed_time:.1f}s")

            time.sleep(2)  # Poll every 2 seconds
            try:
                run = client.beta.threads.runs.retrieve(
                    thread_id=thread.id,
                    run_id=run.id
                )
            except Exception as e:
                logger.error(f"Error retrieving run status: {str(e)}")
                raise

        logger.info(f"Assistant run completed with status: {run.status}")

        if run.status == 'completed':
            # Get all messages from the thread
            logger.info("Retrieving messages from thread")
            try:
                messages = client.beta.threads.messages.list(
                    thread_id=thread.id,
                    order='asc'  # Get messages in chronological order
                )
                logger.info(f"Retrieved {len(messages.data)} messages from thread")
            except Exception as e:
                logger.error(f"Error retrieving messages: {str(e)}")
                raise

            # Get the assistant's response (last message from assistant)
            assistant_message = None
            for i, message in enumerate(reversed(messages.data)):
                logger.info(f"Message {i}: role={message.role}, content_length={len(message.content) if message.content else 0}")
                if message.role == "assistant":
                    assistant_message = message
                    break

            if assistant_message and assistant_message.content:
                logger.info("Found assistant response message")
                # Extract text content from the message
                content_text = assistant_message.content[0].text.value
                logger.info(f"Assistant response length: {len(content_text)} characters")
                logger.info(f"Assistant response preview: {content_text[:500]}...")

                # Parse JSON response from assistant
                logger.info("Attempting to parse JSON response")
                try:
                    json_content = json.loads(content_text)
                    logger.info("Successfully parsed JSON response")
                    logger.info(f"JSON keys: {list(json_content.keys()) if isinstance(json_content, dict) else 'Not a dict'}")
                    return json_content
                except json.JSONDecodeError as e:
                    logger.warning(f"Initial JSON parsing failed: {str(e)}")
                    # If the response isn't valid JSON, try to extract JSON from the text
                    import re
                    logger.info("Attempting to extract JSON using regex")
                    json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
                    if json_match:
                        extracted_json = json_match.group()
                        logger.info(f"Extracted JSON candidate: {extracted_json[:200]}...")
                        try:
                            json_content = json.loads(extracted_json)
                            logger.info("Successfully parsed extracted JSON")
                            return json_content
                        except json.JSONDecodeError as e2:
                            logger.error(f"Failed to parse extracted JSON: {str(e2)}")

                    # If we still can't parse JSON, return the raw text
                    logger.error("Could not parse response as JSON, returning raw response")
                    return {
                        "error": "Assistant response is not valid JSON",
                        "raw_response": content_text
                    }
            else:
                logger.error("No assistant response content found")
                raise Exception("No response content from assistant")

        elif run.status == 'requires_action':
            logger.error("Assistant run requires action - not supported")
            logger.error(f"Required actions: {run.required_action}")
            raise Exception("Assistant requires action - not supported in this implementation")

        elif run.status == 'cancelled':
            logger.error("Assistant run was cancelled")
            raise Exception("Assistant run was cancelled")

        elif run.status == 'failed':
            error_message = run.last_error.message if run.last_error else "Unknown error"
            logger.error(f"Assistant run failed: {error_message}")
            if run.last_error:
                logger.error(f"Error code: {run.last_error.code}")
                logger.error(f"Full error details: {run.last_error}")
            raise Exception(f"Assistant run failed: {error_message}")

        else:
            logger.error(f"Unexpected run status: {run.status}")
            raise Exception(f"Unexpected run status: {run.status}")

    except Exception as e:
        logger.error(f"Exception in generate_exam_reading: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise Exception(f"Error generating exam content: {str(e)}")

def process_single_job():
    """
    Process a single job from the database queue
    Returns: True if a job was processed, False if no jobs available
    """
    try:
        # Get next pending job
        job = get_next_pending_job()
        if not job:
            return False

        job_id = job['id']
        queue_id = job['queue_id']
        category = job['category']
        level = job['level']

        logger.info(f"Processing job: id={job_id}, queue_id={queue_id}, category={category}, level={level}")

        try:
            result = None

            # Handle different job categories
            if category == 'read':
                # Generate reading exam content
                result = generate_exam_reading(level)
            else:
                # Handle other categories in the future (write, listen, speak)
                error_message = f"Unsupported category: {category}"
                logger.error(error_message)
                update_job_failed(queue_id, error_message)
                return True

            # Update job as completed
            update_job_completed(queue_id, result)
            logger.info(f"Successfully completed job: queue_id={queue_id}, category={category}")

        except Exception as e:
            # Update job as failed
            error_message = f"Generation failed: {str(e)}"
            update_job_failed(queue_id, error_message)
            logger.error(f"Job failed: queue_id={queue_id}, error={error_message}")

        return True

    except Exception as e:
        logger.error(f"Error processing job: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return False

def main():
    """
    Main worker - process one job and exit
    """
    logger.info("Starting exam generation worker...")

    # Verify required environment variables
    if not os.environ.get('OPENAI_API_KEY'):
        logger.error("OPENAI_API_KEY environment variable is required")
        exit(1)

    if not os.environ.get('DATABASE_URL'):
        logger.error("DATABASE_URL environment variable is required")
        exit(1)

    logger.info("Environment variables verified, processing one job...")

    try:
        # Process a single job
        job_processed = process_single_job()

        if job_processed:
            logger.info("Job processed successfully, exiting...")
            exit(0)
        else:
            logger.info("No jobs available, exiting...")
            exit(0)

    except Exception as e:
        logger.error(f"Error processing job: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        exit(1)

if __name__ == "__main__":
    main()