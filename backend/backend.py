import json
import os
import logging
import traceback
import uuid
import boto3
from db import get_job_result, get_write_exam_data, update_read_participant_results, update_write_participant_answers, update_listen_participant_results, get_listen_job_result, create_exam_job, get_all_exam_jobs

logger = logging.getLogger()
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS"
}

ECS_CLUSTER_NAME = "goethe-exam-cluster"
ECS_TASK_DEFINITION = "goethe-exam-worker"

ecs_client = boto3.client('ecs')
ec2_client = boto3.client('ec2')

def build_response(status_code, body, additional_headers=None):
    """
    Build standardized response with CORS headers
    """
    headers = CORS_HEADERS.copy()
    if additional_headers:
        headers.update(additional_headers)

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body) if body else ''
    }

def get_default_subnets():
    """
    Get default VPC subnets for ECS tasks
    """
    try:
        # Get default VPC
        vpcs = ec2_client.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])
        if not vpcs['Vpcs']:
            raise Exception("No default VPC found")

        default_vpc_id = vpcs['Vpcs'][0]['VpcId']

        # Get subnets in default VPC
        subnets = ec2_client.describe_subnets(
            Filters=[{'Name': 'vpc-id', 'Values': [default_vpc_id]}]
        )

        subnet_ids = [subnet['SubnetId'] for subnet in subnets['Subnets']]
        logger.info(f"Found default subnets: {subnet_ids}")
        return subnet_ids

    except Exception as e:
        logger.error(f"Error getting default subnets: {e}")
        raise

def start_fargate_task():
    """
    Start ECS Fargate task
    """
    subnets = get_default_subnets()
    response = ecs_client.run_task(
        cluster=ECS_CLUSTER_NAME,
        taskDefinition=ECS_TASK_DEFINITION,
        launchType='FARGATE',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': subnets,
                'assignPublicIp': 'ENABLED'
            }
        }
    )
    return response['tasks'][0]['taskArn']

def validate_level(level):
    """
    Validate CEFR level parameter
    """
    valid_levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    return level in valid_levels

def parse_request_body(body):
    """
    Parse request body from string or dict
    """
    if isinstance(body, str):
        return json.loads(body)
    return body

def handle_get_read(query_params):
    """
    Handle GET /read endpoint - retrieve by queue_id
    """
    queue_id = query_params.get('queue_id')
    if not queue_id:
        return build_response(400, {'error': 'Missing required parameter: queue_id'})

    result = get_job_result(queue_id)

    if result is None:
        return build_response(404, {'error': 'Queue ID not found'})

    return build_response(200, {'payload': result['payload']})

def handle_put_read(query_params):
    """
    Handle PUT /read endpoint - create exam job and start ECS task
    """
    level = query_params.get('level')
    if not level:
        return build_response(400, {'error': 'Missing required parameter: level'})

    if not validate_level(level):
        return build_response(400, {
            'error': f'Invalid level. Must be one of: A1, A2, B1, B2, C1, C2'
        })

    queue_id = create_exam_job('read', level)
    start_fargate_task()

    return build_response(200, {
        'message': 'Read generation job started',
        'queue_id': queue_id,
    })

def handle_patch_read(query_params, body):
    """
    Handle PATCH /read endpoint - update participant results
    """
    queue_id = query_params.get('queue_id')
    if not queue_id:
        return build_response(400, {'error': 'Missing required parameter: queue_id'})

    if not body:
        return build_response(400, {'error': 'Missing request body'})

    request_data = parse_request_body(body)

    # Extract and validate required fields
    participant_answers = request_data.get('participant_answers')
    score = request_data.get('score')
    is_pass = request_data.get('is_pass')

    if participant_answers is None:
        return build_response(400, {'error': 'Missing required field: participant_answers'})
    if score is None:
        return build_response(400, {'error': 'Missing required field: score'})
    if is_pass is None:
        return build_response(400, {'error': 'Missing required field: is_pass'})

    # Validate data types
    if not isinstance(participant_answers, list):
        return build_response(400, {'error': 'participant_answers must be an array'})
    if not isinstance(score, (int, float)):
        return build_response(400, {'error': 'score must be a number'})
    if not isinstance(is_pass, bool):
        return build_response(400, {'error': 'is_pass must be a boolean'})

    success = update_read_participant_results(queue_id, participant_answers, score, is_pass)

    if not success:
        return build_response(404, {'error': 'Queue ID not found or already updated'})

    return build_response(200, {
        'message': 'Participant results updated successfully',
        'queue_id': queue_id,
        'score': score,
        'is_pass': is_pass
    })

def handle_get_write(query_params):
    """
    Handle GET /write endpoint - retrieve by queue_id and modus
    """
    queue_id = query_params.get('queue_id')
    modus = query_params.get('modus')

    if not queue_id:
        return build_response(400, {'error': 'Missing required parameter: queue_id'})

    if not modus:
        return build_response(400, {'error': 'Missing required parameter: modus'})

    if modus not in ['generate', 'evaluate']:
        return build_response(400, {'error': 'Invalid modus. Must be either "generate" or "evaluate"'})

    try:
        result = get_write_exam_data(queue_id, modus)

        if result is None:
            return build_response(404, {'error': 'Queue ID not found or data not ready'})

        return build_response(200, {'payload': result['data']})

    except Exception as e:
        logger.error(f"Failed to get write job result: {e}")
        return build_response(500, {'error': 'Failed to retrieve result'})

def handle_put_write(query_params, body):
    """
    Handle PUT /write endpoint - generation or evaluation based on queue_id presence
    """
    queue_id = query_params.get('queue_id')
    level = query_params.get('level')

    if queue_id:
        # Evaluation phase
        return handle_write_evaluation(queue_id, body)
    else:
        # Generation phase
        return handle_write_generation(level)

