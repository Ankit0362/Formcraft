# FormCraft - Modern Form Builder

FormCraft is a complete, production-ready form builder SaaS built with a modern stack. It allows creators to build dynamic forms, configure conditional logic, and gather responses with real-time analytics. 

## Live Demo & Links

- **Live Web App**: [https://formcraft-web-lwon.vercel.app](https://formcraft-web-lwon.vercel.app)
- **API Documentation**: [https://formcraft-p7bk.onrender.com/docs](https://formcraft-p7bk.onrender.com/docs)
- **API Base URL**: `https://formcraft-p7bk.onrender.com/api`

## Demo Credentials

The database is seeded with sample templates, forms, responses, and analytics. You can log in using these demo credentials (or create your own account):

**Demo User:**
- Email: `demo@formcraft.com`
- Password: `password123`

**Super Admin:**
- Email: `superadmin@formcraft.com`
- Password: `FormCraft@Admin123`

## Features Implemented

- **Authentication**: JWT session-based auth with Google OAuth integration.
- **Creator Dashboard**: Manage workspaces, billing tiers, API keys, and overall form statistics.
- **Form Builder**: Drag-and-drop style builder supporting multiple field types (Short Text, Long Text, Email, Number, Single Select, Multi-Select Checkboxes, Rating, Date).
- **Conditional Logic**: Built-in support to show/hide fields based on previous answers.
- **Theming Engine**: Dynamic themes with live preview.
- **Visibility Modes**:
  - `Public`: Forms appear in the public `/templates` gallery and explore pages.
  - `Unlisted`: Accessible only via the direct link (not shown in explore pages).
  - Password Protection: Optional password required to view the form.
- **Response Analytics**: Real-time charts, completion rates, drop-off tracking, and response times.
- **API Integrations & Webhooks**: Developers can sync form responses directly to external tools using webhooks and API keys.
- **Monorepo Architecture**:
  - `apps/web`: Next.js 15 Frontend
  - `apps/api`: Express.js Backend with tRPC
  - `packages/trpc`: tRPC routers and schemas
  - `packages/database`: Drizzle ORM schema and seed scripts
  - `packages/logger`: Shared logging utility

## Tech Stack

- **Turborepo**: Monorepo management
- **Next.js 15**: React frontend
- **Express.js**: Node backend
- **tRPC**: End-to-end typesafe APIs
- **Zod**: Schema validation
- **Drizzle ORM**: Postgres database interaction
- **PostgreSQL**: Primary database (Neon)
- **Scalar**: OpenAPI Documentation generation
- **TailwindCSS & Framer Motion**: Brutalist, high-performance styling and animations

## Local Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install -g pnpm
   pnpm install
   ```

2. **Environment Variables**
   Create a `.env` file at the root of the project with the following:
   ```env
   DATABASE_URL="postgres://your_neon_db_url"
   JWT_SECRET="your_secure_random_string"
   SESSION_SECURE="false"
   NEXT_PUBLIC_API_URL="http://localhost:8000/trpc"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   BASE_URL="http://localhost:8000"
   ALLOWED_ORIGINS="http://localhost:3000"
   ENABLE_DEMO_LOGIN="true"
   ```

3. **Database Setup**
   ```bash
   pnpm --filter @repo/database db:push
   pnpm --filter @repo/database seed
   ```

4. **Run Development Servers**
   ```bash
   pnpm dev
   ```
   - Frontend runs on `http://localhost:3000`
   - Backend runs on `http://localhost:8000`
