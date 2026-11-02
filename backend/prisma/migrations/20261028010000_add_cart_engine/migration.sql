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
