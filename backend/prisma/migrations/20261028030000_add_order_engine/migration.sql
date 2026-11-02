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
