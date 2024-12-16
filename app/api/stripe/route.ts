import { redis } from "@/app/lib/redis";
import { stripe } from "@/app/lib/stripe";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature");

  if (!signature) {
    return new Response("Missing Stripe Signature", { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_WEBHOOK) {
    throw new Error(
      "Stripe Webhook Secret is not defined in environment variables"
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_SECRET_WEBHOOK
    );
  } catch (error) {
    console.error("Error verifying Stripe webhook signature:", error);
    return new Response("Webhook Error", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;

      if (!userId) {
        console.error("User ID not found in session metadata");
        return new Response("User ID missing in metadata", { status: 400 });
      }

      try {
        await prisma.order.create({
          data: {
            amount: session.amount_total as number,
            status: session.status as string,
            userId,
          },
        });

        await redis.del(`cart-${userId}`);
      } catch (dbError) {
        console.error("Error updating database or cache:", dbError);
        return new Response("Database or Cache Error", { status: 500 });
      }
      break;
    }
    default: {
      console.log(`Unhandled event type: ${event.type}`);
      return new Response("Event type not handled", { status: 400 });
    }
  }

  return new Response(null, { status: 200 });
}
