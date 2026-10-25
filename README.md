# Release Checklist Tool

The Release Checklist Tool helps a team check whether a software release is ready to go live.

Users can create releases, add notes, track completed tasks, update release details, and delete releases. The app saves the data in a PostgreSQL database, so the information stays available after refreshing the page.

## Live Demo

- **Live Application:** https://cactro-release-checklist.netlify.app/
- **GraphQL API:** https://cactro-release-checklist.onrender.com/graphql
- **API Health Check:** https://cactro-release-checklist.onrender.com/health
- **GitHub Repository:** https://github.com/sujay-707/cactro-release-checklist

*Note: The backend runs on Render's free plan and may take a little time to respond after being inactive.*

## Features

- View all saved releases.
- Create a release with a name, due date, and optional notes.
- Edit release details and additional information.
- Check or uncheck release checklist items.
- Automatically update the release status based on completed tasks.
- Delete a release.
- Save release information in a PostgreSQL database.
- Use the app on desktop and mobile screens.

### Release Status

Each release has one of three statuses:

- **Planned:** No checklist items are completed.
- **Ongoing:** At least one item is completed, but some tasks are still left.
- **Done:** All seven checklist items are completed.

### Release Checklist Items

Each release has these seven tasks:

1. All relevant GitHub pull requests have been merged.
2. `CHANGELOG.md` files have been updated.
3. All tests are passing.
4. Releases in GitHub have been created.
5. The release has been deployed to the demo environment.
6. The release has been tested thoroughly in the demo environment.
7. The release has been deployed to production.

## Technologies Used

- **Frontend:** React, Vite, Apollo Client, CSS
- **Backend:** Node.js, Express, Apollo Server, GraphQL
- **Database:** PostgreSQL hosted on Neon
- **Frontend Hosting:** Netlify
- **Backend Hosting:** Render
- **Automated Tests:** Vitest

## How the App Works

The app has three main parts:

1. **Frontend:** The page users open in their browser.
2. **Backend:** Receives requests from the frontend through GraphQL and handles the app's logic.
3. **Database:** Stores release details and checklist progress.

The frontend sends requests to the backend. The backend reads or updates the data in PostgreSQL and sends the result back to the frontend.

## Run the Project on Your Computer

### Requirements

Before starting, install:

- Node.js and npm
- PostgreSQL, either locally or through a hosted service
- Git

### Step 1: Download the Project

Open a terminal and run:

```bash
git clone https://github.com/sujay-707/cactro-release-checklist.git
cd cactro-release-checklist
```

### Step 2: Set Up the Backend

Create a file named `.env` inside the `server` folder.

Add your PostgreSQL connection details:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
PORT=4000
CLIENT_URL=http://localhost:5173
```

Replace the example database URL with your own PostgreSQL connection string. Keep this file private and do not upload it to GitHub.

Now install the backend packages and start the server:

```bash
cd server
npm ci
npm start
```

The backend should now be available at:

- Health Check: http://localhost:4000/health
- GraphQL API: http://localhost:4000/graphql

The backend creates the required database table when it starts.

### Step 3: Set Up the Frontend

Open a second terminal from the main project folder.

Create a file named `.env` inside the `client` folder and add:

```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

Install the frontend packages and start the app:

```bash
cd client
npm ci
npm run dev
```

Open the local address shown in the terminal. It is usually:

http://localhost:5173

Keep the backend running while using the frontend.

## Environment Variables

These settings tell the app how to connect to the database and API.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Connects the backend to PostgreSQL. |
| `PORT` | Sets the backend port. It defaults to `4000` locally. |
| `CLIENT_URL` | Lists the frontend website addresses allowed to call the backend. Multiple addresses can be separated by commas. |
| `VITE_GRAPHQL_URL` | Tells the frontend where the GraphQL API is located. |

Never upload real database passwords or secret environment files to GitHub.

## GraphQL API

