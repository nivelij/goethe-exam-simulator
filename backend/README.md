# Goethe Exam Simulator Backend

## Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your secrets in `.env`:**
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `DATABASE_URL`: Your CockroachDB connection string

3. **Deploy infrastructure:**
   ```bash
   ./deploy.sh
   ```

## Security

- **Never commit `.env` files** - they contain secrets
- **Use `.env.example`** as a template for required variables
- **Set environment variables** in AWS Lambda/ECS for production

## Architecture

```
PUT /read → SQS → Lambda → ECS Fargate → Database
GET /read → Lambda → Database
```