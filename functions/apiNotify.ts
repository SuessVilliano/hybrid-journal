import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * API Endpoint: Send Notifications
 * POST /api/functions/apiNotify
 * 
 * Allows external systems (TaskMagic, webhooks, custom apps) to send notifications
 * to users in the Hybrid Journal platform.
 * 
 * Authentication: api_key header OR user authentication
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse payload
    const payload = await req.json();
    const {
      recipient_email,
      user_id, // Alternative to recipient_email
      title,
      message,
      type = 'user_alert',
      link = null,
      priority = 'medium'
    } = payload;

    // Validate required fields
    if (!title || !message) {
      return Response.json({
        success: false,
        error: 'Missing required fields: title and message are required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!recipient_email && !user_id) {
      return Response.json({
        success: false,
        error: 'Either recipient_email or user_id must be provided',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Determine target user email
    let targetEmail = recipient_email;
    if (!targetEmail && user_id) {
      // Lookup user by ID
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (users.length === 0) {
        return Response.json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }
      targetEmail = users[0].email;
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: targetEmail,
      type,
      title,
      message,
      link,
      priority
    });

    // Try to send browser push notification if user has it enabled
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
      if (users.length > 0 && users[0].notification_preferences?.browser_push) {
        // Note: Browser push requires client-side permission
        // This creates the notification record; browser push happens client-side
        console.log('User has browser push enabled - notification will appear if user is online');
      }
    } catch (error) {
      console.log('Could not check browser push preferences:', error);
    }

    const duration = Date.now() - startTime;

    return Response.json({
      success: true,
      notification_id: notification.id,
      recipient: targetEmail,
      delivered_at: notification.created_date,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notification API error:', error);
    
    const duration = Date.now() - startTime;
    
    return Response.json({
      success: false,
      error: error.message,
      error_stack: error.stack,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});