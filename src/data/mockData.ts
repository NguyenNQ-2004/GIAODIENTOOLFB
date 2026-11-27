import type {
  AuditLog,
  ExtensionDevice,
  FacebookAccount,
  FacebookGroup,
  FacebookPage,
  GroupCollection,
  GroupCollectionItem,
  PaymentOrder,
  Plan,
  Post,
  PublishingTask,
  Subscription,
  User,
} from '../types/domain';
import { addDaysIso, addMinutesIso } from '../utils/dateTime';
import { deriveTaskStatus } from '../utils/taskStatus';

export interface DemoDatabase {
  users: User[];
  plans: Plan[];
  subscriptions: Subscription[];
  accounts: FacebookAccount[];
  pages: FacebookPage[];
  groups: FacebookGroup[];
  collections: GroupCollection[];
  collectionItems: GroupCollectionItem[];
  posts: Post[];
  tasks: PublishingTask[];
  devices: ExtensionDevice[];
  orders: PaymentOrder[];
  auditLogs: AuditLog[];
}

export interface DemoCredentialInfo {
  userId: string;
  email: string;
  label: string;
  role: 'CUSTOMER' | 'ADMIN';
  description: string;
}

export const DEMO_ACCOUNTS: DemoCredentialInfo[] = [
  {
    userId: 'user-customer-pro',
    email: 'customer@demo.fbpostpro.local',
    label: 'Khách hàng (Gói Pro)',
    role: 'CUSTOMER',
    description: 'Tài khoản khách hàng có sẵn nhóm, Fanpage, tác vụ và thiết bị mẫu.',
  },
  {
    userId: 'user-customer-expired',
    email: 'expired@demo.fbpostpro.local',
    label: 'Khách hàng (Gói hết hạn / Trống)',
    role: 'CUSTOMER',
    description: 'Tài khoản khách hàng có gói đã hết hạn và 0 dữ liệu để kiểm thử trạng thái rỗng.',
  },
  {
    userId: 'user-admin',
    email: 'admin@demo.fbpostpro.local',
    label: 'Quản trị viên (Admin)',
    role: 'ADMIN',
    description: 'Tài khoản Admin quản trị người dùng, gói dịch vụ và xác nhận thanh toán DEMO.',
  },
];

function createInitialDraftSlots(userId: string, now: Date): Post[] {
  const ts = now.toISOString();
  const drafts: Post[] = [];
  for (let slot = 1; slot <= 10; slot++) {
    let content = '';
    let linkUrl: string | null = null;
    if (userId === 'user-customer-pro' && slot === 1) {
      content =
        'Chia sẻ checklist tối ưu nội dung bán hàng trên hội nhóm Facebook quý này:\n1. Tiêu đề rõ lợi ích trong 2 dòng đầu\n2. Đính kèm ảnh thực tế sắc nét\n3. Để lại thông tin liên hệ minh bạch ở cuối bài.';
      linkUrl = 'https://example.com/checklist-noi-dung';
    } else if (userId === 'user-customer-pro' && slot === 2) {
      content =
        'Tuyển cộng tác viên phân phối sản phẩm gia dụng thông minh khu vực TP.HCM & Hà Nội. Hỗ trợ hình ảnh và bài mẫu sẵn.';
    }

    drafts.push({
      id: `draft-${userId}-${slot}`,
      userId,
      slotNumber: slot,
      savedName: null,
      content,
      linkUrl,
      status: 'DRAFT',
      media: [],
      createdAt: ts,
      updatedAt: ts,
    });
  }
  return drafts;
}

