import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, eventData } = await req.json();

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    
    if (!accessToken) {
      return Response.json({ 
        error: 'Google Calendar not connected. Please authorize first.' 
      }, { status: 400 });
    }

    if (action === 'createEvent') {
      // Create a new calendar event for trading session
      const event = {
        summary: eventData.title || 'Trading Session',
        description: eventData.description || 'Scheduled trading time',
        start: {
          dateTime: eventData.startTime,
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: 'America/New_York'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 }
          ]
        }
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Calendar API error:', error);
        return Response.json({ error: 'Failed to create event' }, { status: 500 });
      }

      const createdEvent = await response.json();
      return Response.json({ 
        success: true, 
        event: createdEvent,
        message: 'Trading session added to your calendar!'
      });
    }

    if (action === 'listEvents') {
      // List upcoming trading sessions
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
      }

      const data = await response.json();
      return Response.json({ 
        success: true, 
        events: data.items || []
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});