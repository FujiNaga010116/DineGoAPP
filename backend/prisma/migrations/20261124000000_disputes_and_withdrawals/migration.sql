-- ==============================================================================
-- DineGo Backend — Migration: Delivery Disputes & Withdrawal Requests
-- Provider: Microsoft SQL Server (SQLEXPRESS)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.delivery_disputes', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[delivery_disputes] (
        [id] NVARCHAR(100) NOT NULL,
        [order_id] NVARCHAR(100) NOT NULL,
        [order_number] NVARCHAR(100) NOT NULL,
        [driver_id] NVARCHAR(100) NOT NULL,
        [driver_name] NVARCHAR(200) NOT NULL,
        [customer_id] NVARCHAR(100) NULL,
        [customer_name] NVARCHAR(200) NOT NULL,
        [customer_phone] NVARCHAR(50) NULL,
        [merchant_name] NVARCHAR(200) NULL,
        [reason] NVARCHAR(100) NOT NULL,
        [reason_label] NVARCHAR(300) NOT NULL,
        [note] NVARCHAR(1000) NULL,
        [evidence_image] NVARCHAR(MAX) NULL,
        [compensation_amount] DECIMAL(12,2) NOT NULL DEFAULT 15000,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
        [admin_note] NVARCHAR(1000) NULL,
        [created_at] NVARCHAR(100) NULL,
        [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [delivery_disputes_pkey] PRIMARY KEY CLUSTERED ([id])
    );
    CREATE INDEX [delivery_disputes_status_idx] ON [dbo].[delivery_disputes]([status]);
END;

IF OBJECT_ID('dbo.withdrawal_requests', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[withdrawal_requests] (
        [id] NVARCHAR(100) NOT NULL,
        [actor_type] NVARCHAR(20) NOT NULL,
        [actor_id] NVARCHAR(100) NOT NULL,
        [actor_name] NVARCHAR(200) NOT NULL,
        [actor_phone] NVARCHAR(50) NULL,
        [license_plate] NVARCHAR(50) NULL,
        [bank_name] NVARCHAR(150) NOT NULL,
        [bank_account_number] NVARCHAR(100) NOT NULL,
        [bank_account_holder] NVARCHAR(200) NOT NULL,
        [amount] DECIMAL(12,2) NOT NULL,
        [status] NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
        [note] NVARCHAR(500) NULL,
        [created_at] NVARCHAR(100) NULL,
        [processed_at] NVARCHAR(100) NULL,
        [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [withdrawal_requests_pkey] PRIMARY KEY CLUSTERED ([id])
    );
    CREATE INDEX [withdrawal_requests_actor_idx] ON [dbo].[withdrawal_requests]([actor_type], [actor_id]);
    CREATE INDEX [withdrawal_requests_status_idx] ON [dbo].[withdrawal_requests]([status]);
END;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
