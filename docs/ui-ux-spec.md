# Car Finder AI - UI/UX Specification

## 1. Overview & UX Philosophy

This document outlines the UI/UX specifications for the Car Finder AI application. The design philosophy is centered on creating a **"Mission Control" dashboard**. The target user is technically proficient and values data density, efficiency, and powerful tools over a simplified, guided experience.

The UI should feel like a professional analysis tool, prioritizing clarity, speed, and actionable insights. A dark theme will be the default to reduce eye strain during extended analysis sessions.

## 2. Visual Design & Theme

- **Theme:** Dark Mode First. A high-contrast, clean, and minimalist aesthetic.
- **Primary Palette:**
    - **Background:** `#1A1A1A` (Very dark gray)
    - **Surface:** `#2A2A2A` (Slightly lighter gray for cards and panels)
    - **Primary Accent:** `#007BFF` (A vibrant blue for interactive elements, links, and highlights)
    - **Text (Primary):** `#EAEAEA` (Off-white for body text)
    - **Text (Secondary):** `#999999` (Gray for less important metadata)
- **Semantic Colors:**
    - **Success/Good:** `#28A745` (Green for high scores, positive indicators)
    - **Warning/Medium:** `#FFC107` (Amber for medium scores, warnings)
    - **Error/Bad:** `#DC3545` (Red for low scores, errors, deleted status)
- **Typography:**
    - **Font:** Use a modern, sans-serif font like **Inter** or **Roboto**.
    - **Headings:** `font-weight: 600`
    - **Body:** `font-weight: 400`

## 3. Information Architecture

The application will be a Single-Page Application (SPA) with two primary views.

1.  **`/` (Dashboard View):** The main entry point. Displays all vehicles in a configurable layout.
2.  **`/vehicle/{id}` (Detail View):** A detailed view of a single vehicle.

Navigation between these two views should be seamless and fast, with the application state (filters, scroll position) preserved when returning to the dashboard.

## 4. Core Components

### VehicleCard Component (Revised)

This is the central element of the dashboard, designed as a full-width horizontal card.

- **Layout:** A two-part horizontal layout. The image carousel is on the left (e.g., `lg:w-80`), and the main content area fills the remaining space on the right.
- **Image Section:**
    - A responsive image carousel with navigation controls on hover.
    - Displays an image counter and a status badge overlaid on the image.
- **Details Section:**
    - **Header:** Contains the vehicle title (which is a link to the detail page) and the price.
    - **Info Row:** A row of key specs with icons (Year, Mileage, Location, Seller Type).
    - **AI Scores:** A row of visually distinct cards for `AI Priority`, `Personal Fit`, and `Market Value`.
    - **AI Summary:** A concise, one-paragraph summary from the AI.
    - **Features & Actions:** A final row displaying key features as tags and a dropdown for changing the vehicle's status.

## 5. Screen 1: Dashboard View (Revised)

### Wireframe & Layout

This revised wireframe reflects the user's preference for a full-width, list-based layout with a toggleable sidebar.

```
+----------------------------------------------------+----------------------+
| [Car Finder AI Logo]      [Search...] [Filters]    |                      |
+----------------------------------------------------+ AI Assistant         |
|                                                    |                      |
| +------------------------------------------------+ | (Hidden or Open)     |
| | [VehicleCard 1 - Horizontal]                   | |                      |
| +------------------------------------------------+ |                      |
|                                                    |                      |
| +------------------------------------------------+ |                      |
| | [VehicleCard 2 - Horizontal]                   | |                      |
| +------------------------------------------------+ |                      |
|                                                    |                      |
| +------------------------------------------------+ |                      |
| | [VehicleCard 3 - Horizontal]                   | |                      |
| +------------------------------------------------+ |                      |
|                                                    |                      |
+----------------------------------------------------+----------------------+
| [Toggle AI Assistant Button (Floating)]            |                      |
+--------------------------------------------------------------------------+
```

### Interactions & Flow

