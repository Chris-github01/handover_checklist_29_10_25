# Project Handover Checklist System

A comprehensive project management and handover tracking system built for Optimal Fire Systems. This application streamlines the project handover process from pre-let through to completion, managing all stages of fire protection projects with role-based access control and automated notifications.

## 🌟 Features

### Project Management
- **Multi-Project Dashboard**: Track all projects across different stages (In Progress, Live, Closed)
- **Project Types**: Support for Passive Fire, Intumescent, and combined projects
- **BWOF Projects**: Special handling for Building Warrant of Fitness projects (skips stages 1-3)
- **Small Projects**: Simplified workflow for smaller scopes
- **Regional Management**: Auckland and Wellington project tracking
- **Project Codes**: Auto-generated unique project identifiers
- **Cost Allocation**: Track project costs, claims, and outstanding amounts

### Handover Stages (9-Step Process)
1. **Step 1: Pre-Let** - Initial project setup and QS assignment
2. **Step 2: Contract** - Contract documentation and approval
3. **Step 3: Estimating** - Project estimation and pricing
4. **Step 4: Commercial** - Commercial review and sign-off
5. **Step 5: Project Director** - Director review and manager assignment
6. **Step 6: QA** - Quality assurance checks
7. **Step 7: Project Director - Handover** - Final director approval
8. **Step 8: Site Managers** - Site manager preparation
9. **Step 9: Health & Safety** - H&S documentation and clearance

### Advanced Features
- **Role-Based Access Control**: Different permissions for Admin, Director, QS, PM/SM, Estimating, Commercial, QA, H&S
- **Automated Email Notifications**: Step completion notifications sent to responsible parties
- **File Attachments**: Upload and manage documents at stage and item level
- **Progress Tracking**: Visual progress indicators for each stage
- **Notes System**: Detailed note-taking with contextual hints
- **Dropdown Assignments**: QS and Manager assignment with automatic notifications
- **Multi-File Upload**: Batch file upload for estimating stage
- **Dark Premium UI**: Professional dark theme interface
- **Search & Filter**: Quick project and stage filtering
- **Export/Import**: Excel export/import for bulk project management

## 🏗️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon system
- **jsPDF** - PDF generation
- **XLSX** - Excel file handling
- **EmailJS** - Email notification service

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Storage for file attachments
  - Edge Functions for serverless operations

## 📊 Database Schema

### Core Tables

#### `users`
User profiles and role management
- `id` (uuid, primary key)
- `email` (text, unique)
- `name` (text)
- `role` (text) - Admin, Director, QS, PM/SM, Estimating, Commercial, QA, H&S, Read-only

#### `projects`
Main project records
- `id` (uuid, primary key)
- `name` (text) - Project name
- `client` (text) - Client name
- `project_code` (text, unique) - Auto-generated code
- `project_title` (text) - Formatted title (name + client + code)
- `project_type` (text) - passive_fire, intumescent, passive_intumescent
- `region` (text) - auckland, wellington
- `bwof` (boolean) - Building Warrant of Fitness flag
- `start_date_target` (text) - Target start date
- `status` (text) - await_pre_let, awarded, in_progress, active, live, closed
- `site_manager` (text)
- `qs` (text)
- `is_small_project` (boolean)
- `small_project_steps` (integer array)
- `client_qs_name`, `client_qs_email`, `client_qs_number` (text)
- `created_at` (timestamptz)

#### `stages`
Handover process stages
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects)
- `code` (text) - STEP_1 through STEP_9
- `title` (text) - Stage name
- `owner_role` (text) - Role responsible for stage
- `order` (integer) - Display order
- `created_at` (timestamptz)

#### `stage_items`
Checklist items within each stage
- `id` (uuid, primary key)
- `stage_id` (uuid, foreign key → stages)
- `parent_id` (uuid, nullable) - For nested items
- `title` (text)
- `description` (text)
- `is_required` (boolean)
- `requires_all_children` (boolean)
- `order` (integer)

#### `item_checks`
Tracking of completed checklist items
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects)
- `item_id` (uuid, foreign key → stage_items)
- `user_id` (uuid, foreign key → users)
- `is_checked` (boolean)
- `note` (text)
- `checked_at` (timestamptz)

#### `stage_statuses`
Stage completion tracking
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects)
- `stage_id` (uuid, foreign key → stages)
- `status` (text) - pending, in_progress, complete
- `completed_at` (timestamptz)

#### `attachments`
File storage records
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects)
- `stage_id` (uuid, foreign key → stages)
- `item_id` (uuid, nullable, foreign key → stage_items)
- `filename` (text)
- `url` (text)
- `file_path` (text)
- `uploaded_by` (uuid, foreign key → users)
- `created_at` (timestamptz)

#### `cost_allocations`
Project cost tracking
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects)
- `item_number` (text)
- `description` (text)
- `project_value` (numeric)
- `claimed_to_date` (numeric)
- `created_at` (timestamptz)

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Restrict read/write access to authenticated users
- Enforce role-based permissions
- Allow directors and admins full access
- Restrict deletion to directors and admins only
- Control stage access based on user role and ownership

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- EmailJS account (for notifications)

