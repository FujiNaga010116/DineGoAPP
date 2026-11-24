-- ==============================================================================
-- DineGo Migration: Add Catering & Feast Capacity Engine (Module 8)
-- Provider: Microsoft SQL Server 2022
-- ==============================================================================

BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. Create catering_packages
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'catering_packages')
    BEGIN
        CREATE TABLE [dbo].[catering_packages] (
            [id] NVARCHAR(36) NOT NULL,
            [merchant_id] NVARCHAR(36) NOT NULL,
            [name] NVARCHAR(200) NOT NULL,
            [slug] NVARCHAR(250) NOT NULL,
            [event_type] NVARCHAR(50) NOT NULL,
            [description] NVARCHAR(MAX) NULL,
            [servings_per_table] INT NOT NULL DEFAULT 10,
            [price_per_table] DECIMAL(12,2) NOT NULL,
            [min_tables] INT NOT NULL DEFAULT 3,
            [max_tables] INT NOT NULL DEFAULT 50,
            [image_url] NVARCHAR(1000) NULL,
            [is_available] BIT NOT NULL DEFAULT 1,
            [is_active] BIT NOT NULL DEFAULT 1,
            [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [PK_catering_packages] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [FK_catering_packages_merchants] FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants] ([id]) ON DELETE CASCADE
        );
        CREATE NONCLUSTERED INDEX [IX_catering_packages_lookup] ON [dbo].[catering_packages] ([merchant_id], [event_type], [is_active]);
    END;

    -- 2. Create catering_package_dishes
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'catering_package_dishes')
    BEGIN
        CREATE TABLE [dbo].[catering_package_dishes] (
            [id] NVARCHAR(36) NOT NULL,
            [package_id] NVARCHAR(36) NOT NULL,
            [name] NVARCHAR(200) NOT NULL,
            [course] NVARCHAR(50) NOT NULL,
            [description] NVARCHAR(500) NULL,
            [is_optional] BIT NOT NULL DEFAULT 0,
            [extra_price] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            [is_sold_out] BIT NOT NULL DEFAULT 0,
            [allergens] NVARCHAR(200) NULL,
            CONSTRAINT [PK_catering_package_dishes] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [FK_catering_package_dishes_package] FOREIGN KEY ([package_id]) REFERENCES [dbo].[catering_packages] ([id]) ON DELETE CASCADE
        );
        CREATE NONCLUSTERED INDEX [IX_catering_package_dishes_pkg] ON [dbo].[catering_package_dishes] ([package_id]);
    END;

    -- 3. Create catering_capacity_configs
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'catering_capacity_configs')
    BEGIN
        CREATE TABLE [dbo].[catering_capacity_configs] (
            [id] NVARCHAR(36) NOT NULL,
            [merchant_id] NVARCHAR(36) NOT NULL,
            [max_orders_per_day] INT NOT NULL DEFAULT 5,
            [max_tables_per_day] INT NOT NULL DEFAULT 50,
            [max_tables_per_slot] INT NOT NULL DEFAULT 25,
            [min_notice_hours] INT NOT NULL DEFAULT 72,
            [prep_buffer_hours] DECIMAL(4,1) NOT NULL DEFAULT 3.0,
            [transit_buffer_hours] DECIMAL(4,1) NOT NULL DEFAULT 1.0,
            [service_buffer_hours] DECIMAL(4,1) NOT NULL DEFAULT 3.0,
            [cleanup_buffer_hours] DECIMAL(4,1) NOT NULL DEFAULT 1.5,
            [is_active] BIT NOT NULL DEFAULT 1,
            CONSTRAINT [PK_catering_capacity_configs] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [UQ_catering_capacity_configs_merchant] UNIQUE ([merchant_id]),
            CONSTRAINT [FK_catering_capacity_configs_merchant] FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants] ([id]) ON DELETE CASCADE
        );
    END;

    -- 4. Create catering_blocked_slots
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'catering_blocked_slots')
    BEGIN
        CREATE TABLE [dbo].[catering_blocked_slots] (
            [id] NVARCHAR(36) NOT NULL,
            [merchant_id] NVARCHAR(36) NOT NULL,
            [block_date] NVARCHAR(10) NOT NULL,
            [time_slot] NVARCHAR(20) NULL,
            [reason] NVARCHAR(500) NULL,
            [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [PK_catering_blocked_slots] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [UQ_catering_blocked_slots] UNIQUE ([merchant_id], [block_date], [time_slot]),
            CONSTRAINT [FK_catering_blocked_slots_merchant] FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants] ([id]) ON DELETE CASCADE
        );
        CREATE NONCLUSTERED INDEX [IX_catering_blocked_slots_date] ON [dbo].[catering_blocked_slots] ([merchant_id], [block_date]);
    END;

    -- 5. Create catering_bookings
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'catering_bookings')
    BEGIN
        CREATE TABLE [dbo].[catering_bookings] (
            [id] NVARCHAR(36) NOT NULL,
            [booking_code] NVARCHAR(50) NOT NULL,
            [user_id] NVARCHAR(36) NOT NULL,
            [merchant_id] NVARCHAR(36) NOT NULL,
            [package_id] NVARCHAR(36) NOT NULL,
            [package_name] NVARCHAR(200) NOT NULL,
            [event_type] NVARCHAR(50) NOT NULL,
            [event_date] NVARCHAR(10) NOT NULL,
            [event_time] NVARCHAR(10) NOT NULL,
            [event_address] NVARCHAR(500) NOT NULL,
            [event_latitude] FLOAT NULL,
            [event_longitude] FLOAT NULL,
            [table_count] INT NOT NULL,
            [guest_count_per_table] INT NOT NULL DEFAULT 10,
            [price_per_table] DECIMAL(12,2) NOT NULL,
            [tables_subtotal] DECIMAL(12,2) NOT NULL,
            [delivery_fee] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            [service_fee] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            [equipment_fee] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            [discount_amount] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            [total_amount] DECIMAL(12,2) NOT NULL,
            [deposit_percent] INT NOT NULL DEFAULT 30,
            [deposit_amount] DECIMAL(12,2) NOT NULL,
            [remaining_amount] DECIMAL(12,2) NOT NULL,
            [is_deposit_paid] BIT NOT NULL DEFAULT 0,
            [deposit_paid_at] DATETIME2 NULL,
            [deposit_transaction_ref] NVARCHAR(100) NULL,
            [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING_RESTAURANT_CONFIRMATION',
            [is_holding_capacity] BIT NOT NULL DEFAULT 1,
            [hold_expires_at] DATETIME2 NULL,
            [restaurant_deadline] DATETIME2 NULL,
            [customer_deadline] DATETIME2 NULL,
            [deposit_deadline] DATETIME2 NULL,
            [contact_name] NVARCHAR(150) NOT NULL,
            [contact_phone] NVARCHAR(20) NOT NULL,
            [dietary_notes] NVARCHAR(1000) NULL,
            [equipment_notes] NVARCHAR(1000) NULL,
            [merchant_notes] NVARCHAR(1000) NULL,
            [cancel_reason] NVARCHAR(500) NULL,
            [cancelled_by] NVARCHAR(50) NULL,
            [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [PK_catering_bookings] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [UQ_catering_bookings_code] UNIQUE ([booking_code]),
            CONSTRAINT [FK_catering_bookings_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
            CONSTRAINT [FK_catering_bookings_merchant] FOREIGN KEY ([merchant_id]) REFERENCES [dbo].[merchants] ([id]) ON DELETE NO ACTION,
            CONSTRAINT [FK_catering_bookings_package] FOREIGN KEY ([package_id]) REFERENCES [dbo].[catering_packages] ([id]) ON DELETE NO ACTION
        );
        CREATE NONCLUSTERED INDEX [IX_catering_bookings_merchant_date] ON [dbo].[catering_bookings] ([merchant_id], [event_date], [status]);
        CREATE NONCLUSTERED INDEX [IX_catering_bookings_user] ON [dbo].[catering_bookings] ([user_id], [status]);
        CREATE NONCLUSTERED INDEX [IX_catering_bookings_hold] ON [dbo].[catering_bookings] ([is_holding_capacity], [hold_expires_at]);
    END;

    -- 6. Create catering_menu_proposals
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'catering_menu_proposals')
    BEGIN
        CREATE TABLE [dbo].[catering_menu_proposals] (
            [id] NVARCHAR(36) NOT NULL,
            [booking_id] NVARCHAR(36) NOT NULL,
            [version_number] INT NOT NULL DEFAULT 1,
            [status] NVARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
            [reason] NVARCHAR(1000) NOT NULL,
            [dishes_json] NVARCHAR(MAX) NOT NULL,
            [diff_summary_json] NVARCHAR(MAX) NULL,
            [price_delta_per_table] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            [new_total_amount] DECIMAL(12,2) NOT NULL,
            [expires_at] DATETIME2 NOT NULL,
            [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [PK_catering_menu_proposals] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [FK_catering_menu_proposals_booking] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[catering_bookings] ([id]) ON DELETE CASCADE
        );
        CREATE NONCLUSTERED INDEX [IX_catering_menu_proposals_booking] ON [dbo].[catering_menu_proposals] ([booking_id], [status]);
    END;

    -- 7. Create catering_audit_logs
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'catering_audit_logs')
    BEGIN
        CREATE TABLE [dbo].[catering_audit_logs] (
            [id] NVARCHAR(36) NOT NULL,
            [booking_id] NVARCHAR(36) NOT NULL,
            [actor_id] NVARCHAR(36) NOT NULL,
            [actor_role] NVARCHAR(50) NOT NULL,
            [action] NVARCHAR(100) NOT NULL,
            [previous_state] NVARCHAR(MAX) NULL,
            [new_state] NVARCHAR(MAX) NULL,
            [note] NVARCHAR(1000) NULL,
            [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [PK_catering_audit_logs] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [FK_catering_audit_logs_booking] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[catering_bookings] ([id]) ON DELETE CASCADE
        );
        CREATE NONCLUSTERED INDEX [IX_catering_audit_logs_booking] ON [dbo].[catering_audit_logs] ([booking_id], [created_at]);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
