// ==============================================================================
// DineGo Backend — Real-Time GPS Tracking & Geofencing Engine (Sprint 4 — U039 đến U042)
// Architecture: Clean Architecture / Modular Monolith
// ==============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { UpdateDeliveryStatusDto, UpdateGpsLocationDto } from './dto/update-gps.dto.js';
import type {
  Coordinates,
  DeliveryStatus,
  LiveTrackingData,
  ShipperInfo,
} from './interfaces/tracking.interface.js';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  // In-memory Cache for Live Tracking States (OrderId -> LiveTrackingData)
  private readonly trackingStore = new Map<string, LiveTrackingData>();

  constructor(private readonly prisma: PrismaService) {}

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

    const storeLat = order.merchant?.latitude ? Number(order.merchant.latitude) : 10.776889;
    const storeLng = order.merchant?.longitude ? Number(order.merchant.longitude) : 106.700806;

    // Tọa độ khách hàng mặc định (cách quán khoảng 2.5 km)
    const custLat = storeLat + 0.015;
    const custLng = storeLng + 0.012;

    const data: LiveTrackingData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'WAITING_DRIVER',
      storeLocation: {
        latitude: storeLat,
        longitude: storeLng,
        name: order.merchant?.name || 'Nhà Hàng DineGo',
        address: order.merchant?.address || '123 Phố Ẩm Thực',
      },
      customerLocation: {
        latitude: custLat,
        longitude: custLng,
        address: order.deliveryAddress,
      },
      distanceRemainingKm: 2.5,
      etaMinutes: 15,
      isGeofenceStoreTriggered: false,
      isGeofenceCustomerTriggered: false,
      updatedAt: new Date(),
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
    return data;
  }

  // ----------------------------------------------------------------------------
  // U039: SHIPPER NHẬN ĐƠN HÀNG
  // ----------------------------------------------------------------------------

  async assignShipper(orderId: string, shipperUser: AuthenticatedUser): Promise<LiveTrackingData> {
    const data = await this.getOrCreateTrackingData(orderId);

    const shipperInfo: ShipperInfo = {
      id: shipperUser.id,
      fullName: shipperUser.email.split('@')[0].toUpperCase(),
      phoneNumber: '0909888999',
      vehiclePlate: '59-S2 888.88',
      rating: 4.9,
    };

    data.shipper = shipperInfo;
    data.status = 'ASSIGNED';
    data.shipperLocation = {
      latitude: data.storeLocation.latitude - 0.008,
      longitude: data.storeLocation.longitude - 0.005,
    };
    data.updatedAt = new Date();
    data.timeline.push({
      status: 'ASSIGNED',
      title: 'Tài xế đã nhận đơn hàng',
      description: `Tài xế ${shipperInfo.fullName} (${shipperInfo.vehiclePlate}) đang di chuyển tới nhà hàng lấy món.`,
      timestamp: new Date(),
    });

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

    if (data.shipper && data.shipper.id !== shipperUser.id) {
      throw new ForbiddenException('Bạn không phải tài xế phụ trách đơn hàng này');
    }

    const currentCoords: Coordinates = {
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
    data.shipperLocation = currentCoords;
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
      data.distanceRemainingKm = distToStore + this.calculateHaversineDistance(data.storeLocation, data.customerLocation);
      data.etaMinutes = Math.max(5, Math.round(data.distanceRemainingKm * 3.5) + 10);
    }

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

    if (data.shipper && data.shipper.id !== shipperUser.id) {
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

    this.logger.log(`[Tracking] Đơn ${data.orderNumber} đổi trạng thái giao hàng sang: ${dto.status}`);
    return data;
  }

  // ----------------------------------------------------------------------------
  // U042: DỮ LIỆU BẢN ĐỒ TRACKING TRỰC TIẾP CHO KHÁCH HÀNG (LIVE TRACKING API)
  // ----------------------------------------------------------------------------

  async getLiveTracking(orderId: string): Promise<LiveTrackingData> {
    return this.getOrCreateTrackingData(orderId);
  }
}

