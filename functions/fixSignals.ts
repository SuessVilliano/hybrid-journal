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

    console.log('🔧 Starting signal fix for user:', user.email);

    // Get ALL signals using service role (bypasses RLS)
    const allSignals = await base44.asServiceRole.entities.Signal.list('-created_date', 1000);
    console.log('📊 Found', allSignals.length, 'total signals');

    // Filter signals that don't have user_email set
    const signalsToFix = allSignals.filter(s => !s.user_email);
    console.log('🔍 Found', signalsToFix.length, 'signals missing user_email');

    // Update each signal to set user_email based on created_by service role pattern
    // Since these were all created via webhook for the admin user, set to admin email
    const updates = [];
    for (const signal of signalsToFix) {
      try {
        await base44.asServiceRole.entities.Signal.update(signal.id, {
          user_email: user.email
        });
        updates.push(signal.id);
        console.log('✅ Updated signal:', signal.id);
      } catch (error) {
        console.error('❌ Failed to update signal:', signal.id, error.message);
      }
    }

    // Verify the fix by querying as user
    const userSignals = await base44.entities.Signal.filter({ user_email: user.email });
    console.log('✅ User can now see', userSignals.length, 'signals');

    return Response.json({
      success: true,
      totalSignals: allSignals.length,
      signalsFixed: updates.length,
      nowVisibleToUser: userSignals.length,
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