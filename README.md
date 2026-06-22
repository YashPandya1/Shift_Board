# ShiftBoard

**Employee Scheduling & Workforce Management Platform**

ShiftBoard is a modern SaaS-style web application for small and medium-sized businesses to manage employee scheduling across multiple locations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 20+, TypeScript, Angular Material, RxJS, FullCalendar, PWA |
| Backend | Node.js, Express.js, JWT Auth, Socket.io |
| Database | MongoDB, Mongoose ODM |
| Notifications | Twilio (SMS/WhatsApp), Nodemailer (Email) |
| Storage | Cloudinary |
| PDF | PDFKit |

## Project Structure

```
Shiftboard_v2/
├── backend/
│   └── src/
│       ├── config/          # Database, constants
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Auth, validation, audit, errors
│       ├── models/          # Mongoose schemas (13 models)
│       ├── routes/          # REST API routes
│       ├── services/        # Email, SMS, PDF, scheduling engine
│       ├── scripts/         # Seed data
│       └── server.js        # Entry point + Socket.io
├── frontend/
│   └── src/app/
│       ├── core/            # Models, services, guards, interceptors
│       ├── features/        # Auth, dashboard, schedule, employees, etc.
│       └── shared/          # Layout components
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 20+ (recommended)
- MongoDB 6+ running locally or Atlas connection string
- npm 10+

> **Note:** If `npm install` fails in OneDrive folders, move the project to a local path (e.g. `C:\dev\Shiftboard_v2`) or pause OneDrive sync during install.

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm install
npm run seed    # Optional: load demo data
npm run dev     # Starts on http://localhost:3000
```

### Frontend Setup

```bash
cd frontend
npm install
npm start       # Starts on http://localhost:4200
```

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@shiftboard.demo | Demo1234! |
| Manager | manager@shiftboard.demo | Demo1234! |
| Employee | john@shiftboard.demo | Demo1234! |

---

## API Reference

Base URL: `http://localhost:3000/api`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register owner + organization |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset password |
| POST | `/auth/verify-email` | Verify email |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/logout` | Logout |

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/employees` | List employees (paginated) |
| GET | `/employees/:id` | Get employee + availability |
| POST | `/employees` | Create employee |
| PUT | `/employees/:id` | Update employee |
| POST | `/employees/bulk-import` | CSV/bulk import |
| POST | `/employees/:id/transfer` | Transfer between locations |
| POST | `/employees/:id/certifications` | Add certification |
| POST | `/employees/:id/performance-notes` | Add performance note |

### Locations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/locations` | List locations |
| POST | `/locations` | Create location (owner) |
| PUT | `/locations/:id` | Update location |
| DELETE | `/locations/:id` | Deactivate location |
| POST | `/locations/:id/managers` | Assign managers |

### Schedules & Shifts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schedules` | List schedules |
| GET | `/schedules/week` | Get week view with shifts |
| POST | `/schedules` | Create schedule |
| POST | `/schedules/copy-week` | Copy previous week |
| POST | `/schedules/validate` | Validate shift (smart engine) |
| GET | `/schedules/suggest-employees` | Suggest qualified employees |
| POST | `/schedules/:id/publish` | Publish + notify |
| GET | `/schedules/:id/pdf` | Export PDF |
| POST | `/schedules/shifts` | Create shift |
| PUT | `/schedules/shifts/:id` | Update shift |
| DELETE | `/schedules/shifts/:id` | Delete shift |
| POST | `/schedules/shifts/:id/claim` | Claim open shift |
| POST | `/schedules/shifts/:id/approve-claim` | Approve claimed shift |

### Time Off & Availability

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/timeoff` | List time off requests |
| POST | `/timeoff` | Submit request |
| PUT | `/timeoff/:id/review` | Approve/reject |
| GET | `/availability` | Get availability |
| PUT | `/availability` | Update availability |
| POST | `/availability/override` | Manager override |

### Shift Swaps

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shiftswap` | List swap requests |
| POST | `/shiftswap` | Create swap request |
| PUT | `/shiftswap/:id/review` | Approve/reject swap |

