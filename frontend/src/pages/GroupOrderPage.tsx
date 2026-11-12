// ==============================================================================
// DineGo Frontend — Group Order & Split Bill Page (GrabFood Market Style)
// Account-based group rooms, account-verified member invitations, real menu & split
// ==============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Trash2,
  Lock,
  Unlock,
  Receipt,
  CheckCircle2,
  ShoppingBag,
  Copy,
  Plus,
  Minus,
  Search,
  Star,
  Clock,
  Sparkles,
  ShieldCheck,
  Tag,
  ThumbsUp,
  UserPlus,
  Users,
  Check,
  Store,
  X,
  ArrowRight,
  MapPin,
  LogIn,
  RotateCcw,
  Share2,
  AlertCircle,
  Mail,
  Bell,
} from 'lucide-react';
import { API_BASE_URL, MOCK_MERCHANTS, MOCK_MENU_ITEMS } from '../api/client';
import { getDefaultVerifiedAddress } from '../utils/routing';
import type { NavTab } from '../components/common/Header';
import type {
  MenuItem,
  Merchant,
  Order,
  OrderItem,
  Topping,
  User,
} from '../types';

export interface GroupMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isHost: boolean;
  inviteStatus: 'JOINED' | 'PENDING';
  initials: string;
  avatarBg: string;
}

export interface GroupItemTopping {
  id: string;
  toppingId: string;
  name: string;
  price: number;
}

export interface GroupCartItem {
  id: string;
  memberId: string;
  memberName: string;
  dishId: string;
  dishName: string;
  imageUrl?: string;
  basePrice: number;
  quantity: number;
  toppings: GroupItemTopping[];
  note?: string;
  subtotal: number;
}

export interface GroupRoomState {
  roomCode: string;
  groupName: string;
  hostUserId: string;
  merchantId: string;
  members: GroupMember[];
  items: GroupCartItem[];
  splitMode: 'BY_ITEM' | 'EQUAL';
  isLocked: boolean;
  checkoutDone: boolean;
  createdAt: string;
}

export interface GroupOrderPageProps {
  merchants?: Merchant[];
  menuItemsMap?: Record<string, MenuItem[]>;
  currentUser?: User | null;
  allUsers?: User[];
  onOrderPlaced?: (order: Order) => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
  onOpenAddressSetup?: () => void;
  onNavigate?: (tab: NavTab) => void;
}

const AVATAR_COLORS = [
  '#00B14F',
  '#0284C7',
  '#7C3AED',
  '#D97706',
  '#E11D48',
  '#0891B2',
  '#4F46E5',
];

const ROOMS_REGISTRY_KEY = 'dinego_group_rooms_v3';

const getAccountActiveRoomKey = (userId: string) =>
  `dinego_active_group_code_v3_${userId}`;

const getInitials = (name: string): string => {
  const cleaned = name.replace(/\s*\(Bạn\)\s*/g, '').trim();
  if (!cleaned) return 'DG';
  const words = cleaned.split(/\s+/);
  return words.length >= 2
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : cleaned.slice(0, 2).toUpperCase();
};

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `DG-${suffix}`;
};

const createUniqueId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const createTransactionRef = (): string =>
  `MOMO-GRP-${Math.floor(10000000 + Math.random() * 90000000)}`;

const createGroupOrderNumber = (date: Date): string =>
  `DG${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}-GRP${Math.floor(100 + Math.random() * 900)}`;

