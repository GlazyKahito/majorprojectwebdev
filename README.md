# CRM360

CRM360 is a customer relationship management platform for small and mid-sized sales teams. It brings customers, leads, the sales pipeline, tasks and team notifications into one workspace, with role-based access for admins, sales managers and sales executives.

Built with the MERN stack: MongoDB, Express, React and Node.js.

## Features

**Authentication**
- Registration, sign in and sign out with JWT
- Forgot password and reset password with single-use, time-limited tokens
- Profile management and password change (signs out other sessions)
- Passwords hashed with bcrypt; protected routes on both client and server

**Roles and permissions**

| Capability | Admin | Sales Manager | Sales Executive |
| --- | --- | --- | --- |
| Customers | All | All | Own and created |
| Leads | All | All | Assigned and created |
| Delete customers and leads | Yes | Yes | No |
| Assign leads, customers and tasks to others | Yes | Yes | No |
| Convert leads to customers | Yes | Yes | Yes |
| Team analytics | Yes | Yes | Personal only |
| Manage users and roles | Yes | No | No |

Permissions are enforced by the API. The interface only mirrors them.

**Customers**
- Create, view, edit and delete customers
- Search by name, company, email, phone or city; filter by status, industry and owner; sortable columns; CSV export
- Customer profile with contact details, ownership, lifetime value, related tasks and the lead it was converted from
- Interaction history: log calls, emails, meetings and notes, filterable by type

**Leads**
- Create, edit, assign and delete leads
- Stage stepper, notes, follow-up scheduling, lost reasons and expected close dates
- One-click conversion into a customer that carries over notes, tasks and history

**Sales pipeline**
- Kanban board across New, Contacted, Qualified, Proposal Sent, Won and Lost
- Drag and drop with mouse, touch and keyboard, plus a "Move to" menu on every card
- Stage totals, open pipeline, weighted forecast and won value

**Tasks**
- Create, assign, prioritize and schedule tasks linked to customers or leads
- Status tabs, overdue / today / this week filters, priority and assignee filters
- Complete tasks inline; deep links from notifications open the task directly

**Dashboard**
- Total customers, active leads, pending tasks, closed deals and monthly revenue with trend
- Won revenue by month, pipeline value by stage, lead source performance and team leaderboard
- Tasks and follow-ups due soon, recent leads, recent customers and recent activity
- All figures are aggregated from MongoDB and scoped to the signed-in user's role

**Notifications**
- Task assignments, lead assignments, lead updates and upcoming deadlines
- Bell menu with unread badge, notification center with filters, mark read / unread, mark all read
- Per-user preferences for each notification type

**Also included**
- Global search and command palette (`Ctrl K` / `⌘K`)
- Light, dark and system themes; currency preference
- Responsive layouts for desktop, tablet and mobile
- Seed script with a realistic demo workspace

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Vite, Recharts, dnd-kit, Lucide icons, plain CSS with design tokens |
| Backend | Node.js 20+, Express 5, Zod validation, Helmet, express-rate-limit |
| Database | MongoDB with Mongoose |
| Auth | JSON Web Tokens, bcrypt |
| Hosting | Vercel (static client and serverless API) |

## Project structure

```
.
├── api/
│   └── index.js              Vercel serverless entry that exports the Express app
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── crm/          Timeline, task modal, convert dialog, assignee select
│       │   ├── layout/       Sidebar, topbar, command palette
│       │   ├── notifications/
│       │   ├── routing/      Auth and role guards
│       │   └── ui/           Buttons, inputs, modals, tables, badges, dropdowns
│       ├── context/          Auth, toasts, notifications
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       ├── services/         API client and resource services
│       ├── styles/
│       └── utils/
├── server/
│   ├── config/               Environment and database connection
│   ├── controllers/
│   ├── middleware/           Auth, validation, error handling
│   ├── models/               User, Customer, Lead, Task, Notification, Activity
│   ├── routes/
│   ├── scripts/              Seed data and in-memory dev server
│   ├── services/             Access control, activity log, notifications, mail
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── vercel.json
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- A MongoDB database: local MongoDB Community Server or a free MongoDB Atlas cluster

### 1. Install dependencies

```bash
npm run install:all
```

This installs the API dependencies at the root and the client dependencies in `client/`.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `7d` |
| `PORT` | No | API port for local development, default `5000` |
| `CLIENT_URL` | No | Public URL of the client, used in password reset links |
| `CORS_ORIGINS` | No | Comma-separated origins allowed in production |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | No | SMTP settings for password reset emails |
| `EXPOSE_RESET_LINK` | No | When `true` and SMTP is not configured, the reset link is shown on screen in production. Intended for demos only |

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Set up MongoDB

**Local:** install MongoDB Community Server, start it, and use `MONGODB_URI=mongodb://127.0.0.1:27017/crm360`.

**Atlas:**
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Add a database user under *Database Access*.
3. Under *Network Access*, allow your IP (or `0.0.0.0/0` when deploying to Vercel).
4. Copy the connection string from *Connect → Drivers* and set the database name, for example `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/crm360`.

### 4. Seed demo data

```bash
npm run seed
```

This clears the database and creates 7 users, 18 customers, 30 leads across every stage, 24 tasks, activity history and notifications.

### 5. Run the app

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000/api

