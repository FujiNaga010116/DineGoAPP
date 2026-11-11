// ==============================================================================
// DineGo Frontend — Standalone Driver Partner Portal & Customer Order Tracking
// - Each Driver has their own dedicated DriverProfile & User Account (1-to-1)
// - Includes Driver Account & Vehicle Management ('driver-profile')
// - No cross-role switching buttons (Logout only)
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  MapPin,
  Phone,
  CheckCircle2,
  Navigation,
  Store,
  Crosshair,
  RotateCcw,
  Star,
  Wallet,
  ClipboardList,
  ArrowUpRight,
  LogOut,
  User as UserIcon,
  Save,
} from 'lucide-react';
import type { DriverProfile, Order, OrderStatus, User } from '../types';
import type { NavTab } from '../components/common/Header';
import { MOCK_DRIVERS } from '../api/client';
import { DeliveryMap } from '../components/common/DeliveryMap';
import {
  calculateBearingDeg,
  calculateHaversineKm,
  fetchRoadRoute,
  publishLiveTracking,
  readLiveTracking,
  resolveCustomerCoords,
  resolveDriverStartCoords,
  resolveMerchantCoords,
  subscribeLiveTracking,
  syncGpsToBackend,
  type LatLngPoint,
  type LiveOrderTrackingPayload,
} from '../utils/routing';

type TrackingStatus =
  | 'ASSIGNED'
  | 'ARRIVED_AT_STORE'
  | 'DELIVERING'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELIVERED';

interface TrackingState {
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  customerAddress: string;
  driverName: string;
  driverPhone: string;
  licensePlate: string;
  driverRating: number;
  status: TrackingStatus;
  currentLat: number;
  currentLng: number;
  heading: number;
  storeLat: number;
  storeLng: number;
  customerLat: number;
  customerLng: number;
  distanceKm: number;
  etaMinutes: number;
}

