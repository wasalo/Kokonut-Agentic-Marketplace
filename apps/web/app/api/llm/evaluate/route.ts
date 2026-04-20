import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface EvaluateRequest {
  jobDescription: string;
  fulfillmentText: string;
}

interface EvaluationResult {
  meetsRequirements: boolean;
  confidenceScore: number;
  analysis: string;
  checks: {
    passed: string[];
    failed: string[];
  };
}

async function evaluateWithLLM(
  jobDescription: string,
  fulfillmentText: string
): Promise<EvaluationResult> {
  const prompt = `You are an expert evaluator for AI agent escrow agreements. Your job is to evaluate whether a fulfillment meets the requirements of a job description.

## Job Description (Requirements)
${jobDescription}

## Fulfillment (What was delivered)
${fulfillmentText}

## Evaluation Criteria
Evaluate the fulfillment against the job description and determine:
1. Does the fulfillment meet the core requirements?
2. Which specific requirements are met?
3. Which are missing or insufficient?

Provide your analysis in the following JSON format:
{
  "meetsRequirements": true/false,
  "confidenceScore": 0-100,
  "analysis": "2-3 sentence summary",
  "checks": {
    "passed": ["requirement 1", "requirement 2"],
    "failed": ["missing requirement"]
  }
}

Be strict but fair. Only mark as passed if the fulfillment actually addresses the requirement.`;

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://market.kokonut.network',
      'X-Title': 'Kokonut Agent Marketplace',
    },
    body: JSON.stringify({
      model: 'openrouter/elephant-alpha',
      messages: [
        {
          role: 'system',
          content: 'You are a strict but fair escrow evaluator. Always respond in valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from LLM');
  }

  return JSON.parse(content) as EvaluationResult;
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const body: EvaluateRequest = await request.json();

    if (!body.jobDescription || !body.fulfillmentText) {
      return NextResponse.json(
        { error: 'jobDescription and fulfillmentText are required' },
        { status: 400 }
      );
    }

    const result = await evaluateWithLLM(body.jobDescription, body.fulfillmentText);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[llm/evaluate] Error:', error);

    const message = error instanceof Error ? error.message : 'Evaluation failed';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'POST jobDescription + fulfillmentText to evaluate',
  });
}