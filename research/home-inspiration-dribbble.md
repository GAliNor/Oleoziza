# Home screen inspiration: Dribbble and screen galleries

Research for two Oleoziza "Home" screens:

- **(a) Management:** desktop operations and production dashboard.
- **(b) Operator:** phone-first work queue.

Date: 2026-10-21.

## How this was gathered (read first)

- **Dribbble pages could not be read.** Fetching `dribbble.com/search/...` and `dribbble.com/tags/...` returned empty content, so no shot image was seen. Every Dribbble entry below comes from web search results only: title, URL and snippet text. The "what to take" lines therefore rest on the shot's title, tags and description, not on the visuals. Open each link before copying anything.
- **Mobbin** returned HTTP 403. Its pattern-page URL is listed from search results only.
- **Screenlane** produced no results in any search.
- **Behance** produced no relevant project. The closest manufacturing case study turned up on Contra, but no URL was returned for it, so it is left out.
- **No olive-oil-specific dashboard** turned up on any gallery. The nearest domains are farm management, factory/MES, warehouse inventory and brewery tank boards.
- Only URLs that appeared in search results or fetched pages are listed.

## (a) Management desktop dashboard

| # | Link | What to take from it |
|---|------|----------------------|
| 1 | [Farm Management SaaS Dashboard (AgroFlow), RonDesignLab](https://dribbble.com/shots/25216082-Farm-Management-SaaS-Dashboard) | Closest agricultural analogue. The brief combines yield tracking, tasks and resource allocation on one home page, which matches "today figures plus things to do". |
| 2 | [Farm Management System Admin Dashboard: Analytics, Pramathesh Naik](https://dribbble.com/shots/21271917-Farm-Management-System-Admin-Dashboard-Analytics-UI-UX) | Yield and labour-productivity analytics for large farms. A reference for the season-vs-previous-season comparison block. |
| 3 | [Farmering - Agriculture Information Dashboard, Muhammad Khoirul](https://dribbble.com/shots/25160159-Farmering-Agriculture-Information-Dashboard) | A per-harvest analysis framing. Our equivalent is the season (campagne) as the main time unit. |
| 4 | [Smartfarm - Dashboard Design, 300Mind](https://dribbble.com/shots/20986580-Smartfarm-Dashboard-Design) | A case study about replacing manual data collection with one screen, which is the same pitch as replacing the mill's paper register. |
| 5 | [Dribbble tag: production-dashboard](https://dribbble.com/tags/production-dashboard) | Small set (about 6 shots), including "Garments KPI Dashboard Overview" and "Cycle Manufacturing & Production Dashboard". Useful for KPI-row and daily output chart layouts. |
| 6 | [Dribbble search: factory-dashboard](https://dribbble.com/search/factory-dashboard) | Includes "Factory Management Dashboard Design for Real-Time Operations" and "Vista Forge — Factory Monitoring Dashboard". Browse for site comparison tables and status colours. Skip the machine-HMI shots. |
| 7 | [Dribbble tag: inventory_levels](https://dribbble.com/tags/inventory_levels) and [inventory-dashboard](https://dribbble.com/tags/inventory-dashboard) | Stock-level treatments. The "Supply Card - Stock Out Risk" shot (Balkan Brothers / Filip Justic) is the model for a tank card that shows fill and risk together. |
| 8 | [Inventix - SaaS Warehouse Dashboard, Agensip](https://dribbble.com/shots/25487838-Inventix-Mobile-App-SaaS-Warehouse-Dashboard) | A "best performers" ranking list. Reuse it for the per-site comparison or for top clients. |
| 9 | [Logistics Insight: Shipment Status & Order Breakdown, Amplifyn](https://dribbble.com/shots/22203252-Logistics-Insight-Shipment-Status-Order-Breakdown) | A status breakdown by count, for "how many lots at each step today" on the Management home. |
| 10 | [brewery-os (GitHub prototype)](https://github.com/chrisbohn8/brewery-os) | Not a gallery, but the closest tank analogue found. It shows one card per tank grouped by location, with contents, batch number, size, stage badge and "days in stage" in large type. That maps directly onto oil tanks per site. |

## (b) Operator phone work queue

| # | Link | What to take from it |
|---|------|----------------------|
| 11 | [Kanban board — mobile app for the Twinkle project, Andrew](https://dribbble.com/shots/12906065-Kanban-board-mobile-app-for-the-Twinkle-project) | Says outright that most kanban tools have a poor mobile experience and proposes a mobile layout. Check how columns are paged on a phone. |
| 12 | [Kanban Board - Web Desktop & Mobile, Setproduct](https://dribbble.com/shots/15957937-Kanban-Board-Web-Desktop-Mobile) | The same board shown at desktop and mobile widths. A reference for one board serving Management (desktop) and Operator (phone). |
| 13 | [Mobile App - Kanban desk dashboard, WhiteUI.Store](https://dribbble.com/shots/5340471-Mobile-App-Kanban-desk-dashboard) and [Dribbble search: mobile-kanban](https://dribbble.com/search/mobile-kanban) | More mobile kanban variants for comparing column-per-screen with tabbed columns. |
| 14 | [KDS - Kitchen Display System, Madhankumar](https://dribbble.com/shots/24094222-KDS-Kitchen-Display-System) and [tag: kitchen-display-system](https://dribbble.com/tags/kitchen-display-system) | The KDS model is tickets in a queue with a single "bump" action and age-based colour. It is the closest analogue to an operator advancing a lot to the next step. |
| 15 | [POS waiter app, Dimitris Chatzilias](https://dribbble.com/shots/22934983-POS-waiter-app) | A staff-facing flow (pick, build, send to kitchen) with a pending-orders view. Shows a minimal number of steps per action. |
| 16 | [Restaurant iPad App - Waiter, Emiliano Carrillo](https://dribbble.com/shots/11464030-Restaurant-iPad-App-Waiter) | The stated goal is "fat-finger friendly" in a fast-paced job. Large touch targets suit operators wearing gloves or with oily hands. |
| 17 | [Delivery driver app for logistic company, Cleveroad](https://dribbble.com/shots/17069126-Delivery-driver-app-for-logistic-company) | A worker-side (not customer-side) status screen with current status, times and a "mark delivered" action. Our equivalent is marking a lot as withdrawn. |
| 18 | [Grocery Store Mobile App - Delivery Tracking, Rifqi Naufal F](https://dribbble.com/shots/16030192-Grocery-Store-Mobile-App-Delivery-Tracking) | A tracking timeline in collapsed and expanded states. Reuse it for the per-lot traceability timeline (collapsed on the card, expanded on the detail page). |
| 19 | [Dribbble tag: order-status](https://dribbble.com/tags/order-status) | About 85 designs, including an "Order Manager App" with status filters and an order list. A reference for the status-tabs alternative. |
| 20 | [Mobbin: Mobile Order Detail screens](https://mobbin.com/explore/mobile/screens/order-detail) | Real shipped apps, not concepts. Search results mention Snoonu's iOS "Order Timeline". The page returned 403, so it was not reviewed. |

Supporting, non-gallery: [Screens Design: 10 order tracking screen examples](https://screensdesign.com/articles/mobile-app-order-tracking-screen-examples/) (fetched). Its advice is to show completed, current and future milestones differently and to use the customer's language. Its own captions show no strong stepper examples.

## Recurring patterns worth adopting

1. **KPI row first.** Three or four big numbers (kg received, oil produced, average yield) with a small delta against the same day or the same point last season. Every production and farm shot leads with this.
2. **Season as the comparison unit.** The farm shots frame analysis per harvest. Compare "season to date" with "previous season at the same date", not calendar months.
3. **Tank cards, not tank gauges.** Follow the brewery-os model: one card per tank with contents, quantity, fill bar, batch and days stored, grouped by site.
4. **One thin alert band** above the fold, made of actionable items with counts ("3 payments to confirm", "12 400 MAD to collect"), each linking to its list. This works like the KDS colour-on-age idea, applied to money.
5. **Simple bars for 7 days.** One series, today highlighted, no 3D and no dual axis.
6. **Ranking or table for sites.** The "best performers" list (Inventix) or a plain table with sortable columns beats per-site charts.
7. **KDS-style single action on Operator cards.** Show one primary "next step" button labelled with the step name ("Send to pressing"), not a menu.
8. **Step dots plus a collapsed timeline.** The card shows dots for reception → weighing → pressing → storage → withdrawal. The detail page shows the expanded vertical timeline with timestamp and who did it (the grocery tracking pattern, collapsed and expanded).
9. **Distinct done, current and future states** in timelines (Screens Design advice). Show exceptions (rejected lot, dispute) as an alert box, not as a timeline step.
10. **Big touch targets and offline tolerance.** These come from the waiter and KDS references: fat-finger buttons, and status changes queued locally when the network drops.

## Anti-patterns to avoid

- **Radial gauges and speedometers** for tank fill or yield. They waste space, are hard to compare side by side and are hard to read at a glance. A horizontal fill bar with a number is better.
- **Machine-HMI aesthetics** (dark neon SCADA screens). Many "factory dashboard" shots are touchscreen CNC panels, which is the wrong register for a mill owner's office.
- **Decorative maps and satellite views** (common in agritech shots). They add nothing for 2–5 mill sites, where a table is enough.
- **Full horizontal kanban on a phone** with tiny columns side by side. Use either one column per screen (swipe, with a visible column indicator) or status tabs. Do not squeeze several columns into one phone screen.
- **Drag-and-drop as the only way to advance a card.** It is unreliable on phones and with gloves. Always provide the explicit next-step button.
- **Customer-tracking ETAs and maps** copied from delivery apps. Operators need step, time and actor, not a courier map.
- **Concept-only polish.** Most Dribbble shots are unshipped concepts (noted in the search snippets). Prefer Mobbin's real apps when validating interaction details.

## Open question for the design ticket

Swipeable column-per-screen kanban or status tabs? The galleries show both, and the references give no evidence either way. Tabs with counts ("Reception 4 · Pressing 2 · Storage 7") are simpler to build and to understand. Swipe is closer to the desktop board. A quick prototype test with an operator should decide.