### Dashboard & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard stats |
| GET | `/reports/labor-cost` | Labor cost report |
| GET | `/notifications` | User notifications |
| POST | `/notifications/send` | Send SMS/WhatsApp |
| GET | `/announcements` | Announcement board |
| GET | `/organization` | Organization settings |
| PUT | `/organization/settings` | Update settings |

---

## Database Models

| Model | Key Fields |
|-------|-----------|
| Organization | name, scheduleStartDay, overtimeThreshold, branding |
| Location | name, address, managerIds, operatingHours |
| User | email, role, organizationId, preferences |
| EmployeeProfile | position, hourlyWage, locations, certifications |
| Availability | recurringWeekly, unavailableDates, preferredHours |
| Schedule | locationId, weekStart/End, isPublished |
| Shift | employee, date, times, status, laborCost |
| TimeOffRequest | type, dates, status, review |
| ShiftSwapRequest | shifts, validation, status |
| Notification | channel, type, deliveryStatus |
| AuditLog | action, entityType, changes |
| ScheduleTemplate | recurring shift patterns |
| Announcement | title, content, priority |

---

## User Roles

| Role | Permissions |
|------|------------|
| **Owner** | Full access: org settings, locations, employees, schedules, reports |
| **Manager** | Assigned locations: schedules, approvals, employee availability |
| **Employee** | View schedule, submit availability, time off, swap shifts, claim open shifts |

---

## Smart Scheduling Engine

The `SchedulingEngine` service provides:

- **Overlap detection** — prevents double-booking
- **Availability check** — recurring weekly, unavailable dates, approved time off
- **Overtime risk** — configurable threshold per organization
- **Employee suggestions** — ranked by availability and overtime risk
- **Staffing shortages** — detects unassigned shift gaps
- **Shift validation** — combined errors and warnings before save

---

## Implementation Roadmap

### Phase 1 — Foundation (Complete)
- [x] Project scaffolding (backend + frontend)
- [x] MongoDB schemas with indexes
- [x] JWT authentication with refresh tokens
- [x] Role-based access control
- [x] Core REST APIs
- [x] Angular feature modules with Material UI
- [x] Dashboard with stats
- [x] Schedule calendar (FullCalendar)
- [x] Employee & location management
- [x] Time off requests
- [x] Smart scheduling engine
- [x] PDF export
- [x] Notification services (SMS, email, WhatsApp)
- [x] Socket.io real-time setup
- [x] PWA configuration
- [x] Dark mode toggle
- [x] Seed script with demo data

### Phase 2 — Enhanced UX
- [ ] Shift create/edit dialog with drag-and-drop
- [ ] Schedule templates UI
- [ ] CSV employee import parser
- [ ] Chart.js dashboard charts (labor trends, utilization)
- [ ] Real-time schedule updates via Socket.io
- [ ] Employee mobile-optimized views
- [ ] i18n multi-language support

### Phase 3 — Advanced Features
- [ ] Clock-in/clock-out module
- [ ] Certification expiry reminders (cron job)
- [ ] Announcement board UI
- [ ] Shift swap employee-to-employee flow
- [ ] Email PDF attachments
- [ ] Advanced labor law rule engine
- [ ] Audit log viewer
- [ ] Performance notes UI

### Phase 4 — Production
- [ ] Docker Compose setup
- [ ] CI/CD pipeline
- [ ] Unit & integration tests
- [ ] API rate limiting per user
- [ ] Redis session/cache layer
- [ ] Production deployment guide (AWS/GCP)

---

## Environment Variables

See `backend/.env.example` for all configuration options including:

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Token signing keys
- `TWILIO_*` — SMS and WhatsApp credentials
- `SMTP_*` — Email configuration
- `CLOUDINARY_*` — Image upload storage
- `FRONTEND_URL` — CORS origin

---

## License

Proprietary — ShiftBoard © 2026