export function createSeedDemoDatabase(baseDate: Date = new Date()): DemoDatabase {
  const nowIso = baseDate.toISOString();
  const createdPast = addDaysIso(-45, baseDate);

  // Canonical Plan entities — strictly approved fields only (no description/features columns)
  const plans: Plan[] = [
    {
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Gói Cơ Bản',
      monthlyPriceVnd: 199000,
      yearlyPriceVnd: 1990000,
      maxFacebookAccounts: 2,
      maxSavedGroups: 50,
      maxScheduledTasks: 10,
      isActive: true,
      createdAt: createdPast,
      updatedAt: createdPast,
    },
    {
      id: 'plan-pro',
      code: 'PRO',
      name: 'Gói Chuyên Nghiệp',
      monthlyPriceVnd: 499000,
      yearlyPriceVnd: 4990000,
      maxFacebookAccounts: 10,
      maxSavedGroups: 500,
      maxScheduledTasks: 50,
      isActive: true,
      createdAt: createdPast,
      updatedAt: createdPast,
    },
    {
      id: 'plan-agency',
      code: 'AGENCY',
      name: 'Gói Doanh Nghiệp',
      monthlyPriceVnd: 1290000,
      yearlyPriceVnd: 12900000,
      maxFacebookAccounts: 30,
      maxSavedGroups: 2000,
      maxScheduledTasks: 200,
      isActive: true,
      createdAt: createdPast,
      updatedAt: createdPast,
    },
  ];

  const users: User[] = [
    {
      id: 'user-customer-pro',
      email: 'customer@demo.fbpostpro.local',
      displayName: 'Nguyễn Minh Quân',
      avatarUrl: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerifiedAt: createdPast,
      lastLoginAt: addMinutesIso(-15, baseDate),
      createdAt: createdPast,
      updatedAt: nowIso,
    },
    {
      id: 'user-customer-expired',
      email: 'expired@demo.fbpostpro.local',
      displayName: 'Trần Thảo Vy',
      avatarUrl: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerifiedAt: createdPast,
      lastLoginAt: addDaysIso(-5, baseDate),
      createdAt: createdPast,
      updatedAt: addDaysIso(-5, baseDate),
    },
    {
      id: 'user-admin',
      email: 'admin@demo.fbpostpro.local',
      displayName: 'Lê Hoàng Nam',
      avatarUrl: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: createdPast,
      lastLoginAt: addMinutesIso(-5, baseDate),
      createdAt: createdPast,
      updatedAt: nowIso,
    },
  ];

  const subscriptions: Subscription[] = [
    {
      id: 'sub-customer-pro',
      userId: 'user-customer-pro',
      planId: 'plan-pro',
      billingPeriod: 'MONTHLY',
      startsAt: addDaysIso(-12, baseDate),
      expiresAt: addDaysIso(18, baseDate),
      status: 'ACTIVE',
      createdAt: addDaysIso(-12, baseDate),
      updatedAt: addDaysIso(-12, baseDate),
    },
    {
      id: 'sub-customer-expired',
      userId: 'user-customer-expired',
      planId: 'plan-basic',
      billingPeriod: 'MONTHLY',
      startsAt: addDaysIso(-40, baseDate),
      expiresAt: addDaysIso(-10, baseDate),
      status: 'EXPIRED',
      createdAt: addDaysIso(-40, baseDate),
      updatedAt: addDaysIso(-10, baseDate),
    },
    {
      id: 'sub-admin',
      userId: 'user-admin',
      planId: 'plan-agency',
      billingPeriod: 'YEARLY',
      startsAt: addDaysIso(-30, baseDate),
      expiresAt: addDaysIso(335, baseDate),
      status: 'ACTIVE',
      createdAt: addDaysIso(-30, baseDate),
      updatedAt: addDaysIso(-30, baseDate),
    },
  ];

  const accounts: FacebookAccount[] = [
    {
      id: 'fb-acc-1',
      userId: 'user-customer-pro',
      facebookUid: '100084920193841',
      displayName: 'Minh Quân — Kinh doanh',
      avatarUrl: null,
      connectionType: 'META_OAUTH',
      status: 'CONNECTED',
      lastConnectedAt: addMinutesIso(-20, baseDate),
      createdAt: addDaysIso(-30, baseDate),
      updatedAt: addMinutesIso(-20, baseDate),
    },
    {
      id: 'fb-acc-2',
      userId: 'user-customer-pro',
      facebookUid: null,
      displayName: 'Hồ sơ Thủ công — Nhóm BĐS',
      avatarUrl: null,
      connectionType: 'MANUAL_PROFILE',
      status: 'UNVERIFIED',
      lastConnectedAt: null,
      createdAt: addDaysIso(-10, baseDate),
      updatedAt: addDaysIso(-10, baseDate),
    },
    {
      id: 'fb-acc-admin-1',
      userId: 'user-admin',
      facebookUid: '100099112233445',
      displayName: 'Admin Demo Profile',
      avatarUrl: null,
      connectionType: 'META_OAUTH',
      status: 'CONNECTED',
      lastConnectedAt: addMinutesIso(-10, baseDate),
      createdAt: addDaysIso(-20, baseDate),
      updatedAt: addMinutesIso(-10, baseDate),
    },
  ];

  const pages: FacebookPage[] = [
    {
      id: 'fb-page-1',
      userId: 'user-customer-pro',
      facebookAccountId: 'fb-acc-1',
      pageUid: '105829301928374',
      pageName: 'Gia Dụng Thông Minh Minh Quân',
      avatarUrl: null,
      pageUrl: 'https://www.facebook.com/giadungminhquan',
      canPublish: true,
      createdAt: addDaysIso(-29, baseDate),
      updatedAt: addMinutesIso(-20, baseDate),
    },
    {
      id: 'fb-page-2',
      userId: 'user-customer-pro',
      facebookAccountId: 'fb-acc-1',
      pageUid: '105829301999112',
      pageName: 'Kho Hàng Sỉ Miền Nam (Chỉ xem)',
      avatarUrl: null,
      pageUrl: 'https://www.facebook.com/khohangsimiennam',
      canPublish: false,
      createdAt: addDaysIso(-29, baseDate),
      updatedAt: addMinutesIso(-20, baseDate),
    },
  ];

  const groups: FacebookGroup[] = [
    {
      id: 'grp-1',
      userId: 'user-customer-pro',
      groupUid: '384920192837465',
      groupName: 'Cộng Đồng Bán Hàng Online TP.HCM',
      groupUrl: 'https://www.facebook.com/groups/384920192837465',
      avatarUrl: null,
      memberCount: 48200,
      requiresApproval: false,
      notes: 'Tương tác tốt khung giờ 19h–21h',
      createdAt: addDaysIso(-25, baseDate),
      updatedAt: addDaysIso(-5, baseDate),
    },
    {
      id: 'grp-2',
      userId: 'user-customer-pro',
      groupUid: null,
      groupName: 'Hội Gia Dụng & Mẹ Bé Hà Nội',
      groupUrl: 'https://www.facebook.com/groups/giadungmebehanoi',
      avatarUrl: null,
      memberCount: 23500,
      requiresApproval: true,
      notes: 'Cần quản trị viên duyệt bài trước khi hiển thị',
      createdAt: addDaysIso(-20, baseDate),
      updatedAt: addDaysIso(-4, baseDate),
    },
    {
      id: 'grp-3',
      userId: 'user-customer-pro',
      groupUid: '892019283746123',
      groupName: 'Chợ Sỉ Toàn Quốc — Nguồn Hàng Trực Tiếp',
      groupUrl: 'https://www.facebook.com/groups/892019283746123',
      avatarUrl: null,
      memberCount: 91400,
      requiresApproval: false,
      notes: null,
      createdAt: addDaysIso(-18, baseDate),
      updatedAt: addDaysIso(-3, baseDate),
    },
    {
      id: 'grp-4',
      userId: 'user-customer-pro',
      groupUid: null,
      groupName: 'Hội Chủ Shop Shopee & TikTok Việt Nam',
      groupUrl: 'https://www.facebook.com/groups/chushopvietnam',
      avatarUrl: null,
      memberCount: null,
      requiresApproval: null,
      notes: 'Chưa xác định quy định duyệt bài',
      createdAt: addDaysIso(-12, baseDate),
      updatedAt: addDaysIso(-2, baseDate),
    },
    {
      id: 'grp-5',
      userId: 'user-customer-pro',
      groupUid: '512908374615293',
      groupName: 'Review Đồ Gia Dụng Thực Tế',
      groupUrl: 'https://www.facebook.com/groups/512908374615293',
      avatarUrl: null,
      memberCount: 15800,
      requiresApproval: true,
      notes: 'Ưu tiên bài chia sẻ trải nghiệm, hạn chế link trực tiếp',
      createdAt: addDaysIso(-8, baseDate),
      updatedAt: addDaysIso(-1, baseDate),
    },
  ];

  const collections: GroupCollection[] = [
    {
      id: 'col-1',
      userId: 'user-customer-pro',
      name: 'Nhóm Gia Dụng Chủ Lực',
      createdAt: addDaysIso(-15, baseDate),
      updatedAt: addDaysIso(-2, baseDate),
    },
    {
      id: 'col-2',
      userId: 'user-customer-pro',
      name: 'Nhóm Không Cần Duyệt Bài',
      createdAt: addDaysIso(-10, baseDate),
      updatedAt: addDaysIso(-2, baseDate),
    },
  ];

  const collectionItems: GroupCollectionItem[] = [
    { collectionId: 'col-1', groupId: 'grp-1', createdAt: addDaysIso(-15, baseDate) },
    { collectionId: 'col-1', groupId: 'grp-2', createdAt: addDaysIso(-15, baseDate) },
    { collectionId: 'col-1', groupId: 'grp-5', createdAt: addDaysIso(-8, baseDate) },
    { collectionId: 'col-2', groupId: 'grp-1', createdAt: addDaysIso(-10, baseDate) },
    { collectionId: 'col-2', groupId: 'grp-3', createdAt: addDaysIso(-10, baseDate) },
  ];

  const posts: Post[] = [
    ...createInitialDraftSlots('user-customer-pro', baseDate),
    ...createInitialDraftSlots('user-customer-expired', baseDate),
    ...createInitialDraftSlots('user-admin', baseDate),
    {
      id: 'saved-post-1',
      userId: 'user-customer-pro',
      slotNumber: null,
      savedName: 'Mẫu giới thiệu combo gia dụng tháng này',
      content:
        'Combo 3 sản phẩm nhà bếp tối giản — bảo hành chính hãng 12 tháng, kiểm tra hàng trước khi thanh toán. Inbox để nhận bảng giá sỉ & lẻ.',
      linkUrl: 'https://example.com/combo-gia-dung',
      status: 'SAVED',
      media: [],
      createdAt: addDaysIso(-9, baseDate),
      updatedAt: addDaysIso(-3, baseDate),
    },
    {
      id: 'saved-post-2',
      userId: 'user-customer-pro',
      slotNumber: null,
      savedName: 'Mẫu tuyển đại lý phân phối',
      content:
        'Tìm đối tác đại lý khu vực miền Nam & miền Trung. Chiết khấu minh bạch, cung cấp đầy đủ tài liệu sản phẩm và hình ảnh chụp thực tế.',
      linkUrl: null,
      status: 'SAVED',
      media: [],
      createdAt: addDaysIso(-6, baseDate),
      updatedAt: addDaysIso(-1, baseDate),
    },
  ];

  const task1Items: PublishingTask['items'] = [
    {
      id: 'ti-101',
      taskId: 'task-101',
      sourcePostId: 'draft-user-customer-pro-1',
      groupId: 'grp-1',
      pageId: null,
      contentSnapshot:
        'Chia sẻ checklist tối ưu nội dung bán hàng trên hội nhóm Facebook quý này:\n1. Tiêu đề rõ lợi ích trong 2 dòng đầu\n2. Đính kèm ảnh thực tế sắc nét',
      linkSnapshot: 'https://example.com/checklist-noi-dung',
      destinationNameSnapshot: 'Cộng Đồng Bán Hàng Online TP.HCM',
      destinationUrlSnapshot: 'https://www.facebook.com/groups/384920192837465',
      mediaSnapshots: [],
      status: 'SUCCESS',
      confirmationType: 'USER',
      resultPostUrl: 'https://www.facebook.com/groups/384920192837465/posts/9988776655',
      externalPostId: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 1,
      startedAt: addMinutesIso(-45, baseDate),
      finishedAt: addMinutesIso(-40, baseDate),
      createdAt: addMinutesIso(-50, baseDate),
      updatedAt: addMinutesIso(-40, baseDate),
    },
    {
      id: 'ti-102',
      taskId: 'task-101',
      sourcePostId: 'draft-user-customer-pro-1',
      groupId: 'grp-2',
      pageId: null,
      contentSnapshot:
        'Chia sẻ checklist tối ưu nội dung bán hàng trên hội nhóm Facebook quý này:\n1. Tiêu đề rõ lợi ích trong 2 dòng đầu\n2. Đính kèm ảnh thực tế sắc nét',
      linkSnapshot: 'https://example.com/checklist-noi-dung',
      destinationNameSnapshot: 'Hội Gia Dụng & Mẹ Bé Hà Nội',
      destinationUrlSnapshot: 'https://www.facebook.com/groups/giadungmebehanoi',
      mediaSnapshots: [],
      status: 'WAITING_CONFIRMATION',
      confirmationType: null,
      resultPostUrl: null,
      externalPostId: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 1,
      startedAt: addMinutesIso(-38, baseDate),
      finishedAt: null,
      createdAt: addMinutesIso(-50, baseDate),
      updatedAt: addMinutesIso(-38, baseDate),
    },
  ];

  const scheduledFutureIso = addMinutesIso(180, baseDate);
  const task2Items: PublishingTask['items'] = [
    {
      id: 'ti-201',
      taskId: 'task-201',
      sourcePostId: 'draft-user-customer-pro-2',
      groupId: 'grp-3',
      pageId: null,
      contentSnapshot:
        'Tuyển cộng tác viên phân phối sản phẩm gia dụng thông minh khu vực TP.HCM & Hà Nội.',
      linkSnapshot: null,
      destinationNameSnapshot: 'Chợ Sỉ Toàn Quốc — Nguồn Hàng Trực Tiếp',
      destinationUrlSnapshot: 'https://www.facebook.com/groups/892019283746123',
      mediaSnapshots: [],
      status: 'PENDING',
      confirmationType: null,
      resultPostUrl: null,
      externalPostId: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 0,
      startedAt: null,
      finishedAt: null,
      createdAt: addMinutesIso(-120, baseDate),
      updatedAt: addMinutesIso(-120, baseDate),
    },
    {
      id: 'ti-202',
      taskId: 'task-201',
      sourcePostId: 'draft-user-customer-pro-2',
      groupId: 'grp-5',
      pageId: null,
      contentSnapshot:
        'Tuyển cộng tác viên phân phối sản phẩm gia dụng thông minh khu vực TP.HCM & Hà Nội.',
      linkSnapshot: null,
      destinationNameSnapshot: 'Review Đồ Gia Dụng Thực Tế',
      destinationUrlSnapshot: 'https://www.facebook.com/groups/512908374615293',
      mediaSnapshots: [],
      status: 'PENDING',
      confirmationType: null,
      resultPostUrl: null,
      externalPostId: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 0,
      startedAt: null,
      finishedAt: null,
      createdAt: addMinutesIso(-120, baseDate),
      updatedAt: addMinutesIso(-120, baseDate),
    },
  ];

  const task3Items: PublishingTask['items'] = [
    {
      id: 'ti-301',
      taskId: 'task-301',
      sourcePostId: 'saved-post-1',
      groupId: 'grp-1',
      pageId: null,
      contentSnapshot: 'Combo 3 sản phẩm nhà bếp tối giản — bảo hành chính hãng 12 tháng.',
      linkSnapshot: 'https://example.com/combo-gia-dung',
      destinationNameSnapshot: 'Cộng Đồng Bán Hàng Online TP.HCM',
      destinationUrlSnapshot: 'https://www.facebook.com/groups/384920192837465',
      mediaSnapshots: [],
      status: 'SUCCESS',
      confirmationType: 'USER',
      resultPostUrl: 'https://www.facebook.com/groups/384920192837465/posts/1029384756',
      externalPostId: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 1,
      startedAt: addDaysIso(-1, baseDate),
      finishedAt: addDaysIso(-1, baseDate),
      createdAt: addDaysIso(-1, baseDate),
      updatedAt: addDaysIso(-1, baseDate),
    },
    {
      id: 'ti-302',
      taskId: 'task-301',
      sourcePostId: 'saved-post-2',
      groupId: 'grp-4',
      pageId: null,
      contentSnapshot: 'Tìm đối tác đại lý khu vực miền Nam & miền Trung.',
      linkSnapshot: null,
      destinationNameSnapshot: 'Hội Chủ Shop Shopee & TikTok Việt Nam',
      destinationUrlSnapshot: 'https://www.facebook.com/groups/chushopvietnam',
      mediaSnapshots: [],
      status: 'FAILED',
      confirmationType: 'USER',
      resultPostUrl: null,
      externalPostId: null,
      errorCode: 'GROUP_POSTING_RESTRICTED',
      errorMessage: 'Nhóm tạm thời giới hạn đăng bài từ tài khoản chưa đủ 30 ngày tham gia.',
      attemptCount: 1,
      startedAt: addDaysIso(-1, baseDate),
      finishedAt: addDaysIso(-1, baseDate),
      createdAt: addDaysIso(-1, baseDate),
      updatedAt: addDaysIso(-1, baseDate),
    },
  ];

  const task4Items: PublishingTask['items'] = [
    {
      id: 'ti-401',
      taskId: 'task-401',
      sourcePostId: 'saved-post-1',
      groupId: null,
      pageId: 'fb-page-1',
      contentSnapshot: 'Thông báo lịch giao hàng cuối tuần & ưu đãi vận chuyển nội thành.',
      linkSnapshot: null,
      destinationNameSnapshot: 'Gia Dụng Thông Minh Minh Quân',
      destinationUrlSnapshot: 'https://www.facebook.com/giadungminhquan',
      mediaSnapshots: [],
      status: 'SUCCESS',
      confirmationType: 'API',
      resultPostUrl: 'https://www.facebook.com/giadungminhquan/posts/1029300011',
      externalPostId: '105829301928374_1029300011',
      errorCode: null,
      errorMessage: null,
      attemptCount: 1,
      startedAt: addDaysIso(-2, baseDate),
      finishedAt: addDaysIso(-2, baseDate),
      createdAt: addDaysIso(-2, baseDate),
      updatedAt: addDaysIso(-2, baseDate),
    },
  ];

  const scheduledTomorrowIso = addDaysIso(1, baseDate);
  const task5Items: PublishingTask['items'] = [
    {
      id: 'ti-501',
      taskId: 'task-501',
      sourcePostId: 'saved-post-1',
      groupId: null,
      pageId: 'fb-page-1',
      contentSnapshot: 'Cập nhật bảng giá sản phẩm mới nhất tuần này trên Fanpage chính thức.',
      linkSnapshot: 'https://example.com/bang-gia',
      destinationNameSnapshot: 'Gia Dụng Thông Minh Minh Quân',
      destinationUrlSnapshot: 'https://www.facebook.com/giadungminhquan',
      mediaSnapshots: [],
      status: 'PENDING',
      confirmationType: null,
      resultPostUrl: null,
      externalPostId: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 0,
      startedAt: null,
      finishedAt: null,
      createdAt: addMinutesIso(-30, baseDate),
      updatedAt: addMinutesIso(-30, baseDate),
    },
  ];

  const tasks: PublishingTask[] = [
    {
      id: 'task-101',
      userId: 'user-customer-pro',
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      status: deriveTaskStatus(task1Items),
      idempotencyKey: 'seed-task-101',
      startedAt: addMinutesIso(-45, baseDate),
      finishedAt: null,
      createdAt: addMinutesIso(-50, baseDate),
      updatedAt: addMinutesIso(-38, baseDate),
      items: task1Items,
    },
    {
      id: 'task-201',
      userId: 'user-customer-pro',
      facebookAccountId: 'fb-acc-2',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: scheduledFutureIso,
      status: deriveTaskStatus(task2Items, { isScheduledFuture: true }),
      idempotencyKey: 'seed-task-201',
      startedAt: null,
      finishedAt: null,
      createdAt: addMinutesIso(-120, baseDate),
      updatedAt: addMinutesIso(-120, baseDate),
      items: task2Items,
    },
    {
      id: 'task-301',
      userId: 'user-customer-pro',
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      status: deriveTaskStatus(task3Items),
      idempotencyKey: 'seed-task-301',
      startedAt: addDaysIso(-1, baseDate),
      finishedAt: addDaysIso(-1, baseDate),
      createdAt: addDaysIso(-1, baseDate),
      updatedAt: addDaysIso(-1, baseDate),
      items: task3Items,
    },
    {
      id: 'task-401',
      userId: 'user-customer-pro',
      facebookAccountId: 'fb-acc-1',
      targetType: 'PAGE',
      executionMode: 'META_PAGE_API',
      scheduledAt: null,
      status: deriveTaskStatus(task4Items),
      idempotencyKey: 'seed-task-401',
      startedAt: addDaysIso(-2, baseDate),
      finishedAt: addDaysIso(-2, baseDate),
      createdAt: addDaysIso(-2, baseDate),
      updatedAt: addDaysIso(-2, baseDate),
      items: task4Items,
    },
    {
      id: 'task-501',
      userId: 'user-customer-pro',
      facebookAccountId: 'fb-acc-1',
      targetType: 'PAGE',
      executionMode: 'META_PAGE_API',
      scheduledAt: scheduledTomorrowIso,
      status: deriveTaskStatus(task5Items, { isScheduledFuture: true }),
      idempotencyKey: 'seed-task-501',
      startedAt: null,
      finishedAt: null,
      createdAt: addMinutesIso(-30, baseDate),
      updatedAt: addMinutesIso(-30, baseDate),
      items: task5Items,
    },
  ];

  const devices: ExtensionDevice[] = [
    {
      id: 'dev-1',
      userId: 'user-customer-pro',
      deviceName: 'Chrome — Máy tính văn phòng (Windows)',
      extensionVersion: '1.0.0-preview',
      lastSeenAt: addMinutesIso(-1, baseDate),
      revokedAt: null,
      createdAt: addDaysIso(-14, baseDate),
    },
    {
      id: 'dev-2',
      userId: 'user-customer-pro',
      deviceName: 'Chrome — Laptop cá nhân (macOS)',
      extensionVersion: '1.0.0-preview',
      lastSeenAt: addDaysIso(-3, baseDate),
      revokedAt: null,
      createdAt: addDaysIso(-20, baseDate),
    },
  ];

  const orders: PaymentOrder[] = [
    {
      id: 'ord-paid-1',
      userId: 'user-customer-pro',
      planId: 'plan-pro',
      orderCode: 'FPP-DEMO-202601',
      amountVnd: 499000,
      billingPeriod: 'MONTHLY',
      paymentMethod: 'VIETQR',
      providerReference: 'DEMO-TXN-88412',
      status: 'PAID',
      paidAt: addDaysIso(-12, baseDate),
      expiresAt: addDaysIso(-12, baseDate),
      createdAt: addDaysIso(-12, baseDate),
      updatedAt: addDaysIso(-12, baseDate),
    },
    {
      id: 'ord-pending-1',
      userId: 'user-customer-pro',
      planId: 'plan-pro',
      orderCode: 'FPP-DEMO-202602',
      amountVnd: 499000,
      billingPeriod: 'MONTHLY',
      paymentMethod: 'VIETQR',
      providerReference: null,
      status: 'PENDING',
      paidAt: null,
      expiresAt: addMinutesIso(15, baseDate),
      createdAt: addMinutesIso(-2, baseDate),
      updatedAt: addMinutesIso(-2, baseDate),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-1',
      actorUserId: 'user-admin',
      action: 'ORDER_CONFIRMED_DEMO',
      entityType: 'payment_orders',
      entityId: 'ord-paid-1',
      metadata: { orderCode: 'FPP-DEMO-202601', amountVnd: 499000 },
      createdAt: addDaysIso(-12, baseDate),
    },
  ];

  return {
    users,
    plans,
    subscriptions,
    accounts,
    pages,
    groups,
    collections,
    collectionItems,
    posts,
    tasks,
    devices,
    orders,
    auditLogs,
  };
}
