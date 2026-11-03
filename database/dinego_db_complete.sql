-- ==============================================================================
-- DINEGO DATABASE COMPLETE SCRIPT FOR MICROSOFT SQL SERVER / SSMS
-- Generated for Group 17 (NestJS Backend + React Frontend + MoMo Gateway)
-- Database Name: dinego_db
-- Compatibility: Microsoft SQL Server 2019 / 2022 / 2025 Express & Enterprise
-- ==============================================================================

USE [master];
GO

-- 1. Create Database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'dinego_db')
BEGIN
    CREATE DATABASE [dinego_db];
    PRINT N'✅ Database [dinego_db] created successfully.';
END
ELSE
BEGIN
    PRINT N'ℹ️ Database [dinego_db] already exists.';
END
GO

USE [dinego_db];
GO

-- 2. Schema DDL Definition

-- ----------------------------------------------------------------------------
-- Migration: 20261028000000_init_sqlserver
-- ----------------------------------------------------------------------------
-- ==============================================================================
-- DineGo Backend — Migration: Initial schema for SQL Server
-- Phase 2 + 3: Identity, RBAC, Merchant, Menu & User Sessions
-- Provider: Microsoft SQL Server (SQLEXPRESS)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

-- CreateTable: users
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [full_name] NVARCHAR(1000) NOT NULL,
    [phone_number] NVARCHAR(1000),
    [avatar_url] NVARCHAR(1000),
    [is_email_verified] BIT NOT NULL CONSTRAINT [users_is_email_verified_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: user_roles
CREATE TABLE [dbo].[user_roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [user_roles_role_df] DEFAULT 'CUSTOMER',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [user_roles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_roles_role_check] CHECK ([role] IN ('CUSTOMER', 'MERCHANT', 'DRIVER', 'ADMIN'))
);

-- CreateTable: user_sessions
CREATE TABLE [dbo].[user_sessions] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [token_hash] NVARCHAR(1000) NOT NULL,
    [is_revoked] BIT NOT NULL CONSTRAINT [user_sessions_is_revoked_df] DEFAULT 0,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [user_sessions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [user_sessions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: merchants
CREATE TABLE [dbo].[merchants] (
    [id] NVARCHAR(1000) NOT NULL,
    [owner_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX),
    [address] NVARCHAR(1000) NOT NULL,
    [latitude] DECIMAL(10,7),
    [longitude] DECIMAL(10,7),
    [phone_number] NVARCHAR(1000) NOT NULL,
    [logo_url] NVARCHAR(1000),
    [cover_url] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [merchants_status_df] DEFAULT 'PENDING',
    [delivery_type] NVARCHAR(1000) NOT NULL CONSTRAINT [merchants_delivery_type_df] DEFAULT 'DINEGO_SHIPPER',
    [is_open] BIT NOT NULL CONSTRAINT [merchants_is_open_df] DEFAULT 1,
    [is_active] BIT NOT NULL CONSTRAINT [merchants_is_active_df] DEFAULT 1,
    [opening_time] NVARCHAR(1000),
    [closing_time] NVARCHAR(1000),
    [rating] DECIMAL(3,2) NOT NULL CONSTRAINT [merchants_rating_df] DEFAULT 0.0,
    [total_reviews] INT NOT NULL CONSTRAINT [merchants_total_reviews_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [merchants_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [merchants_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [merchants_status_check] CHECK ([status] IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    CONSTRAINT [merchants_delivery_type_check] CHECK ([delivery_type] IN ('MERCHANT_SELF', 'DINEGO_SHIPPER', 'BOTH'))
);

-- CreateTable: categories
CREATE TABLE [dbo].[categories] (
    [id] NVARCHAR(1000) NOT NULL,
    [merchant_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [display_order] INT NOT NULL CONSTRAINT [categories_display_order_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [categories_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [categories_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [categories_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: menu_items
CREATE TABLE [dbo].[menu_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [merchant_id] NVARCHAR(1000) NOT NULL,
    [category_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX),
    [image_url] NVARCHAR(1000),
    [base_price] DECIMAL(12,2) NOT NULL,
    [is_available] BIT NOT NULL CONSTRAINT [menu_items_is_available_df] DEFAULT 1,
    [is_active] BIT NOT NULL CONSTRAINT [menu_items_is_active_df] DEFAULT 1,
    [display_order] INT NOT NULL CONSTRAINT [menu_items_display_order_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [menu_items_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [menu_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: toppings
CREATE TABLE [dbo].[toppings] (
    [id] NVARCHAR(1000) NOT NULL,
    [merchant_id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [price] DECIMAL(12,2) NOT NULL,
    [is_available] BIT NOT NULL CONSTRAINT [toppings_is_available_df] DEFAULT 1,
    [is_active] BIT NOT NULL CONSTRAINT [toppings_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [toppings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [toppings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: menu_item_toppings
CREATE TABLE [dbo].[menu_item_toppings] (
    [id] NVARCHAR(1000) NOT NULL,
    [menu_item_id] NVARCHAR(1000) NOT NULL,
    [topping_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [menu_item_toppings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [menu_item_toppings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE UNIQUE INDEX [users_email_key] ON [dbo].[users]([email]);
CREATE UNIQUE INDEX [users_phone_number_key] ON [dbo].[users]([phone_number]);
CREATE INDEX [user_roles_user_id_idx] ON [dbo].[user_roles]([user_id]);
CREATE UNIQUE INDEX [user_roles_user_id_role_key] ON [dbo].[user_roles]([user_id], [role]);
CREATE INDEX [user_sessions_user_id_is_revoked_idx] ON [dbo].[user_sessions]([user_id], [is_revoked]);
CREATE UNIQUE INDEX [merchants_slug_key] ON [dbo].[merchants]([slug]);
CREATE INDEX [merchants_owner_id_idx] ON [dbo].[merchants]([owner_id]);
CREATE INDEX [merchants_status_is_active_idx] ON [dbo].[merchants]([status], [is_active]);
CREATE INDEX [merchants_slug_idx] ON [dbo].[merchants]([slug]);
CREATE INDEX [categories_merchant_id_display_order_idx] ON [dbo].[categories]([merchant_id], [display_order]);
CREATE INDEX [categories_merchant_id_is_active_idx] ON [dbo].[categories]([merchant_id], [is_active]);
CREATE INDEX [menu_items_merchant_id_is_active_is_available_idx] ON [dbo].[menu_items]([merchant_id], [is_active], [is_available]);
CREATE INDEX [menu_items_category_id_display_order_idx] ON [dbo].[menu_items]([category_id], [display_order]);
CREATE INDEX [toppings_merchant_id_is_active_idx] ON [dbo].[toppings]([merchant_id], [is_active]);
CREATE INDEX [menu_item_toppings_menu_item_id_idx] ON [dbo].[menu_item_toppings]([menu_item_id]);
CREATE INDEX [menu_item_toppings_topping_id_idx] ON [dbo].[menu_item_toppings]([topping_id]);
CREATE UNIQUE INDEX [menu_item_toppings_menu_item_id_topping_id_key] ON [dbo].[menu_item_toppings]([menu_item_id], [topping_id]);

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_user_id_fkey]
    FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[user_sessions] ADD CONSTRAINT [user_sessions_user_id_fkey]
    FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[merchants] ADD CONSTRAINT [merchants_owner_id_fkey]
    FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users]([id]);

ALTER TABLE [dbo].[categories] ADD CONSTRAINT [categories_merchant_id_fkey]
    FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[menu_items] ADD CONSTRAINT [menu_items_merchant_id_fkey]
    FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[menu_items] ADD CONSTRAINT [menu_items_category_id_fkey]
    FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([id]);

ALTER TABLE [dbo].[toppings] ADD CONSTRAINT [toppings_merchant_id_fkey]
    FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[menu_item_toppings] ADD CONSTRAINT [menu_item_toppings_menu_item_id_fkey]
    FOREIGN KEY ([menu_item_id]) REFERENCES [dbo].[menu_items]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[menu_item_toppings] ADD CONSTRAINT [menu_item_toppings_topping_id_fkey]
    FOREIGN KEY ([topping_id]) REFERENCES [dbo].[toppings]([id]);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
THROW;
END CATCH;

GO

-- ----------------------------------------------------------------------------
-- Migration: 20261028010000_add_cart_engine
-- ----------------------------------------------------------------------------
-- ==============================================================================
-- DineGo Backend — Migration: Cart Engine (Phase 5.1)
-- Provider: Microsoft SQL Server (SQLEXPRESS)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

-- CreateTable: carts
CREATE TABLE [dbo].[carts] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [merchant_id] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [carts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [carts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: cart_items
CREATE TABLE [dbo].[cart_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [cart_id] NVARCHAR(1000) NOT NULL,
    [menu_item_id] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [cart_items_quantity_df] DEFAULT 1,
    [note] NVARCHAR(500),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [cart_items_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [cart_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: cart_item_toppings
CREATE TABLE [dbo].[cart_item_toppings] (
    [id] NVARCHAR(1000) NOT NULL,
    [cart_item_id] NVARCHAR(1000) NOT NULL,
    [topping_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [cart_item_toppings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [cart_item_toppings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE UNIQUE INDEX [carts_user_id_key] ON [dbo].[carts]([user_id]);
CREATE INDEX [carts_user_id_idx] ON [dbo].[carts]([user_id]);
CREATE INDEX [carts_merchant_id_idx] ON [dbo].[carts]([merchant_id]);

CREATE INDEX [cart_items_cart_id_idx] ON [dbo].[cart_items]([cart_id]);
CREATE INDEX [cart_items_menu_item_id_idx] ON [dbo].[cart_items]([menu_item_id]);

CREATE UNIQUE INDEX [cart_item_toppings_cart_item_id_topping_id_key] ON [dbo].[cart_item_toppings]([cart_item_id], [topping_id]);
CREATE INDEX [cart_item_toppings_cart_item_id_idx] ON [dbo].[cart_item_toppings]([cart_item_id]);
CREATE INDEX [cart_item_toppings_topping_id_idx] ON [dbo].[cart_item_toppings]([topping_id]);

-- AddForeignKey
ALTER TABLE [dbo].[carts] ADD CONSTRAINT [carts_user_id_fkey]
    FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[carts] ADD CONSTRAINT [carts_merchant_id_fkey]
    FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants]([id]);

ALTER TABLE [dbo].[cart_items] ADD CONSTRAINT [cart_items_cart_id_fkey]
    FOREIGN KEY ([cart_id]) REFERENCES [dbo].[carts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[cart_items] ADD CONSTRAINT [cart_items_menu_item_id_fkey]
    FOREIGN KEY ([menu_item_id]) REFERENCES [dbo].[menu_items]([id]);

ALTER TABLE [dbo].[cart_item_toppings] ADD CONSTRAINT [cart_item_toppings_cart_item_id_fkey]
    FOREIGN KEY ([cart_item_id]) REFERENCES [dbo].[cart_items]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[cart_item_toppings] ADD CONSTRAINT [cart_item_toppings_topping_id_fkey]
    FOREIGN KEY ([topping_id]) REFERENCES [dbo].[toppings]([id]);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
THROW;
END CATCH;

GO

-- ----------------------------------------------------------------------------
-- Migration: 20261028020000_add_promotion_engine
-- ----------------------------------------------------------------------------
-- ==============================================================================
-- DineGo Backend — Migration: Promotion Engine (Phase 5.2)
-- Provider: Microsoft SQL Server (SQLEXPRESS)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

-- CreateTable: promotions
CREATE TABLE [dbo].[promotions] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [discount_type] NVARCHAR(50) NOT NULL,
    [discount_value] DECIMAL(12,2) NOT NULL,
    [min_order_value] DECIMAL(12,2) NOT NULL CONSTRAINT [promotions_min_order_value_df] DEFAULT 0.00,
    [max_discount_amount] DECIMAL(12,2),
    [start_date] DATETIME2 NOT NULL,
    [end_date] DATETIME2 NOT NULL,
    [max_usage] INT,
    [current_usage] INT NOT NULL CONSTRAINT [promotions_current_usage_df] DEFAULT 0,
    [max_usage_per_user] INT CONSTRAINT [promotions_max_usage_per_user_df] DEFAULT 1,
    [scope] NVARCHAR(50) NOT NULL CONSTRAINT [promotions_scope_df] DEFAULT 'GLOBAL',
    [merchant_id] NVARCHAR(1000),
    [is_active] BIT NOT NULL CONSTRAINT [promotions_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [promotions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [promotions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [promotions_discount_type_check] CHECK ([discount_type] IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    CONSTRAINT [promotions_scope_check] CHECK ([scope] IN ('GLOBAL', 'MERCHANT'))
);

-- CreateTable: promotion_usages
CREATE TABLE [dbo].[promotion_usages] (
    [id] NVARCHAR(1000) NOT NULL,
    [promotion_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [used_at] DATETIME2 NOT NULL CONSTRAINT [promotion_usages_used_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [promotion_usages_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE UNIQUE INDEX [promotions_code_key] ON [dbo].[promotions]([code]);
CREATE INDEX [promotions_code_idx] ON [dbo].[promotions]([code]);
CREATE INDEX [promotions_merchant_id_is_active_idx] ON [dbo].[promotions]([merchant_id], [is_active]);
CREATE INDEX [promotions_start_date_end_date_is_active_idx] ON [dbo].[promotions]([start_date], [end_date], [is_active]);

CREATE INDEX [promotion_usages_promotion_id_user_id_idx] ON [dbo].[promotion_usages]([promotion_id], [user_id]);
CREATE INDEX [promotion_usages_user_id_idx] ON [dbo].[promotion_usages]([user_id]);

-- AddForeignKey
ALTER TABLE [dbo].[promotions] ADD CONSTRAINT [promotions_merchant_id_fkey]
    FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants]([id]);

ALTER TABLE [dbo].[promotion_usages] ADD CONSTRAINT [promotion_usages_promotion_id_fkey]
    FOREIGN KEY ([promotion_id]) REFERENCES [dbo].[promotions]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[promotion_usages] ADD CONSTRAINT [promotion_usages_user_id_fkey]
    FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
THROW;
END CATCH;

GO

-- ----------------------------------------------------------------------------
-- Migration: 20261028030000_add_order_engine
-- ----------------------------------------------------------------------------
-- ==============================================================================
-- DineGo Backend — Migration: Order Engine (Phase 5.3)
-- Provider: Microsoft SQL Server (SQLEXPRESS)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

-- 1. AlterTable: promotion_usages to add order_id and discount_amount
ALTER TABLE [dbo].[promotion_usages] ADD [order_id] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[promotion_usages] ADD [discount_amount] DECIMAL(12,2) NULL;

-- 2. CreateTable: orders
CREATE TABLE [dbo].[orders] (
    [id] NVARCHAR(1000) NOT NULL,
    [order_number] NVARCHAR(50) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [merchant_id] NVARCHAR(1000) NOT NULL,
    [promotion_id] NVARCHAR(1000) NULL,
    [status] NVARCHAR(50) NOT NULL CONSTRAINT [orders_status_df] DEFAULT 'PENDING',
    [subtotal] DECIMAL(12,2) NOT NULL,
    [discount_amount] DECIMAL(12,2) NOT NULL CONSTRAINT [orders_discount_amount_df] DEFAULT 0.00,
    [delivery_fee] DECIMAL(12,2) NOT NULL CONSTRAINT [orders_delivery_fee_df] DEFAULT 0.00,
    [final_total] DECIMAL(12,2) NOT NULL,
    [delivery_address] NVARCHAR(500) NOT NULL,
    [recipient_name] NVARCHAR(200) NOT NULL,
    [recipient_phone] NVARCHAR(20) NOT NULL,
    [customer_note] NVARCHAR(500),
    [cancel_reason] NVARCHAR(500),
    [cancelled_by] NVARCHAR(50),
    [cancelled_at] DATETIME2,
    [idempotency_key] NVARCHAR(100),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [orders_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [orders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [orders_status_check] CHECK ([status] IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT [orders_cancelled_by_check] CHECK ([cancelled_by] IS NULL OR [cancelled_by] IN ('USER', 'MERCHANT', 'ADMIN', 'SYSTEM'))
);

-- 3. CreateTable: order_items (Menu item snapshot)
CREATE TABLE [dbo].[order_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [order_id] NVARCHAR(1000) NOT NULL,
    [menu_item_id] NVARCHAR(1000) NULL,
    [item_name] NVARCHAR(200) NOT NULL,
    [item_image] NVARCHAR(1000),
    [base_price] DECIMAL(12,2) NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [order_items_quantity_df] DEFAULT 1,
    [subtotal] DECIMAL(12,2) NOT NULL,
    [note] NVARCHAR(500),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [order_items_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [order_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- 4. CreateTable: order_item_toppings (Topping snapshot)
CREATE TABLE [dbo].[order_item_toppings] (
    [id] NVARCHAR(1000) NOT NULL,
    [order_item_id] NVARCHAR(1000) NOT NULL,
    [topping_id] NVARCHAR(1000) NULL,
    [topping_name] NVARCHAR(200) NOT NULL,
    [topping_price] DECIMAL(12,2) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [order_item_toppings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [order_item_toppings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- 5. Create Indexes
CREATE UNIQUE INDEX [orders_order_number_key] ON [dbo].[orders]([order_number]);
CREATE UNIQUE INDEX [orders_idempotency_key_key] ON [dbo].[orders]([idempotency_key]) WHERE [idempotency_key] IS NOT NULL;
CREATE INDEX [orders_user_id_created_at_idx] ON [dbo].[orders]([user_id], [created_at]);
CREATE INDEX [orders_merchant_id_status_idx] ON [dbo].[orders]([merchant_id], [status]);
CREATE INDEX [orders_order_number_idx] ON [dbo].[orders]([order_number]);
CREATE INDEX [orders_status_created_at_idx] ON [dbo].[orders]([status], [created_at]);

CREATE INDEX [order_items_order_id_idx] ON [dbo].[order_items]([order_id]);
CREATE INDEX [order_items_menu_item_id_idx] ON [dbo].[order_items]([menu_item_id]);

CREATE INDEX [order_item_toppings_order_item_id_idx] ON [dbo].[order_item_toppings]([order_item_id]);
CREATE INDEX [order_item_toppings_topping_id_idx] ON [dbo].[order_item_toppings]([topping_id]);

CREATE INDEX [promotion_usages_order_id_idx] ON [dbo].[promotion_usages]([order_id]);

-- 6. Add Foreign Keys (with NoAction to prevent multiple cascade paths in SQL Server)
ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_user_id_fkey]
    FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]);

ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_merchant_id_fkey]
    FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants]([id]);

ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_promotion_id_fkey]
    FOREIGN KEY ([promotion_id]) REFERENCES [dbo].[promotions]([id]);

ALTER TABLE [dbo].[order_items] ADD CONSTRAINT [order_items_order_id_fkey]
    FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[order_items] ADD CONSTRAINT [order_items_menu_item_id_fkey]
    FOREIGN KEY ([menu_item_id]) REFERENCES [dbo].[menu_items]([id]);

ALTER TABLE [dbo].[order_item_toppings] ADD CONSTRAINT [order_item_toppings_order_item_id_fkey]
    FOREIGN KEY ([order_item_id]) REFERENCES [dbo].[order_items]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE [dbo].[order_item_toppings] ADD CONSTRAINT [order_item_toppings_topping_id_fkey]
    FOREIGN KEY ([topping_id]) REFERENCES [dbo].[toppings]([id]);

ALTER TABLE [dbo].[promotion_usages] ADD CONSTRAINT [promotion_usages_order_id_fkey]
    FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

GO

-- ----------------------------------------------------------------------------
-- Migration: 20261028040000_add_payment_engine
-- ----------------------------------------------------------------------------
-- ==============================================================================
-- DineGo Backend — Migration: Payment Engine with MoMo (Phase 6)
-- Provider: Microsoft SQL Server (SQLEXPRESS)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

-- CreateTable: payments
CREATE TABLE [dbo].[payments] (
    [id] NVARCHAR(1000) NOT NULL,
    [order_id] NVARCHAR(1000) NOT NULL,
    [payment_method] NVARCHAR(50) NOT NULL CONSTRAINT [payments_payment_method_df] DEFAULT 'MOMO_QR',
    [payment_status] NVARCHAR(50) NOT NULL CONSTRAINT [payments_payment_status_df] DEFAULT 'PENDING',
    [amount] DECIMAL(12,2) NOT NULL,
    [currency] NVARCHAR(10) NOT NULL CONSTRAINT [payments_currency_df] DEFAULT 'VND',
    [transaction_ref] NVARCHAR(100),
    [request_id] NVARCHAR(100) NOT NULL,
    [idempotency_key] NVARCHAR(100),
    [paid_at] DATETIME2,
    [gateway_payload] NVARCHAR(MAX),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [payments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [payments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [payments_payment_method_check] CHECK ([payment_method] IN ('MOMO', 'MOMO_QR', 'MOMO_ATM', 'COD')),
    CONSTRAINT [payments_payment_status_check] CHECK ([payment_status] IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'))
);

-- Create Indexes
CREATE UNIQUE INDEX [payments_order_id_key] ON [dbo].[payments]([order_id]);
CREATE UNIQUE INDEX [payments_request_id_key] ON [dbo].[payments]([request_id]);
CREATE UNIQUE INDEX [payments_transaction_ref_key] ON [dbo].[payments]([transaction_ref]) WHERE [transaction_ref] IS NOT NULL;
CREATE UNIQUE INDEX [payments_idempotency_key_key] ON [dbo].[payments]([idempotency_key]) WHERE [idempotency_key] IS NOT NULL;

CREATE INDEX [payments_order_id_idx] ON [dbo].[payments]([order_id]);
CREATE INDEX [payments_transaction_ref_idx] ON [dbo].[payments]([transaction_ref]);
CREATE INDEX [payments_payment_status_idx] ON [dbo].[payments]([payment_status]);

-- Add Foreign Key (with NoAction to prevent cascade path errors in SQL Server)
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_order_id_fkey]
    FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

GO

-- ==============================================================================
-- 3. SEED DATA FOR DINEGO BASELINE (Sprint 1 - 4 Roles & Sample Restaurant)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

-- Seed Users (Password: DineGo@2026_SecurePass -> bcrypt hash)
IF NOT EXISTS (SELECT 1 FROM [dbo].[users] WHERE [email] = 'admin@dinego.vn')
BEGIN
    INSERT INTO [dbo].[users] ([id], [email], [password_hash], [full_name], [phone_number], [is_email_verified], [is_active], [created_at], [updated_at])
    VALUES ('u-admin-001', 'admin@dinego.vn', '$2b$10$VsvoXJYm4f6K.2ljOzsq.OklXe5yUqH/clPIplGXihFwi.a7RQaLG', N'Quản Trị Viên DineGo', '0901000001', 1, 1, SYSDATETIME(), SYSDATETIME());

    INSERT INTO [dbo].[user_roles] ([id], [user_id], [role], [created_at])
    VALUES ('ur-admin-001', 'u-admin-001', 'ADMIN', SYSDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[users] WHERE [email] = 'merchant@dinego.vn')
BEGIN
    INSERT INTO [dbo].[users] ([id], [email], [password_hash], [full_name], [phone_number], [is_email_verified], [is_active], [created_at], [updated_at])
    VALUES ('u-merchant-001', 'merchant@dinego.vn', '$2b$10$VsvoXJYm4f6K.2ljOzsq.OklXe5yUqH/clPIplGXihFwi.a7RQaLG', N'Chủ Quán Cơm Tấm Sài Gòn', '0901000002', 1, 1, SYSDATETIME(), SYSDATETIME());

    INSERT INTO [dbo].[user_roles] ([id], [user_id], [role], [created_at])
    VALUES ('ur-merchant-001', 'u-merchant-001', 'MERCHANT', SYSDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[users] WHERE [email] = 'driver@dinego.vn')
BEGIN
    INSERT INTO [dbo].[users] ([id], [email], [password_hash], [full_name], [phone_number], [is_email_verified], [is_active], [created_at], [updated_at])
    VALUES ('u-driver-001', 'driver@dinego.vn', '$2b$10$VsvoXJYm4f6K.2ljOzsq.OklXe5yUqH/clPIplGXihFwi.a7RQaLG', N'Tài Xế Giao Hàng DineGo', '0901000003', 1, 1, SYSDATETIME(), SYSDATETIME());

    INSERT INTO [dbo].[user_roles] ([id], [user_id], [role], [created_at])
    VALUES ('ur-driver-001', 'u-driver-001', 'DRIVER', SYSDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[users] WHERE [email] = 'customer@dinego.vn')
BEGIN
    INSERT INTO [dbo].[users] ([id], [email], [password_hash], [full_name], [phone_number], [is_email_verified], [is_active], [created_at], [updated_at])
    VALUES ('u-customer-001', 'customer@dinego.vn', '$2b$10$VsvoXJYm4f6K.2ljOzsq.OklXe5yUqH/clPIplGXihFwi.a7RQaLG', N'Khách Hàng Thân Thiết', '0901000004', 1, 1, SYSDATETIME(), SYSDATETIME());

    INSERT INTO [dbo].[user_roles] ([id], [user_id], [role], [created_at])
    VALUES ('ur-customer-001', 'u-customer-001', 'CUSTOMER', SYSDATETIME());
END

-- Seed Sample Restaurant: Cơm Tấm 1985
IF NOT EXISTS (SELECT 1 FROM [dbo].[merchants] WHERE [slug] = 'com-tam-1985')
BEGIN
    INSERT INTO [dbo].[merchants] ([id], [owner_id], [name], [slug], [description], [address], [latitude], [longitude], [phone_number], [status], [delivery_type], [is_open], [is_active], [rating], [total_reviews], [created_at], [updated_at])
    VALUES ('m-com-tam-001', 'u-merchant-001', N'Cơm Tấm Sài Gòn 1985', 'com-tam-1985', N'Cơm tấm sườn bì chả đặc biệt, hương vị truyền thống chuẩn Sài Gòn.', N'123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 10.776889, 106.700806, '0901000002', 'APPROVED', 'BOTH', 1, 1, 4.80, 128, SYSDATETIME(), SYSDATETIME());
END

-- Seed Categories
IF NOT EXISTS (SELECT 1 FROM [dbo].[categories] WHERE [id] = 'cat-main-dishes-001')
BEGIN
    INSERT INTO [dbo].[categories] ([id], [merchant_id], [name], [description], [display_order], [is_active], [created_at], [updated_at])
    VALUES ('cat-main-dishes-001', 'm-com-tam-001', N'Món Chính Đặc Biệt', N'Các món cơm tấm sườn nướng than hoa', 1, 1, SYSDATETIME(), SYSDATETIME());
END

-- Seed Menu Items
IF NOT EXISTS (SELECT 1 FROM [dbo].[menu_items] WHERE [id] = 'dish-com-tam-suon-001')
BEGIN
    INSERT INTO [dbo].[menu_items] ([id], [merchant_id], [category_id], [name], [slug], [description], [base_price], [is_available], [is_active], [display_order], [created_at], [updated_at])
    VALUES ('dish-com-tam-suon-001', 'm-com-tam-001', 'cat-main-dishes-001', N'Cơm Tấm Sườn Cọng Nướng Than', 'com-tam-suon-cong-nuong-than', N'Sườn cọng ướp mật ong đậm đà nướng than hoa thơm lừng.', 65000.00, 1, 1, 1, SYSDATETIME(), SYSDATETIME());
END

-- Seed Toppings
IF NOT EXISTS (SELECT 1 FROM [dbo].[toppings] WHERE [id] = 'top-trung-op-la-001')
BEGIN
    INSERT INTO [dbo].[toppings] ([id], [merchant_id], [name], [price], [is_available], [is_active], [created_at], [updated_at])
    VALUES ('top-trung-op-la-001', 'm-com-tam-001', N'Thêm Trứng Ốp La Lòng Đào', 10000.00, 1, 1, SYSDATETIME(), SYSDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[menu_item_toppings] WHERE [menu_item_id] = 'dish-com-tam-suon-001' AND [topping_id] = 'top-trung-op-la-001')
BEGIN
    INSERT INTO [dbo].[menu_item_toppings] ([id], [menu_item_id], [topping_id], [created_at])
    VALUES ('mit-001', 'dish-com-tam-suon-001', 'top-trung-op-la-001', SYSDATETIME());
END

-- Seed Sample Promotion
IF NOT EXISTS (SELECT 1 FROM [dbo].[promotions] WHERE [code] = 'DINEGO50')
BEGIN
    INSERT INTO [dbo].[promotions] ([id], [code], [name], [description], [discount_type], [discount_value], [min_order_value], [max_discount_amount], [start_date], [end_date], [max_usage], [current_usage], [max_usage_per_user], [scope], [merchant_id], [is_active], [created_at], [updated_at])
    VALUES ('promo-dinego-50', 'DINEGO50', N'Giảm 50% cho người dùng mới', N'Khuyến mãi chào mừng tân thủ trải nghiệm DineGo', 'PERCENTAGE', 50.00, 100000.00, 50000.00, '2026-01-01', '2026-12-31', 1000, 0, 1, 'GLOBAL', NULL, 1, SYSDATETIME(), SYSDATETIME());
END

COMMIT TRANSACTION;
PRINT N'🎉 Seed data inserted successfully!';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
