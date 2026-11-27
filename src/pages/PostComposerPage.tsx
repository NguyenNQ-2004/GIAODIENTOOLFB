import React, { useMemo, useRef, useState } from 'react';
import {
  FacebookAccount,
  FacebookGroup,
  Fanpage,
  GroupCollection,
  MediaAttachment,
  PostSlot,
  PublishingTask,
  SavedPost,
} from '../types/app';
import { SafeImage } from '../components/SafeImage';

interface PostComposerPageProps {
  accounts: FacebookAccount[];
  fanpages: Fanpage[];
  groups: FacebookGroup[];
  collections: GroupCollection[];
  slots: PostSlot[];
  savedPosts: SavedPost[];
  initialScheduleMode?: 'immediate' | 'scheduled';
  onUpdateSlot: (slotNumber: number, updated: Partial<PostSlot>) => void;
  onToggleGroup: (groupId: string) => void;
  onToggleAllGroups: (selected: boolean, visibleIds: string[]) => void;
  onAddGroup: (group: Omit<FacebookGroup, 'id' | 'selected'>) => void;
  onDeleteGroup: (groupId: string) => void;
  onImportCsvGroups: (newGroups: Omit<FacebookGroup, 'id' | 'selected'>[]) => void;
  onAddCollection: (name: string) => void;
  onSavePostTemplate: (slot: PostSlot) => void;
  onCreateTask: (task: PublishingTask) => void;
  onOpenConnectAccountModal: () => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

const EMOJI_BANK = ['🔥', '✨', '📍', '📞', '🏡', '✅', '🚀', '💎', '📌', '🎉', '👉', '💰'];

const SAMPLE_CSV_PREVIEW = [
  {
    row: '#01',
    status: 'valid' as const,
    name: 'Chung Cư Cao Cấp Sunshine City',
    url: 'facebook.com/groups/sunshinecityhanoi',
    uid: '1049285720901',
    members: 14200,
    approval: 'true' as const,
    approvalLabel: 'Có',
  },
  {
    row: '#02',
    status: 'duplicate' as const,
    name: 'Mua bán nhà đất Cầu Giấy (Đã có)',
    url: 'facebook.com/groups/muabannhadathanoi',
    uid: '1049285720194',
    members: 85420,
    approval: 'false' as const,
    approvalLabel: 'Không',
  },
  {
    row: '#03',
    status: 'error' as const,
    name: 'Hội đầu tư BĐS Đông Anh',
    url: '[TRỐNG URL - BẮT BUỘC]',
    uid: '',
    members: 5400,
    approval: 'unknown' as const,
    approvalLabel: 'Chưa rõ',
  },
  {
    row: '#04',
    status: 'valid' as const,
    name: 'Cộng đồng Môi giới Nhà đất Thạch Thất - Hòa Lạc',
    url: 'facebook.com/groups/datnenhoalac2024',
    uid: '1049285720904',
    members: 29810,
    approval: 'false' as const,
    approvalLabel: 'Không',
  },
];

export const PostComposerPage: React.FC<PostComposerPageProps> = ({
  accounts,
  fanpages,
  groups,
  collections,
  slots,
  savedPosts,
  initialScheduleMode = 'immediate',
  onUpdateSlot,
  onToggleGroup,
  onToggleAllGroups,
  onAddGroup,
  onDeleteGroup,
  onImportCsvGroups,
  onAddCollection,
  onSavePostTemplate,
  onCreateTask,
  onOpenConnectAccountModal,
  onNotify,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeSlotNumber, setActiveSlotNumber] = useState<number>(1);
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>(
    initialScheduleMode
  );
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('2024-10-24T17:30');
  const [targetType, setTargetType] = useState<'groups' | 'fanpages'>('groups');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('col_bds');
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [selectedFanpageIds, setSelectedFanpageIds] = useState<string[]>(['fp-1']);

  // Popovers & Modals
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [fullscreenEditor, setFullscreenEditor] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [savedPostsModalOpen, setSavedPostsModalOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [progressPanelOpen, setProgressPanelOpen] = useState(false);

  // Add Group form state (POST-12)
  const [newGroupName, setNewGroupName] = useState('Mua bán nhà đất Hà Nội & Miền Bắc');
  const [newGroupUrl, setNewGroupUrl] = useState('https://facebook.com/groups/batdongsanhanoi');
  const [newGroupUid, setNewGroupUid] = useState('1049285720888');
  const [newGroupMembers, setNewGroupMembers] = useState('85420');
  const [newGroupApproval, setNewGroupApproval] = useState<'true' | 'false' | 'unknown'>('true');
  const [newGroupCol, setNewGroupCol] = useState('col_bds');
  const [newGroupNotes, setNewGroupNotes] = useState(
    'Nhóm kiểm duyệt gắt về hình ảnh bản đồ quy hoạch, ưu tiên đăng khung giờ 11h - 13h trưa.'
  );

  // Collection create state
  const [newCollectionName, setNewCollectionName] = useState('');

  // Confirm modal removed items
  const [excludedConfirmGroupIds, setExcludedConfirmGroupIds] = useState<string[]>([]);
  const [lastCreatedTask, setLastCreatedTask] = useState<PublishingTask | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAccount =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const activeSlot = slots.find((s) => s.slotNumber === activeSlotNumber) || slots[0];

  const visibleGroups = useMemo(() => {
    return groups.filter((g) => {
      if (selectedCollectionId !== 'ALL' && g.collectionId !== selectedCollectionId) {
        return false;
      }
      if (groupSearch.trim()) {
        const q = groupSearch.toLowerCase();
        return g.name.toLowerCase().includes(q) || g.uid.includes(q);
      }
      return true;
    });
  }, [groups, selectedCollectionId, groupSearch]);

  const selectedGroups = useMemo(
    () => groups.filter((g) => g.selected),
    [groups]
  );

  const totalReach = useMemo(
    () => selectedGroups.reduce((acc, g) => acc + g.memberCount, 0),
    [selectedGroups]
  );

  const instantOpenPct = useMemo(() => {
    if (selectedGroups.length === 0) return 0;
    const noApproval = selectedGroups.filter((g) => g.requiresApproval === 'false').length;
    return Math.max(25, Math.round((noApproval / selectedGroups.length) * 100) || 75);
  }, [selectedGroups]);

  const wordCount = useMemo(() => {
    const trimmed = activeSlot.content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [activeSlot.content]);

  const allVisibleSelected =
    visibleGroups.length > 0 && visibleGroups.every((g) => g.selected);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newAttachments: MediaAttachment[] = files.map((file, idx) => ({
      id: `upload-${Date.now()}-${idx}`,
      name: file.name,
      sizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.type.startsWith('video') ? 'video' : 'image',
      url: URL.createObjectURL(file),
      alt: file.name,
    }));
    onUpdateSlot(activeSlotNumber, {
      media: [...activeSlot.media, ...newAttachments],
    });
    onNotify('success', `Đã thêm ${newAttachments.length} tệp đính kèm vào Slot #${activeSlotNumber}.`);
    e.target.value = '';
  };

  const handleMoveMediaLeft = (index: number) => {
    if (index === 0) return;
    const next = [...activeSlot.media];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onUpdateSlot(activeSlotNumber, { media: next });
  };

  const handleRemoveMedia = (id: string) => {
    onUpdateSlot(activeSlotNumber, {
      media: activeSlot.media.filter((m) => m.id !== id),
    });
  };

  const handleOpenConfirmModal = () => {
    if (!activeSlot.content.trim()) {
      onNotify('warning', 'Vui lòng nhập nội dung bài viết trước khi đăng.');
      return;
    }
    if (targetType === 'groups' && selectedGroups.length === 0) {
      onNotify('warning', 'Vui lòng chọn ít nhất 1 nhóm Facebook mục tiêu.');
      return;
    }
    if (targetType === 'fanpages' && selectedFanpageIds.length === 0) {
      onNotify('warning', 'Vui lòng chọn ít nhất 1 Fanpage mục tiêu.');
      return;
    }
    setExcludedConfirmGroupIds([]);
    setConfirmModalOpen(true);
  };

  const confirmRows = useMemo(() => {
    if (targetType === 'groups') {
      return selectedGroups.filter((g) => !excludedConfirmGroupIds.includes(g.id));
    }
    return fanpages.filter(
      (f) => selectedFanpageIds.includes(f.id) && !excludedConfirmGroupIds.includes(f.id)
    );
  }, [targetType, selectedGroups, fanpages, selectedFanpageIds, excludedConfirmGroupIds]);

  const handleConfirmCreateTask = () => {
    if (confirmRows.length === 0) {
      onNotify('warning', 'Không còn đích đăng nào trong danh sách xác nhận.');
      return;
    }
    const taskId = `TASK-${Math.floor(89210 + Math.random() * 700)}`;
    const isScheduled = scheduleMode === 'scheduled';

    const items = confirmRows.map((row, idx) => {
      const name = 'name' in row ? row.name : '';
      const uid = 'uid' in row ? row.uid : (row as Fanpage).pageId;
      const memberLabel =
        'memberCount' in row
          ? `${Math.round((row as FacebookGroup).memberCount / 1000)}k mem`
          : 'Fanpage';

      return {
        id: `ti-${Date.now()}-${idx}`,
        groupName: name,
        groupUid: uid,
        memberCountLabel: memberLabel,
        status: isScheduled
          ? ('QUEUED' as const)
          : idx === 0
          ? ('RUNNING' as const)
          : ('QUEUED' as const),
        statusDetail: isScheduled
          ? `Đã hẹn giờ lúc ${scheduledDateTime.replace('T', ' ')}`
          : idx === 0
          ? 'Extension đang mở form đăng bài trên nhóm Facebook...'
          : 'Đang xếp hàng chờ giãn cách an toàn 45-90s...',
        timestamp: isScheduled ? scheduledDateTime.slice(11, 16) : 'Vừa tạo',
      };
    });

    const newTask: PublishingTask = {
      id: taskId,
      status: isScheduled ? 'SCHEDULED' : 'RUNNING',
      slotNumber: activeSlot.slotNumber,
      mediaType: activeSlot.media.length > 1 ? 'images' : activeSlot.media.length === 1 ? 'image' : 'link',
      mediaSummary:
        activeSlot.media.length > 0
          ? `(${activeSlot.media.length} ảnh)`
          : activeSlot.shareLink
          ? '(Kèm link)'
          : '(Văn bản)',
      content: activeSlot.content,
      accountId: activeAccount.id,
      accountName: activeAccount.name,
      accountInitials: activeAccount.initials,
      accountRoleLabel: activeAccount.label,
      destinationSummary: `${confirmRows.length} ${
        targetType === 'groups' ? 'nhóm Manual' : 'Fanpage'
      }`,
      destinationDetail: confirmRows.map((r) => r.name).slice(0, 2).join(', '),
      method: targetType === 'groups' ? 'MANUAL_GROUP' : 'META_PAGE_API',
      completedCount: 0,
      totalCount: confirmRows.length,
      scheduledLabel: isScheduled ? scheduledDateTime.replace('T', ' ') : 'Ngay lập tức',
      subTimeLabel: isScheduled ? 'Đã lên lịch tự động' : 'Vừa khởi chạy',
      calendarDay: 24,
      mediaUrls: activeSlot.media.map((m) => m.url),
      items,
      logs: [
        {
          time: new Date().toTimeString().slice(0, 8),
          tag: '[AUTH]',
          message: `Verified active session for ${activeAccount.name} (${activeAccount.uid})`,
          tone: 'success',
        },
        {
          time: new Date().toTimeString().slice(0, 8),
          tag: isScheduled ? '[CRON]' : '[EXT]',
          message: isScheduled
            ? `Task queued for ${scheduledDateTime.replace('T', ' ')} GMT+7`
            : `Dispatching ${confirmRows.length} targets via Chrome Extension v1.2.4`,
          tone: 'info',
        },
      ],
    };

    onCreateTask(newTask);
    setLastCreatedTask(newTask);
    setConfirmModalOpen(false);
    setProgressPanelOpen(true);
  };

  const handleSubmitAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupUrl.trim()) return;
    const words = newGroupName.trim().split(/\s+/);
    const initials = (words[0]?.[0] || 'G') + (words[1]?.[0] || 'P');
    onAddGroup({
      name: newGroupName.trim(),
      initials: initials.toUpperCase(),
      badgeColorClass: 'bg-primary-fixed text-primary',
      uid: newGroupUid.trim() || String(Math.floor(1000000000000 + Math.random() * 9000000000000)),
      url: newGroupUrl.trim(),
      memberCount: Number(newGroupMembers) || 12000,
      requiresApproval: newGroupApproval,
      collectionId: newGroupCol,
      notes: newGroupNotes,
    });
    setAddGroupModalOpen(false);
  };

