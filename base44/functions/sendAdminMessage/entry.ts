import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { title, message, link, priority, target } = await req.json();

    if (!title || !message) {
      return Response.json({ error: 'Title and message are required' }, { status: 400 });
    }

    let recipients = [];

    // Determine recipients based on target
    if (target.type === 'all') {
      const allUsers = await base44.asServiceRole.entities.User.list();
      recipients = allUsers.map(u => u.email);
    } else if (target.type === 'specific' && target.emails?.length > 0) {
      recipients = target.emails;
    } else if (target.type === 'filter') {
      const allUsers = await base44.asServiceRole.entities.User.list();
      
      recipients = allUsers
        .filter(u => {
          if (target.roles?.length > 0 && !target.roles.includes(u.role)) return false;
          if (target.email_contains && !u.email.toLowerCase().includes(target.email_contains.toLowerCase())) return false;
          return true;
        })
        .map(u => u.email);
    }

    // Create notifications
    const notifications = await Promise.all(
      recipients.map(email =>
        base44.asServiceRole.entities.Notification.create({
          recipient_email: email,
          sender_email: user.email,
          type: 'system',
          title,
          message,
          link: link || null,
          priority: priority || 'medium'
        })
      )
    );

    return Response.json({ 
      message: 'Messages sent successfully', 
      count: notifications.length,
      recipients 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});