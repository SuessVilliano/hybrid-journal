import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI Data Access: Create Journal Entry
 * Allows AI assistant to create journal entries for the user
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      content, 
      mood_tags = [],
      entry_type = 'thought',
      related_trade_id = null,
      related_plan_id = null
    } = payload;

    if (!content || content.trim().length === 0) {
      return Response.json({ 
        error: 'Content is required',
        hint: 'Provide a non-empty content string'
      }, { status: 400 });
    }

    const entry = await base44.entities.JournalEntry.create({
      date: new Date().toISOString(),
      content,
      mood_tags,
      entry_type,
      related_trade_id,
      related_plan_id
    });

    return Response.json({ 
      success: true,
      entry,
      message: 'Journal entry created successfully'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});