  const handleExportCsv = () => {
    const header = 'group_name,group_url,group_uid,member_count,requires_approval\n';
    const body = visibleGroups
      .map(
        (g) =>
          `"${g.name}","${g.url}","${g.uid}",${g.memberCount},${g.requiresApproval}`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh_sach_nhom_${selectedCollectionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', `Đã xuất ${visibleGroups.length} nhóm ra tệp CSV.`);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg text-on-surface">
      {/* Workstation Breadcrumb & Status Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest px-space-lg py-space-sm rounded-lg shadow-sm">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs text-[13px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">dynamic_feed</span>
            <span>Đăng bài Facebook</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-medium">
              {targetType === 'groups'
                ? 'Chiến dịch đơn lẻ (Manual Mode)'
                : 'Đăng Fanpage qua Meta API'}
            </span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container text-[11px] text-secondary font-mono">
            POST-01 / V1.2
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="flex items-center gap-space-xs text-[11px] text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Extension FB PRO: <strong className="text-on-surface">Đang kết nối (Tab 1)</strong>
            </span>
          </div>
          <div className="h-3 w-[1px] bg-surface-container-highest hidden sm:block" />
          <div className="text-[11px] text-on-surface-variant tabular-nums">
            Hạn mức ngày: <span className="font-medium text-primary">42 / 200 lượt</span>
          </div>
          <button
            type="button"
            onClick={() =>
              onNotify(
                'info',
                'Hướng dẫn: Chọn tài khoản -> Nhập nội dung Slot -> Chọn nhóm mục tiêu -> Bấm Chuẩn bị đăng bài.'
              )
            }
            className="h-6 px-space-sm text-[11px] bg-surface-container-low hover:bg-surface-container text-on-surface rounded flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">help</span>
            <span>Tài liệu hướng dẫn</span>
          </button>
        </div>
      </div>

      {/* Two-Column Main Canvas */}
      <div className="w-full grid grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN (6 cols) */}
        <div className="col-span-12 xl:col-span-6 flex flex-col gap-space-lg">
          {/* A. Facebook Account Selector Card */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="text-[13px] font-semibold text-on-surface tracking-tight">
                  Tài khoản Facebook
                </span>
                <span className="text-[11px] text-secondary font-mono">(Trình điều khiển)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onNotify('success', `Đã làm mới trạng thái Cookie của ${activeAccount.name}.`)
                  }
                  className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  title="Làm mới trạng thái tài khoản"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenConnectAccountModal}
                  className="h-7 px-space-sm bg-surface-container-low hover:bg-surface-container-high text-primary text-xs font-medium rounded flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Thêm TK</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors text-left"
            >
              <div className="flex items-center gap-space-md min-w-0">
                <div className="relative shrink-0">
                  <SafeImage
                    src={activeAccount.avatarUrl}
                    alt={activeAccount.name}
                    fallbackText={activeAccount.initials}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest ${
                      activeAccount.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="text-[13px] font-semibold text-on-surface truncate">
                      {activeAccount.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 ${
                        activeAccount.status === 'CONNECTED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          activeAccount.status === 'CONNECTED' ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                      />
                      {activeAccount.status === 'CONNECTED' ? 'Đã kết nối' : 'Cần xác thực'}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm text-[11px] text-secondary font-mono">
                    <span>UID: {activeAccount.uid}</span>
                    <span>·</span>
                    <span>
                      {activeAccount.cookieDaysLeft
                        ? `Cookie Live (${activeAccount.cookieDaysLeft}d còn lại)`
                        : 'Thêm thủ công'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant shrink-0">
                <span className="text-[11px]">Đổi tài khoản</span>
                <span className="material-symbols-outlined text-[18px]">unfold_more</span>
              </div>
            </button>

            {accountMenuOpen && (
              <div className="absolute left-3 right-3 top-[108px] bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container z-30 py-1">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setAccountMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-surface-container-low ${
                      acc.id === selectedAccountId ? 'bg-primary-fixed/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SafeImage
                        src={acc.avatarUrl}
                        alt={acc.name}
                        fallbackText={acc.initials}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-semibold text-on-surface">{acc.name}</p>
                        <p className="text-[11px] text-on-surface-variant font-mono">{acc.uid}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-primary font-medium">
                      {acc.status === 'CONNECTED' ? 'Live' : 'Expired'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* B. Saved Posts Bar (POST-09) */}
          <div className="bg-surface-container-lowest rounded-lg px-space-md py-space-sm shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[18px]">bookmark</span>
              <span className="text-[13px] font-medium text-on-surface">
                Mẫu bài đăng đã lưu
              </span>
              <span className="px-2 py-0.5 bg-primary-fixed text-on-primary-fixed text-[11px] font-semibold rounded-full tabular-nums">
                {savedPosts.length} bài đã lưu
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSavedPostsModalOpen(true)}
              className="h-7 px-space-md bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium rounded flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[15px]">folder_open</span>
              <span>Chọn bài đã lưu (POST-09)</span>
            </button>
          </div>

          {/* C. 10 Draft Slots Editor */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="text-[16px] font-semibold text-on-surface">
                  Nội dung bài đăng
                </span>
                <span className="text-[11px] text-secondary hidden sm:inline">
                  (Hỗ trợ 10 kịch bản đăng luân phiên)
                </span>
              </div>
              <div className="flex items-center gap-space-xs text-[11px] text-emerald-700 font-medium">
                <span className="material-symbols-outlined text-emerald-600 text-[14px]">
                  check_circle
                </span>
                <span>Đã lưu tự động</span>
              </div>
            </div>

            {/* 10 Horizontal Slots Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-surface-container no-scrollbar">
              {slots.map((slot) => {
                const isActive = slot.slotNumber === activeSlotNumber;
                const hasContent = slot.content.trim().length > 0;
                return (
                  <button
                    key={slot.slotNumber}
                    type="button"
                    onClick={() => setActiveSlotNumber(slot.slotNumber)}
                    className={`relative px-3 py-1.5 rounded-t text-xs flex items-center gap-1.5 shrink-0 transition-colors ${
                      isActive
                        ? 'bg-surface-container text-primary font-semibold'
                        : hasContent
                        ? 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    <span>
                      {slot.slotNumber <= 5 ? `Slot ${slot.slotNumber}` : `${slot.slotNumber}`}
                    </span>
                    {hasContent && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-primary' : 'bg-secondary'
                        }`}
                      />
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Textarea Composer */}
            <div className="relative bg-surface-container-low rounded-lg p-space-sm focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 transition-all">
              <textarea
                rows={fullscreenEditor ? 14 : 7}
                value={activeSlot.content}
                onChange={(e) =>
                  onUpdateSlot(activeSlotNumber, { content: e.target.value })
                }
                placeholder="Nhập nội dung bài viết của bạn tại đây (Hỗ trợ định dạng đầy đủ, biểu tượng cảm xúc, xuống dòng chuẩn Facebook)..."
                className="w-full bg-transparent resize-none outline-none text-[14px] text-on-surface leading-[1.55] placeholder:text-secondary"
              />

              {/* Emoji Picker Popover */}
              {emojiOpen && (
                <div className="absolute bottom-11 left-2 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container p-2 grid grid-cols-6 gap-1 z-20">
                  {EMOJI_BANK.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onUpdateSlot(activeSlotNumber, {
                          content: activeSlot.content + emoji,
                        });
                        setEmojiOpen(false);
                      }}
                      className="w-8 h-8 rounded hover:bg-surface-container flex items-center justify-center text-base"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Editor Metadata */}
              <div className="flex items-center justify-between pt-space-xs mt-space-xs border-t border-surface-container-high/60">
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((prev) => !prev)}
                    className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    title="Chèn biểu tượng Emoji"
                  >
                    <span className="material-symbols-outlined text-[17px]">mood</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(activeSlot.content);
                      onNotify('success', `Đã sao chép nội dung Slot #${activeSlotNumber}.`);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    title="Sao chép nội dung"
                  >
                    <span className="material-symbols-outlined text-[17px]">content_copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSlot(activeSlotNumber, { content: '', shareLink: '', media: [] });
                      onNotify('info', `Đã xóa trắng nội dung Slot #${activeSlotNumber}.`);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded text-error hover:bg-error-container hover:text-on-error-container transition-colors"
                    title="Xóa trắng nội dung"
                  >
                    <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
                  </button>
                  <div className="h-3 w-[1px] bg-surface-container-highest mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setFullscreenEditor((v) => !v)}
                    className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    title="Mở rộng khung soạn thảo"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {fullscreenEditor ? 'close_fullscreen' : 'open_in_full'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-space-md text-[11px] text-secondary tabular-nums">
                  <span>
                    Độ dài:{' '}
                    <strong className="text-on-surface font-mono font-medium">
                      {activeSlot.content.length}
                    </strong>{' '}
                    ký tự
                  </span>
                  <span>·</span>
                  <span>{wordCount} từ</span>
                  <span>·</span>
                  <span className="text-primary font-medium">Slot #{activeSlotNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* D. Share Link Input */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-xs">
            <label
              htmlFor="share-link-input"
              className="flex items-center justify-between text-[13px] font-semibold text-on-surface"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">link</span>
                <span>Liên kết chia sẻ (URL Preview)</span>
              </div>
              <span className="text-[11px] text-secondary font-normal">
                Tùy chọn đính kèm liên kết
              </span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-space-sm material-symbols-outlined text-secondary text-[16px]">
                public
              </span>
              <input
                id="share-link-input"
                type="url"
                value={activeSlot.shareLink}
                onChange={(e) =>
                  onUpdateSlot(activeSlotNumber, { shareLink: e.target.value })
                }
                placeholder="https://batdongsan.com.vn/..."
                className="w-full h-8 pl-8 pr-8 bg-surface-container-low focus:bg-surface-container-lowest text-on-surface text-[13px] rounded-lg outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {activeSlot.shareLink && (
                <button
                  type="button"
                  onClick={() => onUpdateSlot(activeSlotNumber, { shareLink: '' })}
                  className="absolute right-1 w-6 h-6 flex items-center justify-center text-secondary hover:text-error transition-colors"
                  title="Xóa liên kết"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* E. Images & Videos Uploader */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="text-[13px] font-semibold text-on-surface">
                  Hình ảnh / Video đính kèm
                </span>
                <span className="px-1.5 py-0.5 bg-surface-container text-[11px] font-semibold rounded text-secondary tabular-nums">
                  {activeSlot.media.length} tệp đã chọn
                </span>
              </div>
              <span className="text-[11px] text-secondary">Bấm nút mũi tên để đổi thứ tự</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-3 gap-space-sm">
              {activeSlot.media.map((item, idx) => (
                <div
                  key={item.id}
                  className="group relative bg-surface-container-low rounded-lg p-1.5 flex flex-col justify-between hover:bg-surface-container transition-all"
                >
                  <div className="relative w-full h-24 rounded overflow-hidden bg-surface-container-high flex items-center justify-center">
                    <SafeImage
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-inverse-surface/80 backdrop-blur-sm text-inverse-on-surface text-[11px] font-bold rounded tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="absolute inset-0 bg-inverse-surface/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveMediaLeft(idx)}
                          className="w-6 h-6 rounded bg-surface-container-lowest text-on-surface flex items-center justify-center hover:bg-surface-container"
                          title="Đưa lên trước"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_back
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id)}
                        className="w-6 h-6 rounded bg-surface-container-lowest text-error flex items-center justify-center hover:bg-error-container"
                        title="Xóa tệp"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="truncate font-medium text-on-surface max-w-[90px]">
                      {item.name}
                    </span>
                    <span className="text-secondary font-mono">{item.sizeLabel}</span>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-28 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col items-center justify-center text-center p-2 cursor-pointer group border border-dashed border-outline-variant/60"
              >
                <span className="material-symbols-outlined text-primary text-[24px] group-hover:scale-110 transition-transform">
                  cloud_upload
                </span>
                <span className="text-xs font-semibold text-primary mt-1">Tải ảnh/video</span>
                <span className="text-[11px] text-secondary">Tối đa 25MB (JPG, PNG, MP4)</span>
              </button>
            </div>
          </div>

          {/* F. Schedule Configuration */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="text-[13px] font-semibold text-on-surface">
                  Thời gian thực hiện
                </span>
                <span className="text-[11px] text-secondary font-mono">(Múi giờ GMT+7)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <label
                className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer transition-colors ${
                  scheduleMode === 'immediate'
                    ? 'bg-primary-fixed/30 ring-1 ring-primary'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="schedule_type"
                  checked={scheduleMode === 'immediate'}
                  onChange={() => setScheduleMode('immediate')}
                  className="w-4 h-4 text-primary accent-primary"
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-on-surface">Thực hiện ngay</span>
                  <span className="text-[11px] text-secondary">
                    Bắt đầu hàng đợi sau khi bấm xác nhận
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer transition-colors ${
                  scheduleMode === 'scheduled'
                    ? 'bg-primary-fixed/30 ring-1 ring-primary'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="schedule_type"
                  checked={scheduleMode === 'scheduled'}
                  onChange={() => setScheduleMode('scheduled')}
                  className="w-4 h-4 text-primary accent-primary"
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-on-surface">
                    Lên lịch tự động
                  </span>
                  <span className="text-[11px] text-secondary">
                    Hẹn giờ đăng bài tương lai
                  </span>
                </div>
              </label>
            </div>

            {scheduleMode === 'scheduled' && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-on-surface-variant font-medium">
                  Thời điểm phát hành:
                </span>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="h-8 px-3 rounded-lg bg-surface-container-low text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (6 cols) */}
        <div className="col-span-12 xl:col-span-6 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
            {/* Header & Target Type Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container pb-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="text-[16px] font-semibold text-on-surface">
                  Danh sách đăng bài
                </span>
                <span className="text-[11px] bg-surface-container px-2 py-0.5 rounded text-secondary font-medium">
                  {collections.find((c) => c.id === selectedCollectionId)?.name || 'Tất cả'}
                </span>
              </div>

              <div className="inline-flex p-0.5 bg-surface-container rounded-lg">
                <button
                  type="button"
                  onClick={() => setTargetType('groups')}
                  className={`px-space-md py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors whitespace-nowrap ${
                    targetType === 'groups'
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">groups</span>
                  <span>Nhóm Facebook ({groups.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('fanpages')}
                  className={`px-space-md py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors whitespace-nowrap ${
                    targetType === 'fanpages'
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">flag</span>
                  <span>Fanpage ({fanpages.filter((f) => f.canPublish).length})</span>
                </button>
              </div>
            </div>

            {targetType === 'groups' ? (
              <>
                {/* Collection Selector Bar */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low p-space-sm rounded-lg">
                  <div className="flex items-center gap-space-sm">
                    <span className="text-[13px] text-secondary font-medium">Bộ sưu tập:</span>
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="h-8 px-space-md bg-surface-container-lowest text-on-surface text-[13px] font-semibold rounded shadow-sm focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Tất cả ({groups.length} nhóm)</option>
                      {collections.map((col) => {
                        const count = groups.filter((g) => g.collectionId === col.id).length;
                        return (
                          <option key={col.id} value={col.id}>
                            {col.name} ({count} nhóm)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={() =>
                        onNotify(
                          'success',
                          `Đã lưu ${selectedGroups.length} nhóm đã chọn vào bộ sưu tập hiện tại.`
                        )
                      }
                      className="h-7 px-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">save</span>
                      <span>Lưu bộ sưu tập</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionModalOpen(true)}
                      className="h-7 px-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">tune</span>
                      <span>Quản lý BST</span>
                    </button>
                  </div>
                </div>

                {/* Group Search & CSV Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                  <div className="flex-1 min-w-[200px] max-w-sm relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[16px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Tìm theo tên nhóm hoặc UID..."
                      className="w-full h-8 pl-8 pr-3 bg-surface-container-low focus:bg-surface-container-lowest text-on-surface text-[13px] rounded-lg outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <span className="text-xs text-primary font-semibold mr-1 tabular-nums">
                      Đã chọn: {selectedGroups.length}/{visibleGroups.length} nhóm
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddGroupModalOpen(true)}
                      className="h-8 px-space-md bg-primary-container text-on-primary text-xs font-semibold rounded hover:bg-primary transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Thêm nhóm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvModalOpen(true)}
                      className="h-8 px-space-sm bg-surface-container-low hover:bg-surface-container text-on-surface text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">file_upload</span>
                      <span>Nhập CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="h-8 px-space-sm bg-surface-container-low hover:bg-surface-container text-on-surface text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">file_download</span>
                      <span>Xuất CSV</span>
                    </button>
                  </div>
                </div>

                {/* Dense Group Data Table */}
                <div className="w-full overflow-x-auto rounded-lg bg-surface-container-lowest border border-surface-container/60">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="h-8 bg-surface-container text-[11px] uppercase tracking-wider text-secondary">
                        <th className="w-8 px-space-sm text-center">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(e) =>
                              onToggleAllGroups(
                                e.target.checked,
                                visibleGroups.map((g) => g.id)
                              )
                            }
                            className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                          />
                        </th>
                        <th className="px-space-sm font-semibold">Tên nhóm Facebook</th>
                        <th className="px-space-sm font-semibold">UID Nhóm</th>
                        <th className="px-space-sm font-semibold">Thành viên</th>
                        <th className="px-space-sm font-semibold">Duyệt bài</th>
                        <th className="px-space-sm font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container/60 text-[13px]">
                      {visibleGroups.map((group) => (
                        <tr
                          key={group.id}
                          className={`h-10 hover:bg-surface-container-low transition-colors ${
                            group.selected ? 'bg-surface-container-low/40' : 'opacity-75'
                          }`}
                        >
                          <td className="w-8 px-space-sm text-center">
                            <input
                              type="checkbox"
                              checked={group.selected}
                              onChange={() => onToggleGroup(group.id)}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-space-sm">
                            <div className="flex items-center gap-space-sm">
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${group.badgeColorClass}`}
                              >
                                {group.initials}
                              </div>
                              <span
                                className="font-medium text-on-surface truncate max-w-[170px]"
                                title={group.name}
                              >
                                {group.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-space-sm font-mono text-[11px] text-secondary">
                            {group.uid}
                          </td>
                          <td className="px-space-sm font-medium text-on-surface tabular-nums">
                            {group.memberCount.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-space-sm">
                            {group.requiresApproval === 'false' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Không duyệt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Cần duyệt
                              </span>
                            )}
                          </td>
                          <td className="px-space-sm text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onNotify('info', `Đường dẫn nhóm: ${group.url}`)
                                }
                                className="w-6 h-6 flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-surface-container"
                                title="Mở nhóm trên Facebook"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  open_in_new
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteGroup(group.id)}
                                className="w-6 h-6 flex items-center justify-center rounded text-secondary hover:text-error hover:bg-error-container"
                                title="Xóa nhóm"
                              >
                                <span className="material-symbols-outlined text-[15px]">close</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Reach Summary Ring Widget */}
                <div className="bg-surface-container-low rounded-lg p-space-md flex items-center justify-between gap-4">
                  <div className="flex items-center gap-space-md">
                    <div className="w-11 h-11 shrink-0">
                      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-surface-container-high"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="text-primary"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray={`${instantOpenPct}, 100`}
                          strokeLinecap="round"
                          strokeWidth="4"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-on-surface">
                        Tổng quy mô tiếp cận dự kiến
                      </span>
                      <span className="text-[11px] text-secondary tabular-nums">
                        {totalReach.toLocaleString('vi-VN')} thành viên thuộc{' '}
                        {selectedGroups.length} nhóm đã kích hoạt
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {instantOpenPct}%
                    </span>
                    <span className="block text-[11px] text-secondary">Tỷ lệ mở bài ngay</span>
                  </div>
                </div>
              </>
            ) : (
              /* Fanpages Selection Tab */
              <div className="flex flex-col gap-2">
                {fanpages.map((fp) => {
                  const checked = selectedFanpageIds.includes(fp.id);
                  return (
                    <label
                      key={fp.id}
                      className={`p-3 rounded-lg flex items-center justify-between border transition-colors ${
                        !fp.canPublish
                          ? 'opacity-60 bg-surface-container-low/50 border-surface-container cursor-not-allowed'
                          : checked
                          ? 'bg-primary-fixed/20 border-primary/40 cursor-pointer'
                          : 'bg-surface-container-low border-transparent hover:bg-surface-container cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled={!fp.canPublish}
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFanpageIds((prev) => [...prev, fp.id]);
                            } else {
                              setSelectedFanpageIds((prev) =>
                                prev.filter((id) => id !== fp.id)
                              );
                            }
                          }}
                          className="w-4 h-4 accent-primary"
                        />
                        <SafeImage
                          src={fp.avatarUrl}
                          alt={fp.name}
                          fallbackText={fp.initials}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-[13px] font-semibold text-on-surface">{fp.name}</p>
                          <p className="text-[11px] text-on-surface-variant font-mono">
                            ID: {fp.pageId} · Từ {fp.ownerAccountName}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          fp.canPublish
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {fp.canPublish ? 'Có quyền đăng' : 'Chỉ quyền xem'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Summary & Main Action Bar */}
      <div className="w-full bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col xl:flex-row items-center justify-between gap-space-md">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-space-sm w-full xl:w-auto">
          <div className="flex flex-col px-space-md py-1.5 rounded-lg bg-surface-container-low">
            <span className="text-[11px] text-secondary">Bản nháp chọn</span>
            <span className="text-[13px] font-bold text-primary">Slot #{activeSlotNumber}</span>
          </div>
          <div className="flex flex-col px-space-md py-1.5 rounded-lg bg-surface-container-low">
            <span className="text-[11px] text-secondary">Đích đăng</span>
            <span className="text-[13px] font-bold text-on-surface tabular-nums">
              {targetType === 'groups'
                ? `${selectedGroups.length} Nhóm FB`
                : `${selectedFanpageIds.length} Fanpage`}
            </span>
          </div>
          <div className="flex flex-col px-space-md py-1.5 rounded-lg bg-surface-container-low">
            <span className="text-[11px] text-secondary">Lượt dự kiến</span>
            <span className="text-[13px] font-bold text-on-surface tabular-nums">
              {targetType === 'groups' ? selectedGroups.length : selectedFanpageIds.length} lượt
            </span>
          </div>
          <div className="flex flex-col px-space-md py-1.5 rounded-lg bg-surface-container-low">
            <span className="text-[11px] text-secondary">Tệp đính kèm</span>
            <span className="text-[13px] font-bold text-on-surface tabular-nums">
              {activeSlot.media.length} Tệp media
            </span>
          </div>
          <div className="flex flex-col px-space-md py-1.5 rounded-lg bg-surface-container-low">
            <span className="text-[11px] text-secondary">Thời gian</span>
            <span className="text-[13px] font-bold text-emerald-600">
              {scheduleMode === 'immediate' ? 'Ngay lập tức' : 'Theo lịch hẹn'}
            </span>
          </div>
          <div className="flex flex-col px-space-md py-1.5 rounded-lg bg-surface-container-low">
            <span className="text-[11px] text-secondary">Phương thức</span>
            <span className="text-[13px] font-bold text-on-surface font-mono">
              {targetType === 'groups' ? 'MANUAL_GROUP' : 'META_PAGE_API'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm w-full xl:w-auto justify-end">
          <button
            type="button"
            onClick={() => onSavePostTemplate(activeSlot)}
            className="h-9 px-space-md bg-surface-container-low hover:bg-surface-container text-on-surface text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[17px]">bookmark_add</span>
            <span>Lưu bài (POST-08)</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="h-9 px-space-md bg-surface-container-low hover:bg-surface-container text-on-surface text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[17px]">visibility</span>
            <span>Xem trước bài đăng</span>
          </button>
          <button
            type="button"
            onClick={handleOpenConfirmModal}
            className="h-9 px-space-xl bg-primary-container hover:bg-primary text-on-primary text-[13px] font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Chuẩn bị đăng bài (POST-23)</span>
          </button>
        </div>
      </div>

      {/* Expandable Live Progress Panel */}
      {progressPanelOpen && lastCreatedTask && (
        <div className="w-full bg-surface-container-lowest rounded-lg p-space-md shadow-md flex flex-col gap-space-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                <span className="text-[16px] font-bold text-on-surface">
                  Tiến trình đăng bài (Tác vụ #{lastCreatedTask.id})
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                {lastCreatedTask.status === 'SCHEDULED'
                  ? `Đã hẹn giờ (${lastCreatedTask.totalCount} mục)`
                  : `Đang xử lý (0/${lastCreatedTask.totalCount} nhóm)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setProgressPanelOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded text-secondary hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">expand_less</span>
            </button>
          </div>

          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full w-1/4" />
          </div>

          <div className="flex flex-col gap-space-xs pt-1">
            {lastCreatedTask.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-space-sm rounded-lg transition-colors ${
                  item.status === 'RUNNING'
                    ? 'bg-primary-fixed/25'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-space-md min-w-0">
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 ${
                      item.status === 'RUNNING'
                        ? 'text-primary animate-spin'
                        : 'text-amber-600'
                    }`}
                  >
                    {item.status === 'RUNNING' ? 'progress_activity' : 'pending'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-on-surface truncate">
                      {item.groupName}
                    </span>
                    <span className="text-[11px] text-secondary truncate">
                      {item.statusDetail}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-primary font-semibold shrink-0">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Preview Post */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-[80] bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-space-md">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-surface-container bg-surface-container-low">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">preview</span>
                <span className="text-[16px] font-semibold text-on-surface">
                  Xem trước bài viết Facebook (Slot #{activeSlotNumber})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-lg flex flex-col gap-space-md max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-space-md">
                <SafeImage
                  src={activeAccount.avatarUrl}
                  alt={activeAccount.name}
                  fallbackText={activeAccount.initials}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-on-surface">
                    {activeAccount.name}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-secondary">
                    <span>Vừa xong</span>
                    <span>·</span>
                    <span className="material-symbols-outlined text-[14px]">public</span>
                  </div>
                </div>
              </div>

              <div className="text-[14px] text-on-surface whitespace-pre-wrap leading-relaxed">
                {activeSlot.content || '(Chưa nhập nội dung)'}
              </div>

              {activeSlot.shareLink && (
                <a
                  href={activeSlot.shareLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-surface-container-low overflow-hidden hover:opacity-95 transition-opacity block"
                >
                  <div className="px-space-md py-space-sm bg-surface-container flex flex-col">
                    <span className="text-[11px] text-secondary uppercase tracking-wider font-mono truncate">
                      {activeSlot.shareLink}
                    </span>
                    <span className="text-[13px] font-semibold text-on-surface truncate">
                      Liên kết đính kèm bài đăng Facebook
                    </span>
                  </div>
                </a>
              )}

              {activeSlot.media.length > 0 && (
                <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                  {activeSlot.media.slice(0, 4).map((m) => (
                    <div key={m.id} className="h-44 bg-surface-container overflow-hidden">
                      <SafeImage
                        src={m.url}
                        alt={m.alt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-space-xs text-[11px] text-secondary border-t border-surface-container">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    thumb_up
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-error">
                    favorite
                  </span>
                  <span>Thích và thả cảm xúc</span>
                </div>
                <div className="flex items-center gap-space-md">
                  <span>0 bình luận</span>
                  <span>0 chia sẻ</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-space-lg py-space-sm bg-surface-container-low border-t border-surface-container">
              <span className="text-[11px] text-secondary">
                Xem trước cấu hình hiển thị bài đăng thực tế
              </span>
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="h-8 px-space-md bg-surface-container-lowest hover:bg-surface-container text-on-surface text-[13px] rounded"
                >
                  Đóng xem trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewModalOpen(false);
                    handleOpenConfirmModal();
                  }}
                  className="h-8 px-space-lg bg-primary-container hover:bg-primary text-on-primary text-[13px] font-semibold rounded flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Xác nhận đăng bài</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST-22 Publish Confirmation */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-[80] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-space-md">
          <div className="w-full max-w-5xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between px-space-xl py-space-lg bg-surface-container-lowest border-b border-surface-container">
              <div className="flex items-start gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary mt-0.5">
                  <span className="material-symbols-outlined text-[24px]">task_alt</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-sm">
                    <h2 className="text-lg font-semibold text-on-surface tracking-tight">
                      Xác nhận bài đăng
                    </h2>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-semibold uppercase">
                      POST-22
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant mt-0.5">
                    Kiểm tra kỹ nội dung và đích đăng trước khi tạo tác vụ. Mỗi dòng tương ứng với một{' '}
                    <code className="px-1 py-0.5 rounded bg-surface-container font-mono text-[11px]">
                      publishing_task_item
                    </code>
                    .
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-space-xl py-space-sm bg-surface-container-low flex flex-wrap items-center justify-between gap-space-md text-xs">
              <div className="flex flex-wrap items-center gap-space-lg">
                <span>
                  Tài khoản: <strong className="text-on-surface">{activeAccount.name}</strong>
                </span>
                <span>
                  Media:{' '}
                  <strong className="text-primary">
                    {activeSlot.media.length} tệp (Sẵn sàng)
                  </strong>
                </span>
              </div>
              <span className="bg-surface-container px-2 py-0.5 rounded font-medium">
                GMT+7 (Asia/Ho_Chi_Minh)
              </span>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-surface-container text-on-surface-variant text-xs">
                    <th className="py-2.5 px-4 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Bài viết</th>
                    <th className="py-2.5 px-3">Nội dung rút gọn</th>
                    <th className="py-2.5 px-3">Đích đăng &amp; UID</th>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Phương thức</th>
                    <th className="py-2.5 px-4 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {confirmRows.map((row, idx) => {
                    const uid = 'uid' in row ? row.uid : (row as Fanpage).pageId;
                    return (
                      <tr key={row.id} className="hover:bg-surface-container-low">
                        <td className="py-2.5 px-4 text-center font-mono text-xs text-on-surface-variant">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          Slot {activeSlotNumber}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate">{activeSlot.content}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium truncate max-w-[200px]">{row.name}</p>
                          <p className="text-[11px] font-mono text-outline">UID: {uid}</p>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-primary">
                          {scheduleMode === 'immediate'
                            ? 'Thực hiện ngay'
                            : scheduledDateTime.replace('T', ' ')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[11px]">
                            {targetType === 'groups' ? 'MANUAL_GROUP' : 'META_PAGE_API'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExcludedConfirmGroupIds((prev) => [...prev, row.id])
                            }
                            className="w-7 h-7 rounded inline-flex items-center justify-center text-outline hover:text-error hover:bg-error-container/40"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-space-lg bg-surface-container-high/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                <span>
                  Hệ thống tự động thêm độ trễ ngẫu nhiên từ <strong>45 - 90 giây</strong> giữa các nhóm để chống spam Checkpoint.
                </span>
              </div>
              <span className="font-medium text-on-surface-variant">
                Extension V1.2.4 giám sát trực tiếp
              </span>
            </div>

            <div className="flex items-center justify-between px-space-xl py-space-md bg-surface-container-lowest border-t border-surface-container">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="h-9 px-space-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-[13px] font-medium rounded-lg flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Quay lại chỉnh sửa</span>
              </button>
              <div className="flex items-center gap-space-md">
                <span className="text-[11px] text-on-surface-variant">
                  Sẽ tạo chính xác <strong>{confirmRows.length} mục</strong> thực thi
                </span>
                <button
                  type="button"
                  onClick={handleConfirmCreateTask}
                  className="h-9 px-space-xl bg-primary text-on-primary hover:bg-primary-container text-[13px] font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Xác nhận tạo tác vụ (POST-23)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST-12 Add Single Group */}
      {addGroupModalOpen && (
        <div className="fixed inset-0 z-[80] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between px-space-xl py-space-lg border-b border-surface-container">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">group_add</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <h2 className="text-lg font-semibold text-on-surface">Thêm nhóm Facebook</h2>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-semibold">
                      POST-12
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant">
                    Lưu thông tin cộng đồng Facebook mới vào danh sách đích đăng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddGroupModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form
              onSubmit={handleSubmitAddGroup}
              className="p-space-xl flex flex-col gap-space-md overflow-y-auto"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-on-surface">
                  Tên nhóm <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-on-surface">
                  Đường dẫn nhóm (URL) <span className="text-error">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={newGroupUrl}
                  onChange={(e) => setNewGroupUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-on-surface">UID nhóm</label>
                  <input
                    type="text"
                    value={newGroupUid}
                    onChange={(e) => setNewGroupUid(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-on-surface">Số thành viên</label>
                  <input
                    type="number"
                    value={newGroupMembers}
                    onChange={(e) => setNewGroupMembers(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-on-surface">
                    Yêu cầu duyệt bài
                  </label>
                  <select
                    value={newGroupApproval}
                    onChange={(e) =>
                      setNewGroupApproval(e.target.value as 'true' | 'false' | 'unknown')
                    }
                    className="w-full h-9 px-3 rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="unknown">Chưa rõ trạng thái</option>
                    <option value="true">Có kiểm duyệt (Admin duyệt)</option>
                    <option value="false">Không (Đăng trực tiếp tự do)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-on-surface">Bộ sưu tập</label>
                  <select
                    value={newGroupCol}
                    onChange={(e) => setNewGroupCol(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-on-surface">Ghi chú vận hành</label>
                <textarea
                  rows={2}
                  value={newGroupNotes}
                  onChange={(e) => setNewGroupNotes(e.target.value)}
                  className="w-full p-3 rounded-lg bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-space-md pt-2">
                <button
                  type="button"
                  onClick={() => setAddGroupModalOpen(false)}
                  className="h-9 px-4 bg-surface-container-low hover:bg-surface-container rounded-lg text-[13px] font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[13px] font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Thêm nhóm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POST-13 CSV Import */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-[80] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between px-space-xl py-space-lg border-b border-surface-container">
              <div className="flex items-start gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">csv</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <h2 className="text-lg font-semibold text-on-surface">
                      Nhập danh sách nhóm từ file CSV
                    </h2>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-semibold">
                      POST-13
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant mt-0.5">
                    Cấu trúc yêu cầu:{' '}
                    <code className="font-mono text-xs text-primary">
                      group_name, group_url, group_uid, member_count, requires_approval
                    </code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-xl flex flex-col gap-space-md overflow-y-auto">
              <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">description</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-on-surface">
                      danh_sach_nhom_bds_hn.csv{' '}
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-mono text-[11px]">
                        42.5 KB
                      </span>
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Đã phân tích xong · Mã hóa UTF-8 · 25 hàng dữ liệu phát hiện
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-surface-container">
                  <span className="text-[11px] uppercase text-on-surface-variant font-medium">
                    Tổng số dòng
                  </span>
                  <p className="text-lg font-bold text-on-surface mt-1 tabular-nums">25 dòng</p>
                </div>
                <div className="p-3 rounded-lg bg-primary-fixed/40">
                  <span className="text-[11px] uppercase text-on-primary-fixed font-semibold">
                    Hợp lệ
                  </span>
                  <p className="text-lg font-bold text-primary mt-1 tabular-nums">22 nhóm</p>
                </div>
                <div className="p-3 rounded-lg bg-tertiary-fixed/40">
                  <span className="text-[11px] uppercase text-on-tertiary-fixed font-semibold">
                    Trùng lặp
                  </span>
                  <p className="text-lg font-bold text-tertiary mt-1 tabular-nums">2 đã có</p>
                </div>
                <div className="p-3 rounded-lg bg-error-container/40">
                  <span className="text-[11px] uppercase text-on-error-container font-semibold">
                    Dòng lỗi
                  </span>
                  <p className="text-lg font-bold text-error mt-1 tabular-nums">1 thiếu URL</p>
                </div>
              </div>

              <table className="w-full text-left text-[13px] border border-surface-container rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-surface-container text-on-surface-variant text-xs">
                    <th className="py-2 px-3">Dòng</th>
                    <th className="py-2 px-3">Trạng thái</th>
                    <th className="py-2 px-3">Tên nhóm</th>
                    <th className="py-2 px-3">Đường dẫn</th>
                    <th className="py-2 px-3">Thành viên</th>
                    <th className="py-2 px-3">Kiểm duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {SAMPLE_CSV_PREVIEW.map((r) => (
                    <tr key={r.row}>
                      <td className="py-2 px-3 font-mono text-xs text-outline">{r.row}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.status === 'valid'
                              ? 'bg-primary-fixed/60 text-on-primary-fixed'
                              : r.status === 'duplicate'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          {r.status === 'valid'
                            ? 'Hợp lệ'
                            : r.status === 'duplicate'
                            ? 'Trùng lặp'
                            : 'Lỗi'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium">{r.name}</td>
                      <td className="py-2 px-3 font-mono text-xs text-on-surface-variant">
                        {r.url}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums">
                        {r.members.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-3">{r.approvalLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-space-xl py-space-md border-t border-surface-container">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="h-9 px-4 bg-surface-container-low hover:bg-surface-container rounded-lg text-[13px] font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const validRows = SAMPLE_CSV_PREVIEW.filter((r) => r.status === 'valid').map(
                    (r) => ({
                      name: r.name,
                      initials: r.name
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase(),
                      badgeColorClass: 'bg-primary-fixed text-primary',
                      uid: r.uid,
                      url: `https://${r.url}`,
                      memberCount: r.members,
                      requiresApproval: r.approval,
                      collectionId:
                        selectedCollectionId === 'ALL' ? 'col_bds' : selectedCollectionId,
                    })
                  );
                  onImportCsvGroups(validRows);
                  setCsvModalOpen(false);
                }}
                className="h-9 px-5 bg-primary text-on-primary hover:bg-primary-container rounded-lg text-[13px] font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">publish</span>
                <span>Nhập các nhóm hợp lệ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST-09 Saved Posts Picker */}
      {savedPostsModalOpen && (
        <div className="fixed inset-0 z-[80] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">
                Chọn mẫu bài đăng đã lưu (POST-09)
              </h3>
              <button
                type="button"
                onClick={() => setSavedPostsModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {savedPosts.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => {
                    onUpdateSlot(activeSlotNumber, {
                      content: sp.content,
                      shareLink: sp.shareLink,
                    });
                    setSavedPostsModalOpen(false);
                    onNotify('success', `Đã nạp mẫu "${sp.title}" vào Slot #${activeSlotNumber}.`);
                  }}
                  className="text-left p-3 rounded-lg bg-surface-container-low/70 hover:bg-surface-container transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">{sp.title}</span>
                    <span className="text-[11px] text-primary font-medium">{sp.updatedAt}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2">{sp.content}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manage Collections */}
      {collectionModalOpen && (
        <div className="fixed inset-0 z-[80] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Quản lý bộ sưu tập nhóm</h3>
              <button
                type="button"
                onClick={() => setCollectionModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Tên bộ sưu tập mới..."
                  className="flex-1 h-9 px-3 rounded-lg bg-surface-container-low text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCollectionName.trim()) return;
                    onAddCollection(newCollectionName.trim());
                    setNewCollectionName('');
                  }}
                  className="h-9 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold"
                >
                  Tạo mới
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {collections.map((c) => (
                  <div
                    key={c.id}
                    className="px-3 py-2 rounded-lg bg-surface-container-low flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-on-surface">{c.name}</span>
                    <span className="text-on-surface-variant tabular-nums">
                      {groups.filter((g) => g.collectionId === c.id).length} nhóm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
