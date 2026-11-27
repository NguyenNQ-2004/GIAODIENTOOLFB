import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPreview } from '../components/MediaPreview';
import { CollectionModal } from '../components/composer/CollectionModal';
import {
  ConfirmPublishModal,
  type PreviewPublishPair,
} from '../components/composer/ConfirmPublishModal';
import { CsvImportModal } from '../components/composer/CsvImportModal';
import { GroupFormModal } from '../components/composer/GroupFormModal';
import { demoMediaStorage } from '../services/mediaStorage';
import { useApp } from '../state/AppContext';
import type {
  FacebookGroup,
  GroupCollection,
  MediaAttachment,
  Post,
  TaskTargetType,
} from '../types/domain';
import { exportGroupsToCsv } from '../utils/csv';
import {
  getDefaultFutureLocalDateTime,
  isFutureTimestamp,
  vietnamDatetimeLocalToIso,
} from '../utils/dateTime';
import { formatFileSize, formatMemberCount, generateId } from '../utils/formatters';
import {
  hasPublishableContent,
  MAX_MEDIA_PER_POST,
  validateMediaFileInput,
  validatePostForPublish,
} from '../utils/validation';

export const PostComposerPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    accounts,
    pages,
    groups,
    collections,
    collectionItems,
    draftPosts,
    savedPosts,
    usageSummary,
    addToast,
    updateDraftSlot,
    resetDraftSlot,
    savePostTemplate,
    deleteSavedPost,
    createGroup,
    updateGroup,
    deleteGroup,
    importGroups,
    createCollection,
    renameCollection,
    deleteCollection,
    createTask,
  } = useApp();

  // Separate editing slot vs explicitly selected drafts for publishing
  const [activeSlotNumber, setActiveSlotNumber] = useState<number>(1);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const initializedUserRef = useRef<string | null>(null);

  // Account & Destination mode
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    () => accounts.find((a) => a.status !== 'DISCONNECTED')?.id ?? accounts[0]?.id ?? ''
  );
  const [targetType, setTargetType] = useState<TaskTargetType>('GROUP');

  // Per-draft destination assignments (strictly avoids implicit Cartesian multiplication)
  const [groupIdsByDraftId, setGroupIdsByDraftId] = useState<Record<string, string[]>>({});
  const [pageIdsByDraftId, setPageIdsByDraftId] = useState<Record<string, string[]>>({});

  // Group filtering
  const [groupSearch, setGroupSearch] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState<string>('ALL');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'YES' | 'NO' | 'UNKNOWN'>('ALL');

  // Schedule controls
  const [publishMode, setPublishMode] = useState<'NOW' | 'SCHEDULE'>('NOW');
  const [scheduleLocal, setScheduleLocal] = useState<string>(() =>
    getDefaultFutureLocalDateTime()
  );

  // Modals & Popovers
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FacebookGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<FacebookGroup | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<GroupCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<GroupCollection | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [resetSlotConfirmOpen, setResetSlotConfirmOpen] = useState(false);

  // Publish confirmation modal & idempotency key per confirm session
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingPairs, setPendingPairs] = useState<PreviewPublishPair[]>([]);
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string>('');
  const [pendingScheduledIso, setPendingScheduledIso] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep selectedAccountId valid when accounts list changes (e.g., user switch)
  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId('');
      setPageIdsByDraftId({});
      return;
    }
    if (!accounts.some((a) => a.id === selectedAccountId)) {
      const preferred = accounts.find((a) => a.status !== 'DISCONNECTED') ?? accounts[0];
      setSelectedAccountId(preferred.id);
      setPageIdsByDraftId({});
    }
  }, [accounts, selectedAccountId]);

  // Prune deleted group IDs from all per-draft group assignments
  useEffect(() => {
    const validIds = new Set(groups.map((g) => g.id));
    setGroupIdsByDraftId((prev) => {
      let changed = false;
      const next: Record<string, string[]> = {};
      for (const [draftId, ids] of Object.entries(prev)) {
        const filtered = ids.filter((id) => validIds.has(id));
        if (filtered.length !== ids.length) changed = true;
        if (filtered.length > 0) next[draftId] = filtered;
      }
      return changed ? next : prev;
    });
  }, [groups]);

  // One-time default draft selection per signed-in user (never re-checks after user unchecks all)
  useEffect(() => {
    const uid = currentUser?.id ?? null;
    if (!uid || draftPosts.length === 0) return;
    if (initializedUserRef.current === uid) return;
    initializedUserRef.current = uid;
    const firstValid = draftPosts.find((d) => hasPublishableContent(d));
    setSelectedDraftIds(firstValid ? [firstValid.id] : []);
    setGroupIdsByDraftId({});
    setPageIdsByDraftId({});
  }, [currentUser?.id, draftPosts]);

  const activeDraft: Post | undefined = useMemo(
    () => draftPosts.find((d) => d.slotNumber === activeSlotNumber) ?? draftPosts[0],
    [draftPosts, activeSlotNumber]
  );

  const activeDraftId = activeDraft?.id ?? '';
  const selectedGroupIds = useMemo(
    () => (activeDraftId ? groupIdsByDraftId[activeDraftId] ?? [] : []),
    [groupIdsByDraftId, activeDraftId]
  );
  const selectedPageIds = useMemo(
    () => (activeDraftId ? pageIdsByDraftId[activeDraftId] ?? [] : []),
    [pageIdsByDraftId, activeDraftId]
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  // Fanpages strictly filtered by selectedAccountId
  const accountPages = useMemo(
    () => pages.filter((p) => p.facebookAccountId === selectedAccountId),
    [pages, selectedAccountId]
  );

  // Many-to-many map: groupId -> GroupCollection[]
  const collectionsByGroupId = useMemo(() => {
    const colMap = new Map(collections.map((c) => [c.id, c]));
    const result = new Map<string, GroupCollection[]>();
    for (const item of collectionItems) {
      const col = colMap.get(item.collectionId);
      if (!col) continue;
      const list = result.get(item.groupId) ?? [];
      list.push(col);
      result.set(item.groupId, list);
    }
    return result;
  }, [collections, collectionItems]);

  // Count per collection
  const groupCountByCollection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of collectionItems) {
      counts.set(item.collectionId, (counts.get(item.collectionId) ?? 0) + 1);
    }
    return counts;
  }, [collectionItems]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    const activeColGroupIds =
      activeCollectionId === 'ALL'
        ? null
        : new Set(
            collectionItems
              .filter((ci) => ci.collectionId === activeCollectionId)
              .map((ci) => ci.groupId)
          );

    return groups.filter((g) => {
      if (activeColGroupIds && !activeColGroupIds.has(g.id)) return false;
      if (approvalFilter === 'YES' && g.requiresApproval !== true) return false;
      if (approvalFilter === 'NO' && g.requiresApproval !== false) return false;
      if (approvalFilter === 'UNKNOWN' && g.requiresApproval !== null) return false;
      if (q) {
        const matchName = g.groupName.toLowerCase().includes(q);
        const matchUrl = g.groupUrl.toLowerCase().includes(q);
        const matchUid = (g.groupUid ?? '').toLowerCase().includes(q);
        if (!matchName && !matchUrl && !matchUid) return false;
      }
      return true;
    });
  }, [groups, groupSearch, activeCollectionId, collectionItems, approvalFilter]);

  const handleAccountChange = (newAccountId: string) => {
    setSelectedAccountId(newAccountId);
    // Clear invalid Fanpage selections immediately when switching account
    setPageIdsByDraftId({});
  };

  const toggleDraftSelection = (postId: string) => {
    setSelectedDraftIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleMediaFiles = async (fileList: FileList | null) => {
    if (!fileList || !activeDraft) return;
    const files = Array.from(fileList);
    const currentMedia = activeDraft.media;
    const remainingSlots = MAX_MEDIA_PER_POST - currentMedia.length;
    if (remainingSlots <= 0) {
      addToast('warning', `Tối đa ${MAX_MEDIA_PER_POST} tệp media mỗi bài viết.`);
      return;
    }

    const nextItems: MediaAttachment[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      const check = validateMediaFileInput(file);
      if (!check.valid || !check.mediaType) {
        addToast('error', 'Tệp không hợp lệ', check.error);
        continue;
      }
      const mediaId = generateId();
      await demoMediaStorage.saveMediaBlob(mediaId, file, {
        mimeType: file.type,
        originalName: file.name,
      });
      nextItems.push({
        id: mediaId,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        mediaType: check.mediaType,
        status: 'READY',
        // Never persist ephemeral blob: URLs in localStorage; MediaPreview resolves via IndexedDB by media.id
        previewUrl: null,
        sortOrder: currentMedia.length + nextItems.length,
      });
    }

    if (nextItems.length > 0) {
      updateDraftSlot(activeSlotNumber, {
        media: [...currentMedia, ...nextItems],
      });
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    if (!activeDraft) return;
    const nextMedia = activeDraft.media.filter((m) => m.id !== mediaId);
    // mockAppService checks isMediaReferenced() across all drafts, saved posts, and task snapshots
    // before deleting the underlying blob from demoMediaStorage.
    updateDraftSlot(activeSlotNumber, { media: nextMedia });
  };

  const handleReorderMedia = (index: number, direction: -1 | 1) => {
    if (!activeDraft) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= activeDraft.media.length) return;
    const copy = [...activeDraft.media];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, moved);
    updateDraftSlot(activeSlotNumber, { media: copy });
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDraft) return;
    const res = savePostTemplate({
      savedName: templateName,
      content: activeDraft.content,
      linkUrl: activeDraft.linkUrl,
      media: activeDraft.media,
    });
    if (!res.ok) {
      addToast('error', 'Không thể lưu bài viết mẫu', res.error);
      return;
    }
    addToast('success', 'Đã lưu bài viết mẫu', `"${res.data?.savedName}" đã được lưu vào thư viện.`);
    setTemplateName('');
    setSaveTemplateOpen(false);
  };

  const handleLoadSavedPost = (saved: Post) => {
    updateDraftSlot(activeSlotNumber, {
      content: saved.content,
      linkUrl: saved.linkUrl,
      media: saved.media,
    });
    if (activeDraft && !selectedDraftIds.includes(activeDraft.id)) {
      setSelectedDraftIds((prev) => [...prev, activeDraft.id]);
    }
    addToast(
      'success',
      `Đã tải vào Bài nháp #${activeSlotNumber}`,
      `Khôi phục nội dung${saved.media.length > 0 ? ` và ${saved.media.length} tệp media` : ''}.`
    );
    setShowSavedDrawer(false);
  };

  const handleToggleGroup = (groupId: string) => {
    if (!activeDraftId) return;
    setGroupIdsByDraftId((prev) => {
      const current = prev[activeDraftId] ?? [];
      const next = current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId];
      return { ...prev, [activeDraftId]: next };
    });
  };

  const handleToggleAllVisibleGroups = () => {
    if (!activeDraftId) return;
    const visibleIds = filteredGroups.map((g) => g.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedGroupIds.includes(id));
    setGroupIdsByDraftId((prev) => {
      const current = prev[activeDraftId] ?? [];
      const next = allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]));
      return { ...prev, [activeDraftId]: next };
    });
  };

  const handleTogglePage = (pageId: string) => {
    if (!activeDraftId) return;
    setPageIdsByDraftId((prev) => {
      const current = prev[activeDraftId] ?? [];
      const next = current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId];
      return { ...prev, [activeDraftId]: next };
    });
  };

  const handleCopyActiveDestinationsToSelectedDrafts = () => {
    if (!activeDraftId || selectedDraftIds.length <= 1) return;
    if (targetType === 'GROUP') {
      const source = groupIdsByDraftId[activeDraftId] ?? [];
      setGroupIdsByDraftId((prev) => {
        const next = { ...prev };
        for (const id of selectedDraftIds) {
          next[id] = [...source];
        }
        return next;
      });
      addToast(
        'info',
        'Đã sao chép danh sách nhóm đích',
        `Áp dụng ${source.length} nhóm từ Bài #${activeSlotNumber} cho ${selectedDraftIds.length} bài đang chọn.`
      );
    } else {
      const source = pageIdsByDraftId[activeDraftId] ?? [];
      setPageIdsByDraftId((prev) => {
        const next = { ...prev };
        for (const id of selectedDraftIds) {
          next[id] = [...source];
        }
        return next;
      });
      addToast(
        'info',
        'Đã sao chép Fanpage đích',
        `Áp dụng ${source.length} Fanpage từ Bài #${activeSlotNumber} cho ${selectedDraftIds.length} bài đang chọn.`
      );
    }
  };

  const handleExportCsv = () => {
    const targetGroups =
      selectedGroupIds.length > 0
        ? groups.filter((g) => selectedGroupIds.includes(g.id))
        : filteredGroups;

    if (targetGroups.length === 0) {
      addToast('warning', 'Không có nhóm nào để xuất CSV.');
      return;
    }
    const csv = exportGroupsToCsv(targetGroups);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-nhom-facebook-${targetGroups.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(
      'success',
      'Đã xuất file CSV',
      selectedGroupIds.length > 0
        ? `Xuất ${targetGroups.length} nhóm đã chọn.`
        : `Xuất ${targetGroups.length} nhóm đang hiển thị.`
    );
  };

  const handleOpenPublishConfirmation = () => {
    if (!usageSummary.isActive) {
      addToast(
        'error',
        'Gói dịch vụ chưa kích hoạt hoặc đã hết hạn',
        'Vui lòng gia hạn tại trang Gói dịch vụ trước khi tạo tác vụ.'
      );
      return;
    }

    // Strictly respect user's draft checkboxes — never silently publish unselected drafts
    const chosenDrafts = draftPosts.filter((d) => selectedDraftIds.includes(d.id));
    if (chosenDrafts.length === 0) {
      addToast(
        'error',
        'Chưa chọn bài viết nào',
        'Hãy tích chọn ít nhất 1 khung bài nháp ở danh sách Bài 1..10.'
      );
      return;
    }

    for (const draft of chosenDrafts) {
      const check = validatePostForPublish(draft);
      if (!check.valid) {
        addToast('error', `Bài nháp #${draft.slotNumber} chưa hợp lệ`, check.error);
        return;
      }
    }

    // Validate schedule timestamp & concurrent SCHEDULED quota if SCHEDULE
    let scheduledIso: string | null = null;
    if (publishMode === 'SCHEDULE') {
      const converted = vietnamDatetimeLocalToIso(scheduleLocal);
      if (!converted || !isFutureTimestamp(converted)) {
        addToast(
          'error',
          'Thời gian lên lịch không hợp lệ',
          'Vui lòng chọn thời điểm nằm ở tương lai theo giờ Việt Nam (GMT+7).'
        );
        return;
      }
      if (usageSummary.scheduledTasksUsed >= usageSummary.scheduledTasksLimit) {
        addToast(
          'error',
          'Đã đạt giới hạn tác vụ đang chờ lịch',
          `Gói hiện tại cho phép tối đa ${usageSummary.scheduledTasksLimit} tác vụ ở trạng thái SCHEDULED cùng lúc.`
        );
        return;
      }
      scheduledIso = converted;
    }

    // Build exact per-draft (post, destination) pairs — NO implicit Cartesian product
    const pairs: PreviewPublishPair[] = [];
    if (targetType === 'GROUP') {
      const groupMap = new Map(groups.map((g) => [g.id, g]));
      for (const post of chosenDrafts) {
        const assignedIds = (groupIdsByDraftId[post.id] ?? []).filter((id) => groupMap.has(id));
        if (assignedIds.length === 0) {
          addToast(
            'error',
            `Bài nháp #${post.slotNumber} chưa được gán nhóm đích`,
            `Hãy mở tab Bài ${post.slotNumber} và chọn ít nhất 1 nhóm Facebook ở cột bên phải.`
          );
          return;
        }
        for (const gid of assignedIds) {
          const grp = groupMap.get(gid)!;
          pairs.push({
            pairKey: `${post.id}::${grp.id}`,
            post,
            destinationId: grp.id,
            destinationName: grp.groupName,
            destinationUrl: grp.groupUrl,
          });
        }
      }
    } else {
      if (
        !selectedAccount ||
        selectedAccount.connectionType !== 'META_OAUTH' ||
        selectedAccount.status !== 'CONNECTED'
      ) {
        addToast(
          'error',
          'Tài khoản chưa hỗ trợ đăng Fanpage',
          'Vui lòng chọn tài khoản đã kết nối Meta OAuth.'
        );
        return;
      }
      const publishablePageMap = new Map(
        accountPages.filter((p) => p.canPublish).map((p) => [p.id, p])
      );
      for (const post of chosenDrafts) {
        const assignedIds = (pageIdsByDraftId[post.id] ?? []).filter((id) =>
          publishablePageMap.has(id)
        );
        if (assignedIds.length === 0) {
          addToast(
            'error',
            `Bài nháp #${post.slotNumber} chưa được gán Fanpage đích`,
            `Hãy mở tab Bài ${post.slotNumber} và chọn ít nhất 1 Fanpage có quyền đăng.`
          );
          return;
        }
        for (const pid of assignedIds) {
          const page = publishablePageMap.get(pid)!;
          pairs.push({
            pairKey: `${post.id}::${page.id}`,
            post,
            destinationId: page.id,
            destinationName: page.pageName,
            destinationUrl: page.pageUrl,
          });
        }
      }
    }

    setPendingPairs(pairs);
    setPendingScheduledIso(scheduledIso);
    setPendingIdempotencyKey(generateId());
    setConfirmModalOpen(true);
  };

  const handleConfirmCreateTask = (finalPairs: PreviewPublishPair[]) => {
    const res = createTask({
      facebookAccountId: selectedAccount?.id ?? null,
      targetType,
      executionMode: targetType === 'GROUP' ? 'MANUAL_GROUP' : 'META_PAGE_API',
      scheduledAt: pendingScheduledIso,
      idempotencyKey: pendingIdempotencyKey,
      pairs: finalPairs.map((p) => ({
        postId: p.post.id,
        groupId: targetType === 'GROUP' ? p.destinationId : null,
        pageId: targetType === 'PAGE' ? p.destinationId : null,
      })),
    });

    setConfirmModalOpen(false);
    if (!res.ok) {
      addToast('error', 'Không thể tạo tác vụ', res.error);
      return;
    }

    addToast(
      'success',
      'Đã tạo tác vụ mô phỏng',
      `Tác vụ gồm ${finalPairs.length} mục đã được lưu vào Tổng quan & Lịch đăng.`
    );
    navigate('/dashboard');
  };

  // Accurate exact pair count across checked drafts (never Cartesian product)
  const totalAssignedPairsCount = useMemo(() => {
    const validGroupIds = new Set(groups.map((g) => g.id));
    const validPageIds = new Set(accountPages.filter((p) => p.canPublish).map((p) => p.id));
    let count = 0;
    for (const draft of draftPosts) {
      if (!selectedDraftIds.includes(draft.id)) continue;
      if (targetType === 'GROUP') {
        count += (groupIdsByDraftId[draft.id] ?? []).filter((id) => validGroupIds.has(id)).length;
      } else {
        count += (pageIdsByDraftId[draft.id] ?? []).filter((id) => validPageIds.has(id)).length;
      }
    }
    return count;
  }, [draftPosts, selectedDraftIds, targetType, groupIdsByDraftId, pageIdsByDraftId, groups, accountPages]);

  const allVisibleGroupsSelected =
    filteredGroups.length > 0 && filteredGroups.every((g) => selectedGroupIds.includes(g.id));

  return (
    <div className="space-y-4">
      {/* Expired / Inactive Subscription Guard Banner */}
      {!usageSummary.isActive && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-rose-600 text-[20px] mt-0.5">
              gpp_maybe
            </span>
            <div>
              <p className="text-sm font-bold text-rose-900">
                Gói dịch vụ của bạn đã hết hạn hoặc chưa kích hoạt
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                Bạn vẫn có thể soạn bài nháp và quản lý danh sách nhóm, nhưng cần gia hạn gói để tạo
                tác vụ đăng bài mới.
              </p>
            </div>
          </div>
          <Link
            to="/pricing"
            className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            Xem gói dịch vụ
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Top Composer Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="account-select" className="block text-[11px] font-semibold text-slate-500 mb-1">
              Hồ sơ Facebook thực hiện
            </label>
            <select
              id="account-select"
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="h-9 min-w-[230px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
            >
              {accounts.length === 0 && <option value="">Chưa có hồ sơ Facebook nào</option>}
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.displayName} ({acc.connectionType === 'META_OAUTH' ? 'Meta OAuth' : 'Thủ công'} — {acc.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">
              Đích đăng bài
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setTargetType('GROUP')}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${
                  targetType === 'GROUP'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nhóm Facebook ({groups.length})
              </button>
              <button
                type="button"
                onClick={() => setTargetType('PAGE')}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${
                  targetType === 'PAGE'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fanpage ({accountPages.length})
              </button>
            </div>
          </div>
        </div>

        {/* Publish Mode & Submit CTA */}
        <div className="flex flex-wrap items-end gap-2.5">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">
              Thời điểm đăng
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setPublishMode('NOW')}
                className={`h-8 px-3 rounded-md text-xs font-semibold ${
                  publishMode === 'NOW'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đăng ngay
              </button>
              <button
                type="button"
                onClick={() => setPublishMode('SCHEDULE')}
                className={`h-8 px-3 rounded-md text-xs font-semibold ${
                  publishMode === 'SCHEDULE'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lên lịch (GMT+7)
              </button>
            </div>
          </div>

          {publishMode === 'SCHEDULE' && (
            <div>
              <label htmlFor="schedule-input" className="block text-[11px] font-semibold text-slate-500 mb-1">
                Ngày giờ (GMT+7) · Lịch chờ: {usageSummary.scheduledTasksUsed}/{usageSummary.scheduledTasksLimit}
              </label>
              <input
                id="schedule-input"
                type="datetime-local"
                value={scheduleLocal}
                onChange={(e) => setScheduleLocal(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              />
            </div>
          )}

          <button
            type="button"
            disabled={!usageSummary.isActive}
            onClick={handleOpenPublishConfirmation}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[17px]">
              {publishMode === 'SCHEDULE' ? 'schedule_send' : 'send'}
            </span>
            {publishMode === 'SCHEDULE' ? 'Lên lịch tác vụ' : 'Tạo tác vụ đăng'}
            {totalAssignedPairsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500 text-[10px]">
                {totalAssignedPairsCount} mục
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: 10 Draft Slots & Editor */}
        <section className="xl:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                Soạn nội dung bài viết (10 khung bài nháp)
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chọn tab để chỉnh sửa, đánh dấu ô chọn để đưa nhiều bài vào cùng 1 tác vụ.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSavedDrawer((s) => !s)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">bookmarks</span>
                Bài đã lưu ({savedPosts.length})
              </button>
            </div>
          </div>

          {/* Saved Posts Collapsible Shelf */}
          {showSavedDrawer && (
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800">Thư viện bài viết đã lưu</p>
                <button
                  type="button"
                  onClick={() => setShowSavedDrawer(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Thu gọn
                </button>
              </div>
              {savedPosts.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  Chưa có bài viết mẫu nào được lưu.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto">
                  {savedPosts.map((sp) => (
                    <div
                      key={sp.id}
                      className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {sp.savedName ?? 'Bài viết mẫu'}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {sp.content || sp.linkUrl || '(Chỉ có media đính kèm)'}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                          {sp.media.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              {sp.media.length} tệp media
                            </span>
                          )}
                          {sp.linkUrl && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              Có link
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => deleteSavedPost(sp.id)}
                          className="h-7 px-2 rounded text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadSavedPost(sp)}
                          className="h-7 px-2.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold"
                        >
                          Nạp vào Bài #{activeSlotNumber}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 10 Independent Draft Slot Tabs */}
          <div className="px-5 pt-3.5 pb-3 border-b border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {draftPosts.map((draft) => {
                const slot = draft.slotNumber ?? 1;
                const isEditing = slot === activeSlotNumber;
                const isChecked = selectedDraftIds.includes(draft.id);
                const hasContent = hasPublishableContent(draft);
                const assignedCount =
                  targetType === 'GROUP'
                    ? (groupIdsByDraftId[draft.id] ?? []).length
                    : (pageIdsByDraftId[draft.id] ?? []).length;

                return (
                  <div
                    key={draft.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      isEditing
                        ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDraftSelection(draft.id)}
                      aria-label={`Chọn Bài ${slot} để đăng`}
                      title={`Chọn Bài ${slot} để đưa vào tác vụ đăng`}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveSlotNumber(slot)}
                      className="flex items-center justify-between gap-1 flex-1 min-w-0"
                    >
                      <span className="truncate">Bài {slot}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        {assignedCount > 0 && (
                          <span
                            className="px-1 rounded bg-blue-100 text-blue-700 text-[10px] font-bold"
                            title={`Đã gán ${assignedCount} đích đăng riêng cho Bài ${slot}`}
                          >
                            {assignedCount}
                          </span>
                        )}
                        {hasContent && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                            title="Đã có nội dung hợp lệ"
                          />
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Draft Editor */}
          {activeDraft && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    Đang chỉnh sửa: Bài nháp #{activeSlotNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      hasPublishableContent(activeDraft)
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {hasPublishableContent(activeDraft) ? 'Hợp lệ để đăng' : 'Chưa có nội dung'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Đã chọn {selectedDraftIds.length} bài để đăng
                </span>
              </div>

              {/* Text Content */}
              <div>
                <label htmlFor="draft-content" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nội dung văn bản (có thể bỏ trống nếu có ảnh/video hoặc link)
                </label>
                <textarea
                  id="draft-content"
                  rows={6}
                  value={activeDraft.content}
                  onChange={(e) =>
                    updateDraftSlot(activeSlotNumber, { content: e.target.value })
                  }
                  placeholder="Nhập nội dung bài viết Facebook của bạn tại đây..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 resize-y"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{activeDraft.content.length} ký tự</span>
                  <span>Tự động lưu nháp cục bộ (DEMO)</span>
                </div>
              </div>

              {/* Link Attachment */}
              <div>
                <label htmlFor="draft-link" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Đường dẫn đính kèm (tùy chọn)
                </label>
                <input
                  id="draft-link"
                  type="url"
                  value={activeDraft.linkUrl ?? ''}
                  onChange={(e) =>
                    updateDraftSlot(activeSlotNumber, {
                      linkUrl: e.target.value || null,
                    })
                  }
                  placeholder="https://example.com/san-pham"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                />
              </div>

              {/* Media Uploader */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Ảnh &amp; Video đính kèm ({activeDraft.media.length}/{MAX_MEDIA_PER_POST})
                  </label>
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Lưu tạm cục bộ trên trình duyệt (DEMO)
                  </span>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleMediaFiles(e.dataTransfer.files);
                  }}
                  className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 text-[22px]">
                      add_photo_alternate
                    </span>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-700">
                        Kéo thả ảnh/video vào đây hoặc bấm chọn tệp
                      </p>
                      <p className="text-[11px] text-slate-500">
                        JPG, PNG, WEBP, GIF (&le;20MB) · MP4, WEBM, MOV (&le;100MB)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                  >
                    Chọn ảnh / video
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => {
                      handleMediaFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </div>

                {activeDraft.media.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {activeDraft.media.map((m, idx) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col"
                      >
                        <div className="aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden">
                          <MediaPreview media={m} className="w-full h-full" />
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="p-2 flex items-center justify-between gap-1 text-[11px]">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">{m.originalName}</p>
                            <p className="text-[10px] text-slate-500">
                              {formatFileSize(m.sizeBytes)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleReorderMedia(idx, -1)}
                              aria-label="Di chuyển trái"
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                chevron_left
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeDraft.media.length - 1}
                              onClick={() => handleReorderMedia(idx, 1)}
                              aria-label="Di chuyển phải"
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                chevron_right
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(m.id)}
                              aria-label="Xóa tệp"
                              className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Template Inline Form or Action Bar */}
              {saveTemplateOpen ? (
                <form
                  onSubmit={handleSaveTemplate}
                  className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    required
                    placeholder="Đặt tên cho bài viết lưu mẫu..."
                    className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-blue-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                  <button
                    type="submit"
                    className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Lưu mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveTemplateOpen(false)}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold"
                  >
                    Hủy
                  </button>
                </form>
              ) : (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setResetSlotConfirmOpen(true)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    Xóa trắng Bài #{activeSlotNumber}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveTemplateOpen(true)}
                    className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                    Lưu làm bài mẫu
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Groups OR Fanpages Selector */}
        <section className="xl:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {targetType === 'GROUP' ? (
            <>
              <div className="px-5 py-3.5 border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Danh sách Nhóm Facebook ({groups.length}/{usageSummary.groupsLimit || '∞'})
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Đang gán cho <span className="font-bold text-slate-800">Bài nháp #{activeSlotNumber}</span>:{' '}
                      <span className="font-bold text-blue-700">{selectedGroupIds.length}</span> nhóm đích
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(null);
                        setGroupModalOpen(true);
                      }}
                      className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm nhóm
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvModalOpen(true)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      Nhập CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      {selectedGroupIds.length > 0
                        ? `Xuất CSV (${selectedGroupIds.length})`
                        : 'Xuất CSV'}
                    </button>
                  </div>
                </div>

                {/* Search & Approval Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined text-[17px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                      search
                    </span>
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Tìm theo tên nhóm, URL hoặc UID..."
                      className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    />
                  </div>
                  <select
                    value={approvalFilter}
                    onChange={(e) =>
                      setApprovalFilter(e.target.value as 'ALL' | 'YES' | 'NO' | 'UNKNOWN')
                    }
                    aria-label="Lọc theo duyệt bài"
                    className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
                  >
                    <option value="ALL">Mọi trạng thái duyệt</option>
                    <option value="NO">Không cần duyệt</option>
                    <option value="YES">Cần duyệt bài</option>
                    <option value="UNKNOWN">Chưa xác định</option>
                  </select>
                </div>

                {/* Many-to-many Group Collections Filter Bar */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveCollectionId('ALL')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                        activeCollectionId === 'ALL'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Tất cả ({groups.length})
                    </button>
                    {collections.map((col) => {
                      const isActive = activeCollectionId === col.id;
                      const count = groupCountByCollection.get(col.id) ?? 0;
                      return (
                        <div
                          key={col.id}
                          className={`inline-flex items-center rounded-md border text-[11px] ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveCollectionId(col.id)}
                            className="px-2.5 py-1 font-semibold"
                          >
                            {col.name} ({count})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCollection(col);
                              setCollectionModalOpen(true);
                            }}
                            aria-label={`Đổi tên bộ sưu tập ${col.name}`}
                            className={`px-1 py-1 opacity-75 hover:opacity-100 ${
                              isActive ? 'text-white' : 'text-slate-500'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCollection(col)}
                            aria-label={`Xóa bộ sưu tập ${col.name}`}
                            className={`pr-1.5 py-1 opacity-75 hover:opacity-100 ${
                              isActive ? 'text-white' : 'text-rose-500'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">close</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Select All + Save Collection + Optional Copy Mapping */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allVisibleGroupsSelected}
                        onChange={handleToggleAllVisibleGroups}
                        disabled={filteredGroups.length === 0}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium">
                        Chọn tất cả đang hiển thị ({filteredGroups.length})
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      {selectedDraftIds.length > 1 && selectedGroupIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyActiveDestinationsToSelectedDrafts}
                          className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:underline"
                        >
                          Áp dụng cho {selectedDraftIds.length} bài đã chọn
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={selectedGroupIds.length === 0}
                        onClick={() => {
                          setEditingCollection(null);
                          setCollectionModalOpen(true);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                      >
                        + Lưu thành bộ sưu tập ({selectedGroupIds.length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Items List */}
              <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                    <span className="material-symbols-outlined text-[32px] text-slate-300">
                      groups
                    </span>
                    <p>
                      {groups.length === 0
                        ? 'Chưa có nhóm Facebook nào. Hãy bấm "Thêm nhóm" hoặc "Nhập CSV".'
                        : 'Không tìm thấy nhóm phù hợp với bộ lọc hiện tại.'}
                    </p>
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const checked = selectedGroupIds.includes(group.id);
                    const groupCols = collectionsByGroupId.get(group.id) ?? [];
                    return (
                      <div
                        key={group.id}
                        className={`p-3.5 flex items-start gap-3 transition-colors ${
                          checked ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleGroup(group.id)}
                          aria-label={`Chọn nhóm ${group.groupName}`}
                          className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {group.groupName}
                            </p>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGroup(group);
                                  setGroupModalOpen(true);
                                }}
                                aria-label={`Sửa nhóm ${group.groupName}`}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingGroup(group)}
                                aria-label={`Xóa nhóm ${group.groupName}`}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </div>

                          <a
                            href={group.groupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline truncate block mt-0.5"
                          >
                            {group.groupUrl}
                          </a>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Thành viên: {formatMemberCount(group.memberCount)}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                group.requiresApproval === true
                                  ? 'bg-amber-50 text-amber-800'
                                  : group.requiresApproval === false
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {group.requiresApproval === true
                                ? 'Cần duyệt bài'
                                : group.requiresApproval === false
                                ? 'Không cần duyệt'
                                : 'Duyệt bài: Chưa rõ'}
                            </span>
                            {groupCols.map((c) => (
                              <span
                                key={c.id}
                                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                          {group.notes && (
                            <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-1">
                              Ghi chú: {group.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* FANPAGE TAB */
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Fanpage đích cho Bài nháp #{activeSlotNumber}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chỉ các Fanpage có quyền đăng bài (<code className="font-mono">canPublish = true</code>)
                    và thuộc hồ sơ đã kết nối Meta OAuth mới có thể chọn.
                  </p>
                </div>
                {selectedDraftIds.length > 1 && selectedPageIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyActiveDestinationsToSelectedDrafts}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Áp dụng cho {selectedDraftIds.length} bài đã chọn
                  </button>
                )}
              </div>

              {!selectedAccount ||
              selectedAccount.connectionType !== 'META_OAUTH' ||
              selectedAccount.status !== 'CONNECTED' ? (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2.5">
                  <p className="font-bold">
                    Hồ sơ hiện tại chưa kết nối Meta OAuth hợp lệ
                  </p>
                  <p className="leading-relaxed">
                    Hồ sơ thủ công (UNVERIFIED) hoặc hồ sơ đã ngắt kết nối không thể đăng bài qua
                    Meta Page API. Vui lòng chọn hồ sơ Meta OAuth ở thanh trên hoặc kết nối mới.
                  </p>
                  <Link
                    to="/accounts"
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                  >
                    Đi tới trang Tài khoản &amp; Thiết bị
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </Link>
                </div>
              ) : accountPages.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
                  <p>Hồ sơ này chưa có Fanpage nào được đồng bộ.</p>
                  <Link to="/accounts" className="font-semibold text-blue-600 hover:underline">
                    Đồng bộ Fanpage tại trang Tài khoản
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {accountPages.map((page) => {
                    const checked = selectedPageIds.includes(page.id);
                    return (
                      <label
                        key={page.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                          !page.canPublish
                            ? 'bg-slate-50 border-slate-200 opacity-70 cursor-not-allowed'
                            : checked
                            ? 'bg-blue-50/50 border-blue-400 cursor-pointer'
                            : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!page.canPublish}
                          checked={checked}
                          onChange={() => handleTogglePage(page.id)}
                          className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900">{page.pageName}</p>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                page.canPublish
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {page.canPublish ? 'Có quyền đăng' : 'Không có quyền đăng'}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Page UID: {page.pageUid}
                          </p>
                          <a
                            href={page.pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-blue-600 hover:underline block truncate mt-0.5"
                          >
                            {page.pageUrl}
                          </a>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <GroupFormModal
        open={groupModalOpen}
        editingGroup={editingGroup}
        onClose={() => setGroupModalOpen(false)}
        onSubmit={(req, editingId) => {
          const res = editingId ? updateGroup(editingId, req) : createGroup(req);
          if (res.ok) {
            addToast(
              'success',
              editingId ? 'Đã cập nhật nhóm' : 'Đã thêm nhóm mới',
              res.data?.groupName
            );
          }
          return res;
        }}
      />

      <CsvImportModal
        open={csvModalOpen}
        existingGroups={groups}
        onClose={() => setCsvModalOpen(false)}
        onConfirmImport={(rows) => {
          const res = importGroups(rows);
          if (res.ok && res.data) {
            addToast(
              'success',
              `Đã nhập ${res.data.inserted.length} nhóm từ CSV`,
              res.data.skippedCount > 0
                ? `Bỏ qua ${res.data.skippedCount} dòng trùng lặp hoặc vượt hạn mức.`
                : undefined
            );
          }
        }}
      />

      <CollectionModal
        open={collectionModalOpen}
        editingCollection={editingCollection}
        selectedGroupCount={selectedGroupIds.length}
        onClose={() => setCollectionModalOpen(false)}
        onSubmit={(name, editingId) => {
          const res = editingId
            ? renameCollection(editingId, name)
            : createCollection(name, selectedGroupIds);
          if (res.ok) {
            addToast(
              'success',
              editingId ? 'Đã đổi tên bộ sưu tập' : 'Đã tạo bộ sưu tập nhóm',
              res.data?.name
            );
          }
          return res;
        }}
      />

      <ConfirmPublishModal
        open={confirmModalOpen}
        account={selectedAccount}
        targetType={targetType}
        executionMode={targetType === 'GROUP' ? 'MANUAL_GROUP' : 'META_PAGE_API'}
        scheduledAtIso={pendingScheduledIso}
        initialPairs={pendingPairs}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmCreateTask}
      />

      <ConfirmDialog
        open={Boolean(deletingGroup)}
        title="Xóa nhóm khỏi danh sách?"
        description={`Xóa "${deletingGroup?.groupName ?? ''}" chỉ xóa khỏi danh sách quản lý trong công cụ này, KHÔNG tự động rời nhóm Facebook của bạn.`}
        confirmLabel="Xóa khỏi công cụ"
        onCancel={() => setDeletingGroup(null)}
        onConfirm={() => {
          if (deletingGroup) {
            deleteGroup(deletingGroup.id);
            addToast('info', 'Đã xóa nhóm khỏi danh sách', deletingGroup.groupName);
          }
          setDeletingGroup(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingCollection)}
        title="Xóa bộ sưu tập nhóm?"
        description={`Xóa bộ sưu tập "${deletingCollection?.name ?? ''}" sẽ KHÔNG xóa các nhóm Facebook nằm bên trong bộ sưu tập này.`}
        confirmLabel="Xóa bộ sưu tập"
        onCancel={() => setDeletingCollection(null)}
        onConfirm={() => {
          if (deletingCollection) {
            deleteCollection(deletingCollection.id);
            if (activeCollectionId === deletingCollection.id) setActiveCollectionId('ALL');
            addToast('info', 'Đã xóa bộ sưu tập', deletingCollection.name);
          }
          setDeletingCollection(null);
        }}
      />

      <ConfirmDialog
        open={resetSlotConfirmOpen}
        title={`Xóa trắng Bài nháp #${activeSlotNumber}?`}
        description="Nội dung văn bản, liên kết và tệp media đang soạn trong khung bài nháp này sẽ bị xóa."
        confirmLabel="Xóa trắng"
        onCancel={() => setResetSlotConfirmOpen(false)}
        onConfirm={() => {
          resetDraftSlot(activeSlotNumber);
          setResetSlotConfirmOpen(false);
          addToast('info', `Đã xóa trắng Bài nháp #${activeSlotNumber}`);
        }}
      />
    </div>
  );
};
