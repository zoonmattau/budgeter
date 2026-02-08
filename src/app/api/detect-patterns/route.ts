import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { normalizeDescription, calculateNextExpected } from '@/lib/patterns/matcher'

// Validate API key at startup
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. Pattern detection will fail.')
}

// Only create client if API key exists
let anthropicClient: Anthropic | null = null
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic()
}

interface SuggestedBill {
  name: string
  amount: number
  frequency: string
  typical_day: number
  category?: string
  confidence: 'high' | 'medium' | 'low'
  evidence?: string
}

interface SpendingPattern {
  pattern: string
  insight: string
  suggestion: string
}

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

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY || !anthropicClient) {
    return NextResponse.json({
      error: 'Pattern detection is not available. Please try again later.'
    }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch user's transactions from the last 3 months
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (!transactions || transactions.length < 5) {
      return NextResponse.json({
        error: 'Not enough transactions to detect patterns. Add more transactions first.',
        patterns: []
      })
    }

    // Fetch existing bills to avoid duplicates
    const { data: existingBills } = await supabase
      .from('bills')
      .select('name, amount')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const existingBillNames = existingBills?.map(b => b.name.toLowerCase()) || []

    // Format transactions for analysis
    const txList = transactions.map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.categories?.name || 'Uncategorized'
    }))

    // Use Claude to find patterns
    const message = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Analyze these transactions and identify recurring patterns that should become bills.
Look for:
- Subscriptions (Netflix, Spotify, gym memberships, etc.)
- Regular bills (utilities, rent, insurance, phone)
- Any transaction that occurs regularly with similar amounts

Existing bills (don't suggest duplicates): ${existingBillNames.join(', ') || 'None'}

Return JSON:
{
  "suggested_bills": [
    {
      "name": "Bill name",
      "amount": 15.99,
      "frequency": "monthly" | "weekly" | "fortnightly" | "quarterly" | "yearly",
      "typical_day": 15,
      "category": "Subscriptions",
      "confidence": "high" | "medium" | "low",
      "evidence": "Found 3 transactions on similar dates"
    }
  ],
  "spending_patterns": [
    {
      "pattern": "Description of pattern",
      "insight": "What this means for the user",
      "suggestion": "Actionable advice"
    }
  ]
}

Transactions:
${JSON.stringify(txList, null, 2)}`
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let analysis: { suggested_bills?: SuggestedBill[]; spending_patterns?: SpendingPattern[] }
    try {
      analysis = extractJSON(responseText) as typeof analysis
    } catch (parseError) {
      console.error('Pattern detection JSON parse error:', parseError)
      return NextResponse.json({
        suggested_bills: [],
        spending_patterns: [],
        error: 'Failed to parse AI response'
      })
    }

    // Persist detected patterns to payment_patterns table
    if (analysis.suggested_bills && analysis.suggested_bills.length > 0) {
      // Fetch user's categories for mapping
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)

      const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]) || [])

      for (const bill of analysis.suggested_bills) {
        const normalizedName = normalizeDescription(bill.name)
        const categoryId = categoryMap.get(bill.category?.toLowerCase()) || null
        const confidence = bill.confidence === 'high' ? 0.85 : bill.confidence === 'medium' ? 0.65 : 0.45
        const frequency = bill.frequency as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
        const nextExpected = calculateNextExpected(frequency, bill.typical_day)

        // Upsert pattern (update if exists, insert if not)
        const { error: upsertError } = await supabase
          .from('payment_patterns')
          .upsert({
            user_id: user.id,
            name: bill.name,
            normalized_name: normalizedName,
            typical_amount: bill.amount,
            amount_variance: bill.amount * 0.1, // 10% variance by default
            frequency,
            typical_day: bill.typical_day,
            day_variance: 3,
            confidence,
            category_id: categoryId,
            is_active: true,
            next_expected: nextExpected.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,normalized_name',
            ignoreDuplicates: false
          })

        if (upsertError) {
          console.error('Error upserting pattern:', upsertError)
        }
      }
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Pattern detection error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('API key')) {
      return NextResponse.json({ error: 'Pattern detection is not available. Please try again later.' }, { status: 503 })
    }
    if (errorMessage.includes('rate limit')) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 })
    }

    return NextResponse.json({ error: 'Failed to detect patterns. Please try again.' }, { status: 500 })
  }
}
