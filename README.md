# FSA - Field Service Application

A comprehensive field service management system built with modern web technologies.

## 🏗️ Architecture

This is a monorepo containing:
- **Frontend**: Next.js 15 with TypeScript, Material-UI, and SWR
- **Backend**: Node.js with Fastify, TypeScript, and MongoDB

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- npm or yarn

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd fsa
   npm run setup
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - API Documentation: http://localhost:3001/docs

### Alternative Manual Setup

If you prefer to start servers individually:

```bash
# Terminal 1 - Backend
cd apps/backend
npm run dev

# Terminal 2 - Frontend
cd apps/frontend
npm run dev
```

## 📁 Project Structure

```
fsa/
├── apps/
│   ├── frontend/          # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/       # App router pages
│   │   │   ├── sections/  # Feature components
│   │   │   ├── contexts/  # React contexts
│   │   │   └── lib/       # Utilities and configurations
│   │   └── package.json
│   └── backend/           # Fastify backend API
│       ├── src/
│       │   ├── models/    # MongoDB models
│       │   ├── routes/    # API routes
│       │   ├── controllers/ # Business logic
│       │   └── middleware/ # Auth, CORS, etc.
│       └── package.json
├── start-dev.sh          # Development startup script
└── package.json          # Root package configuration
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build both applications
- `npm run lint` - Lint frontend code
- `npm run lint:fix` - Fix linting issues
- `npm run setup` - Install dependencies and setup backend
- `npm run clean` - Clean all node_modules and build artifacts

### Frontend (apps/frontend)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run start` - Start production server

### Backend (apps/backend)
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server
- `npm run setup` - Initialize database with seed data

## 🗄️ Database

The application uses MongoDB with the following main collections:
- **Clients** - Customer/client information
- **Work Orders** - Field service requests
- **Tasks** - Project management tasks (Kanban)
- **Users** - System users and authentication
- **Technicians** - Field service personnel

## 🔐 Authentication

- JWT-based authentication
- Role-based access control (Admin, Manager, Technician, etc.)
- Session management with secure token storage

## 🎯 Key Features

### Client Management
- ✅ Create, edit, and manage clients
- ✅ Client filtering across all views
- ✅ VAT number and contact information

### Work Orders
- ✅ Create and manage field service requests
- ✅ Client-specific work order filtering
- ✅ Status tracking and priority management

### Kanban Board
- ✅ Task management with drag-and-drop
- ✅ Client-specific task filtering
- ✅ Work order integration

### Real-time Updates
- ✅ SWR for efficient data fetching
- ✅ Automatic cache revalidation
- ✅ Optimistic updates

## 🕒 Time Entry System (Design & Tasks)

### Objectives
- **Enable personnel to log time** on task details (hours or days) with effortless UX.
- **Convert days↔hours** using a working-day baseline (default 8 hours; configurable later).
- **Snapshot hourly rate** at entry time to compute precise labor cost.
- **Roll up totals** to `Task.actualHours` and `WorkOrder.actualDuration`/`cost.labor`.
- **Respect tenant isolation and permissions** across Personnel, Tasks, and Work Orders.
- **Provide reports** by personnel/work order/date range with CSV export.

### Backend Scope
- **API design**: REST endpoints for create/list/update/delete time entries; summaries and reports.
- **Validation**: Tenant checks; personnel assignment checks; date/hours/days normalization.
- **Conversion & Cost**: `hours = days * workingDayHours`; `days = hours / workingDayHours`; `cost = hours * hourlyRate`.
- **Aggregations**: Recompute task and work order totals on write operations.
- **Realtime**: Emit `time:created|updated|deleted` to task rooms.

### Frontend Scope
- **API client/actions** for time entries.
- **Task details – Time tab**: entry form, list, totals, and cost per personnel and overall.
- **Work order rollups**: display actual duration and labor cost.
- **Reports UI**: filters by personnel/work order/date range; CSV export.

### Task Breakdown
1. Design backend time entry API (endpoints, payloads, validation, responses)
2. Implement time conversion and cost helpers (hours↔days, workingDayHours)
3. Create CRUD routes in `apps/backend/src/routes/time-entries.ts` with tenant isolation
4. Enforce permissions: only assigned personnel can create/update; admins manage all
5. Compute and persist cost snapshot from `Personnel.hourlyRate` on create/update
6. Aggregate and update `Task.actualHours` and `WorkOrder.actualDuration`/`cost.labor`
7. Emit realtime events for time entries (`time:created|updated|deleted`) to task rooms
8. Add frontend API client/actions and types for time entries
9. Add Time tab in task details with entry form, list, totals, and cost
10. Show work order time/cost rollups in work order list/details
11. Add reporting endpoints (by work order, by personnel, by date range) and CSV export
12. Write migrations/backfill to initialize aggregates from existing entries
13. Add unit/integration/e2e tests (backend routes, permissions, aggregates, UI flows)
14. Document API, UI usage, and operational notes (working day hours config)

## 🔄 Data Flow

1. **Client Selection**: Users select a client from the workspace popover
2. **URL Updates**: Client selection updates URL parameters
3. **API Filtering**: All API calls include client filter when applicable
4. **Cache Management**: SWR handles data caching and revalidation
5. **UI Updates**: Components automatically update based on filtered data

## 🛠️ Development

### Code Quality
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Import sorting and organization

### API Design
- RESTful API design
- Consistent response formats
- Comprehensive error handling
- API documentation with Fastify Swagger

### State Management
- React Context for global state
- SWR for server state management
- URL parameters for filter persistence

## 🚀 Deployment

### Frontend
```bash
cd apps/frontend
npm run build
npm run start
```

### Backend
```bash
cd apps/backend
npm run build
npm run start
```

## 📝 Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/fsa
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the API documentation at http://localhost:3001/docs
2. Review the terminal logs for error details
3. Ensure MongoDB is running and accessible
4. Verify all environment variables are set correctly

---

**Happy coding! 🎉**