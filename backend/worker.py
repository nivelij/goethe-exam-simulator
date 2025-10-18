import os
import time
import json
import logging
import traceback
import random
import base64
from openai import OpenAI
from google import genai
from google.genai import types
from io import BytesIO
from pydub import AudioSegment
from pydub.utils import which
from worker_db import get_next_pending_job, update_job_completed, update_job_failed, get_write_exam_for_evaluation, update_write_exam_score

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# OpenAI Assistant ID for writing (reading now uses Gemini)
WRITING_ASSISTANT_ID = "asst_w1oN6tiVxBkLVZWimbqmwjm3"

# FFmpeg / FFprobe setup for audio processing
AudioSegment.converter = which("ffmpeg")
AudioSegment.ffprobe = which("ffprobe")

# Voice mappings by gender for TTS
MALE_VOICES = ["alloy", "ash", "ballad", "cedar", "echo", "fable", "onyx", "verse"]
FEMALE_VOICES = ["coral", "marin", "nova", "sage", "shimmer"]

def generate_exam_reading(level):
    """
    Generate reading exam content using Google Gemini API

    Args:
        level (str): CEFR level (A1, A2, B1, B2, C1, C2)

    Returns:
        dict: Generated exam content as JSON object
    """
    logger.info(f"Starting reading exam generation for level: {level}")

    try:
        # Path to reading system prompt
        system_prompt_path = os.path.join(os.path.dirname(__file__), 'prompts/reading_system_prompt.txt')

        # Generate content using Gemini utility function
        # For reading, we only pass the level (no payload wrapper needed)
        result = generate_content_with_gemini(level, system_prompt_path, payload=None)

        logger.info("Reading exam generation completed successfully")
        return result

    except Exception as e:
        logger.error(f"Exception in generate_exam_reading: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise Exception(f"Error generating reading exam content: {str(e)}")

def generate_exam_writing(level):
    """
    Generate writing exam content using OpenAI Assistant

    Args:
        level (str): CEFR level (A1, A2, B1, B2, C1, C2)

    Returns:
        dict: Generated exam content as JSON object
    """
    logger.info(f"Starting writing exam generation for level: {level}")

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

        # Create a message in the thread with JSON payload
        payload = {
            "modus": "GENERATE",
            "level": level
        }
        prompt_content = json.dumps(payload)
        logger.info(f"Creating message with prompt: {prompt_content}")

        message = client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=prompt_content
        )
        logger.info(f"Message created with ID: {message.id}")

        # Run the assistant
        logger.info(f"Starting assistant run with ID: {WRITING_ASSISTANT_ID}")
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=WRITING_ASSISTANT_ID
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
                    json_match = re.search(r'\\{.*\\}', content_text, re.DOTALL)
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
        logger.error(f"Exception in generate_exam_writing: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise Exception(f"Error generating writing exam content: {str(e)}")

def evaluate_exam_writing(queue_id):
    """
    Evaluate writing exam using OpenAI Assistant

    Args:
        queue_id (str): The queue ID to get exam data from

    Returns:
        dict: Evaluation results as JSON object
    """
    logger.info(f"Starting writing exam evaluation for queue_id: {queue_id}")

    try:
        # Get exam data for evaluation
        exam_data = get_write_exam_for_evaluation(queue_id)
        if not exam_data:
            raise Exception("No exam data found for evaluation")

        aufgabe = exam_data['payload']
        antwort = exam_data['participant_answers']

        if not aufgabe or not antwort:
            raise Exception("Missing exam payload or participant answers")

        # Create evaluation payload
        payload = {
            "modus": "EVALUATE",
            "aufgabe": aufgabe,
            "antwort": antwort
        }

        # Create thread and message
        thread = client.beta.threads.create()
        prompt_content = json.dumps(payload)

        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=prompt_content
        )

        # Run the assistant
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=WRITING_ASSISTANT_ID
        )

        # Wait for completion
        max_wait_time = 300
        start_time = time.time()

        while run.status in ['queued', 'in_progress', 'cancelling']:
            if time.time() - start_time > max_wait_time:
                raise Exception(f"Assistant run timed out after {max_wait_time} seconds")

            time.sleep(2)
            run = client.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )

        if run.status == 'completed':
            messages = client.beta.threads.messages.list(
                thread_id=thread.id,
                order='asc'
            )

            # Get assistant's response
            for message in reversed(messages.data):
                if message.role == "assistant":
                    content_text = message.content[0].text.value
                    logger.info(f"Assistant evaluation response: {content_text[:500]}...")

                    try:
                        result = json.loads(content_text)
                        logger.info(f"Successfully parsed evaluation JSON with keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                        return result
                    except json.JSONDecodeError:
                        logger.warning("Failed to parse evaluation response as JSON, trying regex extraction")
                        # Try to extract JSON from text
                        import re
                        json_match = re.search(r'\\{.*\\}', content_text, re.DOTALL)
                        if json_match:
                            try:
                                result = json.loads(json_match.group())
                                logger.info("Successfully parsed extracted evaluation JSON")
                                return result
                            except json.JSONDecodeError:
                                logger.error("Failed to parse extracted JSON")

                        logger.error("Could not parse evaluation response as JSON")
                        return {
                            "error": "Assistant response is not valid JSON",
                            "raw_response": content_text
                        }

            raise Exception("No assistant response found")

        elif run.status == 'failed':
            error_message = run.last_error.message if run.last_error else "Unknown error"
            raise Exception(f"Assistant run failed: {error_message}")

        else:
            raise Exception(f"Unexpected run status: {run.status}")

    except Exception as e:
        logger.error(f"Exception in evaluate_exam_writing: {str(e)}")
        raise Exception(f"Error evaluating writing exam: {str(e)}")

def generate_content_with_gemini(level, system_prompt_path, payload=None):
    """
    Utility function to generate content using Google Gemini API

    Args:
        level (str): CEFR level (A1, A2, B1, B2, C1, C2)
        system_prompt_path (str): Path to the system instruction file
        payload (dict, optional): Additional payload data. If None, only level is sent

    Returns:
        dict: Generated content as JSON object
    """
    try:
        # Check if Gemini API key is available
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        if not gemini_api_key:
            raise Exception("GEMINI_API_KEY environment variable is not set")

        logger.info("Gemini API key found, initializing client")

        # Initialize Gemini client
        gemini_client = genai.Client(api_key=gemini_api_key)

        # Read system instruction from file
        logger.info(f"Reading system instruction from: {system_prompt_path}")
        with open(system_prompt_path, 'r', encoding='utf-8') as f:
            system_instruction_text = f.read()

        # Create payload
        if payload is None:
            prompt_content = level
        else:
            prompt_content = json.dumps(payload)

        logger.info(f"Creating request with prompt: {prompt_content}")

        # Prepare contents for Gemini
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt_content),
                ],
            ),
        ]

        # Configure generation
        generate_content_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_budget=16584,
            ),
            response_mime_type="application/json",
            system_instruction=[
                types.Part.from_text(text=system_instruction_text),
            ],
        )

        logger.info("Sending request to Gemini API...")

        # Generate content (collect all chunks into complete response)
        model = "gemini-2.5-flash"
        full_response = ""

        for chunk in gemini_client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                full_response += chunk.text

        # Parse JSON response from Gemini
        logger.info("Attempting to parse JSON response")
        try:
            json_content = json.loads(full_response)
            logger.info("Successfully parsed JSON response")
            return json_content
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {str(e)}")
            logger.error(f"Raw response: {full_response[:1000]}...")
            return {
                "error": "Gemini response is not valid JSON",
                "raw_response": full_response
            }

    except Exception as e:
        logger.error(f"Exception in generate_content_with_gemini: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise Exception(f"Error generating content with Gemini: {str(e)}")

def assign_voice_by_gender(gender):
    """Assign random voice based on gender"""
    if gender.lower() == "male":
        return random.choice(MALE_VOICES)
    elif gender.lower() == "female":
        return random.choice(FEMALE_VOICES)
    else:
        return random.choice(MALE_VOICES)  # default fallback

def audio_to_base64(audio_segment):
    """Convert AudioSegment to base64 string"""
    buffer = BytesIO()
    audio_segment.export(buffer, format="mp3")
    audio_data = buffer.getvalue()
    return base64.b64encode(audio_data).decode('utf-8')

def generate_exam_listening(level):
    """
    Generate listening exam content using Google Gemini API and convert to audio with TTS

    Args:
        level (str): CEFR level (A1, A2, B1, B2, C1, C2)

    Returns:
        dict: Generated exam content as JSON object with embedded base64 audio
    """
    logger.info(f"Starting listening exam generation for level: {level}")

    try:
        # Path to listening system prompt
        system_prompt_path = os.path.join(os.path.dirname(__file__), 'prompts/listening_system_prompt.txt')

        # Create payload for listening exam
        payload = {
            "modus": "GENERATE",
            "level": level
        }

        # Generate content using Gemini utility function
        data = generate_content_with_gemini(level, system_prompt_path, payload=payload)

        # Now process the JSON to add TTS audio
        logger.info("Starting TTS audio generation for listening exam")

        if 'teile' in data:
            for teil in data['teile']:
                teil_nummer = teil.get('teilNummer', 'unknown')
                logger.info(f"Processing Teil {teil_nummer}...")

                if 'audioSzenarien' in teil:
                    for scenario in teil['audioSzenarien']:
                        szenario_nummer = scenario.get('szenarioNummer', 'unknown')
                        logger.info(f"  Processing Scenario {szenario_nummer}...")

                        # Get speaker info for voice assignment
                        sprecher_info = scenario.get('szenarioBeschreibung', {}).get('sprecher', [])
                        voice_mapping = {}

                        # Assign voices to each speaker based on gender
                        for sprecher in sprecher_info:
                            speaker_id = sprecher.get('sprecherID')
                            gender = sprecher.get('gender', 'male')
                            voice_mapping[speaker_id] = assign_voice_by_gender(gender)
                            logger.info(f"    Assigned voice: {speaker_id} ({gender}) -> {voice_mapping[speaker_id]}")

                        # Generate conversation audio
                        conversation = AudioSegment.silent(duration=0)
                        transkript = scenario.get('transkript', [])

                        for i, transcript_line in enumerate(transkript):
                            speaker_id = transcript_line.get('sprecherID')
                            text = transcript_line.get('text', '')
                            voice = voice_mapping.get(speaker_id, 'alloy')

                            logger.info(f"    Generating TTS for {speaker_id}: {text[:50]}...")

                            try:
                                response = client.audio.speech.create(
                                    model="gpt-4o-mini-tts",
                                    voice=voice,
                                    input=text,
                                )

                                audio_bytes = BytesIO(response.read())
                                segment = AudioSegment.from_file(audio_bytes, format="mp3")

                                # Add slight panning for stereo effect
                                pan_value = -0.3 if i % 2 == 0 else 0.3
                                segment = segment.pan(pan_value)

                                conversation += segment

                                # Add pause between speakers (except for last line)
                                if i < len(transkript) - 1:
                                    pause_duration = random.randint(700, 1600)
                                    conversation += AudioSegment.silent(duration=pause_duration)

                            except Exception as e:
                                logger.error(f"Error generating TTS for line: {str(e)}")
                                raise

                        # Convert to base64 and add to scenario object
                        base64_audio = audio_to_base64(conversation)
                        scenario['encodedAudio'] = base64_audio
                        logger.info(f"    Base64 encoding completed ({len(base64_audio)} characters)")

        logger.info("TTS audio generation completed successfully")
        return data

    except Exception as e:
        logger.error(f"Exception in generate_exam_listening: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise Exception(f"Error generating listening exam content: {str(e)}")

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
                result = generate_exam_reading(level)
            elif category == 'write_generation':
                result = generate_exam_writing(level)
            elif category == 'write_evaluation':
                result = evaluate_exam_writing(queue_id)

                # Extract score from evaluation result and update write_exam
                if result and isinstance(result, dict) and 'evaluation' in result:
                    evaluation = result['evaluation']
                    if 'geschätztePunktzahl' in evaluation:
                        score = evaluation['geschätztePunktzahl']
                        is_pass = score >= 60
                        update_write_exam_score(queue_id, score, is_pass)
                        logger.info(f"Updated write exam score: queue_id={queue_id}, score={score}, is_pass={is_pass}")
                    else:
                        logger.warning(f"No geschätztePunktzahl found in evaluation result for queue_id={queue_id}")
                else:
                    logger.warning(f"Invalid evaluation result format for queue_id={queue_id}")
            elif category == 'listen':
                result = generate_exam_listening(level)
            else:
                error_message = f"Unsupported category: {category}"
                logger.error(error_message)
                update_job_failed(queue_id, error_message)
                return True

            # Update job as completed
            update_job_completed(queue_id, result, job_id)
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

    if not os.environ.get('GEMINI_API_KEY'):
        logger.error("GEMINI_API_KEY environment variable is required")
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