The frontend and backend communicate using GraphQL.

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Checks whether the backend and database are working. |
| `POST` | `/graphql` | Used to read and change release information. |

The full deployed GraphQL URL is:

https://cactro-release-checklist.onrender.com/graphql

### 1. View All Releases

This query returns all saved releases.

```graphql
query GetReleases {
  releases {
    id
    name
    date
    status
    additionalInfo
    completedSteps
    createdAt
    updatedAt
  }
}
```

### 2. View One Release

```graphql
query GetRelease($id: ID!) {
  release(id: $id) {
    id
    name
    date
    status
    additionalInfo
    completedSteps
    createdAt
    updatedAt
  }
}
```

### 3. Create a Release

```graphql
mutation CreateRelease($input: CreateReleaseInput!) {
  createRelease(input: $input) {
    id
    name
    date
    status
    additionalInfo
    completedSteps
  }
}
```

Example input:

```json
{
  "input": {
    "name": "v1.0.0",
    "date": "2026-10-30",
    "additionalInfo": "First production release"
  }
}
```

### 4. Update a Release

Use this mutation to change a release's name, date, or additional information.

```graphql
mutation UpdateRelease($id: ID!, $input: UpdateReleaseInput!) {
  updateRelease(id: $id, input: $input) {
    id
    name
    date
    additionalInfo
    status
  }
}
```

### 5. Check or Uncheck a Task

Each checklist item has a number from `0` to `6`. The number `0` means the first item.

```graphql
mutation ToggleStep($releaseId: ID!, $stepIndex: Int!) {
  toggleStep(releaseId: $releaseId, stepIndex: $stepIndex) {
    id
    status
    completedSteps
  }
}
```

### 6. Delete a Release

```graphql
mutation DeleteRelease($id: ID!) {
  deleteRelease(id: $id)
}
```

## Database Structure

The app stores release information in a PostgreSQL table named `releases`.

| Column | What it stores |
|---|---|
| `id` | A unique ID for each release. |
| `name` | The release name. |
| `release_date` | The release due date. |
| `additional_info` | Optional notes about the release. |
| `completed_steps` | The seven checklist items and whether each one is completed. |
| `created_at` | When the release was created. |
| `updated_at` | When the release was last updated. |

The `completed_steps` column stores seven `true` or `false` values. `true` means the task is completed, and `false` means it is not.

The app calculates the release status from these values instead of storing the status separately.

The database also has an index on `release_date` to help sort releases by date.

## Run the Tests

To run the backend tests:

```bash
cd server
npm test
```

To build the frontend:

```bash
cd client
npm ci
npm run build
```

The automated tests check how the app determines whether a release is Planned, Ongoing, or Done.

## Run with Docker

The backend has a `Dockerfile`, and the project includes a Docker Compose configuration.

If Docker is installed and the Compose configuration is set up correctly, run this command from the project folder:

```bash
docker compose up --build
```

Make sure the backend receives a valid `DATABASE_URL` and can connect to PostgreSQL.

## Deployment

The project is deployed using these services:

- **Netlify:** Hosts the React frontend.
- **Render:** Runs the GraphQL backend.
- **Neon:** Stores the PostgreSQL data.

The frontend uses `VITE_GRAPHQL_URL` to find the backend. The backend uses `CLIENT_URL` to allow requests from the deployed frontend.

## Performance Testing

A stress test sends many requests to the API at the same time to see how the application handles the load.

To measure performance properly:

1. Run a test with increasing numbers of concurrent requests.
2. Record successful requests, failed requests, and response times.
3. Identify when requests begin failing or response times become too slow.
4. Make an optimization and run the same test again.
5. Compare the results before and after the optimization.

The maximum supported concurrency has not been documented here because it must be measured through actual tests. Results can vary depending on the hosting plan, database, network, and test workload.

## Notes

- This is a single-user application. It does not include login or user management.
- The backend's free hosting plan may take extra time to respond after being inactive.
- Keep database credentials private and never commit `.env` files to GitHub.
