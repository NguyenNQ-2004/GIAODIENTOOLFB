import React, { useEffect, useState } from 'react';
import type { GroupCollection } from '../../types/domain';

interface CollectionModalProps {
  open: boolean;
  editingCollection: GroupCollection | null;
  selectedGroupCount: number;
  onClose: () => void;
  onSubmit: (name: string, editingId?: string) => { ok: boolean; error?: string };
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  open,
  editingCollection,
  selectedGroupCount,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(editingCollection ? editingCollection.name : '');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, editingCollection, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onSubmit(name, editingCollection?.id);
    if (!res.ok) {
      setError(res.error ?? 'Không thể lưu bộ sưu tập.');
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="collection-modal-title" className="text-sm font-bold text-slate-900">
              {editingCollection ? 'Đổi tên bộ sưu tập nhóm' : 'Lưu nhóm đã chọn thành bộ sưu tập'}
            </h3>
            {!editingCollection && (
              <p className="text-xs text-slate-500 mt-0.5">
                Đang lưu {selectedGroupCount} nhóm đã chọn (1 nhóm có thể thuộc nhiều bộ sưu tập).
              </p>
            )}
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
              Tên bộ sưu tập <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Ví dụ: Nhóm Gia Dụng Miền Nam"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
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
              {editingCollection ? 'Lưu tên mới' : 'Lưu bộ sưu tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