### 1. Clone Repository
```bash
git clone https://github.com/Chris-github01/handover_checklist_29_10_25.git
cd handover_checklist_29_10_25
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

#### Apply Migrations
The database migrations are located in `supabase/migrations/`. They should be applied in order:

1. Initial schema creation (`20250910020200_scarlet_sky.sql`)
2. Stage definitions and items
3. RLS policies
4. Additional features (cost allocation, client QS info, etc.)

**To apply migrations:**
```bash
# Using Supabase CLI
supabase db push

# Or apply manually through Supabase Dashboard → SQL Editor
```

#### Initialize Default Data
After migrations, you'll need to:
1. Create user profiles in the `users` table
2. Project stages will be auto-created when projects are created

### 5. Storage Setup
Configure Supabase Storage:
1. Create a bucket named `project-attachments`
2. Set bucket to private
3. Configure RLS policies for the bucket:
   - Allow authenticated users to upload
   - Allow authenticated users to read files from their projects

### 6. Email Configuration
The app uses EmailJS for notifications:
1. Create an EmailJS account
2. Set up a service and template
3. Update credentials in `src/components/Stages/StageModal.tsx`:
   - Service ID: `service_eh5hex9`
   - Template ID: `template_msss66t`
   - Public Key: `fksPkj0nAvRfXvhjx`

### 7. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 8. Build for Production
```bash
npm run build
```

## 👥 User Roles & Permissions

### Admin
- Full system access
- Can create, edit, delete any project
- Can manage all stages
- Can view all data

### Director
- Create and edit projects
- Access all stages
- Delete projects
- Assign managers and QS
- View all project data

### QS (Quantity Surveyor)
- Access to Steps 1, 2, 3
- Can be assigned to projects
- Upload estimates and documentation

### PM/SM (Project Manager/Site Manager)
- Access to Steps 7, 8
- View project details
- Manage site preparation

### Estimating
- Access to Step 3
- Upload estimation files
- Review project scope

### Commercial
- Access to Step 4
- Review commercial aspects
- Approve contracts

### QA (Quality Assurance)
- Access to Step 6
- Quality checks
- Documentation review

### H&S (Health & Safety)
- Access to Step 9
- Safety documentation
- Final clearance

### Read-only
- View projects and stages
- No edit permissions

## 📧 Email Notification System

Automated notifications are sent when stages are completed:

- **Step 1 → Step 2**: Notifies Reynier
- **Step 2 → Step 3**: Notifies Sanet
- **Step 3 → Step 4**: Notifies Contracts, Pedro, Ray
- **Step 4 → Step 5**: Notifies Pedro, Ray
- **Step 5 → Step 6**: Notifies Okkie, Karel
- **Step 6 → Step 7**: Notifies Pedro
- **Step 7 → Step 8**: Notifies assigned manager
- **Step 8 → Step 9**: Notifies Jacilise, Arlene
- **Step 9 → Complete**: Notifies Pedro, Pieter, Ray

## 🎨 UI Design

The application features a premium dark theme:
- **Primary Color**: BurnRatePro Gold (#F4B223)
- **Background**: Near-black (#0f0f0f)
- **Cards**: Dark charcoal (#1a1a1a)
- **Borders**: Subtle gray (#808080)
- **Text**: High-contrast grays for readability
- **Semantic Colors**: Green (success), Red (risk), Orange (warning)

## 📁 Project Structure

```
handover_checklist_29_10_25/
├── src/
│   ├── components/
│   │   ├── Auth/              # Login and password reset
│   │   ├── Layout/            # Header and layout components
│   │   ├── Notifications/     # Email notification system
│   │   ├── Projects/          # Project management components
│   │   ├── Stages/            # Stage workflow components
│   │   └── ui/                # Shared UI components (Button, Card, Badge)
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication context
│   ├── hooks/
│   │   └── useProjects.ts     # Project data hooks
│   ├── lib/
│   │   ├── database.ts        # Database operations
│   │   ├── storage.ts         # File storage operations
│   │   ├── supabase.ts        # Supabase client
│   │   └── naming.ts          # Naming utilities
│   ├── types/
│   │   └── database.ts        # TypeScript types
│   ├── App.tsx                # Main application
│   └── main.tsx               # Entry point
├── supabase/
│   ├── functions/             # Edge functions
│   └── migrations/            # Database migrations
├── public/                    # Static assets
└── package.json
```

## 🔐 Security Features

- **Row Level Security**: All database tables protected with RLS
- **Role-Based Access**: Granular permissions per user role
- **Authenticated Routes**: Protected routes require login
- **Secure File Storage**: Private file storage with access control
- **Input Validation**: Form validation and sanitization
- **SQL Injection Prevention**: Parameterized queries via Supabase

## 🛠️ Development

### Code Style
- TypeScript strict mode enabled
- ESLint configuration for code quality
- Component-based architecture
- Hooks for state management
- Context API for global state

### Testing
```bash
npm run lint
```

### Building
```bash
npm run build
npm run preview  # Preview production build
```

## 📝 License

Proprietary - Optimal Fire Systems

## 🤝 Support

For issues or questions, contact the development team at Optimal Fire Systems.

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Maintained by**: Optimal Fire Systems Development Team
