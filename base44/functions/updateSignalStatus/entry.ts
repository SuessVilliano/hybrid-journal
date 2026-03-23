import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update signal status (viewed, ignored, executed)
 * Uses asServiceRole since signals are created by webhooks with service role
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signal_id, status } = await req.json();

    if (!signal_id) {
      return Response.json({ error: 'signal_id is required' }, { status: 400 });
    }

    if (!['viewed', 'ignored', 'executed'].includes(status)) {
      return Response.json({ error: 'Invalid status. Must be: viewed, ignored, or executed' }, { status: 400 });
    }

    // Fetch the signal to verify it belongs to this user
    const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
    const signal = signals[0];

    if (!signal) {
      return Response.json({ error: 'Signal not found' }, { status: 404 });
    }

    // Verify the signal belongs to this user
    if (signal.user_email !== user.email) {
      return Response.json({ error: 'Unauthorized - signal does not belong to this user' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, any> = { status };

    if (status === 'executed') {
      updateData.executed_at = new Date().toISOString();
    }

    // Update using service role (since signal was created by service role)
    const updatedSignal = await base44.asServiceRole.entities.Signal.update(signal_id, updateData);

    console.log(`Signal ${signal_id} updated to status: ${status} by user: ${user.email}`);

    return Response.json({
      success: true,
      signal: updatedSignal,
      message: `Signal marked as ${status}`
    });

  } catch (error) {
    console.error('Update signal status error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});
