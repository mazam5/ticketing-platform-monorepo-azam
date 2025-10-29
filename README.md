# Dynamic Ticket Pricing Full Stack App

## Prerequisites

- [Node.js](https://nodejs.org/en) (v18.17 or higher)
- [Pnpm](https://pnpm.io/) (v8 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)
- [Redis](https://redis.io/) (v6 or higher) - optional, for caching

## Installation Steps

1. Install [Node.js](https://nodejs.org/en) (v18.17 or higher recommended)

2. Install Pnpm globally (if not already installed):

   ```bash
   npm install -g pnpm
   ```

3. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/mazam5/ticketing-platform-monorepo-azam
   cd ticketing-platform-monorepo-azam
   pnpm install
   ```

4. Set up PostgreSQL database:

   ```bash
   # Create database (method depends on your PostgreSQL setup)
   create db event_management
   # or using psql
   psql -U postgres -c "CREATE DATABASE event_management;"
   ```

## Environment Variables Setup

Create the following environment files:

#### Web .env: env

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### Backend .env: env

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/db_name"
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
ADMIN_API_KEY=key
HIGH_UTILIZATION_WEIGHT=weight
FRONTEND_URL='http://localhost:3000'
```

## How to run the Application

Install the Packages in the Turbo Repo Root Directory

```bash
pnpm install
```

Set up the database:

```bash
cd packages/database
# Seed the database with sample data
pnpm db:seed
```

Start the development servers:

```bash
cd ../..
# Start both frontend and backend
turbo dev

# or

pnpm turbo dev

# Or start individually
pnpm frontend:dev    # Frontend on http://localhost:3000
pnpm backend:dev     # Backend on http://localhost:3001
```

Access the application:

Frontend: `http://localhost:3000`

Backend API: `http://localhost:3001`

## How to run Tests

Run all tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```
