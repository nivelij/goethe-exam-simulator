import json
import os
import logging
import traceback
import uuid
import boto3
from db import insert_read_exam, insert_exam_job

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




def lambda_handler(event, context):
    """
    AWS Lambda handler for API Gateway requests
    """
    logger.info(f"Received event: {json.dumps(event, default=str)}")

    try:
        # Get HTTP method and path
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        logger.info(f"Processing request: {http_method} {path}")

        # Handle OPTIONS (preflight) request
        if http_method == "OPTIONS":
            logger.info("Handling OPTIONS preflight request")
            return build_response(200, {})

        # Handle GET /read endpoint (retrieve by queue_id)
        if http_method == 'GET' and path == '/read':
            logger.info("Handling GET /read endpoint - retrieve by queue_id")
            # Get query parameters
            query_params = event.get('queryStringParameters') or {}
            queue_id = query_params.get('queue_id')
            logger.info(f"Query parameters: {query_params}")

            if not queue_id:
                logger.warning("Missing required parameter: queue_id")
                return build_response(400, {
                    'error': 'Missing required parameter: queue_id'
                })

            try:
                from db import get_job_result
                result = get_job_result(queue_id)

                if result is None:
                    logger.info(f"Queue ID not found: {queue_id}")
                    return build_response(404, {
                        'error': 'Queue ID not found'
                    })

                return build_response(200, {
                    'payload': result['payload']
                })

            except Exception as e:
                logger.error(f"Error retrieving job result: {str(e)}")
                logger.error(f"Full traceback: {traceback.format_exc()}")
                return build_response(500, {
                    'error': 'Failed to retrieve job result'
                })

        if http_method == 'PUT' and path == '/read':
            logger.info("Handling PUT /read endpoint - create exam job and start ECS task")
            query_params = event.get('queryStringParameters') or {}
            level = query_params.get('level')
            logger.info(f"Query parameters: {query_params}")

            if not level:
                return build_response(400, {
                    'error': 'Missing required parameter: level'
                })

            valid_levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
            if level not in valid_levels:
                logger.warning(f"Invalid level parameter: {level}. Valid levels: {valid_levels}")
                return build_response(400, {
                    'error': f'Invalid level. Must be one of: {", ".join(valid_levels)}'
                })

            try:
                queue_id = str(uuid.uuid4())
                insert_read_exam(queue_id, level)
                insert_exam_job(queue_id, 'read')

                # Start ECS task directly
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

                task_arn = response['tasks'][0]['taskArn']
                logger.info(f"Successfully started ECS task: {task_arn}")

                return build_response(200, {
                    'queue_id': queue_id,
                    'task_arn': task_arn
                })
            except Exception as e:
                logger.error(f"Full traceback: {traceback.format_exc()}")
                return build_response(500, {'error': f'Failed to create exam job: {str(e)}'})

        # Handle PATCH /read endpoint (update participant results)
        if http_method == 'PATCH' and path == '/read':
            logger.info("Handling PATCH /read endpoint - update participant results")
            query_params = event.get('queryStringParameters') or {}
            queue_id = query_params.get('queue_id')
            logger.info(f"Query parameters: {query_params}")

            if not queue_id:
                logger.warning("Missing required parameter: queue_id")
                return build_response(400, {
                    'error': 'Missing required parameter: queue_id'
                })

            try:
                # Parse request body
                body = event.get('body')
                if not body:
                    logger.warning("Missing request body")
                    return build_response(400, {
                        'error': 'Missing request body'
                    })

                # Handle both string and dict body
                if isinstance(body, str):
                    request_data = json.loads(body)
                else:
                    request_data = body

                logger.info(f"Request data: {request_data}")

                # Extract required fields
                participant_answers = request_data.get('participant_answers')
                score = request_data.get('score')
                is_pass = request_data.get('is_pass')

                # Validate required fields
                if participant_answers is None:
                    return build_response(400, {
                        'error': 'Missing required field: participant_answers'
                    })

                if score is None:
                    return build_response(400, {
                        'error': 'Missing required field: score'
                    })

                if is_pass is None:
                    return build_response(400, {
                        'error': 'Missing required field: is_pass'
                    })

                # Validate data types
                if not isinstance(participant_answers, list):
                    return build_response(400, {
                        'error': 'participant_answers must be an array'
                    })

                if not isinstance(score, (int, float)):
                    return build_response(400, {
                        'error': 'score must be a number'
                    })

                if not isinstance(is_pass, bool):
                    return build_response(400, {
                        'error': 'is_pass must be a boolean'
                    })

                # Update participant results in database
                from db import update_participant_results
                success = update_participant_results(queue_id, participant_answers, score, is_pass)

                if not success:
                    return build_response(404, {
                        'error': 'Queue ID not found or already updated'
                    })

                return build_response(200, {
                    'message': 'Participant results updated successfully',
                    'queue_id': queue_id,
                    'score': score,
                    'is_pass': is_pass
                })

            except json.JSONDecodeError:
                logger.error("Invalid JSON in request body")
                return build_response(400, {
                    'error': 'Invalid JSON in request body'
                })
            except Exception as e:
                logger.error(f"Error updating participant results: {str(e)}")
                logger.error(f"Full traceback: {traceback.format_exc()}")
                return build_response(500, {
                    'error': 'Failed to update participant results'
                })

        return build_response(404, {
            'error': f'Endpoint not found: {http_method} {path}'
        })

    except Exception as e:
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return build_response(500, {
            'error': f'Internal server error: {str(e)}'
        })
