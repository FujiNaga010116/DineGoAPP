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
