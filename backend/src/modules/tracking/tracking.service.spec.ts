import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { TrackingService } from './tracking.service.js';

describe('TrackingService (Sprint 4 — U039 đến U042)', () => {
  let service: TrackingService;

  const mockShipperUser: AuthenticatedUser = {
    id: 'user-shipper-1',
    email: 'shipper@dinego.vn',
    roles: [Role.DRIVER],
  };

  const mockOtherShipper: AuthenticatedUser = {
    id: 'user-other-shipper',
    email: 'other@dinego.vn',
    roles: [Role.DRIVER],
  };

  const mockOrder = {
    id: 'ord-track-1',
    orderNumber: 'DG20261103-TRK001',
    deliveryAddress: '456 Hai Bà Trưng, Quận 1, TP.HCM',
    merchant: {
      id: 'merch-1',
      name: 'Cơm Tấm Ba Ghiền',
      address: '84 Đặng Văn Ngữ, Phú Nhuận',
      latitude: 10.793333,
      longitude: 106.678889,
    },
  };

  const mockPrisma = {
    order: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TrackingService(mockPrisma as unknown as PrismaService);
  });

  describe('assignShipper (U039)', () => {
    it('should assign shipper to order and set status to ASSIGNED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const live = await service.assignShipper('ord-track-1', mockShipperUser);

      expect(live.status).toBe('ASSIGNED');
      expect(live.shipper?.id).toBe(mockShipperUser.id);
      expect(live.timeline.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.assignShipper('non-existent', mockShipperUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateShipperGps & Geofencing 100m (U040 & U041)', () => {
    it('should update shipper position and calculate ETA and remaining distance', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      await service.assignShipper('ord-track-1', mockShipperUser);

      // Shipper sends GPS 500m away from store
      const live = await service.updateShipperGps('ord-track-1', mockShipperUser, {
        latitude: 10.798000,
        longitude: 106.680000,
      });

      expect(live.shipperLocation?.latitude).toBe(10.798000);
      expect(live.distanceRemainingKm).toBeGreaterThan(0);
      expect(live.etaMinutes).toBeGreaterThan(0);
    });

    it('U041: should automatically trigger ARRIVED_AT_STORE when shipper enters 100m radius of store', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      await service.assignShipper('ord-track-1', mockShipperUser);

      // Store location: 10.793333, 106.678889. Send GPS 30 meters away!
      const live = await service.updateShipperGps('ord-track-1', mockShipperUser, {
        latitude: 10.793350,
        longitude: 106.678900,
      });

      expect(live.isGeofenceStoreTriggered).toBe(true);
      expect(live.status).toBe('ARRIVED_AT_STORE');
      expect(live.timeline.some((t) => t.status === 'ARRIVED_AT_STORE')).toBe(true);
    });

    it('U041: should automatically trigger ARRIVED_AT_DESTINATION when shipper enters 100m radius of customer during delivery', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      const initial = await service.assignShipper('ord-track-1', mockShipperUser);

      // Transition to DELIVERING
      await service.updateDeliveryStatus('ord-track-1', mockShipperUser, {
        status: 'DELIVERING',
      });

      // Send GPS within 20 meters of customer coordinates
      const custCoords = initial.customerLocation;
      const live = await service.updateShipperGps('ord-track-1', mockShipperUser, {
        latitude: custCoords.latitude + 0.0001,
        longitude: custCoords.longitude + 0.0001,
      });

      expect(live.isGeofenceCustomerTriggered).toBe(true);
      expect(live.status).toBe('ARRIVED_AT_DESTINATION');
    });

    it('should reject GPS update from another shipper', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      await service.assignShipper('ord-track-1', mockShipperUser);

      await expect(
        service.updateShipperGps('ord-track-1', mockOtherShipper, {
          latitude: 10.790000,
          longitude: 106.670000,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateDeliveryStatus & getLiveTracking (U039, U042)', () => {
    it('should update status to DELIVERED and clear remaining distance', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      await service.assignShipper('ord-track-1', mockShipperUser);

      const live = await service.updateDeliveryStatus('ord-track-1', mockShipperUser, {
        status: 'DELIVERED',
      });

      expect(live.status).toBe('DELIVERED');
      expect(live.distanceRemainingKm).toBe(0);
      expect(live.etaMinutes).toBe(0);
    });

    it('U042: should provide complete live map tracking data', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      const tracking = await service.getLiveTracking('ord-track-1');

      expect(tracking.orderNumber).toBe(mockOrder.orderNumber);
      expect(tracking.storeLocation.name).toBe(mockOrder.merchant.name);
      expect(tracking.customerLocation.address).toBe(mockOrder.deliveryAddress);
    });
  });
});

