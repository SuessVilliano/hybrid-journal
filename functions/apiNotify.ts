import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// API endpoint to send in-app notifications programmatically
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate via API key
    const apiKey = req.headers.get('api_key');
    if (!apiKey) {
      return Response.json({ error: 'Missing api_key header' }, { status: 401 });
    }

    // Find user by API key
    const users = await base44.asServiceRole.entities.User.filter({ api_key: apiKey, api_key_enabled: true });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Invalid or disabled API key' }, { status: 401 });
    }

    const user = users[0];
    const payload = await req.json();

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: payload.type || 'user_alert',
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      priority: payload.priority || 'medium',
      user_email: user.email
    });

    return Response.json({
      success: true,
      notification: notification,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('API Notify error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});