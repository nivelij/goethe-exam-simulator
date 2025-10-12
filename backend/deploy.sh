#!/bin/bash

# Goethe Exam Worker Deployment Script
set -e

# Configuration
STACK_NAME="goethe-exam-worker"
REGION="eu-central-1"

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is not set"
    echo "   Create a .env file or set the environment variable"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "   Create a .env file or set the environment variable"
    exit 1
fi

echo "🚀 Deploying Goethe Exam Worker Infrastructure..."

# Step 1: Deploy ECR and ECS infrastructure
echo "📋 Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file simplified-infrastructure.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    OpenAIApiKey="$OPENAI_API_KEY" \
    DatabaseUrl="$DATABASE_URL" \
    ImageTag="latest" \
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --profile personal

# Get ECR repository URI
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
  --output text \
  --region $REGION \
  --profile personal)

echo "📦 ECR Repository: $ECR_URI"

# Step 2: Build and push Docker image to ECR
echo "🔑 Logging in to ECR..."
aws ecr get-login-password --region $REGION --profile personal | docker login --username AWS --password-stdin $ECR_URI

echo "🐳 Building Docker image..."
docker build --platform linux/amd64 -t exam-worker .

echo "🏷️ Tagging Docker image..."
docker tag exam-worker:latest $ECR_URI:latest

echo "📤 Pushing Docker image to ECR..."
docker push $ECR_URI:latest

# Note: Lambda function is deployed manually and not managed by this stack

echo "✅ Deployment complete!"
echo ""
echo "📋 Infrastructure Details:"
echo "   Stack Name: $STACK_NAME"
echo "   Region: $REGION"
echo "   ECR URI: $ECR_URI"
echo ""
echo "🔄 Architecture Flow:"
echo "   1. PUT /read → SQS message"
echo "   2. Your manually deployed Lambda triggered by SQS"
echo "   3. Lambda starts ECS Fargate task"
echo "   4. Fargate task processes job and exits"
echo ""
echo "📊 Monitor logs:"
echo "   ECS logs: aws logs tail /ecs/goethe-exam-worker --follow --region $REGION"
echo ""
echo "⚠️  Remember to:"
echo "   1. Configure your Lambda function to trigger from SQS queue: arn:aws:sqs:eu-central-1:177078044036:GoetheExamQueue"
echo "   2. Set Lambda environment variables: ECS_CLUSTER_NAME=$STACK_NAME, ECS_TASK_DEFINITION=goethe-exam-worker"