import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Admin function to fix existing signals that are missing user_email
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate as admin
    const user = await base44.auth.me();
    if (!user || user.email !== 'liv8ent@gmail.com') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    const { targetUserEmail } = await req.json();

    if (!targetUserEmail) {
      return Response.json({ error: 'targetUserEmail is required in the payload' }, { status: 400 });
    }

    console.log('🔧 Starting signal fix for target user:', targetUserEmail);
    console.log('Admin running function:', user.email);

    // Get ALL signals using service role (bypasses RLS)
    const allSignals = await base44.asServiceRole.entities.Signal.list('-created_date', 1000);
    console.log('📊 Found', allSignals.length, 'total signals');

    // Filter signals that don't have user_email OR have wrong user_email
    const signalsToFix = allSignals.filter(s => !s.user_email || s.user_email !== targetUserEmail);
    console.log('🔍 Found', signalsToFix.length, 'signals to fix for', targetUserEmail);

    // Update each signal to set user_email to the target user
    const updates = [];
    for (const signal of signalsToFix) {
      try {
        await base44.asServiceRole.entities.Signal.update(signal.id, {
          user_email: targetUserEmail
        });
        updates.push(signal.id);
        console.log('✅ Updated signal:', signal.id, 'to user_email:', targetUserEmail);
      } catch (error) {
        console.error('❌ Failed to update signal:', signal.id, error.message);
      }
    }

    // Verify by re-fetching all signals and counting those with target user_email
    const allSignalsAfter = await base44.asServiceRole.entities.Signal.list('-created_date', 1000);
    const targetUserSignals = allSignalsAfter.filter(s => s.user_email === targetUserEmail);
    console.log('✅ Target user should now see', targetUserSignals.length, 'signals');

    return Response.json({
      success: true,
      totalSignals: allSignals.length,
      signalsFixed: updates.length,
      targetUserEmail: targetUserEmail,
      nowVisibleToTargetUser: targetUserSignals.length,
      updatedSignalIds: updates
    });

  } catch (error) {
    console.error('❌ Fix failed:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});