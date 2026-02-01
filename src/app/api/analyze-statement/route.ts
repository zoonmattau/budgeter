import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Validate API key at startup
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. Statement analysis will fail.')
}

const anthropic = new Anthropic()

function extractJSON(text: string): unknown {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim())
  }

  // Find the first { and last } to extract the outermost JSON object
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in response')
  }

  return JSON.parse(text.slice(firstBrace, lastBrace + 1))
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Statement analysis is not configured. Please set up ANTHROPIC_API_KEY.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileText = formData.get('text') as string // For pasted text

    let content = fileText || ''

    if (file && !fileText) {
      // Read file content
      const text = await file.text()
      content = text
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    // Fetch user's existing categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', user.id)

    const categoryList = categories?.map(c => c.name).join(', ') || 'Groceries, Dining Out, Transport, Entertainment, Shopping, Utilities, Subscriptions'

    // Use Claude to analyze the statement
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze this bank statement data and extract useful information. Return a JSON response with the following structure:

{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Original description",
      "amount": 123.45,
      "type": "expense" or "income",
      "suggested_category": "Category name",
      "is_recurring": true/false,
      "recurring_frequency": "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly" | null,
      "merchant": "Clean merchant name"
    }
  ],
  "recurring_bills": [
    {
      "name": "Bill name",
      "amount": 123.45,
      "frequency": "monthly",
      "typical_day": 15,
      "category": "Category name"
    }
  ],
  "insights": {
    "total_income": 1234.56,
    "total_expenses": 1234.56,
    "top_spending_categories": [
      { "category": "Category", "amount": 123.45, "percentage": 25 }
    ],
    "savings_rate": 15.5,
    "recommendations": [
      "Specific actionable recommendation based on the data"
    ]
  }
}

Available categories to use: ${categoryList}

If a transaction doesn't fit existing categories, suggest a new appropriate one.
For recurring bills, look for patterns like subscriptions (Netflix, Spotify), utilities, rent, insurance, etc.
Be specific with recommendations - mention actual amounts and merchants.

Bank statement data:
${content.slice(0, 50000)}`
        }
      ]
    })

    // Extract the JSON from Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Try to parse JSON from response
    let analysis
    try {
      analysis = extractJSON(responseText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({
        error: 'Failed to parse analysis. The AI response was not valid JSON.',
        raw: responseText.slice(0, 500)
      }, { status: 500 })
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Statement analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze statement' }, { status: 500 })
  }
}
