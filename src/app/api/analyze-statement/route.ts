import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
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
      // Find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      return NextResponse.json({
        error: 'Failed to parse analysis',
        raw: responseText
      }, { status: 500 })
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Statement analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze statement' }, { status: 500 })
  }
}
