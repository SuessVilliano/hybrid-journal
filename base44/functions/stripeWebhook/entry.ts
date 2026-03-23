import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  const base44 = createClientFromRequest(req);

  try {
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        const userId = session.metadata.user_id;
        const tier = session.metadata.tier;

        await base44.asServiceRole.entities.User.update(userId, {
          subscription_tier: tier,
          subscription_status: 'active',
          stripe_subscription_id: subscription.id,
          subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const users = await base44.asServiceRole.entities.User.filter({
          stripe_subscription_id: subscription.id
        });

        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_status: subscription.status,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const users = await base44.asServiceRole.entities.User.filter({
          stripe_subscription_id: subscription.id
        });

        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_tier: 'free',
            subscription_status: 'cancelled'
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});