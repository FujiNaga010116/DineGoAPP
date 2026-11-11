// ==============================================================================
// DineGo Frontend — Mandatory Map-Verified Address Setup Modal
// Prompted automatically when a newly registered Customer tries to order food
// before configuring a map-matched delivery address on their account.
// ==============================================================================

import React, { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type { SavedAddress, User } from '../../types';
import { AddressMapPicker, type AddressPickerValue } from './AddressMapPicker';

interface AddressSetupModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onSaveAddress: (savedAddress: SavedAddress, makeDefault: boolean) => void;
}

export const AddressSetupModal: React.FC<AddressSetupModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSaveAddress,
}) => {
  const [label, setLabel] = useState('Nhà riêng');
  const [recipientName, setRecipientName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phoneNumber || '');
  const [makeDefault, setMakeDefault] = useState(true);
  const [pickerValue, setPickerValue] = useState<AddressPickerValue>({
    fullAddress: '',
    isSynced: false,
  });

  if (!isOpen || !currentUser) return null;

  const canSubmit =
    Boolean(recipientName.trim()) &&
    Boolean(phone.trim()) &&
    pickerValue.isSynced &&
    typeof pickerValue.latitude === 'number' &&
    typeof pickerValue.longitude === 'number';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const newAddress: SavedAddress = {
      id: `addr-${Date.now()}`,
      label,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      fullAddress: pickerValue.fullAddress,
      latitude: pickerValue.latitude,
      longitude: pickerValue.longitude,
      mapReferenceName: pickerValue.mapReferenceName,
      mapVerified: true,
      isDefault: makeDefault,
    };

    onSaveAddress(newAddress, makeDefault);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-box"
        style={{
          maxWidth: 660,
          background: '#FFFFFF',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 22px',
            background: '#ECFDF5',
            borderBottom: '1px solid #D1FAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#00B14F',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Thiết lập địa chỉ nhận món trên bản đồ
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#047857' }}>
                Vui lòng chọn và khớp địa chỉ trên bản đồ cho tài khoản để bắt đầu đặt món.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: 20,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 10 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                Nhãn địa chỉ
              </label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  background: '#FFFFFF',
                }}
              >
                <option value="Nhà riêng">Nhà riêng</option>
                <option value="Văn phòng">Văn phòng</option>
                <option value="Trường học / Khác">Trường học / Khác</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                Người nhận hàng *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                Số điện thoại *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0909123456"
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                }}
              />
            </div>
          </div>

          <AddressMapPicker
            height={250}
            onChange={setPickerValue}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.82rem',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
            />
            <span>Đặt làm địa chỉ nhận hàng mặc định của tài khoản</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', borderRadius: 10, fontSize: '0.86rem' }}
            >
              Để sau
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                fontSize: '0.86rem',
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              Xác nhận địa chỉ & Tiếp tục
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

