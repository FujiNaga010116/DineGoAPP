-- ==============================================================================
-- DineGo Backend — Migration: Live Delivery Tracking & Order Coordinates
-- Provider: Microsoft SQL Server (SQLEXPRESS)
-- ==============================================================================

BEGIN TRY
BEGIN TRANSACTION;

-- 1. Add optional customer delivery coordinates onto [dbo].[orders]
IF COL_LENGTH('dbo.orders', 'delivery_latitude') IS NULL
BEGIN
    ALTER TABLE [dbo].[orders] ADD [delivery_latitude] FLOAT(53) NULL;
END;

IF COL_LENGTH('dbo.orders', 'delivery_longitude') IS NULL
BEGIN
    ALTER TABLE [dbo].[orders] ADD [delivery_longitude] FLOAT(53) NULL;
END;

-- 2. Create [dbo].[order_trackings] if missing
IF OBJECT_ID('dbo.order_trackings', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[order_trackings] (
        [id] NVARCHAR(1000) NOT NULL,
        [order_id] NVARCHAR(1000) NOT NULL,
        [driver_id] NVARCHAR(1000),
        [driver_name] NVARCHAR(200),
        [driver_phone] NVARCHAR(20),
        [vehicle_plate] NVARCHAR(50),
        [driver_rating] FLOAT(53) CONSTRAINT [order_trackings_driver_rating_df] DEFAULT 4.9,
        [delivery_status] NVARCHAR(50) NOT NULL CONSTRAINT [order_trackings_delivery_status_df] DEFAULT 'WAITING_DRIVER',
        [store_latitude] FLOAT(53) NOT NULL,
        [store_longitude] FLOAT(53) NOT NULL,
        [customer_latitude] FLOAT(53) NOT NULL,
        [customer_longitude] FLOAT(53) NOT NULL,
        [shipper_latitude] FLOAT(53),
        [shipper_longitude] FLOAT(53),
        [heading] FLOAT(53),
        [distance_km] FLOAT(53) NOT NULL CONSTRAINT [order_trackings_distance_km_df] DEFAULT 0,
        [eta_minutes] INT NOT NULL CONSTRAINT [order_trackings_eta_minutes_df] DEFAULT 0,
        [last_location_at] DATETIME2,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [order_trackings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
        [updated_at] DATETIME2 NOT NULL,
        CONSTRAINT [order_trackings_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [order_trackings_delivery_status_check] CHECK ([delivery_status] IN ('WAITING_DRIVER', 'ASSIGNED', 'ARRIVED_AT_STORE', 'PICKED_UP', 'DELIVERING', 'ARRIVED_AT_DESTINATION', 'DELIVERED'))
    );

    CREATE UNIQUE INDEX [order_trackings_order_id_key] ON [dbo].[order_trackings]([order_id]);
    CREATE INDEX [order_trackings_driver_id_idx] ON [dbo].[order_trackings]([driver_id]);
    CREATE INDEX [order_trackings_delivery_status_idx] ON [dbo].[order_trackings]([delivery_status]);

    ALTER TABLE [dbo].[order_trackings] ADD CONSTRAINT [order_trackings_order_id_fkey]
        FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

