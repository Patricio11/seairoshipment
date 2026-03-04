ALTER TYPE "public"."notification_type" ADD VALUE 'PAYMENT_REMINDER';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reminder_sent_at" timestamp;