export interface TrackingPageProps {
  activeOrder?: Order | null;
  allOrders?: Order[];
  activeTab?: NavTab;
  onNavigate?: (tab: NavTab) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  isDriverMode?: boolean;
  currentDriver?: DriverProfile;
  currentUser?: User | null;
  onUpdateDriverProfile?: (updatedDriver: DriverProfile, updatedUser?: User) => void;
  onOpenReviewModal?: (order: Order) => void;
  onExploreFood?: () => void;
  onLogout?: () => void;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({
  activeOrder,
  allOrders = [],
  activeTab = 'tracking',
  onNavigate,
  onUpdateOrderStatus,
  isDriverMode = false,
  currentDriver = MOCK_DRIVERS[0],
  currentUser,
  onUpdateDriverProfile,
  onOpenReviewModal,
  onExploreFood,
  onLogout,
}) => {
  const isDriverPortal =
    isDriverMode || String(activeTab).startsWith('driver-');
  const [driverOnline, setDriverOnline] = useState(currentDriver.status !== 'OFFLINE');
  const [withdrawnNotice, setWithdrawnNotice] = useState(false);
  const [profileSavedNotice, setProfileSavedNotice] = useState('');

  // Editable Driver Profile fields
  const [drvFullName, setDrvFullName] = useState(currentDriver.fullName);
  const [drvPhone, setDrvPhone] = useState(currentDriver.phoneNumber);
  const [drvEmail, setDrvEmail] = useState(currentDriver.email);
  const [drvNationalId, setDrvNationalId] = useState(currentDriver.nationalId);
  const [drvLicenseNum, setDrvLicenseNum] = useState(currentDriver.driverLicenseNumber);
  const [drvVehicleType, setDrvVehicleType] = useState(currentDriver.vehicleType);
  const [drvLicensePlate, setDrvLicensePlate] = useState(currentDriver.licensePlate);
  const [drvZone, setDrvZone] = useState(currentDriver.operatingZone);
  const [drvBankName, setDrvBankName] = useState(currentDriver.bankName);
  const [drvBankAcc, setDrvBankAcc] = useState(currentDriver.bankAccountNumber);
  const [drvBankHolder, setDrvBankHolder] = useState(currentDriver.bankAccountHolder);
  const [drvEmergency, setDrvEmergency] = useState(currentDriver.emergencyContact || '');
  const [drvNewPassword, setDrvNewPassword] = useState('');

  useEffect(() => {
    setDrvFullName(currentDriver.fullName);
    setDrvPhone(currentDriver.phoneNumber);
    setDrvEmail(currentDriver.email);
    setDrvNationalId(currentDriver.nationalId);
    setDrvLicenseNum(currentDriver.driverLicenseNumber);
    setDrvVehicleType(currentDriver.vehicleType);
    setDrvLicensePlate(currentDriver.licensePlate);
    setDrvZone(currentDriver.operatingZone);
    setDrvBankName(currentDriver.bankName);
    setDrvBankAcc(currentDriver.bankAccountNumber);
    setDrvBankHolder(currentDriver.bankAccountHolder);
    setDrvEmergency(currentDriver.emergencyContact || '');
  }, [currentDriver]);

  const initialStore =
    activeOrder?.merchant?.latitude != null && activeOrder?.merchant?.longitude != null
      ? { lat: activeOrder.merchant.latitude, lng: activeOrder.merchant.longitude }
      : resolveMerchantCoords(
          activeOrder?.merchant?.id,
          activeOrder?.merchant?.address,
        );
  const initialCustomerAddress =
    activeOrder?.deliveryAddress || '45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM';
  const initialCustomer =
    activeOrder?.deliveryLatitude != null && activeOrder?.deliveryLongitude != null
      ? { lat: activeOrder.deliveryLatitude, lng: activeOrder.deliveryLongitude }
      : resolveCustomerCoords(initialCustomerAddress, initialStore);
  const initialDriverStart = resolveDriverStartCoords(initialStore, currentDriver.id);

  const [tracking, setTracking] = useState<TrackingState>(() => {
    const orderNum = activeOrder?.orderNumber || 'DG20261103-TRK88';
    const existingSync = readLiveTracking(orderNum);
    if (existingSync) {
      return {
        orderNumber: existingSync.orderNumber,
        restaurantName: existingSync.storeName,
        restaurantAddress: existingSync.storeAddress,
        customerAddress: existingSync.customerAddress,
        driverName: existingSync.driverName,
        driverPhone: existingSync.driverPhone,
        licensePlate: existingSync.licensePlate,
        driverRating: existingSync.driverRating,
        status: existingSync.status === 'PICKED_UP' ? 'DELIVERING' : existingSync.status,
        currentLat: existingSync.currentLat,
        currentLng: existingSync.currentLng,
        heading: existingSync.heading,
        storeLat: existingSync.storeLat,
        storeLng: existingSync.storeLng,
        customerLat: existingSync.customerLat,
        customerLng: existingSync.customerLng,
        distanceKm: existingSync.distanceKm,
        etaMinutes: existingSync.etaMinutes,
      };
    }

    const isPendingPickup =
      activeOrder?.status === 'PENDING' || activeOrder?.status === 'CONFIRMED';
    const startShipperPt = isPendingPickup ? initialDriverStart : initialStore;
    const startDist = calculateHaversineKm(startShipperPt, initialCustomer);
    return {
      orderNumber: orderNum,
      restaurantName: activeOrder?.merchant?.name || 'Cơm Tấm Sài Gòn 1985',
      restaurantAddress:
        activeOrder?.merchant?.address || '123 Nguyễn Huệ, Quận 1, TP. HCM',
      customerAddress: initialCustomerAddress,
      driverName: currentDriver.fullName,
      driverPhone: currentDriver.phoneNumber,
      licensePlate: currentDriver.licensePlate,
      driverRating: currentDriver.rating,
      status: isPendingPickup ? 'ASSIGNED' : 'DELIVERING',
      currentLat: startShipperPt.lat,
      currentLng: startShipperPt.lng,
      heading: calculateBearingDeg(startShipperPt, isPendingPickup ? initialStore : initialCustomer),
      storeLat: initialStore.lat,
      storeLng: initialStore.lng,
      customerLat: initialCustomer.lat,
      customerLng: initialCustomer.lng,
      distanceKm: startDist,
      etaMinutes: Math.max(4, Math.ceil(startDist * 3.5)),
    };
  });

  const [routePoints, setRoutePoints] = useState<[number, number][]>([
    [initialStore.lat, initialStore.lng],
    [initialCustomer.lat, initialCustomer.lng],
  ]);
  const [driverToStorePoints, setDriverToStorePoints] = useState<[number, number][]>([]);
  const [routeSource, setRouteSource] = useState<'osrm' | 'fallback'>('osrm');
  const [gpsStatusNotice, setGpsStatusNotice] = useState('');
  const [isAutoMoving, setIsAutoMoving] = useState(false);

  const routeCursorRef = useRef<number>(0);
  const latestTrackingRef = useRef<TrackingState>(tracking);
  latestTrackingRef.current = tracking;

  const broadcastTrackingState = (nextState: TrackingState) => {
    const payload: LiveOrderTrackingPayload = {
      orderId: activeOrder?.id,
      orderNumber: nextState.orderNumber,
      status: nextState.status,
      currentLat: nextState.currentLat,
      currentLng: nextState.currentLng,
      heading: nextState.heading,
      distanceKm: nextState.distanceKm,
      etaMinutes: nextState.etaMinutes,
      storeLat: nextState.storeLat,
      storeLng: nextState.storeLng,
      storeName: nextState.restaurantName,
      storeAddress: nextState.restaurantAddress,
      customerLat: nextState.customerLat,
      customerLng: nextState.customerLng,
      customerAddress: nextState.customerAddress,
      driverId: currentDriver.id,
      driverName: nextState.driverName,
      driverPhone: nextState.driverPhone,
      licensePlate: nextState.licensePlate,
      driverRating: nextState.driverRating,
      updatedAt: new Date().toISOString(),
    };
    publishLiveTracking(payload);
  };

  useEffect(() => {
    if (activeOrder) {
      let mappedStatus: TrackingStatus = 'DELIVERING';
      if (activeOrder.status === 'PENDING' || activeOrder.status === 'CONFIRMED') {
        mappedStatus = 'ASSIGNED';
      } else if (activeOrder.status === 'PREPARING' || activeOrder.status === 'READY_FOR_PICKUP') {
        mappedStatus = 'ARRIVED_AT_STORE';
      } else if (activeOrder.status === 'DELIVERING') {
        mappedStatus = 'DELIVERING';
      } else if (activeOrder.status === 'COMPLETED') {
        mappedStatus = 'DELIVERED';
      }

      const nextStore =
        activeOrder.merchant?.latitude != null && activeOrder.merchant?.longitude != null
          ? { lat: activeOrder.merchant.latitude, lng: activeOrder.merchant.longitude }
          : resolveMerchantCoords(
              activeOrder.merchant?.id,
              activeOrder.merchant?.address,
            );
      const nextCustomer =
        activeOrder.deliveryLatitude != null && activeOrder.deliveryLongitude != null
          ? { lat: activeOrder.deliveryLatitude, lng: activeOrder.deliveryLongitude }
          : resolveCustomerCoords(
              activeOrder.deliveryAddress,
              nextStore,
            );
      const synced = readLiveTracking(activeOrder.orderNumber);
      const fallbackShipper =
        mappedStatus === 'ASSIGNED'
          ? resolveDriverStartCoords(nextStore, currentDriver.id)
          : mappedStatus === 'DELIVERED'
          ? nextCustomer
          : nextStore;

      setTracking((prev) => {
        const useSyncedCoords =
          synced && prev.orderNumber === synced.orderNumber
            ? {
                lat: synced.currentLat,
                lng: synced.currentLng,
                heading: synced.heading,
                dist: synced.distanceKm,
                eta: synced.etaMinutes,
              }
            : synced && !isDriverPortal
            ? {
                lat: synced.currentLat,
                lng: synced.currentLng,
                heading: synced.heading,
                dist: synced.distanceKm,
                eta: synced.etaMinutes,
              }
            : null;

        const baseDist =
          mappedStatus === 'DELIVERED'
            ? 0
            : calculateHaversineKm(fallbackShipper, nextCustomer);

        return {
          ...prev,
          orderNumber: activeOrder.orderNumber,
          restaurantName: activeOrder.merchant?.name || prev.restaurantName,
          restaurantAddress: activeOrder.merchant?.address || prev.restaurantAddress,
          customerAddress: activeOrder.deliveryAddress || prev.customerAddress,
          driverName: currentDriver.fullName,
          driverPhone: currentDriver.phoneNumber,
          licensePlate: currentDriver.licensePlate,
          driverRating: currentDriver.rating,
          status:
            synced && !isDriverPortal
              ? synced.status === 'PICKED_UP'
                ? 'DELIVERING'
                : synced.status
              : mappedStatus,
          storeLat: nextStore.lat,
          storeLng: nextStore.lng,
          customerLat: nextCustomer.lat,
          customerLng: nextCustomer.lng,
          currentLat: useSyncedCoords ? useSyncedCoords.lat : fallbackShipper.lat,
          currentLng: useSyncedCoords ? useSyncedCoords.lng : fallbackShipper.lng,
          heading: useSyncedCoords
            ? useSyncedCoords.heading
            : calculateBearingDeg(fallbackShipper, nextCustomer),
          distanceKm: useSyncedCoords ? useSyncedCoords.dist : baseDist,
          etaMinutes: useSyncedCoords
            ? useSyncedCoords.eta
            : mappedStatus === 'DELIVERED'
            ? 0
            : Math.max(3, Math.ceil(baseDist * 3.5)),
        };
      });
      routeCursorRef.current = 0;
    }
  }, [activeOrder, currentDriver, isDriverPortal]);

  // Fetch real OpenStreetMap / OSRM road route whenever Store or Customer changes
  useEffect(() => {
    let cancelled = false;
    const storePt: LatLngPoint = { lat: tracking.storeLat, lng: tracking.storeLng };
    const custPt: LatLngPoint = {
      lat: tracking.customerLat,
      lng: tracking.customerLng,
    };

    fetchRoadRoute([storePt, custPt]).then((res) => {
      if (cancelled) return;
      setRoutePoints(res.coordinates);
      setRouteSource(res.source);

      // Update planned distance if shipper is still at store before departure
      const cur = latestTrackingRef.current;
      const distFromStore = calculateHaversineKm(
        { lat: cur.currentLat, lng: cur.currentLng },
        storePt,
      );
      if (
        (cur.status === 'ARRIVED_AT_STORE' || cur.status === 'ASSIGNED') &&
        distFromStore < 0.05
      ) {
        setTracking((prev) => ({
          ...prev,
          distanceKm: res.distanceKm,
          etaMinutes: res.durationMin,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tracking.storeLat, tracking.storeLng, tracking.customerLat, tracking.customerLng]);

  // Fetch approach route (Driver -> Store) when status is ASSIGNED
  useEffect(() => {
    let cancelled = false;
    if (tracking.status !== 'ASSIGNED') {
      setDriverToStorePoints([]);
      return;
    }
    const startPt: LatLngPoint = {
      lat: tracking.currentLat,
      lng: tracking.currentLng,
    };
    const storePt: LatLngPoint = {
      lat: tracking.storeLat,
      lng: tracking.storeLng,
    };
    fetchRoadRoute([startPt, storePt]).then((res) => {
      if (!cancelled) {
        setDriverToStorePoints(res.coordinates);
      }
    });
    return () => {
      cancelled = true;
    };
    // Only re-fetch driver->store route when order changes or status enters ASSIGNED
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking.status, tracking.storeLat, tracking.storeLng, tracking.orderNumber]);

  // Subscribe to live BroadcastChannel updates from Driver tab when viewing as Customer
  useEffect(() => {
    if (isDriverPortal) return;
    return subscribeLiveTracking(tracking.orderNumber, (payload) => {
      setTracking((prev) => ({
        ...prev,
        status: payload.status === 'PICKED_UP' ? 'DELIVERING' : payload.status,
        currentLat: payload.currentLat,
        currentLng: payload.currentLng,
        heading: payload.heading,
        distanceKm: payload.distanceKm,
        etaMinutes: payload.etaMinutes,
        driverName: payload.driverName,
        driverPhone: payload.driverPhone,
        licensePlate: payload.licensePlate,
      }));
    });
  }, [isDriverPortal, tracking.orderNumber]);

  // Smooth step-by-step GPS simulation following actual OSRM street coordinates
  useEffect(() => {
    if (!isAutoMoving) return;

    const timer = setInterval(() => {
      const cur = latestTrackingRef.current;
      if (cur.status === 'DELIVERED') {
        setIsAutoMoving(false);
        return;
      }

      // Advance from ARRIVED_AT_STORE into DELIVERING automatically when starting GPS simulation
      let workingStatus: TrackingStatus = cur.status;
      if (workingStatus === 'ARRIVED_AT_STORE') {
        workingStatus = 'DELIVERING';
        routeCursorRef.current = 0;
        syncWithGlobalOrder('DELIVERING');
      }

      const activePoly =
        workingStatus === 'ASSIGNED' && driverToStorePoints.length >= 2
          ? driverToStorePoints
          : routePoints;

      if (activePoly.length < 2) return;

      const stride = Math.max(1, Math.floor(activePoly.length / 26));
      const nextIdx = Math.min(activePoly.length - 1, routeCursorRef.current + stride);
      routeCursorRef.current = nextIdx;

      const [nextLat, nextLng] = activePoly[nextIdx];
      const nextPt: LatLngPoint = { lat: nextLat, lng: nextLng };
      const prevPt: LatLngPoint = { lat: cur.currentLat, lng: cur.currentLng };
      const heading = calculateBearingDeg(prevPt, nextPt);

      const targetPt: LatLngPoint =
        workingStatus === 'ASSIGNED'
          ? { lat: cur.storeLat, lng: cur.storeLng }
          : { lat: cur.customerLat, lng: cur.customerLng };

      const distToTarget = calculateHaversineKm(nextPt, targetPt);
      const isLastPoint = nextIdx >= activePoly.length - 1;

      if (workingStatus === 'ASSIGNED' && (distToTarget <= 0.1 || isLastPoint)) {
        const arrivedStoreState: TrackingState = {
          ...cur,
          status: 'ARRIVED_AT_STORE',
          currentLat: cur.storeLat,
          currentLng: cur.storeLng,
          heading,
          distanceKm: calculateHaversineKm(
            { lat: cur.storeLat, lng: cur.storeLng },
            { lat: cur.customerLat, lng: cur.customerLng },
          ),
          etaMinutes: Math.max(
            3,
            Math.ceil(
              calculateHaversineKm(
                { lat: cur.storeLat, lng: cur.storeLng },
                { lat: cur.customerLat, lng: cur.customerLng },
              ) * 3.5,
            ),
          ),
        };
        routeCursorRef.current = 0;
        setTracking(arrivedStoreState);
        broadcastTrackingState(arrivedStoreState);
        syncGpsToBackend(activeOrder?.id, cur.storeLat, cur.storeLng, heading);
        syncWithGlobalOrder('ARRIVED_AT_STORE');
        setGpsStatusNotice(
          'Geofence <100m tại nhà hàng đã kích hoạt! Bấm "Mô phỏng di chuyển GPS" hoặc "Bắt đầu giao hàng" để đi tiếp.',
        );
        setIsAutoMoving(false);
        return;
      }

      if (workingStatus === 'DELIVERING' && (distToTarget <= 0.1 || isLastPoint)) {
        const distFinal = Math.min(0.05, distToTarget);
        const arrivedCustState: TrackingState = {
          ...cur,
          status: 'ARRIVED_AT_DESTINATION',
          currentLat: nextLat,
          currentLng: nextLng,
          heading,
          distanceKm: distFinal,
          etaMinutes: 1,
        };
        setTracking(arrivedCustState);
        broadcastTrackingState(arrivedCustState);
        syncGpsToBackend(activeOrder?.id, nextLat, nextLng, heading);
        syncWithGlobalOrder('ARRIVED_AT_DESTINATION');
        setGpsStatusNotice(
          'Đã vào bán kính 100m quanh khách hàng — Sẵn sàng xác nhận giao hàng!',
        );
        setIsAutoMoving(false);
        return;
      }

      const remainingKm =
        workingStatus === 'ASSIGNED'
          ? Math.round(
              (distToTarget +
                calculateHaversineKm(
                  { lat: cur.storeLat, lng: cur.storeLng },
                  { lat: cur.customerLat, lng: cur.customerLng },
                )) *
                100,
            ) / 100
          : Math.round(distToTarget * 100) / 100;

      const updated: TrackingState = {
        ...cur,
        status: workingStatus,
        currentLat: nextLat,
        currentLng: nextLng,
        heading,
        distanceKm: remainingKm,
        etaMinutes: Math.max(1, Math.ceil(remainingKm * 3.5)),
      };

      setTracking(updated);
      broadcastTrackingState(updated);
      syncGpsToBackend(activeOrder?.id, nextLat, nextLng, heading);
    }, 750);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoMoving, routePoints, driverToStorePoints, activeOrder?.id]);

  const syncWithGlobalOrder = (newTrackingStatus: TrackingStatus) => {
    if (!activeOrder || !onUpdateOrderStatus) return;
    if (newTrackingStatus === 'ARRIVED_AT_STORE') {
      onUpdateOrderStatus(activeOrder.id, 'READY_FOR_PICKUP');
    } else if (newTrackingStatus === 'DELIVERING' || newTrackingStatus === 'ARRIVED_AT_DESTINATION') {
      onUpdateOrderStatus(activeOrder.id, 'DELIVERING');
    } else if (newTrackingStatus === 'DELIVERED') {
      onUpdateOrderStatus(activeOrder.id, 'COMPLETED');
    }
  };

  const handleUseDeviceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatusNotice('Trình duyệt không hỗ trợ Geolocation GPS.');
      return;
    }
    setIsAutoMoving(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        const cur = latestTrackingRef.current;
        const heading =
          pos.coords.heading ??
          calculateBearingDeg({ lat: cur.currentLat, lng: cur.currentLng }, { lat, lng });
        const distToCustomer = calculateHaversineKm(
          { lat, lng },
          { lat: cur.customerLat, lng: cur.customerLng },
        );
        const nextStatus: TrackingStatus =
          distToCustomer <= 0.1 ? 'ARRIVED_AT_DESTINATION' : cur.status;
        const updated: TrackingState = {
          ...cur,
          currentLat: lat,
          currentLng: lng,
          heading,
          status: nextStatus,
          distanceKm: Math.round(distToCustomer * 100) / 100,
          etaMinutes: Math.max(1, Math.ceil(distToCustomer * 3.5)),
        };
        setTracking(updated);
        broadcastTrackingState(updated);
        syncGpsToBackend(activeOrder?.id, lat, lng, heading);
        setGpsStatusNotice(`Đã lấy tọa độ GPS thực tế từ thiết bị (${lat}, ${lng}).`);
      },
      (err) => {
        setGpsStatusNotice(`Không thể truy cập GPS thiết bị: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  const handleMapClickPoint = (point: LatLngPoint) => {
    setIsAutoMoving(false);
    const cur = latestTrackingRef.current;
    const heading = calculateBearingDeg(
      { lat: cur.currentLat, lng: cur.currentLng },
      point,
    );
    const distStore = calculateHaversineKm(point, {
      lat: cur.storeLat,
      lng: cur.storeLng,
    });
    const distCust = calculateHaversineKm(point, {
      lat: cur.customerLat,
      lng: cur.customerLng,
    });

    let nextStatus = cur.status;
    if (cur.status === 'ASSIGNED' && distStore <= 0.1) {
      nextStatus = 'ARRIVED_AT_STORE';
      syncWithGlobalOrder('ARRIVED_AT_STORE');
      setGpsStatusNotice('Geofence <100m quanh nhà hàng được kích hoạt.');
    } else if (cur.status === 'DELIVERING' && distCust <= 0.1) {
      nextStatus = 'ARRIVED_AT_DESTINATION';
      syncWithGlobalOrder('ARRIVED_AT_DESTINATION');
      setGpsStatusNotice('Geofence <100m quanh khách hàng được kích hoạt.');
    } else {
      setGpsStatusNotice(`Đã đặt vị trí GPS tới (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}).`);
    }

    const updated: TrackingState = {
      ...cur,
      currentLat: point.lat,
      currentLng: point.lng,
      heading,
      status: nextStatus,
      distanceKm: Math.round(distCust * 100) / 100,
      etaMinutes: distCust <= 0.1 ? 1 : Math.max(1, Math.ceil(distCust * 3.5)),
    };
    setTracking(updated);
    broadcastTrackingState(updated);
    syncGpsToBackend(activeOrder?.id, point.lat, point.lng, heading);
  };

  const handleStepAction = (nextStatus: TrackingStatus) => {
    const cur = latestTrackingRef.current;
    setGpsStatusNotice('');

    if (nextStatus === 'ARRIVED_AT_STORE') {
      const dist = calculateHaversineKm(
        { lat: cur.storeLat, lng: cur.storeLng },
        { lat: cur.customerLat, lng: cur.customerLng },
      );
      const updated: TrackingState = {
        ...cur,
        status: 'ARRIVED_AT_STORE',
        currentLat: cur.storeLat,
        currentLng: cur.storeLng,
        distanceKm: Math.round(dist * 100) / 100,
        etaMinutes: Math.max(3, Math.ceil(dist * 3.5)),
      };
      routeCursorRef.current = 0;
      setTracking(updated);
      broadcastTrackingState(updated);
      syncWithGlobalOrder('ARRIVED_AT_STORE');
    } else if (nextStatus === 'DELIVERING') {
      const dist = calculateHaversineKm(
        { lat: cur.storeLat, lng: cur.storeLng },
        { lat: cur.customerLat, lng: cur.customerLng },
      );
      const updated: TrackingState = {
        ...cur,
        status: 'DELIVERING',
        currentLat: cur.storeLat,
        currentLng: cur.storeLng,
        heading: calculateBearingDeg(
          { lat: cur.storeLat, lng: cur.storeLng },
          { lat: cur.customerLat, lng: cur.customerLng },
        ),
        distanceKm: Math.round(dist * 100) / 100,
        etaMinutes: Math.max(3, Math.ceil(dist * 3.5)),
      };
      routeCursorRef.current = 0;
      setTracking(updated);
      broadcastTrackingState(updated);
      syncWithGlobalOrder('DELIVERING');
    } else if (nextStatus === 'ARRIVED_AT_DESTINATION') {
      const nearLat = +(cur.customerLat - 0.0002).toFixed(6);
      const nearLng = +(cur.customerLng - 0.0002).toFixed(6);
      const updated: TrackingState = {
        ...cur,
        status: 'ARRIVED_AT_DESTINATION',
        currentLat: nearLat,
        currentLng: nearLng,
        distanceKm: 0.03,
        etaMinutes: 1,
      };
      routeCursorRef.current = Math.max(0, routePoints.length - 1);
      setIsAutoMoving(false);
      setTracking(updated);
      broadcastTrackingState(updated);
      syncGpsToBackend(activeOrder?.id, nearLat, nearLng, cur.heading);
      syncWithGlobalOrder('ARRIVED_AT_DESTINATION');
    } else if (nextStatus === 'DELIVERED') {
      if (cur.distanceKm > 0.1) {
        alert('Chưa thể hoàn tất: Bạn cần di chuyển vào phạm vi 100m quanh địa chỉ khách hàng để xác nhận giao thành công.');
        return;
      }
      const updated: TrackingState = {
        ...cur,
        status: 'DELIVERED',
        currentLat: cur.customerLat,
        currentLng: cur.customerLng,
        distanceKm: 0,
        etaMinutes: 0,
      };
      setIsAutoMoving(false);
      setTracking(updated);
      broadcastTrackingState(updated);
      syncWithGlobalOrder('DELIVERED');
    }
  };

  const handleSaveDriverAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drvFullName.trim() || !drvLicensePlate.trim()) return;

    const updatedDriver: DriverProfile = {
      ...currentDriver,
      fullName: drvFullName.trim(),
      phoneNumber: drvPhone.trim(),
      email: drvEmail.trim(),
      nationalId: drvNationalId.trim(),
      driverLicenseNumber: drvLicenseNum.trim(),
      vehicleType: drvVehicleType.trim(),
      licensePlate: drvLicensePlate.trim().toUpperCase(),
      operatingZone: drvZone.trim(),
      bankName: drvBankName.trim(),
      bankAccountNumber: drvBankAcc.trim(),
      bankAccountHolder: drvBankHolder.trim().toUpperCase(),
      emergencyContact: drvEmergency.trim(),
    };

    const updatedUser: User | undefined = currentUser
      ? {
          ...currentUser,
          fullName: drvFullName.trim(),
          phoneNumber: drvPhone.trim(),
          email: drvEmail.trim(),
          address: drvZone.trim(),
          bankName: drvBankName.trim(),
          bankAccountNumber: drvBankAcc.trim(),
          bankAccountHolder: drvBankHolder.trim().toUpperCase(),
          ...(drvNewPassword.trim() ? { password: drvNewPassword.trim() } : {}),
        }
      : undefined;

    onUpdateDriverProfile?.(updatedDriver, updatedUser);
    setDrvNewPassword('');
    setProfileSavedNotice('Đã lưu thông tin hồ sơ tài xế và phương tiện thành công.');
    setTimeout(() => setProfileSavedNotice(''), 3000);
  };

  const isDriverSubTab =
    activeTab === 'driver-orders' ||
    activeTab === 'driver-map' ||
    activeTab === 'driver-earnings' ||
    activeTab === 'driver-profile';

  const completedDriverOrders = allOrders.filter((o) => o.status === 'COMPLETED');
  const totalShippingEarned =
    completedDriverOrders.reduce((s, o) => s + (o.deliveryFee || 15000), 0) + currentDriver.walletBalance;
  const driverNetIncome = Math.round(totalShippingEarned * 0.85);

  // ============================================================================
  // 1. STANDALONE DRIVER PARTNER PORTAL (DARK SIDEBAR + OPERATIONAL WORKSPACE)
  // ============================================================================
  if (isDriverMode || isDriverSubTab) {
    const currentDriverTab = isDriverSubTab ? activeTab : 'driver-orders';

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', color: '#0F172A' }}>
        {/* Left Sidebar — Driver Partner Shell */}
        <aside
          style={{
            width: 268,
            background: '#0F172A',
            color: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderRight: '1px solid #1E293B',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            zIndex: 40,
          }}
        >
          {/* Driver Brand Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                }}
              >
                DRV
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.02rem', color: '#FFFFFF', letterSpacing: -0.3 }}>
                  DineGo Driver
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>
                  TÀI KHOẢN TÀI XẾ ĐỘC LẬP
                </div>
              </div>
            </div>
          </div>

          {/* Driver Personal & Vehicle Info Box */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B', background: '#1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <img
                src={
                  currentDriver.avatarUrl ||
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'
                }
                alt={currentDriver.fullName}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #38BDF8' }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>{currentDriver.fullName}</div>
                <div style={{ fontSize: '0.73rem', color: '#94A3B8' }}>{currentDriver.email}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginBottom: 4 }}>
              Phương tiện: <strong>{currentDriver.vehicleType}</strong>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#38BDF8', fontWeight: 700, marginBottom: 10 }}>
              Biển số: {currentDriver.licensePlate}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: driverOnline ? '#34D399' : '#94A3B8',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: driverOnline ? '#10B981' : '#64748B',
                  }}
                />
                {driverOnline ? 'Đang trực tuyến' : 'Đã nghỉ ca'}
              </span>
              <button
                onClick={() => setDriverOnline(!driverOnline)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: driverOnline ? '#334155' : '#0284C7',
                  color: '#FFFFFF',
                }}
              >
                {driverOnline ? 'Nghỉ ca' : 'Bật nhận chuyến'}
              </button>
            </div>
          </div>

          {/* Driver Sidebar Navigation */}
          <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {[
              {
                id: 'driver-orders' as NavTab,
                label: 'Nhận & Xử Lý Chuyến',
                icon: <ClipboardList size={17} />,
              },
              {
                id: 'driver-map' as NavTab,
                label: 'Bản Đồ Điều Hướng GPS',
                icon: <Navigation size={17} />,
              },
              {
                id: 'driver-earnings' as NavTab,
                label: 'Ví Thu Nhập & Đối Soát',
                icon: <Wallet size={17} />,
              },
              {
                id: 'driver-profile' as NavTab,
                label: 'Quản Lý Tài Khoản & Xe',
                icon: <UserIcon size={17} />,
              },
            ].map((item) => {
              const active = currentDriverTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 14px',
                    borderRadius: 8,
                    background: active ? '#0284C7' : 'transparent',
                    color: active ? '#FFFFFF' : '#CBD5E1',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.86rem',
                    textAlign: 'left',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Driver Sidebar Footer — Logout Only (Sticky at bottom) */}
          <div
            style={{
              padding: 16,
              borderTop: '1px solid #1E293B',
              marginTop: 'auto',
              position: 'sticky',
              bottom: 0,
              background: '#0F172A',
              zIndex: 10,
            }}
          >
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#1E293B',
                  border: '1px solid #334155',
                  color: '#F87171',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={15} /> Đăng xuất tài khoản
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Operational Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top Operational Header */}
          <header
            style={{
              height: 64,
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '0 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 30,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {currentDriverTab === 'driver-orders' && 'Bảng Điều Phối & Xác Nhận Giao Nhận'}
                {currentDriverTab === 'driver-map' && 'Bản Đồ Lộ Trình Thời Gian Thực & Geofence 100m'}
                {currentDriverTab === 'driver-earnings' && 'Ví Thu Nhập Tài Xế & Lịch Sử Đối Soát'}
                {currentDriverTab === 'driver-profile' && 'Quản Lý Hồ Sơ Tài Xế & Thông Tin Phương Tiện'}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Khu vực: <strong>{currentDriver.operatingZone}</strong>
              </div>
              <div style={{ height: 18, width: 1, background: '#E2E8F0' }} />
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Đánh giá: <strong style={{ color: '#0F172A' }}>{currentDriver.rating} ★</strong> ({currentDriver.completedTrips} chuyến)
              </div>
              <div style={{ height: 18, width: 1, background: '#E2E8F0' }} />
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Số dư ví: <strong style={{ color: '#0284C7' }}>{driverNetIncome.toLocaleString('vi-VN')}đ</strong>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Đăng xuất tài xế"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: 6,
                  }}
                >
                  <LogOut size={13} />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </header>

          <div style={{ padding: 28, maxWidth: 1240, width: '100%' }}>
            {/* TAB 1: DRIVER ORDERS & ACTIVE DISPATCH */}
            {currentDriverTab === 'driver-orders' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Active Order Dispatch Card */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    padding: 24,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: '#E0F2FE',
                          color: '#0369A1',
                        }}
                      >
                        Chuyến đang thực hiện
                      </span>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '6px 0 0 0', fontVariantNumeric: 'tabular-nums' }}>
                        Mã vận đơn: #{tracking.orderNumber}
                      </h2>
                    </div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Cước giao hàng</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
                        +{(activeOrder?.deliveryFee || 15000).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>

                  {/* Route Pickup -> Dropoff */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      borderRadius: 10,
                      padding: 16,
                      border: '1px solid #E2E8F0',
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: '#FEF3C7',
                          color: '#D97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Store size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          Điểm lấy hàng (Nhà hàng)
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#0F172A' }}>
                          {tracking.restaurantName}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>{tracking.restaurantAddress}</div>
                        <div style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 600, marginTop: 2 }}>
                          SĐT Quán: {activeOrder?.merchant?.phoneNumber || '0901000002'}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 1, background: '#E2E8F0', margin: '10px 0 14px 40px' }} />

                    <div style={{ display: 'flex', gap: 12 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: '#DCFCE7',
                          color: '#15803D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <MapPin size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          Điểm giao hàng (Khách nhận)
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#0F172A' }}>
                          {activeOrder?.recipientName || 'Nguyễn Văn An'} — {activeOrder?.recipientPhone || '0901000004'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>{tracking.customerAddress}</div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items & COD Check */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                      Chi tiết món cần kiểm tra khi nhận tại bếp:
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontVariantNumeric: 'tabular-nums' }}>
                      {(activeOrder?.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.84rem',
                            padding: '4px 0',
                            borderBottom: idx < (activeOrder?.items.length || 1) - 1 ? '1px dashed #E2E8F0' : 'none',
                          }}
                        >
                          <span>
                            <strong>{item.quantity}x</strong> {item.itemName}
                          </span>
                          <span style={{ fontWeight: 600 }}>{item.subtotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                      ))}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          paddingTop: 8,
                          marginTop: 6,
                          borderTop: '1px solid #E2E8F0',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                        }}
                      >
                        <span>
                          Thu hộ khách (COD / MoMo):{' '}
                          <span style={{ color: activeOrder?.payment?.paymentMethod === 'COD' ? '#DC2626' : '#059669' }}>
                            {activeOrder?.payment?.paymentMethod === 'COD' ? 'Thu tiền mặt' : 'Đã thanh toán MoMo'}
                          </span>
                        </span>
                        <span>
                          {activeOrder?.payment?.paymentMethod === 'COD'
                            ? `${(activeOrder?.finalTotal || 0).toLocaleString('vi-VN')}đ`
                            : '0đ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stepper Controls */}
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                    Cập nhật trạng thái chuyến giao hàng:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      onClick={() => handleStepAction('ARRIVED_AT_STORE')}
                      style={{
                        padding: '11px 14px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: tracking.status === 'ARRIVED_AT_STORE' ? '#0284C7' : '#FFFFFF',
                        color: tracking.status === 'ARRIVED_AT_STORE' ? '#FFFFFF' : '#0F172A',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                      }}
                    >
                      1. Đã đến nhà hàng
                    </button>
                    <button
                      onClick={() => handleStepAction('DELIVERING')}
                      style={{
                        padding: '11px 14px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: tracking.status === 'DELIVERING' ? '#0284C7' : '#FFFFFF',
                        color: tracking.status === 'DELIVERING' ? '#FFFFFF' : '#0F172A',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                      }}
                    >
                      2. Đã lấy món & Đi giao
                    </button>
                    <button
                      onClick={() => handleStepAction('ARRIVED_AT_DESTINATION')}
                      style={{
                        padding: '11px 14px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: tracking.status === 'ARRIVED_AT_DESTINATION' ? '#0284C7' : '#FFFFFF',
                        color: tracking.status === 'ARRIVED_AT_DESTINATION' ? '#FFFFFF' : '#0F172A',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                      }}
                    >
                      3. Đã tới điểm giao (&lt;100m)
                    </button>
                    <button
                      onClick={() => handleStepAction('DELIVERED')}
                      style={{
                        padding: '11px 14px',
                        borderRadius: 8,
                        background: '#059669',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                      }}
                    >
                      4. Hoàn tất giao hàng
                    </button>
                  </div>
                </div>

                {/* Right Column: Queue of Available Orders in Area */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    padding: 24,
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                    Danh Sách Đơn Trong Khu Vực ({allOrders.length})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 16 }}>
                    Các đơn hàng từ đối tác nhà hàng trong bán kính 3km quanh vị trí của {currentDriver.fullName}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {allOrders.map((ord) => (
                      <div
                        key={ord.id}
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                            #{ord.orderNumber} — {ord.merchant?.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                            Giao tới: {ord.deliveryAddress}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 700, marginTop: 4 }}>
                            Trạng thái: {ord.status} • Cước phí: {(ord.deliveryFee || 15000).toLocaleString('vi-VN')}đ
                          </div>
                        </div>

                        {ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED' && (
                          <button
                            onClick={() => onUpdateOrderStatus?.(ord.id, 'DELIVERING')}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 6,
                              background: '#0284C7',
                              color: '#FFFFFF',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Nhận giao
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DRIVER GPS MAP & TELEMETRY */}
            {currentDriverTab === 'driver-map' && (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Bản Đồ Lộ Trình Giao Hàng — #{tracking.orderNumber}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                      Tài xế: {currentDriver.fullName} ({currentDriver.licensePlate}) • Khoảng cách còn lại:{' '}
                      <strong>{tracking.distanceKm} km</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button
                      onClick={() => setIsAutoMoving(!isAutoMoving)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: isAutoMoving ? '#DC2626' : '#0284C7',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {isAutoMoving ? 'Tạm dừng di chuyển' : 'Mô phỏng di chuyển GPS'}
                    </button>
                    <button
                      onClick={handleUseDeviceGps}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#ECFEFF',
                        color: '#0369A1',
                        border: '1px solid #BAE6FD',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Crosshair size={14} />
                      Dùng GPS thật
                    </button>
                    <button
                      onClick={() => handleStepAction('ARRIVED_AT_DESTINATION')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: '#F1F5F9',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      Vào vùng Geofence (&lt;100m)
                    </button>
                  </div>
                </div>

                {gpsStatusNotice && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      color: '#0369A1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    {gpsStatusNotice}
                  </div>
                )}

                {/* Real OpenStreetMap + OSRM Interactive Map */}
                <DeliveryMap
                  store={{
                    lat: tracking.storeLat,
                    lng: tracking.storeLng,
                    name: tracking.restaurantName,
                    address: tracking.restaurantAddress,
                  }}
                  customer={{
                    lat: tracking.customerLat,
                    lng: tracking.customerLng,
                    label: 'Điểm giao khách',
                    address: tracking.customerAddress,
                  }}
                  shipper={{
                    lat: tracking.currentLat,
                    lng: tracking.currentLng,
                    name: tracking.driverName,
                    plate: tracking.licensePlate,
                    heading: tracking.heading,
                  }}
                  routePoints={routePoints}
                  driverToStorePoints={
                    tracking.status === 'ASSIGNED' ? driverToStorePoints : undefined
                  }
                  status={tracking.status}
                  distanceKm={tracking.distanceKm}
                  etaMinutes={tracking.etaMinutes}
                  routeSource={routeSource}
                  height={400}
                  showGeofenceCircles={true}
                  onMapClickPoint={handleMapClickPoint}
                  accentColor="#0284C7"
                />

                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 8,
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span>
                    Tọa độ GPS: <strong>{tracking.currentLat.toFixed(5)}°N, {tracking.currentLng.toFixed(5)}°E</strong>
                  </span>
                  <span>
                    Geofence 100m:{' '}
                    <strong style={{ color: tracking.distanceKm <= 0.1 ? '#16A34A' : '#D97706' }}>
                      {tracking.distanceKm <= 0.1
                        ? 'Đạt chuẩn mở khóa giao hàng'
                        : 'Đang ngoài bán kính 100m'}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: DRIVER WALLET & EARNINGS LEDGER */}
            {currentDriverTab === 'driver-earnings' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 24, fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ background: '#FFFFFF', padding: 22, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                      Tổng cước giao hàng tích lũy
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
                      {totalShippingEarned.toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: 4 }}>
                      {currentDriver.completedTrips + completedDriverOrders.length} chuyến hoàn thành
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: 22, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                      Thu nhập thực nhận (85%)
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284C7' }}>
                      {driverNetIncome.toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 4 }}>
                      Đã khấu trừ 15% phí nền tảng & thuế
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: 22, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                      Tài khoản nhận đối soát
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                      {currentDriver.bankName} • {currentDriver.bankAccountNumber}
                    </div>
                    <button
                      onClick={() => setWithdrawnNotice(true)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        background: '#059669',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ArrowUpRight size={15} /> Rút tiền về ngân hàng
                    </button>
                  </div>
                </div>

                {withdrawnNotice && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#DCFCE7',
                      color: '#166534',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      marginBottom: 20,
                    }}
                  >
                    Yêu cầu rút {driverNetIncome.toLocaleString('vi-VN')}đ về tài khoản {currentDriver.bankName} ({currentDriver.bankAccountNumber} - {currentDriver.bankAccountHolder}) đã được ghi nhận.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DRIVER ACCOUNT & VEHICLE PROFILE MANAGEMENT */}
            {currentDriverTab === 'driver-profile' && (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 28,
                }}
              >
                {profileSavedNotice && (
                  <div
                    style={{
                      marginBottom: 18,
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={17} color="#059669" />
                    <span>{profileSavedNotice}</span>
                  </div>
                )}

                <form onSubmit={handleSaveDriverAccount}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                    Quản Lý Thông Tin Tài Khoản & Phương Tiện Tài Xế
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: 22 }}>
                    Cập nhật thông tin cá nhân, giấy phép lái xe, biển số phương tiện và tài khoản ngân hàng nhận thu nhập
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Họ và tên tài xế *
                      </label>
                      <input
                        type="text"
                        value={drvFullName}
                        onChange={(e) => setDrvFullName(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số điện thoại liên lạc *
                      </label>
                      <input
                        type="text"
                        value={drvPhone}
                        onChange={(e) => setDrvPhone(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Email tài khoản *
                      </label>
                      <input
                        type="email"
                        value={drvEmail}
                        onChange={(e) => setDrvEmail(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số Căn cước công dân (CCCD)
                      </label>
                      <input
                        type="text"
                        value={drvNationalId}
                        onChange={(e) => setDrvNationalId(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số Giấy phép lái xe (GPLX)
                      </label>
                      <input
                        type="text"
                        value={drvLicenseNum}
                        onChange={(e) => setDrvLicenseNum(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Loại xe máy đăng ký *
                      </label>
                      <input
                        type="text"
                        value={drvVehicleType}
                        onChange={(e) => setDrvVehicleType(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Biển kiểm soát phương tiện *
                      </label>
                      <input
                        type="text"
                        value={drvLicensePlate}
                        onChange={(e) => setDrvLicensePlate(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Khu vực hoạt động chính
                      </label>
                      <input
                        type="text"
                        value={drvZone}
                        onChange={(e) => setDrvZone(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Ngân hàng thụ hưởng
                      </label>
                      <input
                        type="text"
                        value={drvBankName}
                        onChange={(e) => setDrvBankName(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số tài khoản ngân hàng
                      </label>
                      <input
                        type="text"
                        value={drvBankAcc}
                        onChange={(e) => setDrvBankAcc(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Chủ tài khoản ngân hàng
                      </label>
                      <input
                        type="text"
                        value={drvBankHolder}
                        onChange={(e) => setDrvBankHolder(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Liên hệ khẩn cấp (Người thân)
                      </label>
                      <input
                        type="text"
                        value={drvEmergency}
                        onChange={(e) => setDrvEmergency(e.target.value)}
                        placeholder="Số điện thoại & Họ tên người thân"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Đổi mật khẩu đăng nhập (Bỏ trống nếu giữ nguyên)
                      </label>
                      <input
                        type="password"
                        value={drvNewPassword}
                        onChange={(e) => setDrvNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới nếu muốn thay đổi..."
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '11px 24px',
                      borderRadius: 8,
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Save size={16} /> Lưu thông tin tài xế & phương tiện
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. CUSTOMER ORDER TRACKING VIEW (RENDERED INSIDE CUSTOMER STOREFRONT)
  // ============================================================================
  if (!activeOrder) {
    return (
      <div className="container" style={{ padding: '64px 20px', maxWidth: 680, textAlign: 'center' }}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: '44px 28px',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#F0FDF4',
              color: '#00B14F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Bike size={30} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            Chưa có đơn hàng nào đang giao
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem', marginBottom: 24, lineHeight: 1.6 }}>
            Khi bạn đặt đơn hàng bằng tài khoản của mình, hành trình tài xế và bản đồ giao hàng trực tiếp sẽ hiển thị tại đây.
          </p>
          {onExploreFood && (
            <button
              onClick={onExploreFood}
              className="btn btn-primary"
              style={{ padding: '11px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.92rem' }}
            >
              Khám phá nhà hàng & Đặt món ngay
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '28px 20px 60px', maxWidth: 1120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#00B14F',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            Theo dõi hành trình đơn hàng trực tuyến
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 0 0', fontVariantNumeric: 'tabular-nums' }}>
            Đơn hàng #{tracking.orderNumber}
          </h1>
        </div>

        <button
          onClick={() => {
            setTracking((p) => ({
              ...p,
              status: 'DELIVERING',
              distanceKm: 1.4,
              etaMinutes: 8,
            }));
          }}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={14} /> Làm mới vị trí
        </button>
      </div>

      {/* 4-Step Progress Bar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {[
          { key: 'ASSIGNED', label: '1. Đã ghép tài xế', desc: 'Tài xế đã nhận đơn' },
          { key: 'ARRIVED_AT_STORE', label: '2. Đang lấy món', desc: 'Tài xế tại nhà hàng' },
          { key: 'DELIVERING', label: '3. Đang giao hàng', desc: `Dự kiến ${tracking.etaMinutes} phút` },
          { key: 'DELIVERED', label: '4. Đã giao thành công', desc: 'Hoàn tất đơn hàng' },
        ].map((st, idx) => {
          const orderIdx = ['ASSIGNED', 'ARRIVED_AT_STORE', 'DELIVERING', 'ARRIVED_AT_DESTINATION', 'DELIVERED'].indexOf(
            tracking.status,
          );
          const active =
            idx === 0
              ? orderIdx >= 0
              : idx === 1
              ? orderIdx >= 1
              : idx === 2
              ? orderIdx >= 2
              : orderIdx >= 4;

          return (
            <div
              key={st.key}
              style={{
                borderTop: `3px solid ${active ? '#00B14F' : '#E2E8F0'}`,
                paddingTop: 10,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: active ? '#0F172A' : '#94A3B8' }}>
                {st.label}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>{st.desc}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Live Map */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 12, paddingBottom: 0 }}>
            <DeliveryMap
              store={{
                lat: tracking.storeLat,
                lng: tracking.storeLng,
                name: tracking.restaurantName,
                address: tracking.restaurantAddress,
              }}
              customer={{
                lat: tracking.customerLat,
                lng: tracking.customerLng,
                label: 'Điểm nhận hàng của bạn',
                address: tracking.customerAddress,
              }}
              shipper={{
                lat: tracking.currentLat,
                lng: tracking.currentLng,
                name: tracking.driverName,
                plate: tracking.licensePlate,
                heading: tracking.heading,
              }}
              routePoints={routePoints}
              driverToStorePoints={
                tracking.status === 'ASSIGNED' ? driverToStorePoints : undefined
              }
              status={tracking.status}
              distanceKm={tracking.distanceKm}
              etaMinutes={tracking.etaMinutes}
              routeSource={routeSource}
              height={380}
              showGeofenceCircles={true}
              accentColor="#00B14F"
            />
          </div>

          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.84rem',
              color: '#475569',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>Khoảng cách còn lại: <strong>{tracking.distanceKm.toFixed(2)} km</strong></span>
            <span>Thời gian dự kiến: <strong style={{ color: '#00B14F' }}>{tracking.etaMinutes} phút</strong></span>
          </div>
        </div>

        {/* Right: Driver Info & Delivery Address */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
              Thông tin tài xế giao đơn
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.02rem', color: '#0F172A' }}>{tracking.driverName}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 2 }}>
                  Biển số: <strong>{tracking.licensePlate}</strong> • Đánh giá {tracking.driverRating} ★
                </div>
              </div>
              <a
                href={`tel:${tracking.driverPhone}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#F0FDF4',
                  color: '#00B14F',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Phone size={14} /> {tracking.driverPhone}
              </a>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, fontSize: '0.84rem', color: '#334155' }}>
              <div style={{ marginBottom: 6 }}>
                <strong>Nhà hàng:</strong> {tracking.restaurantName}
              </div>
              <div>
                <strong>Giao đến:</strong> {tracking.customerAddress}
              </div>
            </div>
          </div>

          {tracking.status === 'DELIVERED' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803D', fontWeight: 800, marginBottom: 8 }}>
                <CheckCircle2 size={18} /> Đơn hàng đã giao thành công
              </div>
              <p style={{ fontSize: '0.82rem', color: '#166534', marginBottom: 14 }}>
                Cảm ơn bạn đã đặt món trên DineGo. Hãy chia sẻ đánh giá để giúp nhà hàng nâng cao chất lượng phục vụ.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {activeOrder && onOpenReviewModal && (
                  <button
                    onClick={() => onOpenReviewModal(activeOrder)}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: 8,
                      background: '#00B14F',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Star size={14} /> Đánh giá món ăn
                  </button>
                )}
                {onExploreFood && (
                  <button
                    onClick={onExploreFood}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 8,
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                    }}
                  >
                    Đặt thêm món
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
