CREATE TYPE "public"."container_status" AS ENUM('OPEN', 'THRESHOLD_REACHED', 'BOOKED', 'SAILING', 'DELIVERED');--> statement-breakpoint
CREATE TYPE "public"."container_type" AS ENUM('20FT', '40FT');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('INVOICE', 'BOL', 'COA', 'PACKING_LIST', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TYPE "public"."allocation_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('CONTAINER_THRESHOLD', 'BOOKING_CREATED', 'DOCUMENT_UPLOADED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('DEPOSIT', 'BALANCE');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('ORIGIN', 'DESTINATION', 'HUB');--> statement-breakpoint
CREATE TYPE "public"."charge_type" AS ENUM('PER_PALLET', 'PER_CONTAINER', 'FIXED');--> statement-breakpoint
CREATE TABLE "container_types" (
	"id" text PRIMARY KEY NOT NULL,
	"size" text NOT NULL,
	"type" text NOT NULL,
	"variant" text,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"max_pallets" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "container_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "containers" (
	"id" text PRIMARY KEY NOT NULL,
	"route" text NOT NULL,
	"vessel" text NOT NULL,
	"voyage_number" text,
	"sailing_schedule_id" text,
	"type" "container_type" DEFAULT '40FT' NOT NULL,
	"etd" timestamp,
	"eta" timestamp,
	"total_pallets" integer DEFAULT 0 NOT NULL,
	"max_capacity" integer DEFAULT 20 NOT NULL,
	"status" "container_status" DEFAULT 'OPEN' NOT NULL,
	"metaship_order_no" text,
	"metaship_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"allocation_id" text,
	"user_id" text NOT NULL,
	"original_name" text NOT NULL,
	"stored_name" text NOT NULL,
	"type" "document_type" NOT NULL,
	"url" text,
	"status" "document_status" DEFAULT 'PENDING' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"role" "role" DEFAULT 'client' NOT NULL,
	"isVetted" boolean DEFAULT false NOT NULL,
	"accountNumber" text,
	"companyName" text,
	"companyReg" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_accountNumber_unique" UNIQUE("accountNumber")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "pallet_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"container_id" text NOT NULL,
	"user_id" text NOT NULL,
	"pallet_count" integer NOT NULL,
	"product_id" text,
	"commodity_name" text,
	"hs_code" text,
	"nett_weight" numeric,
	"gross_weight" numeric,
	"temperature" text,
	"consignee_name" text,
	"consignee_address" text,
	"status" "allocation_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"container_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"allocation_id" text,
	"user_id" text NOT NULL,
	"type" "invoice_type" NOT NULL,
	"status" "invoice_status" DEFAULT 'PENDING' NOT NULL,
	"booking_ref" text NOT NULL,
	"route" text NOT NULL,
	"pallet_count" integer NOT NULL,
	"origin_charges_zar" numeric NOT NULL,
	"ocean_freight_zar" numeric NOT NULL,
	"destination_charges_zar" numeric NOT NULL,
	"subtotal_zar" numeric NOT NULL,
	"percentage" integer NOT NULL,
	"amount_zar" numeric NOT NULL,
	"po_number" text,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"country" text NOT NULL,
	"type" "location_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"coordinates" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sales_rate_types" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_rate_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "destination_charge_items" (
	"id" text PRIMARY KEY NOT NULL,
	"destination_charge_id" text NOT NULL,
	"charge_code" text DEFAULT '' NOT NULL,
	"charge_name" text NOT NULL,
	"charge_type" text DEFAULT 'PER_CONTAINER' NOT NULL,
	"amount_local" numeric NOT NULL,
	"amount_zar" numeric NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destination_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"sales_rate_type_id" text,
	"destination_id" text NOT NULL,
	"destination_name" text NOT NULL,
	"destination_port_code" text NOT NULL,
	"container_id" text NOT NULL,
	"currency" text NOT NULL,
	"exchange_rate_to_zar" numeric NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocean_freight_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"sales_rate_type_id" text,
	"origin" text NOT NULL,
	"destination_country" text NOT NULL,
	"destination_port" text NOT NULL,
	"destination_port_code" text NOT NULL,
	"shipping_line" text DEFAULT 'MSC' NOT NULL,
	"container_id" text NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"freight_usd" numeric DEFAULT '0' NOT NULL,
	"baf_usd" numeric DEFAULT '0' NOT NULL,
	"isps_usd" numeric DEFAULT '0' NOT NULL,
	"other_surcharges_usd" numeric DEFAULT '0' NOT NULL,
	"rcg_usd" numeric DEFAULT '0' NOT NULL,
	"total_usd" numeric DEFAULT '0' NOT NULL,
	"exchange_rate" numeric DEFAULT '0' NOT NULL,
	"total_zar" numeric DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "origin_charge_items" (
	"id" text PRIMARY KEY NOT NULL,
	"origin_charge_id" text NOT NULL,
	"charge_code" text DEFAULT '' NOT NULL,
	"charge_name" text NOT NULL,
	"charge_type" charge_type NOT NULL,
	"category" text DEFAULT 'OTHER' NOT NULL,
	"unit_cost" numeric,
	"container_cost" numeric,
	"mandatory" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "origin_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"sales_rate_type_id" text,
	"origin_id" text NOT NULL,
	"origin_name" text NOT NULL,
	"container_id" text NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_allocation_id_pallet_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."pallet_allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallet_allocations" ADD CONSTRAINT "pallet_allocations_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallet_allocations" ADD CONSTRAINT "pallet_allocations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_allocation_id_pallet_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."pallet_allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_charge_items" ADD CONSTRAINT "destination_charge_items_destination_charge_id_destination_charges_id_fk" FOREIGN KEY ("destination_charge_id") REFERENCES "public"."destination_charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_charges" ADD CONSTRAINT "destination_charges_sales_rate_type_id_sales_rate_types_id_fk" FOREIGN KEY ("sales_rate_type_id") REFERENCES "public"."sales_rate_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_charges" ADD CONSTRAINT "destination_charges_container_id_container_types_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."container_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocean_freight_rates" ADD CONSTRAINT "ocean_freight_rates_sales_rate_type_id_sales_rate_types_id_fk" FOREIGN KEY ("sales_rate_type_id") REFERENCES "public"."sales_rate_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocean_freight_rates" ADD CONSTRAINT "ocean_freight_rates_container_id_container_types_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."container_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "origin_charge_items" ADD CONSTRAINT "origin_charge_items_origin_charge_id_origin_charges_id_fk" FOREIGN KEY ("origin_charge_id") REFERENCES "public"."origin_charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "origin_charges" ADD CONSTRAINT "origin_charges_sales_rate_type_id_sales_rate_types_id_fk" FOREIGN KEY ("sales_rate_type_id") REFERENCES "public"."sales_rate_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "origin_charges" ADD CONSTRAINT "origin_charges_container_id_container_types_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."container_types"("id") ON DELETE no action ON UPDATE no action;