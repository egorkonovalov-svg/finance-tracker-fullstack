# Figma Import Guide — FinTrack

Use this guide and the provided assets to recreate the app’s pages and tabs in Figma.

---

## 1. Frame size

- **Phone frame:** 393 × 852 px (iPhone 17 Pro standard).
- Use one frame per screen; place tab screens in one flow and auth/secondary in separate flows.

---

## 2. File structure in Figma

Suggested structure:

```
FinTrack
├── 📄 Cover (optional)
├── 📁 Design Tokens
│   ├── Colors (Light)
│   ├── Colors (Dark)
│   └── Typography / Spacing / Radius
├── 📁 Auth Flow
│   ├── Welcome
│   ├── Auth (Login / Sign Up)
│   └── Verify Code
├── 📁 Main App — Tabs
│   ├── Dashboard
│   ├── Transactions
│   ├── Add Transaction
│   ├── Analytics
│   └── Settings
├── 📁 Secondary
│   ├── Transaction Detail
│   └── Manage Categories
└── 📁 Components (optional)
    └── Tab Bar
```

---

## 3. Tabs (bottom navigation)

- **Count:** 5 items.
- **Order:** Dashboard → Transactions → **Add (center)** → Analytics → Settings.
- **Style:** Bottom, floating (with blur in app). Height ~88 px (with safe area).
- **Icons:** Home, List, **Add (center FAB)**, Bar chart, Settings.
- **Labels:** Dashboard, Transactions, *(no label for Add)*, Analytics, Settings.
- **Center tab:** Prominent “Add” button (e.g. 52×52 px, rounded, primary color).

Use the same frame size (390×844) for each tab screen so the tab bar aligns.

---

## 4. Pages and screens (for import)

### Auth Flow

| Screen        | Route         | Key elements |
|---------------|---------------|--------------|
| **Welcome**   | `/welcome`    | Logo circle, “FinTrack”, “Take control of your finances”, “Get Started” button |
| **Auth**      | `/auth`       | Mode toggle (Log In / Sign Up), Name (signup), Email, Password (+ visibility toggle), primary CTA, “or continue with”, Google, Apple |
| **Verify Code** | `/verify-code` | Back, “Check your email”, “We sent a 6-digit code to {email}”, masked email, 6 digit inputs, error message (optional), “Resend Code” / “Resend in Xs” |

### Main (tabs)

| Tab           | Screen name     | Key elements |
|---------------|-----------------|-------------|
| Dashboard     | Dashboard       | Greeting + “Your Finances”, Balance card (Total Balance, Income \| Expenses), 3 summary cards (Income, Expenses, Savings), “Recent Transactions” list |
| Transactions  | Transactions    | Title, search, filter chips (All / Expense / Income), list with date sections (Today, Yesterday, …) and transaction rows |
| Add           | New Transaction | Title, Expense/Income toggle, Amount, Category chips, Note, Date, Recurring, “Add Transaction” button |
| Analytics     | Analytics       | Title, Period (Month / Quarter / Year), bar chart (last 7 days), pie chart (expenses by category), Top Categories list (top 5 categories with icon, name, amount) |
| Settings      | Settings        | Title, LANGUAGE (English / Russian), APPEARANCE (Dark mode + Light/Dark/System), CURRENCY (picker: USD, EUR, RUB, GBP, JPY — amounts stored in USD, displayed in chosen currency), DATA (Manage Categories), ABOUT, Log out |

### Secondary

| Screen              | Route              | Key elements |
|---------------------|--------------------|-------------|
| Transaction Detail  | `/transaction/[id]`| Back, title “Transaction”, type/amount/category/note/date, view mode (summary), Edit (switches to edit mode with type toggle, amount field, category chips, date picker, note, Save/Cancel), Delete (with confirmation) |
| Manage Categories   | `/categories`     | Back, “Manage Categories”, category list (icon, name, type, color dot), add/edit category form (name, type: income/expense/both, icon picker, color picker) |

---

## 5. Design tokens (from `figma-screens-spec.json`)

Use these in Figma variables or local styles.

**Colors — Light**

| Token          | Hex / value                 |
|----------------|-----------------------------|
| background     | `#F5F3FF`                   |
| text           | `#111827`                   |
| textSecondary  | `#6B7280`                   |
| textMuted      | `#9CA3AF`                   |
| primary        | `#4F46E5`                   |
| income         | `#10B981`                   |
| expense        | `#EF4444`                   |
| tabBar         | `rgba(255,255,255,0.85)`    |
| inputBorder    | `#E5E7EB`                   |
| inputBg        | `rgba(255,255,255,0.6)`     |

**Colors — Dark**

| Token          | Hex / value                 |
|----------------|-----------------------------|
| background     | `#0C0A1D`                   |
| text           | `#F9FAFB`                   |
| textSecondary  | `#9CA3AF`                   |
| textMuted      | `#4B5563`                   |
| primary        | `#818CF8`                   |
| income         | `#10B981`                   |
| expense        | `#EF4444`                   |
| tabBar         | `rgba(12,10,29,0.92)`       |
| inputBorder    | `rgba(255,255,255,0.1)`     |
| inputBg        | `rgba(255,255,255,0.06)`    |

**Spacing (px):** 4, 8, 12, 16, 24, 32, 48  
**Radius (px):** 8, 12, 16, 20, 24  
**Font sizes (px):** 11, 13, 15, 17, 20, 24, 30, 36  
**Fonts:** Outfit (headings), DM Sans (body). If not available, use similar (e.g. Inter + DM Sans).

For the full token set (including additional semantic colors and glass/overlay values), treat `figma-screens-spec.json` as the canonical source of truth and this table as a curated subset for quick reference.

---

## 6. Importing the SVGs

- **Location:** `assets/figma/` in the repo.
- **Files:** One SVG per screen (e.g. `01-welcome.svg`, `02-auth.svg`, …).
- **In Figma:** Drag and drop the SVG onto the canvas, or use **File → Place image** and choose the SVG. Resize the imported group to 390×844 if needed.
- Use them as wireframes or as a base: replace with your high-fidelity components and apply the design tokens above.

---

## 7. JSON spec

- **File:** `figma-screens-spec.json` in the project root.
- Contains: app name, frame size, design tokens, **pages** (Auth Flow, Main Tabs, Secondary), **screens** per page with **sections** and **elements**, and **tabBarSpec**.
- Use it as a single source of truth for screen list, hierarchy, and tokens when building frames or using a plugin that reads JSON.

---

## 8. Quick checklist

- [ ] Create 390×844 frames for each screen.
- [ ] Add Design Tokens (colors, spacing, radius, type).
- [ ] Create Auth Flow: Welcome, Auth, Verify Code.
- [ ] Create Main App: Dashboard, Transactions, Add, Analytics, Settings.
- [ ] Create Tab Bar component (5 items, Add centered).
- [ ] Create Secondary: Transaction Detail, Manage Categories.
- [ ] Import SVGs from `assets/figma/` and align to frames.
- [ ] Optionally use `figma-screens-spec.json` for structure and tokens.

After that, you can refine visuals and add interactions (e.g. prototype links) in Figma.
