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
