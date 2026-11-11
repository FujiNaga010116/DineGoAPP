// ==============================================================================
// DineGo Backend — Real-Time GPS Tracking & Geofencing Engine (Sprint 4 — U039 đến U042)
// Architecture: Clean Architecture / Modular Monolith
// ==============================================================================

import {
  ForbiddenException,
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { concat, filter, from, map, Observable, Subject } from 'rxjs';
import { Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import {
  AssignShipperDto,
  UpdateDeliveryStatusDto,
  UpdateGpsLocationDto,
} from './dto/update-gps.dto.js';
import type {
  Coordinates,
  DeliveryStatus,
  LiveTrackingData,
  ShipperInfo,
} from './interfaces/tracking.interface.js';
import {
  VietnamGeocodeHelper,
  type VietnamGeocodeResult,
} from './vietnam-geocode.helper.js';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly geocodeHelper = new VietnamGeocodeHelper();

  // In-memory Cache for Live Tracking States (OrderId -> LiveTrackingData)
  private readonly trackingStore = new Map<string, LiveTrackingData>();
  private readonly orderOwnersStore = new Map<
    string,
    { customerId?: string; merchantOwnerId?: string }
  >();
  private readonly trackingEvents$ = new Subject<{
    orderId: string;
    data: LiveTrackingData;
  }>();

  constructor(private readonly prisma: PrismaService) {}

  private async persistTrackingSnapshot(
    data: LiveTrackingData,
    broadcast = true,
  ): Promise<void> {
    if (broadcast) {
      this.trackingEvents$.next({ orderId: data.orderId, data: { ...data } });
    }

    const repo = (
      this.prisma as unknown as {
        orderTracking?: {
          upsert?: (args: Record<string, unknown>) => Promise<unknown>;
        };
      }
    ).orderTracking;

    if (!repo?.upsert) return;

    try {
      await repo.upsert({
        where: { orderId: data.orderId },
        update: {
          driverId: data.shipper?.id ?? null,
          driverName: data.shipper?.fullName ?? null,
          driverPhone: data.shipper?.phoneNumber ?? null,
          vehiclePlate: data.shipper?.vehiclePlate ?? null,
          driverRating: data.shipper?.rating ?? 4.9,
          deliveryStatus: data.status,
          storeLatitude: data.storeLocation.latitude,
          storeLongitude: data.storeLocation.longitude,
          customerLatitude: data.customerLocation.latitude,
          customerLongitude: data.customerLocation.longitude,
          shipperLatitude: data.shipperLocation?.latitude ?? null,
          shipperLongitude: data.shipperLocation?.longitude ?? null,
          heading: data.heading ?? null,
          distanceKm: data.distanceRemainingKm,
          etaMinutes: data.etaMinutes,
          lastLocationAt: data.updatedAt,
        },
        create: {
          orderId: data.orderId,
          driverId: data.shipper?.id ?? null,
          driverName: data.shipper?.fullName ?? null,
          driverPhone: data.shipper?.phoneNumber ?? null,
          vehiclePlate: data.shipper?.vehiclePlate ?? null,
          driverRating: data.shipper?.rating ?? 4.9,
          deliveryStatus: data.status,
          storeLatitude: data.storeLocation.latitude,
          storeLongitude: data.storeLocation.longitude,
          customerLatitude: data.customerLocation.latitude,
          customerLongitude: data.customerLocation.longitude,
          shipperLatitude: data.shipperLocation?.latitude ?? null,
          shipperLongitude: data.shipperLocation?.longitude ?? null,
          heading: data.heading ?? null,
          distanceKm: data.distanceRemainingKm,
          etaMinutes: data.etaMinutes,
          lastLocationAt: data.updatedAt,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Could not persist tracking snapshot for ${data.orderNumber}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Helper: Tính khoảng cách giữa hai tọa độ bằng công thức Haversine (km)
   */
  private calculateHaversineDistance(c1: Coordinates, c2: Coordinates): number {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
    const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1.latitude * Math.PI) / 180) *
        Math.cos((c2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 1000) / 1000; // Làm tròn tới mét
  }

  /**
   * Helper: Khởi tạo dữ liệu tracking ban đầu nếu chưa có trong cache
   */
  private async getOrCreateTrackingData(orderId: string): Promise<LiveTrackingData> {
    if (this.trackingStore.has(orderId)) {
      return this.trackingStore.get(orderId)!;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { merchant: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ID ${orderId}`);
    }

    const orderAny = order as unknown as {
      id: string;
      orderNumber: string;
      userId?: string;
      deliveryAddress: string;
      deliveryLatitude?: number | null;
      deliveryLongitude?: number | null;
      merchant?: {
        name?: string;
        address?: string;
        ownerId?: string;
        latitude?: number | string | null;
        longitude?: number | string | null;
      } | null;
    };

    this.orderOwnersStore.set(orderId, {
      customerId: orderAny.userId,
      merchantOwnerId: orderAny.merchant?.ownerId,
    });

    const trackingRepo = (
      this.prisma as unknown as {
        orderTracking?: {
          findUnique?: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
        };
      }
    ).orderTracking;

    let persisted: Record<string, unknown> | null = null;
    if (trackingRepo?.findUnique) {
      try {
        persisted = await trackingRepo.findUnique({ where: { orderId } });
      } catch {
        persisted = null;
      }
    }

    const storeLat =
      typeof persisted?.storeLatitude === 'number'
        ? persisted.storeLatitude
        : orderAny.merchant?.latitude != null
        ? Number(orderAny.merchant.latitude)
        : 10.776889;
    const storeLng =
      typeof persisted?.storeLongitude === 'number'
        ? persisted.storeLongitude
        : orderAny.merchant?.longitude != null
        ? Number(orderAny.merchant.longitude)
        : 106.700806;

    const custLat =
      typeof persisted?.customerLatitude === 'number'
        ? persisted.customerLatitude
        : orderAny.deliveryLatitude != null
        ? Number(orderAny.deliveryLatitude)
        : storeLat + 0.015;
    const custLng =
      typeof persisted?.customerLongitude === 'number'
        ? persisted.customerLongitude
        : orderAny.deliveryLongitude != null
        ? Number(orderAny.deliveryLongitude)
        : storeLng + 0.012;

    const initialDistance =
      typeof persisted?.distanceKm === 'number'
        ? persisted.distanceKm
        : this.calculateHaversineDistance(
            { latitude: storeLat, longitude: storeLng },
            { latitude: custLat, longitude: custLng },
          ) || 2.5;

    const persistedStatus =
      typeof persisted?.deliveryStatus === 'string'
        ? (persisted.deliveryStatus as DeliveryStatus)
        : 'WAITING_DRIVER';

    const data: LiveTrackingData = {
      orderId: orderAny.id,
      orderNumber: orderAny.orderNumber,
      status: persistedStatus,
      ...(typeof persisted?.driverId === 'string'
        ? {
            shipper: {
              id: persisted.driverId,
              fullName:
                typeof persisted.driverName === 'string'
                  ? persisted.driverName
                  : 'Tài xế DineGo',
              phoneNumber:
                typeof persisted.driverPhone === 'string'
                  ? persisted.driverPhone
                  : '0909888999',
              vehiclePlate:
                typeof persisted.vehiclePlate === 'string'
                  ? persisted.vehiclePlate
                  : '59-S2 888.88',
              rating:
                typeof persisted.driverRating === 'number'
                  ? persisted.driverRating
                  : 4.9,
            },
          }
        : {}),
      ...(typeof persisted?.shipperLatitude === 'number' &&
      typeof persisted?.shipperLongitude === 'number'
        ? {
            shipperLocation: {
              latitude: persisted.shipperLatitude,
              longitude: persisted.shipperLongitude,
            },
          }
        : {}),
      ...(typeof persisted?.heading === 'number'
        ? { heading: persisted.heading }
        : {}),
      storeLocation: {
        latitude: storeLat,
        longitude: storeLng,
        name: orderAny.merchant?.name || 'Nhà Hàng DineGo',
        address: orderAny.merchant?.address || '123 Phố Ẩm Thực',
      },
      customerLocation: {
        latitude: custLat,
        longitude: custLng,
        address: orderAny.deliveryAddress,
      },
      distanceRemainingKm: initialDistance,
      etaMinutes:
        typeof persisted?.etaMinutes === 'number'
          ? persisted.etaMinutes
          : Math.max(5, Math.round(initialDistance * 3.5) + 5),
      isGeofenceStoreTriggered: ['ARRIVED_AT_STORE', 'PICKED_UP', 'DELIVERING', 'ARRIVED_AT_DESTINATION', 'DELIVERED'].includes(persistedStatus),
      isGeofenceCustomerTriggered: ['ARRIVED_AT_DESTINATION', 'DELIVERED'].includes(persistedStatus),
      updatedAt:
        persisted?.lastLocationAt instanceof Date
          ? persisted.lastLocationAt
          : new Date(),
      timeline: [
        {
          status: 'WAITING_DRIVER',
          title: 'Đang tìm tài xế giao hàng',
          description: 'Hệ thống đang quét tài xế ở khu vực gần nhà hàng nhất.',
          timestamp: new Date(),
        },
      ],
    };

    this.trackingStore.set(orderId, data);
    if (!persisted) {
      await this.persistTrackingSnapshot(data, false);
    }
    return data;
  }

  // ----------------------------------------------------------------------------
  // U039: SHIPPER NHẬN ĐƠN HÀNG
  // ----------------------------------------------------------------------------

  async assignShipper(
    orderId: string,
    shipperUser: AuthenticatedUser,
    dto?: AssignShipperDto,
  ): Promise<LiveTrackingData> {
    const data = await this.getOrCreateTrackingData(orderId);

    const userRepo = (
      this.prisma as unknown as {
        user?: {
          findUnique?: (args: Record<string, unknown>) => Promise<{
            fullName?: string | null;
            phoneNumber?: string | null;
          } | null>;
        };
      }
    ).user;

    let dbDriver: { fullName?: string | null; phoneNumber?: string | null } | null = null;
    if (userRepo?.findUnique) {
      try {
        dbDriver = await userRepo.findUnique({
          where: { id: shipperUser.id },
          select: { fullName: true, phoneNumber: true },
        });
      } catch {
        dbDriver = null;
      }
    }

    const shipperInfo: ShipperInfo = {
      id: shipperUser.id,
      fullName:
        dbDriver?.fullName ||
        shipperUser.fullName ||
        shipperUser.email.split('@')[0].toUpperCase(),
      phoneNumber: dbDriver?.phoneNumber || '0909888999',
      vehiclePlate: dto?.vehiclePlate?.trim() || '59-S2 888.88',
      rating: 4.9,
    };

    data.shipper = shipperInfo;
    data.status = 'ASSIGNED';
    data.shipperLocation = data.shipperLocation ?? {
      latitude: data.storeLocation.latitude - 0.008,
      longitude: data.storeLocation.longitude - 0.005,
    };
    const distToStore = this.calculateHaversineDistance(
      data.shipperLocation,
      data.storeLocation,
    );
    const distStoreToCustomer = this.calculateHaversineDistance(
      data.storeLocation,
      data.customerLocation,
    );
    data.distanceRemainingKm =
      Math.round((distToStore + distStoreToCustomer) * 1000) / 1000;
    data.etaMinutes = Math.max(5, Math.round(data.distanceRemainingKm * 3.5) + 10);
    data.updatedAt = new Date();
    data.timeline.push({
      status: 'ASSIGNED',
      title: 'Tài xế đã nhận đơn hàng',
      description: `Tài xế ${shipperInfo.fullName} (${shipperInfo.vehiclePlate}) đang di chuyển tới nhà hàng lấy món.`,
      timestamp: new Date(),
    });

    await this.persistTrackingSnapshot(data);
    this.logger.log(`[Tracking] Tài xế ${shipperUser.email} đã nhận đơn ${data.orderNumber}`);
    return data;
  }

  // ----------------------------------------------------------------------------
  // U040 & U041: REAL-TIME GPS & TỰ ĐỘNG KÍCH HOẠT GEOFENCE (100 MÉT)
  // ----------------------------------------------------------------------------

  async updateShipperGps(
    orderId: string,
    shipperUser: AuthenticatedUser,
    dto: UpdateGpsLocationDto,
  ): Promise<LiveTrackingData> {
    const data = await this.getOrCreateTrackingData(orderId);

    if (
      data.shipper &&
      data.shipper.id !== shipperUser.id &&
      !shipperUser.roles?.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException('Bạn không phải tài xế phụ trách đơn hàng này');
    }

    const currentCoords: Coordinates = {
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
    data.shipperLocation = currentCoords;
    if (typeof dto.heading === 'number') {
      data.heading = dto.heading;
    }
    if (typeof dto.speed === 'number') {
      data.speed = dto.speed;
    }
    data.updatedAt = new Date();

    // 1. Tính khoảng cách đến quán ăn
    const distToStore = this.calculateHaversineDistance(currentCoords, data.storeLocation);

    // 2. Tính khoảng cách đến điểm giao của khách
    const distToCustomer = this.calculateHaversineDistance(currentCoords, data.customerLocation);

    // =========================================================================
    // U041 GEOFENCE LOGIC (Bán kính 100 mét = 0.1 km)
    // =========================================================================

    // A. Khi tài xế vào vùng 100m quanh quán ăn và đang trên đường tới quán
    if (distToStore <= 0.1 && !data.isGeofenceStoreTriggered && data.status === 'ASSIGNED') {
      data.isGeofenceStoreTriggered = true;
      data.status = 'ARRIVED_AT_STORE';
      data.timeline.push({
        status: 'ARRIVED_AT_STORE',
        title: 'Geofence: Tài xế đã tới nhà hàng (Bán kính < 100m)',
        description: 'Tự động phát hiện qua GPS định vị. Tài xế đang đợi lấy món tại quầy.',
        timestamp: new Date(),
      });
      this.logger.log(`[Geofence] Kích hoạt ARRIVED_AT_STORE cho đơn ${data.orderNumber} (Khoảng cách: ${distToStore * 1000}m)`);
    }

    // B. Khi tài xế vào vùng 100m quanh điểm giao của khách và đang giao hàng
    if (distToCustomer <= 0.1 && !data.isGeofenceCustomerTriggered && data.status === 'DELIVERING') {
      data.isGeofenceCustomerTriggered = true;
      data.status = 'ARRIVED_AT_DESTINATION';
      data.timeline.push({
        status: 'ARRIVED_AT_DESTINATION',
        title: 'Geofence: Tài xế đã tới điểm giao (Bán kính < 100m)',
        description: 'Tài xế đã đến trước cửa nhà/tòa nhà của bạn và chuẩn bị liên hệ giao hàng.',
        timestamp: new Date(),
      });
      this.logger.log(`[Geofence] Kích hoạt ARRIVED_AT_DESTINATION cho đơn ${data.orderNumber} (Khoảng cách: ${distToCustomer * 1000}m)`);
    }

    // Cập nhật khoảng cách còn lại và thời gian ước tính (ETA)
    if (['DELIVERING', 'ARRIVED_AT_DESTINATION'].includes(data.status)) {
      data.distanceRemainingKm = distToCustomer;
      data.etaMinutes = Math.max(1, Math.round(distToCustomer * 3.5));
    } else {
      data.distanceRemainingKm =
        Math.round(
          (distToStore +
            this.calculateHaversineDistance(data.storeLocation, data.customerLocation)) *
            1000,
        ) / 1000;
      data.etaMinutes = Math.max(5, Math.round(data.distanceRemainingKm * 3.5) + 10);
    }

    await this.persistTrackingSnapshot(data);
    return data;
  }

  // ----------------------------------------------------------------------------
  // U039: CẬP NHẬT TRẠNG THÁI GIAO HÀNG THỦ CÔNG
  // ----------------------------------------------------------------------------

  async updateDeliveryStatus(
    orderId: string,
    shipperUser: AuthenticatedUser,
    dto: UpdateDeliveryStatusDto,
  ): Promise<LiveTrackingData> {
    const data = await this.getOrCreateTrackingData(orderId);

    if (
      data.shipper &&
      data.shipper.id !== shipperUser.id &&
      !shipperUser.roles?.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException('Bạn không phải tài xế phụ trách đơn hàng này');
    }

    data.status = dto.status;
    data.updatedAt = new Date();

    let title = 'Cập nhật lộ trình giao hàng';
    let desc = `Trạng thái đơn chuyển sang ${dto.status}`;

    if (dto.status === 'PICKED_UP') {
      title = 'Tài xế đã lấy món từ quán';
      desc = 'Món ăn đã được đóng gói kỹ càng và tài xế bắt đầu hành trình giao đến bạn.';
    } else if (dto.status === 'DELIVERING') {
      title = 'Đang giao hàng tới bạn';
      desc = 'Tài xế đang di chuyển trên tuyến đường nhanh nhất.';
    } else if (dto.status === 'DELIVERED') {
      title = 'Giao hàng thành công';
      desc = 'Đơn hàng đã được bàn giao an toàn và đầy đủ cho khách hàng.';
      data.distanceRemainingKm = 0;
      data.etaMinutes = 0;
    }

    data.timeline.push({
      status: dto.status,
      title,
      description: desc,
      timestamp: new Date(),
    });

    await this.persistTrackingSnapshot(data);
    this.logger.log(`[Tracking] Đơn ${data.orderNumber} đổi trạng thái giao hàng sang: ${dto.status}`);
    return data;
  }

  private assertCanViewTracking(
    orderId: string,
    viewer: AuthenticatedUser,
    data: LiveTrackingData,
  ): void {
    if (viewer.roles?.includes(Role.ADMIN)) return;
    const owners = this.orderOwnersStore.get(orderId);
    const isOwner = owners?.customerId != null && owners.customerId === viewer.id;
    const isMerchant =
      owners?.merchantOwnerId != null && owners.merchantOwnerId === viewer.id;
    const isShipper = data.shipper?.id === viewer.id;
    if (!isOwner && !isMerchant && !isShipper) {
      throw new ForbiddenException('Bạn không có quyền theo dõi đơn hàng này');
    }
  }

  // ----------------------------------------------------------------------------
  // U042: DỮ LIỆU BẢN ĐỒ TRACKING TRỰC TIẾP CHO KHÁCH HÀNG (LIVE TRACKING API)
  // ----------------------------------------------------------------------------

  async getLiveTracking(
    orderId: string,
    viewer?: AuthenticatedUser,
  ): Promise<LiveTrackingData> {
    const data = await this.getOrCreateTrackingData(orderId);
    if (viewer) {
      this.assertCanViewTracking(orderId, viewer, data);
    }
    return data;
  }

  async streamOrderTracking(
    orderId: string,
    viewer?: AuthenticatedUser,
  ): Promise<Observable<MessageEvent>> {
    const initial = await this.getLiveTracking(orderId, viewer);
    return concat(
      from([{ data: initial } as MessageEvent]),
      this.trackingEvents$.pipe(
        filter((evt) => evt.orderId === orderId),
        map((evt) => ({ data: evt.data }) as MessageEvent),
      ),
    );
  }

  searchVietnamAddress(query: string): Promise<VietnamGeocodeResult[]> {
    return this.geocodeHelper.searchAddress(query || '');
  }

  reverseVietnamCoordinates(
    lat: number,
    lng: number,
  ): Promise<VietnamGeocodeResult | null> {
    return this.geocodeHelper.reverseGeocode(lat, lng);
  }
}

