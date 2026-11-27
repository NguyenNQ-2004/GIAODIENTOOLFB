import React, { useEffect, useRef, useState } from 'react';
import type { UpsertGroupRequest } from '../../types/api';
import type { FacebookGroup } from '../../types/domain';
import {
  type CsvParsePreview,
  generateSampleGroupsCsv,
  parseGroupsCsv,
} from '../../utils/csv';

interface CsvImportModalProps {
  open: boolean;
  existingGroups: FacebookGroup[];
  onClose: () => void;
  onConfirmImport: (rows: UpsertGroupRequest[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  open,
  existingGroups,
  onClose,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvParsePreview | null>(null);

  useEffect(() => {
    if (!open) {
      setFileName(null);
      setPreview(null);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseGroupsCsv(text, existingGroups);
      setPreview(parsed);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleDownloadSample = () => {
    const csv = generateSampleGroupsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau-nhap-nhom-facebook.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirm = () => {
    if (!preview || !preview.validHeader) return;
    const validRows: UpsertGroupRequest[] = preview.rows
      .filter((r) => r.status === 'VALID')
      .map((r) => ({
        groupName: r.groupName,
        groupUrl: r.groupUrl,
        groupUid: r.groupUid,
        memberCount: r.memberCount,
        requiresApproval: r.requiresApproval,
        notes: r.notes,
      }));
    if (validRows.length === 0) return;
    onConfirmImport(validRows);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 id="csv-import-title" className="text-sm font-bold text-slate-900">
              Nhập danh sách nhóm từ file CSV
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cột bắt buộc: <code className="font-mono text-slate-700">group_name, group_url</code>{' '}
              (tùy chọn: <code className="font-mono text-slate-700">group_uid, member_count, requires_approval, notes</code>)
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

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {fileName ? `Tệp đã chọn: ${fileName}` : 'Chọn tệp .csv từ máy tính của bạn'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hệ thống sẽ kiểm tra header, URL hợp lệ và phát hiện trùng lặp trước khi nhập.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSample}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Tải file mẫu
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                Chọn file CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {preview && !preview.validHeader && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {preview.headerError}
            </div>
          )}

          {preview && preview.validHeader && (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-[11px] text-emerald-700 font-medium">Dòng hợp lệ</p>
                  <p className="text-lg font-bold text-emerald-800">{preview.validCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-[11px] text-amber-800 font-medium">Trùng lặp (bỏ qua)</p>
                  <p className="text-lg font-bold text-amber-900">{preview.duplicateCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <p className="text-[11px] text-rose-700 font-medium">Dòng lỗi (bỏ qua)</p>
                  <p className="text-lg font-bold text-rose-800">{preview.errorCount}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-600">Dòng</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Tên nhóm</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Trạng thái</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.map((row) => (
                        <tr key={row.rowIndex} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2 font-mono text-slate-500">#{row.rowIndex}</td>
                          <td className="px-3 py-2 font-medium text-slate-900 max-w-[180px] truncate">
                            {row.groupName || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.status === 'VALID'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : row.status === 'DUPLICATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {row.status === 'VALID'
                                ? 'Hợp lệ'
                                : row.status === 'DUPLICATE'
                                ? 'Trùng lặp'
                                : 'Lỗi'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.reason ?? row.groupUrl}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!preview || !preview.validHeader || preview.validCount === 0}
            onClick={handleConfirm}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold"
          >
            Nhập {preview?.validCount ?? 0} nhóm hợp lệ
          </button>
        </div>
      </div>
    </div>
  );
};
