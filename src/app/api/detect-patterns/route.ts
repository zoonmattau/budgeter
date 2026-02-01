import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST() {
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
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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

    let analysis
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found')
      }
    } catch {
      return NextResponse.json({ suggested_bills: [], spending_patterns: [] })
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Pattern detection error:', error)
    return NextResponse.json({ error: 'Failed to detect patterns' }, { status: 500 })
  }
}
