import React, { useEffect, useState } from 'react';
import type { UpsertGroupRequest } from '../../types/api';
import type { FacebookGroup } from '../../types/domain';
import { extractNumericGroupUid, normalizeFacebookGroupUrl } from '../../utils/validation';

interface GroupFormModalProps {
  open: boolean;
  editingGroup: FacebookGroup | null;
  onClose: () => void;
  onSubmit: (req: UpsertGroupRequest, editingId?: string) => { ok: boolean; error?: string };
}

export const GroupFormModal: React.FC<GroupFormModalProps> = ({
  open,
  editingGroup,
  onClose,
  onSubmit,
}) => {
  const [groupName, setGroupName] = useState('');
  const [groupUrl, setGroupUrl] = useState('');
  const [groupUid, setGroupUid] = useState('');
  const [memberCount, setMemberCount] = useState('');
  const [requiresApproval, setRequiresApproval] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingGroup) {
      setGroupName(editingGroup.groupName);
      setGroupUrl(editingGroup.groupUrl);
      setGroupUid(editingGroup.groupUid ?? '');
      setMemberCount(editingGroup.memberCount !== null ? String(editingGroup.memberCount) : '');
      setRequiresApproval(
        editingGroup.requiresApproval === null
          ? 'unknown'
          : editingGroup.requiresApproval
          ? 'yes'
          : 'no'
      );
      setNotes(editingGroup.notes ?? '');
    } else {
      // Strictly empty defaults on Add
      setGroupName('');
      setGroupUrl('');
      setGroupUid('');
      setMemberCount('');
      setRequiresApproval('unknown');
      setNotes('');
    }
  }, [open, editingGroup]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const detectedUid = extractNumericGroupUid(groupUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!groupName.trim()) {
      setError('Vui lòng nhập tên nhóm Facebook.');
      return;
    }
    const normalized = normalizeFacebookGroupUrl(groupUrl);
    if (!normalized) {
      setError('URL nhóm phải hợp lệ, ví dụ: https://www.facebook.com/groups/tennhom');
      return;
    }

    let parsedMembers: number | null = null;
    if (memberCount.trim()) {
      const cleaned = memberCount.trim().replace(/[.,\s]/g, '');
      if (!/^\d+$/.test(cleaned)) {
        setError('Số lượng thành viên phải là số nguyên không âm.');
        return;
      }
      parsedMembers = Number.parseInt(cleaned, 10);
    }

    const res = onSubmit(
      {
        groupName: groupName.trim(),
        groupUrl: normalized,
        groupUid: groupUid.trim() || detectedUid || null,
        memberCount: parsedMembers,
        requiresApproval:
          requiresApproval === 'unknown' ? null : requiresApproval === 'yes',
        notes: notes.trim() || null,
      },
      editingGroup?.id
    );

    if (!res.ok) {
      setError(res.error ?? 'Không thể lưu nhóm.');
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-form-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="group-form-title" className="text-sm font-bold text-slate-900">
              {editingGroup ? 'Chỉnh sửa thông tin nhóm' : 'Thêm nhóm Facebook mới'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Các thông tin không bắt buộc sẽ được lưu là chưa xác định thay vì tự bịa số liệu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên nhóm Facebook <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              placeholder="Ví dụ: Cộng đồng Marketing Việt Nam"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Đường dẫn (URL) nhóm <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={groupUrl}
              onChange={(e) => setGroupUrl(e.target.value)}
              required
              placeholder="https://www.facebook.com/groups/tennhom-hoac-id"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
            />
            {detectedUid && (
              <p className="text-[11px] text-emerald-700 mt-1">
                Đã nhận diện UID số từ URL: <span className="font-mono font-semibold">{detectedUid}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Group UID (tùy chọn)
              </label>
              <input
                type="text"
                value={groupUid}
                onChange={(e) => setGroupUid(e.target.value)}
                placeholder="Để trống nếu chưa có"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số thành viên (tùy chọn)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
                placeholder="Để trống nếu chưa rõ"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Trạng thái duyệt bài của nhóm
            </label>
            <select
              value={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.value as 'unknown' | 'yes' | 'no')}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
            >
              <option value="unknown">Chưa xác định</option>
              <option value="no">Không cần duyệt bài</option>
              <option value="yes">Cần quản trị viên duyệt bài</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú khung giờ hoặc quy định đăng bài của nhóm..."
              className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {editingGroup ? 'Lưu thay đổi' : 'Thêm nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