const readRoomsRegistry = (): Record<string, GroupRoomState> => {
  try {
    const raw = localStorage.getItem(ROOMS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveRoomToRegistry = (room: GroupRoomState) => {
  try {
    const reg = readRoomsRegistry();
    reg[room.roomCode.toUpperCase()] = room;
    localStorage.setItem(ROOMS_REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    // Ignore storage errors
  }
  void fetch(`${API_BASE_URL}/group-orders/live/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room),
  }).catch(() => {});
};

const deleteRoomFromRegistry = (roomCode: string) => {
  const code = roomCode.trim().toUpperCase();
  try {
    const reg = readRoomsRegistry();
    delete reg[code];
    localStorage.setItem(ROOMS_REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    // Ignore storage errors
  }
  void fetch(`${API_BASE_URL}/group-orders/live/rooms/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  }).catch(() => {});
};

const readStoredUsersList = (): User[] => {
  const collected: User[] = [];
  try {
    const rawList = localStorage.getItem('dinego_users_list');
    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) collected.push(...parsed);
    }
    const rawSingle = localStorage.getItem('dinego_user');
    if (rawSingle) {
      const parsedSingle = JSON.parse(rawSingle);
      if (parsedSingle?.email) collected.push(parsedSingle);
    }
  } catch {
    // Ignore parse errors
  }
  return collected;
};

const mergeAccountLists = (...lists: User[][]): User[] => {
  const byEmail = new Map<string, User>();
  for (const list of lists) {
    for (const u of list) {
      if (!u?.email) continue;
      const key = u.email.trim().toLowerCase();
      const existing = byEmail.get(key);
      byEmail.set(key, existing ? { ...u, ...existing } : u);
    }
  }
  return Array.from(byEmail.values());
};

const isMemberMatchingUser = (member: GroupMember, user: User): boolean =>
  member.userId === user.id ||
  member.email.trim().toLowerCase() === user.email.trim().toLowerCase();

const userToGroupMember = (
  user: User,
  isHost: boolean,
  inviteStatus: 'JOINED' | 'PENDING',
  colorIdx: number,
): GroupMember => ({
  id: `m-${user.id}`,
  userId: user.id,
  name: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  avatarUrl: user.avatarUrl,
  isHost,
  inviteStatus,
  initials: getInitials(user.fullName),
  avatarBg: isHost ? '#00B14F' : AVATAR_COLORS[colorIdx % AVATAR_COLORS.length],
});

export const GroupOrderPage: React.FC<GroupOrderPageProps> = ({
  merchants = MOCK_MERCHANTS,
  menuItemsMap = MOCK_MENU_ITEMS,
  currentUser,
  allUsers = [],
  onOrderPlaced,
  onOpenAuthModal,
  onOpenAddressSetup,
  onNavigate,
}) => {
  // Registry snapshot so invitations & rooms stay synchronized across accounts & tabs
  const [roomsRegistry, setRoomsRegistry] = useState<Record<string, GroupRoomState>>(
    () => readRoomsRegistry(),
  );
  const [remoteUsers, setRemoteUsers] = useState<User[]>(() => readStoredUsersList());
  const [setupInviteFocused, setSetupInviteFocused] = useState(false);

  const availableUsers = useMemo(
    () => mergeAccountLists(allUsers, readStoredUsersList(), remoteUsers),
    [allUsers, remoteUsers],
  );

  // Sync both registered accounts & shared group rooms from localStorage + backend live registry
  useEffect(() => {
    let active = true;
    const syncFromRemoteAndStorage = async () => {
      const storedUsers = readStoredUsersList();
      if (active && storedUsers.length > 0) {
        setRemoteUsers((prev) => mergeAccountLists(prev, storedUsers));
      }
      const localRooms = readRoomsRegistry();
      try {
        const [accRes, roomRes] = await Promise.all([
          fetch(`${API_BASE_URL}/group-orders/live/accounts`),
          fetch(`${API_BASE_URL}/group-orders/live/rooms`),
        ]);
        if (active && accRes.ok) {
          const accList = (await accRes.json()) as User[];
          if (Array.isArray(accList)) {
            setRemoteUsers((prev) => mergeAccountLists(prev, storedUsers, accList));
          }
        }
        if (active && roomRes.ok) {
          const liveRoomList = (await roomRes.json()) as GroupRoomState[];
          if (Array.isArray(liveRoomList)) {
            const mergedRooms: Record<string, GroupRoomState> = { ...localRooms };
            for (const lr of liveRoomList) {
              if (lr?.roomCode) mergedRooms[lr.roomCode.toUpperCase()] = lr;
            }
            setRoomsRegistry(mergedRooms);
            try {
              localStorage.setItem(ROOMS_REGISTRY_KEY, JSON.stringify(mergedRooms));
            } catch {
              // Ignore storage errors
            }
          }
        }
      } catch {
        if (active) {
          setRoomsRegistry((prev) => ({ ...prev, ...localRooms }));
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dinego_users_list' || e.key === 'dinego_user') {
        setRemoteUsers((prev) => mergeAccountLists(prev, readStoredUsersList()));
      }
      if (e.key === ROOMS_REGISTRY_KEY) {
        setRoomsRegistry(readRoomsRegistry());
      }
    };

    const handleFocus = () => {
      void syncFromRemoteAndStorage();
    };

    void syncFromRemoteAndStorage();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    const timer = window.setInterval(() => {
      void syncFromRemoteAndStorage();
    }, 3000);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(timer);
    };
  }, []);

  // Active room code for current logged-in account (never pre-seeded for new accounts)
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(() => {
    if (!currentUser) return null;
    const reg = readRoomsRegistry();
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('groupRoom')?.trim().toUpperCase();
      if (inviteCode && reg[inviteCode]) {
        const target = reg[inviteCode];
        const alreadyIn = target.members.some((m) => isMemberMatchingUser(m, currentUser));
        if (alreadyIn) {
          return inviteCode;
        }
      }
      const savedCode = localStorage.getItem(getAccountActiveRoomKey(currentUser.id));
      if (savedCode && reg[savedCode]) {
        const savedRoom = reg[savedCode];
        const member = savedRoom.members.find((m) => isMemberMatchingUser(m, currentUser));
        if (member && member.inviteStatus === 'JOINED') {
          return savedCode;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  });

  const room: GroupRoomState | null = activeRoomCode
    ? roomsRegistry[activeRoomCode] || null
    : null;

  // Pending invitations sent to currentUser by other accounts
  const pendingInvitations = useMemo(() => {
    if (!currentUser) return [];
    return Object.values(roomsRegistry).filter(
      (r) =>
        !r.checkoutDone &&
        r.members.some(
          (m) => isMemberMatchingUser(m, currentUser) && m.inviteStatus === 'PENDING',
        ),
    );
  }, [roomsRegistry, currentUser]);

  // Rooms that currentUser has already joined (aside from the currently opened one)
  const myJoinedRooms = useMemo(() => {
    if (!currentUser) return [];
    return Object.values(roomsRegistry).filter((r) =>
      r.members.some(
        (m) => isMemberMatchingUser(m, currentUser) && m.inviteStatus === 'JOINED',
      ),
    );
  }, [roomsRegistry, currentUser]);

  // Persist active room code for currentUser
  useEffect(() => {
    if (!currentUser) return;
    try {
      const key = getAccountActiveRoomKey(currentUser.id);
      if (activeRoomCode) {
        localStorage.setItem(key, activeRoomCode);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  }, [activeRoomCode, currentUser]);

  const updateRoom = (updater: (prev: GroupRoomState) => GroupRoomState) => {
    if (!activeRoomCode) return;
    setRoomsRegistry((prevReg) => {
      const current = prevReg[activeRoomCode];
      if (!current) return prevReg;
      const next = updater(current);
      saveRoomToRegistry(next);
      return { ...prevReg, [activeRoomCode]: next };
    });
  };

  // Setup state when user hasn't opened a group room yet
  const [setupGroupName, setSetupGroupName] = useState('');
  const [setupMerchantId, setSetupMerchantId] = useState<string>('');
  const [setupMerchantSearch, setSetupMerchantSearch] = useState('');
  const [setupAccountQuery, setSetupAccountQuery] = useState('');
  const [setupInvitedUsers, setSetupInvitedUsers] = useState<User[]>([]);
  const [setupInviteError, setSetupInviteError] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('groupRoom') || '';
    } catch {
      return '';
    }
  });
  const [joinError, setJoinError] = useState<string | null>(null);

  // Active room UI states
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMerchantPicker, setShowMerchantPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    if (!currentUser || !room) return '';
    return room.members.find((m) => isMemberMatchingUser(m, currentUser))?.id || room.members[0]?.id || '';
  });
  const [inviteAccountQuery, setInviteAccountQuery] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showAddMemberInput, setShowAddMemberInput] = useState(false);

  // Delivery overrides (fallback directly to currentUser profile — no hardcoded mock data)
  const verifiedAddress = getDefaultVerifiedAddress(currentUser);
  const [deliveryAddressOverride, setDeliveryAddressOverride] = useState<string | null>(null);
  const [recipientPhoneOverride, setRecipientPhoneOverride] = useState<string | null>(null);
  const [recipientNameOverride, setRecipientNameOverride] = useState<string | null>(null);

  const deliveryAddress =
    deliveryAddressOverride ?? (verifiedAddress?.fullAddress || currentUser?.address || '');
  const recipientPhone =
    recipientPhoneOverride ?? (verifiedAddress?.phone || currentUser?.phoneNumber || '');
  const recipientName =
    recipientNameOverride ?? (verifiedAddress?.recipientName || currentUser?.fullName || '');

  // Dish Customizer Modal state
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [modalMemberId, setModalMemberId] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [modalToppings, setModalToppings] = useState<GroupItemTopping[]>([]);
  const [modalNote, setModalNote] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Searchable registered accounts helper (strictly real accounts from merged system accounts)
  const findMatchingAccounts = (query: string, excludedUserIds: string[]): User[] => {
    const q = query.trim().toLowerCase();
    const candidates = availableUsers.filter(
      (u) => u.isActive !== false && !excludedUserIds.includes(u.id),
    );
    if (!q) {
      return candidates.slice(0, 8);
    }
    return candidates
      .filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.phoneNumber || '').toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q),
      )
      .slice(0, 8);
  };

  const setupMatchingAccounts = useMemo(() => {
    const excluded = [
      ...(currentUser ? [currentUser.id] : []),
      ...setupInvitedUsers.map((u) => u.id),
    ];
    return findMatchingAccounts(setupAccountQuery, excluded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupAccountQuery, availableUsers, currentUser, setupInvitedUsers]);

  const activeRoomMatchingAccounts = useMemo(() => {
    const excluded = [
      ...(currentUser ? [currentUser.id] : []),
      ...(room ? room.members.map((m) => m.userId) : []),
    ];
    return findMatchingAccounts(inviteAccountQuery, excluded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteAccountQuery, availableUsers, currentUser, room]);

  const selectedMerchant = useMemo(() => {
    if (!room) return merchants[0] || MOCK_MERCHANTS[0];
    return merchants.find((m) => m.id === room.merchantId) || merchants[0] || MOCK_MERCHANTS[0];
  }, [merchants, room]);

  const rawMenuItems = useMemo(() => {
    if (!selectedMerchant) return [];
    return (
      (menuItemsMap && menuItemsMap[selectedMerchant.id]) ||
      MOCK_MENU_ITEMS[selectedMerchant.id] ||
      []
    );
  }, [menuItemsMap, selectedMerchant]);

  const categories = useMemo(() => {
    const list = [{ id: 'all', label: 'Tất cả món' }];
    const uniqueCats = Array.from(
      new Set(rawMenuItems.map((i) => i.category || i.categoryName || 'Món chính')),
    );
    uniqueCats.forEach((cat) => list.push({ id: cat, label: cat }));
    return list;
  }, [rawMenuItems]);

  const filteredMenuItems = useMemo(() => {
    return rawMenuItems.filter((dish) => {
      const matchSearch =
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dish.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        activeCategory === 'all' ||
        (dish.category || dish.categoryName || 'Món chính') === activeCategory;
      return matchSearch && matchCat;
    });
  }, [rawMenuItems, searchQuery, activeCategory]);

  const filteredSetupMerchants = useMemo(() => {
    const q = setupMerchantSearch.trim().toLowerCase();
    if (!q) return merchants;
    return merchants.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q),
    );
  }, [merchants, setupMerchantSearch]);

  // --- Setup & Invitation Handlers ---
  const handleInviteAccountInSetup = (account: User) => {
    if (currentUser && account.id === currentUser.id) return;
    if (setupInvitedUsers.some((u) => u.id === account.id)) return;
    setSetupInvitedUsers((prev) => [...prev, account]);
    setSetupAccountQuery('');
    setSetupInviteError(null);
  };

  const handleExactInviteInSetup = () => {
    const q = setupAccountQuery.trim().toLowerCase();
    if (!q) {
      setSetupInviteError('Vui lòng nhập email, số điện thoại hoặc tên tài khoản.');
      return;
    }
    const exactMatch = availableUsers.find(
      (u) =>
        u.id !== currentUser?.id &&
        u.isActive !== false &&
        (u.email.toLowerCase() === q || (u.phoneNumber || '').toLowerCase() === q),
    );
    const chosen = exactMatch || (setupMatchingAccounts.length === 1 ? setupMatchingAccounts[0] : null);
    if (!chosen) {
      setSetupInviteError(
        'Không tìm thấy tài khoản DineGo phù hợp. Thành viên bắt buộc phải có tài khoản để được mời!',
      );
      return;
    }
    handleInviteAccountInSetup(chosen);
  };

  const handleCreateRoom = () => {
    if (!currentUser) {
      onOpenAuthModal?.('login');
      return;
    }
    if (!setupMerchantId) {
      showToast('Vui lòng chọn quán ăn cho nhóm của bạn!');
      return;
    }

    const hostMember = userToGroupMember(currentUser, true, 'JOINED', 0);
    const invitedMembers = setupInvitedUsers.map((u, idx) =>
      userToGroupMember(u, false, 'PENDING', idx + 1),
    );

    const code = generateRoomCode();
    const cleanGroupName =
      setupGroupName.trim() || `Đơn nhóm của ${currentUser.fullName}`;

    const newRoom: GroupRoomState = {
      roomCode: code,
      groupName: cleanGroupName,
      hostUserId: currentUser.id,
      merchantId: setupMerchantId,
      members: [hostMember, ...invitedMembers],
      items: [],
      splitMode: 'BY_ITEM',
      isLocked: false,
      checkoutDone: false,
      createdAt: new Date().toISOString(),
    };

    saveRoomToRegistry(newRoom);
    setRoomsRegistry((prev) => ({ ...prev, [code]: newRoom }));
    setActiveRoomCode(code);
    setSelectedMemberId(hostMember.id);
    setActiveCategory('all');
    setSearchQuery('');
    showToast(`Đã tạo phòng ${code}! Bạn có thể mời thêm tài khoản khác hoặc bắt đầu chọn món.`);
  };

  const handleAcceptInvitation = (targetRoomCode: string) => {
    if (!currentUser) {
      onOpenAuthModal?.('login');
      return;
    }
    const reg = readRoomsRegistry();
    const targetRoom = reg[targetRoomCode];
    if (!targetRoom) return;

    const updatedMembers = targetRoom.members.map((m) =>
      isMemberMatchingUser(m, currentUser)
        ? { ...m, userId: currentUser.id, name: currentUser.fullName, inviteStatus: 'JOINED' as const }
        : m,
    );
    const updatedRoom: GroupRoomState = { ...targetRoom, members: updatedMembers };
    saveRoomToRegistry(updatedRoom);
    setRoomsRegistry((prev) => ({ ...prev, [targetRoomCode]: updatedRoom }));
    setActiveRoomCode(targetRoomCode);

    const selfMember = updatedMembers.find((m) => isMemberMatchingUser(m, currentUser));
    if (selfMember) setSelectedMemberId(selfMember.id);
    showToast(`Bạn đã tham gia nhóm "${updatedRoom.groupName}"!`);
  };

  const handleDeclineInvitation = (targetRoomCode: string) => {
    if (!currentUser) return;
    const reg = readRoomsRegistry();
    const targetRoom = reg[targetRoomCode];
    if (!targetRoom) return;

    const updatedRoom: GroupRoomState = {
      ...targetRoom,
      members: targetRoom.members.filter((m) => !isMemberMatchingUser(m, currentUser)),
      items: targetRoom.items.filter(
        (it) =>
          !targetRoom.members.some(
            (m) => m.id === it.memberId && isMemberMatchingUser(m, currentUser),
          ),
      ),
    };
    saveRoomToRegistry(updatedRoom);
    setRoomsRegistry((prev) => ({ ...prev, [targetRoomCode]: updatedRoom }));
    showToast('Đã từ chối lời mời tham gia nhóm.');
  };

  const handleJoinRoomByCode = () => {
    if (!currentUser) {
      onOpenAuthModal?.('login');
      return;
    }
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setJoinError('Vui lòng nhập mã phòng nhóm (ví dụ: DG-XXXX).');
      return;
    }
    const reg = { ...readRoomsRegistry(), ...roomsRegistry };
    const targetRoom = reg[code];
    if (!targetRoom) {
      setJoinError(`Không tìm thấy phòng "${code}" trên hệ thống. Vui lòng kiểm tra lại mã.`);
      return;
    }
    if (targetRoom.isLocked || targetRoom.checkoutDone) {
      setJoinError(`Phòng "${code}" đã khóa hoặc đã chốt đơn.`);
      return;
    }

    const existingMember = targetRoom.members.find((m) =>
      isMemberMatchingUser(m, currentUser),
    );
    let updatedMembers = targetRoom.members;
    let joinedMemberId = existingMember?.id;

    if (existingMember) {
      updatedMembers = targetRoom.members.map((m) =>
        m.id === existingMember.id
          ? { ...m, userId: currentUser.id, name: currentUser.fullName, inviteStatus: 'JOINED' as const }
          : m,
      );
    } else {
      const joinedMember = userToGroupMember(
        currentUser,
        false,
        'JOINED',
        targetRoom.members.length,
      );
      updatedMembers = [...targetRoom.members, joinedMember];
      joinedMemberId = joinedMember.id;
    }

    const updatedRoom: GroupRoomState = { ...targetRoom, members: updatedMembers };
    saveRoomToRegistry(updatedRoom);
    setRoomsRegistry((prev) => ({ ...prev, [code]: updatedRoom }));
    setActiveRoomCode(code);
    if (joinedMemberId) setSelectedMemberId(joinedMemberId);
    setJoinError(null);
    showToast(`Đã tham gia phòng ${code} bằng tài khoản ${currentUser.fullName}!`);
  };

  // --- Active Room Handlers ---
  const handleLeaveOrResetRoom = () => {
    if (!room || !currentUser) return;
    const isHost = room.hostUserId === currentUser.id;
    if (isHost) {
      if (room.items.length > 0 && !room.checkoutDone) {
        const ok = window.confirm(
          'Bạn là trưởng nhóm. Giải tán phòng hiện tại sẽ đóng phòng và xóa giỏ hàng chung. Tiếp tục?',
        );
        if (!ok) return;
      }
      deleteRoomFromRegistry(room.roomCode);
      setRoomsRegistry((prev) => {
        const copy = { ...prev };
        delete copy[room.roomCode];
        return copy;
      });
    }
    setActiveRoomCode(null);
    setSetupGroupName('');
    setSetupMerchantId('');
    setSetupInvitedUsers([]);
    setShowMerchantPicker(false);
    setShowAddMemberInput(false);
  };

  const handleSelectRestaurant = (merchant: Merchant) => {
    if (!room) return;
    if (merchant.id === room.merchantId) {
      setShowMerchantPicker(false);
      return;
    }
    if (room.items.length > 0) {
      const ok = window.confirm(
        `Giỏ hàng nhóm hiện đang có ${room.items.length} món từ "${selectedMerchant.name}". Đổi sang quán "${merchant.name}" sẽ làm mới giỏ hàng nhóm. Bạn có chắc chắn?`,
      );
      if (!ok) return;
    }
    updateRoom((prev) => ({
      ...prev,
      merchantId: merchant.id,
      items: [],
      isLocked: false,
      checkoutDone: false,
    }));
    setActiveCategory('all');
    setSearchQuery('');
    setShowMerchantPicker(false);
    showToast(`Đã chuyển phòng đặt nhóm sang quán ${merchant.name}`);
  };

  const handleInviteAccountToRoom = (account: User) => {
    if (!room) return;
    if (room.members.some((m) => isMemberMatchingUser(m, account))) {
      setInviteError(`Tài khoản ${account.email} đã có trong nhóm rồi.`);
      return;
    }
    const newMember = userToGroupMember(
      account,
      false,
      'PENDING',
      room.members.length,
    );
    updateRoom((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
    setInviteAccountQuery('');
    setInviteError(null);
    setShowAddMemberInput(false);
    showToast(`Đã gửi lời mời tới tài khoản ${account.fullName} (${account.email})`);
  };

  const handleExactInviteInRoom = () => {
    const q = inviteAccountQuery.trim().toLowerCase();
    if (!q) {
      setInviteError('Vui lòng nhập Email, Số điện thoại hoặc tên tài khoản để mời.');
      return;
    }
    const exactMatch = availableUsers.find(
      (u) =>
        u.id !== currentUser?.id &&
        u.isActive !== false &&
        (u.email.toLowerCase() === q || (u.phoneNumber || '').toLowerCase() === q),
    );
    const chosen =
      exactMatch ||
      (activeRoomMatchingAccounts.length === 1 ? activeRoomMatchingAccounts[0] : null);
    if (!chosen) {
      setInviteError(
        'Không tìm thấy tài khoản nào khớp trên DineGo. Vui lòng nhập đúng email/SĐT đã đăng ký tài khoản.',
      );
      return;
    }
    handleInviteAccountToRoom(chosen);
  };

  const handleRemoveMember = (member: GroupMember) => {
    if (!room || member.isHost) return;
    const memberHasItems = room.items.some((it) => it.memberId === member.id);
    if (memberHasItems) {
      const ok = window.confirm(
        `"${member.name}" đang có món trong giỏ nhóm. Xóa thành viên này sẽ xóa các món họ đã chọn. Tiếp tục?`,
      );
      if (!ok) return;
    }
    const remaining = room.members.filter((m) => m.id !== member.id);
    updateRoom((prev) => ({
      ...prev,
      members: remaining,
      items: prev.items.filter((it) => it.memberId !== member.id),
    }));
    if (selectedMemberId === member.id && remaining[0]) {
      setSelectedMemberId(remaining[0].id);
    }
    showToast(`Đã hủy mời / xóa ${member.name} khỏi nhóm.`);
  };

  const handleOpenDishModal = (dish: MenuItem) => {
    if (!room) return;
    if (room.isLocked) {
      showToast('Phòng đặt nhóm đã khóa. Vui lòng mở khóa phòng để thêm món!');
      return;
    }
    const defaultMember =
      room.members.find((m) => m.id === selectedMemberId) ||
      (currentUser
        ? room.members.find((m) => isMemberMatchingUser(m, currentUser))
        : undefined) ||
      room.members[0];
    setSelectedDish(dish);
    setModalMemberId(defaultMember?.id || '');
    setModalQuantity(1);
    setModalToppings([]);
    setModalNote('');
  };

  const handleToggleTopping = (topping: Topping) => {
    const exists = modalToppings.find((t) => t.toppingId === topping.id);
    if (exists) {
      setModalToppings(modalToppings.filter((t) => t.toppingId !== topping.id));
    } else {
      setModalToppings([
        ...modalToppings,
        {
          id: createUniqueId(topping.id),
          toppingId: topping.id,
          name: topping.name,
          price: topping.price,
        },
      ]);
    }
  };

  const handleConfirmAddDishToGroup = () => {
    if (!room || !selectedDish || room.isLocked) return;
    const targetMember =
      room.members.find((m) => m.id === modalMemberId) || room.members[0];
    if (!targetMember) return;
    const toppingsSum = modalToppings.reduce((s, t) => s + t.price, 0);
    const unitPrice = selectedDish.basePrice + toppingsSum;
    const newItem: GroupCartItem = {
      id: createUniqueId('gi'),
      memberId: targetMember.id,
      memberName: targetMember.name,
      dishId: selectedDish.id,
      dishName: selectedDish.name,
      imageUrl: selectedDish.imageUrl,
      basePrice: selectedDish.basePrice,
      quantity: modalQuantity,
      toppings: modalToppings,
      note: modalNote.trim() || undefined,
      subtotal: unitPrice * modalQuantity,
    };
    updateRoom((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedDish(null);
    showToast(`Đã thêm ${modalQuantity}x ${selectedDish.name} cho ${targetMember.name}`);
  };

  const handleQuickAddDish = (e: React.MouseEvent, dish: MenuItem) => {
    e.stopPropagation();
    if (!room) return;
    if (room.isLocked) {
      showToast('Phòng đã khóa! Hãy mở khóa phòng để thêm món.');
      return;
    }
    if (dish.toppings && dish.toppings.length > 0) {
      handleOpenDishModal(dish);
      return;
    }
    const targetMember =
      room.members.find((m) => m.id === selectedMemberId) || room.members[0];
    if (!targetMember) return;
    const newItem: GroupCartItem = {
      id: createUniqueId('gi'),
      memberId: targetMember.id,
      memberName: targetMember.name,
      dishId: dish.id,
      dishName: dish.name,
      imageUrl: dish.imageUrl,
      basePrice: dish.basePrice,
      quantity: 1,
      toppings: [],
      subtotal: dish.basePrice,
    };
    updateRoom((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    showToast(`Đã thêm ${dish.name} cho ${targetMember.name}`);
  };

  const handleUpdateItemQty = (itemId: string, delta: number) => {
    if (!room || room.isLocked) return;
    updateRoom((prev) => {
      const nextItems = prev.items
        .map((it) => {
          if (it.id !== itemId) return it;
          const nextQty = it.quantity + delta;
          if (nextQty <= 0) return null;
          const toppingsSum = it.toppings.reduce((s, t) => s + t.price, 0);
          return {
            ...it,
            quantity: nextQty,
            subtotal: (it.basePrice + toppingsSum) * nextQty,
          };
        })
        .filter(Boolean) as GroupCartItem[];
      return { ...prev, items: nextItems };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!room || room.isLocked) return;
    updateRoom((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));
  };

  const handleCopyLink = () => {
    if (!room) return;
    const shareUrl = `${window.location.origin}/?groupRoom=${room.roomCode}`;
    navigator.clipboard?.writeText?.(shareUrl);
    setCopied(true);
    showToast(`Đã sao chép link mời phòng ${room.roomCode}`);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculations
  const items = room?.items || [];
  const members = room?.members || [];
  const splitMode = room?.splitMode || 'BY_ITEM';
  const isLocked = room?.isLocked || false;
  const checkoutDone = room?.checkoutDone || false;
  const isCurrentUserHost = Boolean(
    currentUser && room && room.hostUserId === currentUser.id,
  );

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = items.length > 0 ? 18000 : 0;
  const groupDiscount = subtotal >= 150000 ? 20000 : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - groupDiscount);

  const memberBreakdowns = members.map((m) => {
    const memberItems = items.filter((i) => i.memberId === m.id);
    const itemTotal = memberItems.reduce((s, it) => s + it.subtotal, 0);
    const shippingShare = members.length > 0 ? Math.round(deliveryFee / members.length) : 0;
    const discountShare = members.length > 0 ? Math.round(groupDiscount / members.length) : 0;

    let finalToPay = 0;
    if (splitMode === 'BY_ITEM') {
      finalToPay =
        itemTotal > 0 || deliveryFee === 0
          ? Math.max(0, itemTotal + shippingShare - discountShare)
          : shippingShare;
    } else {
      finalToPay = members.length > 0 ? Math.round(grandTotal / members.length) : 0;
    }

    return {
      member: m,
      items: memberItems,
      itemTotal,
      shippingShare,
      discountShare,
      finalToPay,
      itemCount: memberItems.reduce((s, it) => s + it.quantity, 0),
    };
  });

  const handleCheckoutGroupOrder = () => {
    if (!room || items.length === 0) return;

    if (!currentUser) {
      showToast('Vui lòng đăng nhập tài khoản để chốt đơn nhóm!');
      onOpenAuthModal?.('login');
      return;
    }

    if (!deliveryAddress.trim() || !recipientPhone.trim()) {
      showToast('Vui lòng nhập đầy đủ địa chỉ giao hàng và số điện thoại nhận hàng!');
      return;
    }

    updateRoom((prev) => ({ ...prev, isLocked: true, checkoutDone: true }));

    if (onOrderPlaced) {
      const now = new Date();
      const orderItems: OrderItem[] = items.map((gi) => ({
        id: gi.id,
        itemName: `[${gi.memberName}] ${gi.dishName}`,
        itemImage: gi.imageUrl || null,
        basePrice: gi.basePrice,
        quantity: gi.quantity,
        subtotal: gi.subtotal,
        note: gi.note || null,
        toppings: gi.toppings.map((t) => ({
          id: t.id,
          toppingName: t.name,
          toppingPrice: t.price,
        })),
      }));

      const newOrder: Order = {
        id: `ord-grp-${now.getTime()}`,
        orderNumber: createGroupOrderNumber(now),
        customerId: currentUser.id,
        customerEmail: currentUser.email,
        status: 'CONFIRMED',
        subtotal,
        discountAmount: groupDiscount,
        deliveryFee,
        finalTotal: grandTotal,
        deliveryAddress: deliveryAddress.trim(),
        deliveryLatitude: verifiedAddress?.latitude || currentUser.addressLat || 10.7745,
        deliveryLongitude: verifiedAddress?.longitude || currentUser.addressLng || 106.7035,
        recipientName: recipientName.trim() || currentUser.fullName,
        recipientPhone: recipientPhone.trim(),
        customerNote: `${room.groupName} (${members.length} thành viên • Phòng ${room.roomCode} • ${
          splitMode === 'BY_ITEM' ? 'Chia theo món' : 'Chia đều đầu người'
        })`,
        createdAt: now.toISOString(),
        merchant: {
          id: selectedMerchant.id,
          name: selectedMerchant.name,
          address: selectedMerchant.address,
          phoneNumber: selectedMerchant.phoneNumber,
          logoUrl: selectedMerchant.logoUrl || null,
          latitude: selectedMerchant.latitude || 10.7769,
          longitude: selectedMerchant.longitude || 106.7009,
        },
        items: orderItems,
        payment: {
          id: `pay-grp-${now.getTime()}`,
          paymentMethod: 'MOMO_QR',
          paymentStatus: 'SUCCESS',
          amount: grandTotal,
          currency: 'VND',
          transactionRef: createTransactionRef(),
          paidAt: now.toISOString(),
        },
      };

      onOrderPlaced(newOrder);
    }
  };

  const totalItemCount = items.reduce((s, i) => s + i.quantity, 0);
  const activeMemberObj =
    members.find((m) => m.id === selectedMemberId) || members[0];
  const modalUnitPrice =
    (selectedDish?.basePrice || 0) +
    modalToppings.reduce((s, t) => s + t.price, 0);

  // ============================================================================
  // VIEW 0: YÊU CẦU ĐĂNG NHẬP TÀI KHOẢN (THÀNH VIÊN PHẢI MỜI QUA TÀI KHOẢN)
  // ============================================================================
  if (!currentUser) {
    return (
      <div className="container" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div
          style={{
            maxWidth: 620,
            margin: '0 auto',
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 22,
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(0, 177, 79, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Users size={30} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
            Đăng nhập tài khoản để Đặt đơn nhóm
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: '0 0 24px 0', lineHeight: 1.55 }}>
            Để tự tạo phòng đặt chung, mời đúng thành viên qua tài khoản DineGo (Email / SĐT) hoặc nhận lời mời từ bạn bè, bạn vui lòng đăng nhập tài khoản của mình.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('login')}
              className="btn btn-primary"
              style={{
                padding: '11px 24px',
                borderRadius: 12,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <LogIn size={16} />
              <span>Đăng nhập ngay</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('register')}
              className="btn btn-outline"
              style={{
                padding: '11px 22px',
                borderRadius: 12,
                fontWeight: 700,
              }}
            >
              Tạo tài khoản mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: TẠO PHÒNG ĐẶT NHÓM & NHẬN LỜI MỜI QUA TÀI KHOẢN
  // ============================================================================
  if (!room) {
    return (
      <div className="container" style={{ paddingTop: 24, paddingBottom: 70 }}>
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0F172A',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: 14,
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              zIndex: 2000,
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            <CheckCircle2 size={18} color="#00B14F" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Pending Invitations Inbox for this logged-in account */}
        {pendingInvitations.length > 0 && (
          <div
            style={{
              background: '#ECFDF5',
              border: '1.5px solid #00B14F',
              borderRadius: 18,
              padding: '16px 22px',
              marginBottom: 22,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#065F46', fontSize: '0.96rem', marginBottom: 10 }}>
              <Bell size={18} color="#00B14F" />
              <span>Bạn có {pendingInvitations.length} lời mời tham gia Đặt đơn nhóm!</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingInvitations.map((inv) => {
                const host = inv.members.find((m) => m.isHost);
                const merchant = merchants.find((m) => m.id === inv.merchantId);
                return (
                  <div
                    key={inv.roomCode}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 12,
                      padding: '12px 16px',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.94rem' }}>
                        {inv.groupName} <span style={{ color: 'var(--primary)' }}>({inv.roomCode})</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Trưởng nhóm: <strong>{host?.name}</strong> ({host?.email}) • Quán: <strong>{merchant?.name}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleDeclineInvitation(inv.roomCode)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          color: '#64748B',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptInvitation(inv.roomCode)}
                        className="btn btn-primary"
                        style={{
                          padding: '8px 16px',
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: '0.82rem',
                        }}
                      >
                        Chấp nhận &amp; Vào nhóm
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Header Banner */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '24px 28px',
            marginBottom: 24,
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(0, 177, 79, 0.1)',
                color: 'var(--primary)',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              <Users size={14} />
              <span>ĐẶT ĐƠN NHÓM • MỜI THÀNH VIÊN QUA TÀI KHOẢN DINEGO</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Tạo Phòng Đặt Món Cùng Nhóm
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Xin chào <strong>{currentUser.fullName}</strong> ({currentUser.email}). Chọn quán ăn và mời thành viên bằng tài khoản DineGo để đặt chung!
            </p>
          </div>

          {myJoinedRooms.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                Nhóm bạn đang tham gia:
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {myJoinedRooms.map((r) => (
                  <button
                    key={r.roomCode}
                    type="button"
                    onClick={() => {
                      setActiveRoomCode(r.roomCode);
                      const me = r.members.find((m) => isMemberMatchingUser(m, currentUser));
                      if (me) setSelectedMemberId(me.id);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--primary)',
                      background: '#ECFDF5',
                      color: '#065F46',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Mở {r.groupName} ({r.roomCode})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(340px, 1fr)',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Left: Choose Restaurant */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 22,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={18} color="var(--primary)" />
                  <span>Bước 1: Chọn quán ăn cho nhóm</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Nhóm của bạn sẽ cùng chọn món từ thực đơn của quán được chọn
                </p>
              </div>

              <div style={{ position: 'relative', minWidth: 210, flex: '0 1 240px' }}>
                <Search
                  size={15}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Tìm tên quán ăn..."
                  value={setupMerchantSearch}
                  onChange={(e) => setSetupMerchantSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-main)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 14,
              }}
            >
              {filteredSetupMerchants.map((m) => {
                const isSelected = setupMerchantId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSetupMerchantId(m.id)}
                    style={{
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 16,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: isSelected ? '#ECFDF5' : '#FFFFFF',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'var(--primary)',
                          color: '#FFFFFF',
                          borderRadius: 999,
                          padding: '3px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          zIndex: 2,
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                        Đã chọn
                      </div>
                    )}
                    <img
                      src={m.coverUrl}
                      alt={m.name}
                      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ padding: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text-main)', marginBottom: 6 }}>
                        {m.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        <span style={{ color: '#B45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Star size={12} fill="#F59E0B" color="#F59E0B" />
                          {m.rating}
                        </span>
                        <span>•</span>
                        <span>{m.deliveryTimeMin}-{m.deliveryTimeMax} phút</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{m.address}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Group Config + Account-based Invite + Join Room */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: 22,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="var(--primary)" />
                <span>Bước 2: Thông tin nhóm &amp; Mời qua tài khoản</span>
              </h2>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Tên nhóm của bạn
                </label>
                <input
                  type="text"
                  placeholder="VD: Ăn trưa văn phòng, Team dự án..."
                  value={setupGroupName}
                  onChange={(e) => setSetupGroupName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Trưởng nhóm (Tài khoản của bạn)
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: '#ECFDF5',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#00B14F',
                      color: '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(currentUser.fullName)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#065F46' }}>
                      {currentUser.fullName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#047857' }}>
                      {currentUser.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account-based member lookup */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Mời thành viên theo Email / SĐT tài khoản (tùy chọn)
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Mail
                      size={14}
                      color="var(--text-muted)"
                      style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      placeholder="Nhập email hoặc SĐT tài khoản..."
                      value={setupAccountQuery}
                      onFocus={() => setSetupInviteFocused(true)}
                      onBlur={() => setTimeout(() => setSetupInviteFocused(false), 180)}
                      onChange={(e) => {
                        setSetupAccountQuery(e.target.value);
                        setSetupInviteError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleExactInviteInSetup()}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 32px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        fontSize: '0.84rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExactInviteInSetup}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--primary)',
                      background: '#ECFDF5',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + Mời
                  </button>
                </div>

                {setupInviteError && (
                  <div style={{ fontSize: '0.76rem', color: '#DC2626', fontWeight: 600, marginBottom: 8 }}>
                    {setupInviteError}
                  </div>
                )}

                {/* Matching accounts dropdown/list */}
                {(setupInviteFocused || setupAccountQuery.trim().length > 0) && (
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: '#FFFFFF',
                      marginBottom: 10,
                      maxHeight: 190,
                      overflowY: 'auto',
                    }}
                  >
                    {setupMatchingAccounts.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Không tìm thấy tài khoản khớp với "{setupAccountQuery}"
                      </div>
                    ) : (
                      setupMatchingAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #F1F5F9',
                            gap: 8,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {acc.fullName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {acc.email}{acc.phoneNumber ? ` • ${acc.phoneNumber}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInviteAccountInSetup(acc)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: 'none',
                              background: 'var(--primary)',
                              color: '#FFFFFF',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            Mời tài khoản
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {setupInvitedUsers.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Thành viên được mời qua tài khoản DineGo (hoặc tham gia bằng mã phòng sau khi tạo).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {setupInvitedUsers.map((u) => (
                      <span
                        key={u.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px',
                          borderRadius: 999,
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        <span>{u.fullName} ({u.email})</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSetupInvitedUsers((prev) => prev.filter((x) => x.id !== u.id))
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'inline-flex',
                          }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={!setupMerchantId}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  opacity: setupMerchantId ? 1 : 0.6,
                  cursor: setupMerchantId ? 'pointer' : 'not-allowed',
                }}
              >
                {setupMerchantId
                  ? `Tạo Phòng Đặt Nhóm (${merchants.find((m) => m.id === setupMerchantId)?.name})`
                  : 'Chọn quán ăn bên trái để tạo phòng'}
              </button>
            </div>

            {/* Join Existing Room by Invite Code */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 18,
                padding: 18,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Share2 size={16} color="#0284C7" />
                <span>Tham gia nhóm bằng mã phòng</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                Nhập mã phòng từ bạn bè để tham gia bằng tài khoản <strong>{currentUser.email}</strong>.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Mã phòng (VD: DG-XXXX)"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value);
                    setJoinError(null);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-main)',
                    fontSize: '0.84rem',
                    outline: 'none',
                  }}
                />
                {joinError && (
                  <div style={{ fontSize: '0.76rem', color: '#DC2626', fontWeight: 600 }}>
                    {joinError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleJoinRoomByCode}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: '1px solid #0284C7',
                    background: '#EFF6FF',
                    color: '#0369A1',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Tham gia phòng bằng tài khoản này
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: PHÒNG ĐẶT NHÓM ĐANG HOẠT ĐỘNG (CHUẨN GIAO DIỆN ĐẶT ĐỒ ĂN + CHIA TIỀN)
  // ============================================================================
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 70 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 14,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 2000,
            fontWeight: 700,
            fontSize: '0.88rem',
          }}
        >
          <CheckCircle2 size={18} color="#00B14F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Group Room Control Banner */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '18px 24px',
          marginBottom: 22,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <span
              style={{
                background: 'rgba(0, 177, 79, 0.1)',
                color: 'var(--primary)',
                padding: '4px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Users size={14} />
              Mã phòng: {room.roomCode}
            </span>
            <button
              onClick={handleCopyLink}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 12px',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Copy size={13} />
              {copied ? 'Đã sao chép liên kết mời!' : 'Sao chép đường dẫn mời nhóm'}
            </button>
            {isCurrentUserHost && (
              <button
                onClick={() => setShowMerchantPicker(!showMerchantPicker)}
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 8,
                  padding: '4px 12px',
                  color: '#1D4ED8',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Store size={13} />
                Đổi quán ({selectedMerchant.name})
              </button>
            )}
            <button
              onClick={handleLeaveOrResetRoom}
              style={{
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                borderRadius: 8,
                padding: '4px 12px',
                color: '#C2410C',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RotateCcw size={13} />
              {isCurrentUserHost ? 'Tạo nhóm mới' : 'Quay lại / Rời nhóm'}
            </button>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
            {room.groupName}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Trưởng nhóm: <strong>{members[0]?.name}</strong> ({members[0]?.email}) •{' '}
            <strong>{members.length}</strong> tài khoản trong phòng
          </p>
        </div>

        {/* Invite Account & Room Lock Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {!isLocked && (
            <button
              onClick={() => setShowAddMemberInput(!showAddMemberInput)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 10,
                background: '#F8FAFC',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={15} color="var(--primary)" />
              <span>Mời theo tài khoản</span>
            </button>
          )}

          {isCurrentUserHost && (
            <button
              onClick={() => {
                if (checkoutDone) return;
                const nextLocked = !isLocked;
                updateRoom((prev) => ({ ...prev, isLocked: nextLocked }));
                showToast(
                  nextLocked
                    ? 'Đã khóa phòng đặt món. Thành viên không thể thêm/xóa món.'
                    : 'Đã mở khóa phòng. Thành viên có thể tiếp tục chọn món!',
                );
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                borderRadius: 10,
                background: isLocked ? '#FEE2E2' : 'rgba(0, 177, 79, 0.1)',
                color: isLocked ? '#DC2626' : 'var(--primary)',
                border: `1.5px solid ${isLocked ? '#DC2626' : 'var(--primary)'}`,
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
              {isLocked ? 'Phòng đã khóa (Ngưng thêm món)' : 'Phòng đang mở (Nhận đặt món)'}
            </button>
          )}
        </div>
      </div>

      {/* Inline Account Invite Lookup Panel */}
      {showAddMemberInput && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid var(--primary)',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={17} color="var(--primary)" />
              <span>Tìm &amp; mời thành viên qua tài khoản DineGo</span>
            </div>
            <button
              onClick={() => setShowAddMemberInput(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Mail
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Nhập Email, SĐT hoặc tên tài khoản đã đăng ký..."
                value={inviteAccountQuery}
                onChange={(e) => {
                  setInviteAccountQuery(e.target.value);
                  setInviteError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleExactInviteInRoom()}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 36px',
                  borderRadius: 10,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleExactInviteInRoom}
              className="btn btn-primary"
              style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.86rem' }}
            >
              Gửi lời mời tài khoản
            </button>
          </div>

          {inviteError && (
            <div style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600, marginBottom: 10 }}>
              {inviteError}
            </div>
          )}

          {/* Account search suggestions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
            {activeRoomMatchingAccounts.map((acc) => (
              <div
                key={acc.id}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {acc.fullName}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {acc.email}{acc.phoneNumber ? ` • ${acc.phoneNumber}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInviteAccountToRoom(acc)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#FFFFFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Mời
                </button>
              </div>
            ))}
          </div>
          {inviteAccountQuery.trim().length > 0 && activeRoomMatchingAccounts.length === 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Không tìm thấy tài khoản nào khớp trên hệ thống. Bạn có thể bảo bạn bè đăng ký tài khoản DineGo trước khi mời.
            </div>
          )}
        </div>
      )}

      {/* Restaurant Picker Drawer */}
      {showMerchantPicker && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #BFDBFE',
            borderRadius: 18,
            padding: 20,
            marginBottom: 24,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Chọn nhà hàng khác cho nhóm
            </h3>
            <button
              onClick={() => setShowMerchantPicker(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
            {merchants.map((m) => {
              const isCurrent = m.id === selectedMerchant.id;
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectRestaurant(m)}
                  style={{
                    border: `2px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: isCurrent ? '#ECFDF5' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <img
                    src={m.coverUrl}
                    alt={m.name}
                    style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)', marginBottom: 4 }}>
                      {m.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: '#B45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Star size={12} fill="#F59E0B" color="#F59E0B" />
                        {m.rating}
                      </span>
                      <span>•</span>
                      <span>{m.deliveryTimeMin}-{m.deliveryTimeMax} phút</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Main 2-Column Workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(340px, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN */}
        <div>
          {/* Restaurant Header Card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: 20,
            }}
          >
            <div style={{ height: 180, position: 'relative' }}>
              <img
                src={selectedMerchant.coverUrl}
                alt={selectedMerchant.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.25) 60%, transparent 100%)',
                }}
              />
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(0, 177, 79, 0.95)',
                    color: '#fff',
                    padding: '5px 12px',
                    borderRadius: 999,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <ShieldCheck size={13} />
                  DineGo Partner Quán Chuẩn
                </span>
                <span
                  style={{
                    background: 'rgba(255, 87, 34, 0.95)',
                    color: '#fff',
                    padding: '5px 12px',
                    borderRadius: 999,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <ThumbsUp size={12} />
                  Hỗ trợ Đặt Nhóm
                </span>
              </div>

              <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18, color: '#FFFFFF' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', color: '#FFFFFF' }}>
                  {selectedMerchant.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.84rem', color: '#E2E8F0', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#FBBF24', fontWeight: 700 }}>
                    <Star size={14} fill="#FBBF24" color="#FBBF24" />
                    {selectedMerchant.rating} ({selectedMerchant.reviewCount}+)
                  </span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} /> {selectedMerchant.deliveryTimeMin}-{selectedMerchant.deliveryTimeMax} phút
                  </span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} /> {selectedMerchant.address}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', background: '#FAFAFA' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 87, 34, 0.08)',
                  border: '1px dashed var(--secondary)',
                  padding: '5px 12px',
                  borderRadius: 8,
                  color: 'var(--secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                <Tag size={13} />
                <span>Ưu đãi Nhóm: Tự động giảm 20k đơn từ 150k</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(0, 177, 79, 0.08)',
                  border: '1px dashed var(--primary)',
                  padding: '5px 12px',
                  borderRadius: 8,
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                <Users size={13} />
                <span>Chia đều phí giao hàng {members.length} thành viên</span>
              </div>
            </div>
          </div>

          {/* Active Member Selector Bar */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '14px 18px',
              border: '1.5px solid #BBF7D0',
              marginBottom: 18,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={16} color="#00B14F" />
                <span>Thành viên trong nhóm (chọn tài khoản đặt món):</span>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Mỗi thành viên được gắn với 1 tài khoản DineGo
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {members.map((m) => {
                const isSelected = m.id === (activeMemberObj?.id || selectedMemberId);
                const isMe = isMemberMatchingUser(m, currentUser);
                const count = items
                  .filter((it) => it.memberId === m.id)
                  .reduce((s, it) => s + it.quantity, 0);
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 999,
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? '#ECFDF5' : '#F8FAFC',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: isSelected ? '#065F46' : 'var(--text-main)',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                      title={m.email}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: m.avatarBg,
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {m.initials}
                      </span>
                      <span>
                        {m.name}
                        {isMe ? ' (Bạn)' : ''}
                      </span>
                      {m.inviteStatus === 'PENDING' && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            background: '#FEF3C7',
                            color: '#B45309',
                            padding: '1px 6px',
                            borderRadius: 6,
                            fontWeight: 700,
                          }}
                        >
                          Đã mời
                        </span>
                      )}
                      {count > 0 && (
                        <span
                          style={{
                            background: isSelected ? 'var(--primary)' : '#CBD5E1',
                            color: isSelected ? '#FFFFFF' : '#1E293B',
                            borderRadius: 999,
                            padding: '1px 7px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>

                    {!m.isHost && isCurrentUserHost && !isLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        title={`Hủy mời / xóa ${m.name}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '0 2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}

              {!isLocked && (
                <button
                  type="button"
                  onClick={() => setShowAddMemberInput(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1.5px dashed #94A3B8',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Mời tài khoản khác</span>
                </button>
              )}
            </div>
          </div>

          {/* Menu Categories Bar & Search Filter */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '12px 16px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: '0.84rem',
                    fontWeight: activeCategory === cat.id ? 700 : 500,
                    background: activeCategory === cat.id ? 'var(--primary)' : 'var(--bg-main)',
                    color: activeCategory === cat.id ? '#FFFFFF' : 'var(--text-main)',
                    border: activeCategory === cat.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: 210, flex: '0 1 240px' }}>
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Tìm món ăn trong quán..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Dishes Grid */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Sparkles size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {activeCategory === 'all' ? 'Thực đơn nhà hàng' : activeCategory}
            </h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
              ({filteredMenuItems.length} món)
            </span>
          </div>

          {filteredMenuItems.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              Không tìm thấy món ăn nào phù hợp với từ khóa tìm kiếm.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: 16,
              }}
            >
              {filteredMenuItems.map((dish) => (
                <div
                  key={dish.id}
                  onClick={() => dish.isAvailable && handleOpenDishModal(dish)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    padding: 14,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: dish.isAvailable ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (dish.isAvailable) {
                      e.currentTarget.style.borderColor = 'rgba(0, 177, 79, 0.5)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        margin: '0 0 5px 0',
                        lineHeight: 1.3,
                      }}
                    >
                      {dish.name}
                    </h4>
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        margin: '0 0 10px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {dish.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: dish.isAvailable ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      >
                        {dish.basePrice.toLocaleString('vi-VN')}đ
                      </span>

                      {!dish.isAvailable ? (
                        <span
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          Tạm hết
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAddDish(e, dish)}
                          disabled={isLocked}
                          style={{
                            background: isLocked ? '#CBD5E1' : 'var(--primary)',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 10,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            boxShadow: isLocked ? 'none' : '0 4px 10px rgba(0, 177, 79, 0.25)',
                          }}
                          title={`Thêm món cho ${activeMemberObj?.name || 'thành viên'}`}
                        >
                          <Plus size={14} />
                          <span>Thêm</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 12,
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                      opacity: dish.isAvailable ? 1 : 0.6,
                    }}
                  >
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Shared Group Cart & Automated Split Bill Sidebar */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 22,
            boxShadow: 'var(--shadow-md)',
            position: 'sticky',
            top: 84,
          }}
        >
          {/* Cart Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} color="var(--primary)" />
              <span>Giỏ Hàng Nhóm ({totalItemCount} món)</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {members.length} tài khoản
            </span>
          </div>

          {/* Items Grouped by Member */}
          {items.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-main)',
                borderRadius: 14,
                padding: '28px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.86rem',
                marginBottom: 18,
              }}
            >
              Giỏ hàng nhóm đang trống. Hãy mời thêm bạn bè qua tài khoản và bấm <strong>+ Thêm</strong> món ở thực đơn bên trái!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 320, overflowY: 'auto', paddingRight: 4, marginBottom: 18 }}>
              {memberBreakdowns.map((b) => (
                <div
                  key={b.member.id}
                  style={{
                    background: 'var(--bg-main)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: b.items.length > 0 ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: b.member.avatarBg,
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {b.member.initials}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                          {b.member.name}{isMemberMatchingUser(b.member, currentUser) ? ' (Bạn)' : ''}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {b.member.email}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {b.itemTotal.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  {b.items.length === 0 ? (
                    <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: 4, fontStyle: 'italic' }}>
                      {b.member.inviteStatus === 'PENDING' ? 'Đang chờ xác nhận lời mời — ' : 'Chưa chọn món — '}
                      <span
                        onClick={() => setSelectedMemberId(b.member.id)}
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontStyle: 'normal' }}
                      >
                        Chọn món ngay
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {b.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: 10,
                            padding: '8px 10px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                              {item.dishName}
                            </div>
                            {item.toppings.length > 0 && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                + {item.toppings.map((t) => t.name).join(', ')}
                              </div>
                            )}
                            {item.note && (
                              <div style={{ fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic', marginTop: 2 }}>
                                Ghi chú: {item.note}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                              {item.subtotal.toLocaleString('vi-VN')}đ
                            </span>
                            {!isLocked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.id, -1)}
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                    background: '#F8FAFC',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Minus size={11} />
                                </button>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.id, 1)}
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                    background: '#F8FAFC',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Plus size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#EF4444',
                                    padding: 2,
                                    cursor: 'pointer',
                                    marginLeft: 2,
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Split Bill Section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={16} color="var(--primary)" /> Bảng Chia Tiền Theo Nhóm
            </h4>

            {/* Split Mode Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <button
                onClick={() => updateRoom((prev) => ({ ...prev, splitMode: 'BY_ITEM' }))}
                style={{
                  padding: '8px 6px',
                  borderRadius: 8,
                  background: splitMode === 'BY_ITEM' ? 'var(--primary)' : 'var(--bg-main)',
                  border: `1px solid ${splitMode === 'BY_ITEM' ? 'var(--primary)' : 'var(--border)'}`,
                  color: splitMode === 'BY_ITEM' ? '#FFFFFF' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Chia theo món đã gọi
              </button>
              <button
                onClick={() => updateRoom((prev) => ({ ...prev, splitMode: 'EQUAL' }))}
                style={{
                  padding: '8px 6px',
                  borderRadius: 8,
                  background: splitMode === 'EQUAL' ? 'var(--primary)' : 'var(--bg-main)',
                  border: `1px solid ${splitMode === 'EQUAL' ? 'var(--primary)' : 'var(--border)'}`,
                  color: splitMode === 'EQUAL' ? '#FFFFFF' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Chia đều đầu người
              </button>
            </div>

            {/* Cost Summary */}
            <div style={{ background: 'var(--bg-main)', padding: '12px 14px', borderRadius: 12, marginBottom: 14, fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4, color: 'var(--text-muted)' }}>
                <span>Tổng tiền món ăn:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4, color: 'var(--text-muted)' }}>
                <span>Phí giao hàng ({members.length} người chia đều):</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>+{deliveryFee.toLocaleString('vi-VN')}đ</span>
              </div>
              {groupDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6, color: 'var(--primary)', fontWeight: 700 }}>
                  <span>Ưu đãi đặt đơn nhóm:</span>
                  <span>-{groupDiscount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8, color: 'var(--text-main)' }}>
                <span>Tổng hóa đơn nhóm:</span>
                <span style={{ color: 'var(--primary)' }}>{grandTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Per Member Breakdown */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
                Số tiền từng tài khoản cần thanh toán:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {memberBreakdowns.map((b) => (
                  <div
                    key={b.member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: b.member.avatarBg,
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {b.member.initials}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {b.member.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {b.member.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.88rem' }}>
                        {b.finalToPay.toLocaleString('vi-VN')}đ
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {splitMode === 'BY_ITEM'
                          ? `Món ${b.itemTotal.toLocaleString('vi-VN')}đ + Ship ${b.shippingShare.toLocaleString('vi-VN')}đ`
                          : 'Chia đều tổng đơn'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Real User Delivery Info */}
            {!checkoutDone && isCurrentUserHost && (
              <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={13} color="var(--primary)" /> Thông tin nhận đơn nhóm
                  </span>
                  {onOpenAddressSetup && (
                    <button
                      type="button"
                      onClick={onOpenAddressSetup}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Chọn từ sổ địa chỉ
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Địa chỉ giao hàng cho nhóm..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddressOverride(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Tên người nhận..."
                      value={recipientName}
                      onChange={(e) => setRecipientNameOverride(e.target.value)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="SĐT người nhận..."
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhoneOverride(e.target.value)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Checkout CTA */}
            {checkoutDone ? (
              <div style={{ padding: 14, borderRadius: 12, background: '#D1FAE5', color: '#065F46', textAlign: 'center' }}>
                <CheckCircle2 size={28} color="#059669" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>Đã chốt đơn nhóm thành công!</div>
                <div style={{ fontSize: '0.78rem', marginTop: 4, marginBottom: 10 }}>
                  Đơn hàng chung đã được gửi tới {selectedMerchant.name}.
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('orders')}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderRadius: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <span>Xem tiến trình đơn hàng</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            ) : isCurrentUserHost ? (
              <button
                onClick={handleCheckoutGroupOrder}
                disabled={items.length === 0}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  borderRadius: 12,
                  boxShadow: items.length > 0 ? '0 8px 20px rgba(0, 177, 79, 0.3)' : 'none',
                }}
              >
                Khóa Phòng &amp; Chốt Đơn Nhóm ({grandTotal.toLocaleString('vi-VN')}đ)
              </button>
            ) : (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <AlertCircle size={15} />
                <span>Trưởng nhóm ({members[0]?.name}) sẽ khóa phòng và chốt đơn chung.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Dish Customizer Modal */}
      {selectedDish && (
        <div
          onClick={() => setSelectedDish(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 22,
              maxWidth: 480,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ height: 180, position: 'relative', flexShrink: 0 }}>
              <img
                src={selectedDish.imageUrl}
                alt={selectedDish.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => setSelectedDish(null)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.65)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {selectedDish.name}
                </h3>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                  {selectedDish.basePrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 18px 0', lineHeight: 1.5 }}>
                {selectedDish.description}
              </p>

              {/* Group Member Selector inside Modal */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
                  Đặt món này cho tài khoản:
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {members.map((m) => {
                    const active = modalMemberId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModalMemberId(m.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 999,
                          border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                          background: active ? '#ECFDF5' : '#F8FAFC',
                          color: active ? '#065F46' : 'var(--text-main)',
                          fontSize: '0.8rem',
                          fontWeight: active ? 800 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {active && <Check size={13} color="var(--primary)" />}
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toppings */}
              {selectedDish.toppings && selectedDish.toppings.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
                    Tùy chọn thêm (Topping)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDish.toppings.map((top) => {
                      const checked = modalToppings.some((t) => t.toppingId === top.id);
                      return (
                        <div
                          key={top.id}
                          onClick={() => handleToggleTopping(top)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: 12,
                            border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                            background: checked ? '#F0FDF4' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 5,
                                border: `2px solid ${checked ? 'var(--primary)' : '#CBD5E1'}`,
                                background: checked ? 'var(--primary)' : '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                              }}
                            >
                              {checked && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {top.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary)' }}>
                            +{top.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                  Ghi chú cho bếp (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ít đường, không hành, để riêng nước mắm..."
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-main)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Quantity & Add CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--bg-main)',
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={15} />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: 20, textAlign: 'center' }}>
                    {modalQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAddDishToGroup}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                  }}
                >
                  Thêm cho {members.find((m) => m.id === modalMemberId)?.name} •{' '}
                  {(modalUnitPrice * modalQuantity).toLocaleString('vi-VN')}đ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
