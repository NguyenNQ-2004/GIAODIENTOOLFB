# Screen & Route Mapping (V3)

| # | Screen | Route | Guard | Primary Component |
|---|---|---|---|---|
| 1 | Login | `/login` | GuestOnly | `src/pages/AuthPage.tsx` (`mode="login"`) |
| 2 | Register | `/register` | GuestOnly | `src/pages/AuthPage.tsx` (`mode="register"`) |
| 3 | Forgot Password | `/forgot-password` | GuestOnly | `src/pages/AuthPage.tsx` (`mode="forgot-password"`) |
| 4 | Reset Password | `/reset-password` | GuestOnly | `src/pages/AuthPage.tsx` (`mode="reset-password"`) |
| 5 | Post Composer | `/post` | AuthGuard | `src/pages/PostComposerPage.tsx` |
| 6 | Dashboard & Schedule | `/dashboard` | AuthGuard | `src/pages/DashboardPage.tsx` |
| 7 | Task Detail Drawer | Drawer on `/dashboard` | AuthGuard | `src/components/TaskDrawer.tsx` |
| 8 | Facebook Accounts & Devices | `/accounts` | AuthGuard | `src/pages/AccountsPage.tsx` |
| 9 | Pricing & Payment Orders | `/pricing` | AuthGuard | `src/pages/PricingPage.tsx` |
| 10 | Admin — Overview | `/admin` (tab `overview`) | AdminGuard | `src/pages/AdminPage.tsx` |
| 11 | Admin — Users | `/admin` (tab `users`) | AdminGuard | `src/pages/AdminPage.tsx` |
| 12 | Admin — Plans | `/admin` (tab `plans`) | AdminGuard | `src/pages/AdminPage.tsx` |
| 13 | Admin — Payments | `/admin` (tab `payments`) | AdminGuard | `src/pages/AdminPage.tsx` |
| 14 | Extension Popup Preview *(Dev/DEMO only)* | `/extension-preview` | `IS_DEV_OR_DEMO` + AuthGuard | `src/pages/ExtensionPopupPage.tsx` |

## Default Redirects & DEMO Boundary
- `/` → `/login` when unauthenticated, `/post` when authenticated.
- Unknown routes (`*`) → `/login` when unauthenticated, `/post` when authenticated.
- Customer accessing `/admin` directly → renders explicit **Không có quyền truy cập (Access Denied)** screen (and Admin nav link is hidden in `LayoutShell`).
- `/extension-preview` is mounted and linked ONLY when `IS_DEV_OR_DEMO` is true (`import.meta.env.DEV || IS_DEMO_MODE`). When `VITE_DEMO_MODE=false` in production build, `/extension-preview`, quick DEMO logins, Reset DEMO button, and Admin DEMO payment confirmation buttons are hidden.
