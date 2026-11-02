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