def handle_write_generation(level):
    """
    Handle write generation phase
    """
    if not level:
        return build_response(400, {'error': 'Missing required parameter: level'})

    if not validate_level(level):
        return build_response(400, {
            'error': f'Invalid level. Must be one of: A1, A2, B1, B2, C1, C2'
        })

    queue_id = create_exam_job('write_generation', level)
    start_fargate_task()

    return build_response(200, {
        'message': 'Write generation job started',
        'queue_id': queue_id,
    })

def handle_write_evaluation(queue_id, body):
    """
    Handle write evaluation phase
    """
    if not body:
        return build_response(400, {'error': 'Missing request body'})

    request_data = parse_request_body(body)
    participant_answers = request_data.get('participant_answers')

    if not participant_answers:
        return build_response(400, {'error': 'Missing required field: participant_answers'})

    success = update_write_participant_answers(queue_id, participant_answers)

    if not success:
        return build_response(404, {'error': 'Queue ID not found'})

    create_exam_job('write_evaluation', None, queue_id)
    start_fargate_task()

    return build_response(200, {
        'message': 'Write evaluation job started',
        'queue_id': queue_id,
    })

def handle_get_listen(query_params):
    """
    Handle GET /listen endpoint - retrieve by queue_id
    """
    queue_id = query_params.get('queue_id')
    if not queue_id:
        return build_response(400, {'error': 'Missing required parameter: queue_id'})

    result = get_listen_job_result(queue_id)

    if result is None:
        return build_response(404, {'error': 'Queue ID not found'})

    return build_response(200, {'payload': result['payload']})

def handle_put_listen(query_params):
    """
    Handle PUT /listen endpoint - create listening exam job and start ECS task
    """
    level = query_params.get('level')
    if not level:
        return build_response(400, {'error': 'Missing required parameter: level'})

    if not validate_level(level):
        return build_response(400, {
            'error': f'Invalid level. Must be one of: A1, A2, B1, B2, C1, C2'
        })

    queue_id = create_exam_job('listen', level)
    start_fargate_task()

    return build_response(200, {
        'message': 'Listen generation job started',
        'queue_id': queue_id,
    })

def handle_patch_listen(query_params, body):
    """
    Handle PATCH /listen endpoint - update participant results
    """
    queue_id = query_params.get('queue_id')
    if not queue_id:
        return build_response(400, {'error': 'Missing required parameter: queue_id'})

    if not body:
        return build_response(400, {'error': 'Missing request body'})

    request_data = parse_request_body(body)

    # Extract and validate required fields
    participant_answers = request_data.get('participant_answers')
    score = request_data.get('score')
    is_pass = request_data.get('is_pass')

    if participant_answers is None:
        return build_response(400, {'error': 'Missing required field: participant_answers'})
    if score is None:
        return build_response(400, {'error': 'Missing required field: score'})
    if is_pass is None:
        return build_response(400, {'error': 'Missing required field: is_pass'})

    # Validate data types
    if not isinstance(participant_answers, list):
        return build_response(400, {'error': 'participant_answers must be an array'})
    if not isinstance(score, (int, float)):
        return build_response(400, {'error': 'score must be a number'})
    if not isinstance(is_pass, bool):
        return build_response(400, {'error': 'is_pass must be a boolean'})

    success = update_listen_participant_results(queue_id, participant_answers, score, is_pass)

    if not success:
        return build_response(404, {'error': 'Queue ID not found or already updated'})

    return build_response(200, {
        'message': 'Participant results updated successfully',
        'queue_id': queue_id,
        'score': score,
        'is_pass': is_pass
    })

def handle_get_jobs():
    """
    Handle GET /jobs endpoint - retrieve all exam jobs
    """
    try:
        jobs = get_all_exam_jobs()
        return build_response(200, {'jobs': jobs})
    except Exception as e:
        logger.error(f"Failed to retrieve jobs: {e}")
        return build_response(500, {'error': 'Failed to retrieve jobs'})

def lambda_handler(event, context):
    """
    AWS Lambda handler for API Gateway requests
    """
    logger.info(f"Received event: {json.dumps(event, default=str)}")

    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        query_params = event.get('queryStringParameters') or {}
        body = event.get('body')

        logger.info(f"Processing request: {http_method} {path}")
        logger.info(f"Query parameters: {query_params}")

        # Handle OPTIONS (preflight) request
        if http_method == "OPTIONS":
            return build_response(200, {})

        # Route requests to appropriate handlers
        try:
            if http_method == 'GET' and path == '/read':
                return handle_get_read(query_params)
            elif http_method == 'PUT' and path == '/read':
                return handle_put_read(query_params)
            elif http_method == 'PATCH' and path == '/read':
                return handle_patch_read(query_params, body)
            elif http_method == 'GET' and path == '/write':
                return handle_get_write(query_params)
            elif http_method == 'PUT' and path == '/write':
                return handle_put_write(query_params, body)
            elif http_method == 'GET' and path == '/listen':
                return handle_get_listen(query_params)
            elif http_method == 'PUT' and path == '/listen':
                return handle_put_listen(query_params)
            elif http_method == 'PATCH' and path == '/listen':
                return handle_patch_listen(query_params, body)
            elif http_method == 'GET' and path == '/jobs':
                return handle_get_jobs()
            else:
                return build_response(404, {
                    'error': f'Endpoint not found: {http_method} {path}'
                })

        except json.JSONDecodeError:
            return build_response(400, {'error': 'Invalid JSON in request body'})
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return build_response(500, {'error': 'Failed to process request'})

    except Exception as e:
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return build_response(500, {
            'error': f'Internal server error: {str(e)}'
        })