1.  **Main Layout:** The main content area is a single column that takes up the full width of the viewport. The `AIChatSidebar` is positioned on the right and can be toggled open or closed.
2.  **Header & Filters:** A `SearchAndFilters` component at the top provides global keyword search and dropdowns for filtering by `AI Priority` and `Status`.
3.  **Vehicle List:** The dashboard displays a vertical list of `VehicleCard` components. Each card takes the full width of the main content area.
4.  **AI Chat Sidebar:**
    - A floating action button at the bottom-right toggles the visibility of the `AIChatSidebar`.
    - When open, the sidebar appears as a 96-unit wide (`w-96`) panel on the right, pushing the main content to the left.
    - The sidebar contains a complete chat interface for interacting with the AI Assistant.
5.  **Navigation:** Clicking on a `VehicleCard` navigates the user to the `Vehicle Detail View`.

## 6. Screen 2: Vehicle Detail View (Restored)

### Wireframe & Layout

```
+----------------------------------------------------+----------------------+\
| [<- Back to Dashboard]                             |                      |\
+----------------------------------------------------+ AI Assistant         |\
| (Year) (Make) (Model)           [Status Dropdown]  |                      |\
| Price: €XX,XXX (PLN XX,XXX)                        | (Hidden or Open)     |\
+----------------------------------------------------+                      |\
| | Image Gallery Carousel                         | |                      |\
| +------------------------------------------------+ |                      |\
| | Main Info            | Scores & AI Analysis    | |                      |\
| |----------------------|-------------------------| |                      |\
| | - Mileage: XX,XXX km | Personal Fit: 88%       | |                      |\
| | - Year: XXXX         | Market Value: -12%      | |                      |\
| | ... (all data)       | AI Summary: [Text]      | |                      |\
| +----------------------+-------------------------+ |                      |\
| | Virtual Mechanic\'s Report                      | |                      |\
| |------------------------------------------------| |                      |\
| | [Detailed, formatted report from the AI...]    | |                      |\
| +------------------------------------------------+ |                      |\
| | My Notes & Communication Assistant             | |                      |\
| |------------------------------------------------| |                      |\
| | [Text area for notes] | [Compose | Translate]  | |                      |\
| +------------------------------------------------+ |                      |\
+----------------------------------------------------+----------------------+\
```

### Interactions & Flow

1.  **Navigation:** A clear "Back" link returns the user to the Dashboard, preserving its previous state.
2.  **Layout:** The main content is a multi-section page. The `AIChatSidebar` is persistently available on the right, matching its behavior on the dashboard.
3.  **Header Section:** Displays the vehicle\'s title, price, and status dropdown.
4.  **Image Gallery:** A large, high-resolution image gallery.
5.  **Two-Column Layout:**
    - **Left Column (The Facts):** A comprehensive list of all scraped and standardized data points.
    - **Right Column (The Insights):** All AI-generated scores and reports.
6.  **Virtual Mechanic\'s Report:** A dedicated section for the detailed AI report.
7.  **Notes & Communication:** A final section for user notes and the AI Communication Assistant for contacting the seller.
8.  **Persistent AI Assistant:** The `AIChatSidebar` and its toggle button are available on this screen, allowing the user to ask contextual questions about the specific vehicle they are viewing.

## 7. AI Chat Sidebar

As a core component of the user experience, the `AIChatSidebar` provides a persistent, context-aware AI assistant.

- **Visibility:** The sidebar is hidden by default. A floating button allows the user to toggle it open.
- **Context:** The sidebar is aware of the current view (`dashboard` or `detail`). When in the detail view, it has access to the `vehicleId` to provide specific analysis.
- **Functionality:**
    - Send and receive messages.
    - View conversation history.
    - Clear the chat.
    - A loading indicator shows when the AI is processing a request.

## 8. Interaction Design & Error Handling

- **Loading States:**
    - **Initial Load:** A loading spinner is displayed while the initial list of vehicles is fetched.
    - **Background Sync:** A non-blocking toast notification or a subtle icon in the header will indicate when background scraping or analysis is in progress.
- **Error Handling:**
    - If the main vehicle list fails to load, a prominent error message is displayed with an option to dismiss or retry.
    - Errors related to specific vehicle actions (e.g., AI analysis failure) will be displayed on the relevant `VehicleCard` or in the `Detail View`.
- **Responsiveness:** The horizontal `VehicleCard` naturally adapts to smaller screens by stacking its internal elements (image and content) vertically. The AI sidebar will likely overlay the content on mobile viewports instead of pushing it.
