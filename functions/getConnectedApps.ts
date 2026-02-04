import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Get connected apps for the current user
 * Uses asServiceRole since ConnectedApps are created by the linkExchange function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query ConnectedApps using asServiceRole since they're created by service role
    const connectedApps = await base44.asServiceRole.entities.ConnectedApp.filter({
      user_email: user.email
    });

    return Response.json({
      success: true,
      apps: connectedApps
    });

  } catch (error) {
    console.error('Get connected apps error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});