The Vite dev server proxies `/api` to the backend. To run them separately:

```bash
npm run dev:server
npm run dev:client
```

**No MongoDB installed?** `npm run dev:memory` starts the API with an in-memory MongoDB that is seeded automatically. Run `npm run dev:client` alongside it. Data resets when the process stops.

### Production build

```bash
npm run build
npm start
```

`npm run build` outputs the client to `client/dist`. Serve it from any static host and point `/api` at the Express server.

## Demo credentials

All demo accounts use the password `Demo@1234`.

| Role | Email |
| --- | --- |
| Admin | admin@crm360.app |
| Sales Manager | manager@crm360.app |
| Sales Executive | executive@crm360.app |

Additional seeded team members: `daniel.okafor@crm360.app` (Sales Manager), `sara.lindqvist@crm360.app`, `kabir.anand@crm360.app` and `maya.chen@crm360.app` (Sales Executives).

New accounts created from the registration page join as Sales Executives. The first account in an empty database becomes the Admin.

## Deploying to Vercel

1. Import the repository into Vercel. `vercel.json` already configures the build, the serverless API function and SPA routing.
2. Add environment variables in *Project Settings → Environment Variables*: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel URL), `NODE_ENV=production`, and optionally the SMTP settings or `EXPOSE_RESET_LINK=true`.
3. Allow Vercel to reach your Atlas cluster (`0.0.0.0/0` in Network Access).
4. Seed the production database once from your machine: `MONGODB_URI="<atlas uri>" JWT_SECRET=x npm run seed`.

## API overview

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

**Auth**

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/logout` | Sign out |
| POST | `/auth/forgot-password` | Request a reset link |
| POST | `/auth/reset-password` | Set a new password with a reset token |
| GET | `/auth/me` | Current user |
| PUT | `/auth/profile` | Update profile |
| PUT | `/auth/password` | Change password |
| PUT | `/auth/preferences` | Update theme, currency and notification preferences |

**Customers**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/customers` | List with `q`, `status`, `industry`, `assignedTo`, `sort`, `page`, `limit` |
| POST | `/customers` | Create |
| GET | `/customers/:id` | Details and summary |
| PUT | `/customers/:id` | Update |
| DELETE | `/customers/:id` | Delete (admin, manager) |
| GET | `/customers/:id/activities` | Interaction history, optional `type` |
| POST | `/customers/:id/activities` | Log a call, email, meeting or note |
| DELETE | `/customers/:id/activities/:activityId` | Remove a logged interaction |

**Leads**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/leads` | List with `q`, `status` (or `open`), `source`, `assignedTo`, `followUp`, `sort`, `page`; `view=pipeline` returns all matching leads |
| POST | `/leads` | Create |
| GET | `/leads/:id` | Details with notes |
| PUT | `/leads/:id` | Update |
| PATCH | `/leads/:id/status` | Move to a pipeline stage |
| DELETE | `/leads/:id` | Delete (admin, manager) |
| POST | `/leads/:id/convert` | Convert into a customer |
| POST | `/leads/:id/notes` | Add a note |
| DELETE | `/leads/:id/notes/:noteId` | Delete a note |
| GET | `/leads/:id/activities` | Activity history |
| POST | `/leads/:id/activities` | Log an interaction |

**Tasks**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/tasks` | List with `status` (or `pending`), `priority`, `due`, `assignedTo`, `customer`, `lead`, `q`, `sort` |
| POST | `/tasks` | Create |
| GET | `/tasks/:id` | Details |
| PUT | `/tasks/:id` | Update or change status |
| DELETE | `/tasks/:id` | Delete (creator, admin, manager) |

**Dashboard, search and notifications**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/dashboard` | Role-scoped metrics, charts and recent records |
| GET | `/search?q=` | Search customers, leads and tasks |
| GET | `/notifications` | List with `filter=unread`, `type`, `page` |
| GET | `/notifications/unread-count` | Unread count |
| PUT | `/notifications/:id/read` | Mark as read |
| PUT | `/notifications/:id/unread` | Mark as unread |
| PUT | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Remove |

**Users**

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/users/team` | Active team members for assignment (all roles) |
| GET | `/users` | List with workload stats (admin) |
| POST | `/users` | Create a user (admin) |
| GET | `/users/:id` | User details (admin) |
| PUT | `/users/:id` | Update details, role or active status (admin) |
| DELETE | `/users/:id` | Remove and reassign their records (admin) |

Errors use a consistent shape:

```json
{ "message": "Enter a valid email address", "details": [{ "field": "email", "message": "Enter a valid email address" }] }
```

## Data model

- **User**: name, email, hashed password, role, title, phone, preferences, active flag
- **Customer**: contact details, address, industry, status, owner, notes, lifetime value, last interaction, source lead
- **Lead**: contact details, source, stage, value, owner, notes, follow-up, expected close, lost reason, converted customer
- **Task**: title, description, assignee, creator, priority, status, due date, related customer or lead
- **Notification**: recipient, actor, type, title, message, link, read state
- **Activity**: interactions and system events linked to customers, leads and tasks

## Notes

- Deadline notifications are generated when a user loads their notifications, so no background worker is required on serverless hosting.
- Password reset emails are sent when SMTP is configured. Without SMTP, the reset link is shown on screen in development, or in production when `EXPOSE_RESET_LINK=true`.
