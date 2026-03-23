import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Test function to verify signal creation works
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate as admin
    const user = await base44.auth.me();
    if (!user || user.email !== 'liv8ent@gmail.com') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    console.log('🧪 TEST: Starting signal creation test for user:', user.email);

    // Test 1: Create a signal with user_email using service role
    const testSignal = {
      provider: 'TEST',
      symbol: 'TEST123',
      action: 'BUY',
      price: 100,
      stop_loss: 95,
      take_profit: 110,
      take_profits: [110, 120],
      timeframe: '5m',
      confidence: 90,
      strategy: 'Test Strategy',
      notes: 'This is a test signal',
      status: 'new',
      user_email: user.email,
      raw_data: { test: true }
    };

    console.log('🧪 TEST: Creating signal with data:', testSignal);
    const createdSignal = await base44.asServiceRole.entities.Signal.create(testSignal);
    console.log('✅ TEST: Signal created:', createdSignal.id);

    // Test 2: Query signals as user (with user auth context)
    console.log('🧪 TEST: Querying signals as user...');
    const userSignals = await base44.entities.Signal.filter({ user_email: user.email });
    console.log('📊 TEST: User query returned:', userSignals.length, 'signals');

    // Test 3: Query signals as service role
    console.log('🧪 TEST: Querying signals as service role...');
    const serviceSignals = await base44.asServiceRole.entities.Signal.filter({ user_email: user.email });
    console.log('📊 TEST: Service role query returned:', serviceSignals.length, 'signals');

    // Clean up test signal
    await base44.asServiceRole.entities.Signal.delete(createdSignal.id);
    console.log('🧹 TEST: Cleaned up test signal');

    return Response.json({
      success: true,
      results: {
        signalCreated: true,
        signalId: createdSignal.id,
        userQueryCount: userSignals.length,
        serviceQueryCount: serviceSignals.length,
        message: userSignals.length > 0 
          ? '✅ Signals are accessible to user' 
          : '❌ Signals NOT accessible to user - RLS issue detected'
      }
    });

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});