import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Use service role to read all achievements (bypasses per-user RLS)
    const achievements = await base44.asServiceRole.entities.Achievement.list('-total_points', 50);
    return Response.json({ achievements });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});