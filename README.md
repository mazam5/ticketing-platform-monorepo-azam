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
3. Clone the repository and install dependencies:
  
    ```bash
    git clone <repository-url>
    cd dynamic-ticket-pricing
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
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/ticket_platform"
REDIS_URL="redis://localhost:6379"
PORT=3001
```

## How to run the Application

Install the Packages

```bash
pnpm install
```

Set up the database:

```bash
# Generate and run database migrations
pnpm db:push
# Seed the database with sample data
pnpm db:seed
```

Start the development servers:

```bash
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

Run tests with coverage:

```bash
pnpm test:coverage
```

Run specific test suites:

```bash
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests only
pnpm test:concurrency    # Concurrency tests
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Test coverage requirements:

Minimum 70% coverage for pricing logic

All concurrency tests must pass

Integration tests cover full booking flow

Available Scripts

Development

```bash
pnpm dev              # Start all services in development
pnpm frontend:dev     # Start only frontend
pnpm backend:dev      # Start only backend
```

Database

```bash
pnpm db:push         # Push database schema
pnpm db:generate     # Generate migrations
pnpm db:studio       # Open Drizzle Studio
pnpm db:seed         # Seed with sample data
```

Building

```bash
pnpm build           # Build all packages
pnpm frontend:build  # Build frontend only
pnpm backend:build   # Build backend only
```

Production

```bash
pnpm start           # Start production servers
```

Code Quality

```bash
pnpm lint           # Run ESLint
pnpm format         # Format code with Prettier
pnpm type-check     # Run TypeScript type checking
```

### API Endpoints

#### Events

```GET /events``` - List all events

```GET /events/:id``` - Get event details with price breakdown

```POST /events``` - Create new event

#### Bookings

```POST /bookings``` - Create booking

```GET /bookings``` - List bookings (with eventId query param)

### Analytics

```GET /analytics/events/:id``` - Event metrics

```GET /analytics/summary``` - System-wide metrics

### Development

```POST /seed``` - Seed database with sample data