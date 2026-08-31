# Hirestack UI Redesign & Flow Implementation Plan

## Goal
Redesign the entire **Hirestack** desktop application platform from scratch. The primary focus is a cohesive, developer-friendly, monochrome Swiss-style design system. The implementation will prioritize UI/UX first using local prototyping, subsequently connecting backend logic.

## Design Philosophy (The "Hirestack" UI)
- **Monochrome Engine**: Strict white, black, and slate gradient.
- **Micro-interactions**: Subtle but deliberate (Anime.js).
- **Architecture**: Sidebar-based navigation, main content area, interactive state-driven components.
- **Accessibility**: High contrast, keyboard navigable.

## Proposed Approach
1. **Develop on localhost first**: Refine React components in the Desktop `renderer` (accessible via `npm run ui:dev`).
2. **Re-skin Navigation Shell**: Establish the new sidebar and header layout.
3. **Page-by-Page Redesign**:
   - Home Dashboard
   - Job Feed / Opportunity Stream
   - Outreach & Outreach Templates
   - Pipeline Board (Data visualization)
   - Learner Hub (Progress & Milestones)
   - Profile & Billing
4. **Integration**: Connect components to `getApi()` calls once the UI looks right.

## Phase 1: Navigation Shell & Home Dashboard
- [ ] Create `apps/desktop/src/renderer/components/AppShell.tsx` (Layout container).
- [ ] Implement Sidebar (re-styled with new Hirestack branding).
- [ ] Implement new Homepage layout.
- [ ] Verify interactivity in browser (`npm run ui:dev`).

## Tools & Libs
- Frontend: React + Tailwind CSS.
- Icons: Lucide-react (retained for clean geometric icons).
- Animations: Anime.js (for the new, smooth interaction flow).

## Verification
- Run `npm run ui:dev`.
- Inspect in browser and verify mobile responsiveness.

---
*Status: Planning complete. Ready to proceed with Step 1 (App Shell).*
