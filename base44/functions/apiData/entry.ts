import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Unified API endpoint for data operations with real-time capabilities
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
    const url = new URL(req.url);
    const entity = url.searchParams.get('entity');
    const action = url.searchParams.get('action') || 'list';

    if (!entity) {
      return Response.json({ error: 'Missing entity parameter' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'list':
        // List all records for this user
        result = await base44.asServiceRole.entities[entity].filter(
          { created_by: user.email },
          '-created_date',
          parseInt(url.searchParams.get('limit') || '100')
        );
        break;

      case 'get':
        // Get specific record
        const id = url.searchParams.get('id');
        if (!id) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        const records = await base44.asServiceRole.entities[entity].filter({ id, created_by: user.email });
        result = records.length > 0 ? records[0] : null;
        break;

      case 'create':
        // Create new record
        const createData = await req.json();
        result = await base44.asServiceRole.entities[entity].create({
          ...createData,
          created_by: user.email
        });
        break;

      case 'update':
        // Update record
        const updateId = url.searchParams.get('id');
        if (!updateId) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        const updateData = await req.json();
        
        // Verify ownership
        const existing = await base44.asServiceRole.entities[entity].filter({ 
          id: updateId, 
          created_by: user.email 
        });
        if (existing.length === 0) {
          return Response.json({ error: 'Record not found or access denied' }, { status: 404 });
        }
        
        result = await base44.asServiceRole.entities[entity].update(updateId, updateData);
        break;

      case 'delete':
        // Delete record
        const deleteId = url.searchParams.get('id');
        if (!deleteId) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        
        // Verify ownership
        const toDelete = await base44.asServiceRole.entities[entity].filter({ 
          id: deleteId, 
          created_by: user.email 
        });
        if (toDelete.length === 0) {
          return Response.json({ error: 'Record not found or access denied' }, { status: 404 });
        }
        
        await base44.asServiceRole.entities[entity].delete(deleteId);
        result = { success: true, message: 'Record deleted' };
        break;

      case 'realtime':
        // Get latest updates (for polling-based real-time)
        const since = url.searchParams.get('since'); // ISO timestamp
        const filter = since ? {
          created_by: user.email,
          updated_date: { $gte: since }
        } : { created_by: user.email };
        
        result = await base44.asServiceRole.entities[entity].filter(
          filter,
          '-updated_date',
          50
        );
        break;

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({
      success: true,
      action,
      entity,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Data error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});