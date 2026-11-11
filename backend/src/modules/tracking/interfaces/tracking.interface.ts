export type DeliveryStatus =
  | 'WAITING_DRIVER'
  | 'ASSIGNED'
  | 'ARRIVED_AT_STORE'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELIVERED';

export interface ShipperInfo {
  id: string;
  fullName: string;
  phoneNumber: string;
  vehiclePlate: string;
  rating: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LiveTrackingData {
  orderId: string;
  orderNumber: string;
  status: DeliveryStatus;
  shipper?: ShipperInfo;
  shipperLocation?: Coordinates;
  heading?: number;
  speed?: number;
  storeLocation: Coordinates & { name: string; address: string };
  customerLocation: Coordinates & { address: string };
  distanceRemainingKm: number;
  etaMinutes: number;
  isGeofenceStoreTriggered: boolean;
  isGeofenceCustomerTriggered: boolean;
  updatedAt: Date;
  timeline: {
    status: DeliveryStatus;
    title: string;
    description: string;
    timestamp: Date;
  }[];
}

