# Lucky Draw (Random Name Picker)

A modern, fullscreen random name picker application with an administrative backend built with Next.js (App Router), Tailwind CSS, and Supabase.

## Features

- **Public Draw Page**: Fullscreen, dark-themed, sleek UI with a randomizing animation.
- **Admin Dashboard**: Manage participants, view groups statistics, and configure draw settings.
- **Bulk Migration**: Easily move participants across groups to advance winners.
- **Configuration**: Change animation speed, number of winners, and the eligible group in real-time.

## Setup Instructions

### 1. Supabase Project Setup
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the SQL Editor and run the SQL migration found in `supabase/migrations/00000_schema.sql` to create the `participants`, `settings`, and `winner_logs` tables, as well as the `select_winners` function and RLS policies.
3. Keep the SQL editor tab open or note your Supabase API keys.

### 2. Environment Variables
1. Clone the repository and navigate to the project root.
2. Edit `.env.local` and substitute the placeholders with your actual Supabase keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> **Security Note:** The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security and is necessary for the API route to securely pick and delete winners from the database on a public request without full user authentication. Do NOT expose this key to the client.

### 3. Create an Admin Account
Because the admin area is protected, you need to create an initial admin account. 
1. In your Supabase Dashboard, go to **Authentication > Users**.
2. Click **Add User > Create New User**.
3. Fill in the email and password you will use to log into the application. (Optionally disable Auto Confirm and just confirm it manually or send confirmation email).

### 4. Running the Application
Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Navigate to:
- **Public Page:** `http://localhost:3000/`
- **Admin Panel:** `http://localhost:3000/admin` (You will be redirected to the login page).
