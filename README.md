## Health Lynk - Provider Portal

A modern healthcare provider portal built with Vite, React, and Tailwind CSS.

### Features

- **Reusable AppLayout Component**: Sidebar navigation and topbar with search functionality
- **Provider Dashboard**: Comprehensive dashboard with summary cards and patient eligibility checks
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Enterprise UI**: Clean, modern interface inspired by Salesforce Lightning design

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

#### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   └── AppLayout.jsx      # Reusable layout with sidebar and topbar
├── pages/
│   └── ProviderDashboard.jsx  # Provider dashboard page
├── data/
│   └── mockData.js        # Dummy JSON data for testing
├── App.jsx                 # Main app component with routing
├── main.jsx               # Entry point
└── index.css              # Global styles with Tailwind
```

## Technologies Used

- **Vite**: Fast build tool and dev server
- **React**: UI library
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

