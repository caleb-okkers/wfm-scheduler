# Payload Blank Template

This template comes configured with the bare minimum to get started on anything you need.

## Quick start

This template can be deployed directly from our Cloud hosting and it will setup MongoDB and cloud S3 object storage for media.

## Quick Start - local setup

To spin up this template locally, follow these steps:

### Clone

After you click the `Deploy` button above, you'll want to have standalone copy of this repo on your machine. If you've already cloned this repo, skip to [Development](#development).

### Development

1. First [clone the repo](#clone) if you have not done so already.
2. `cd wfm-scheduler && cp .env.example .env` to copy the example environment variables.
3. Edit `.env` and set:
   - `DATABASE_URL` – MongoDB connection string, for example `mongodb://127.0.0.1/wfm-scheduler`
   - `PAYLOAD_SECRET` – a random string used to sign auth tokens
4. Install dependencies and start the dev server:
   - `pnpm install`
   - `pnpm dev`
5. Open `http://localhost:3000` in your browser.

Changes made in `./src` will be reflected in your app. Follow the on-screen instructions to login and create your first admin user.

#### Docker (Optional)

If you prefer to use Docker for local development instead of a local MongoDB instance, the provided `docker-compose.yml` file can be used.

To do so, follow these steps:

- Modify the `DATABASE_URL` in your `.env` file to `mongodb://127.0.0.1/<dbname>`
- Modify the `docker-compose.yml` file's `DATABASE_URL` to match the above `<dbname>`
- Run `docker-compose up` to start the database, optionally pass `-d` to run in the background.

## How it works

The Payload config is tailored specifically to the needs of most websites. It is pre-configured in the following ways:

### Collections

See the [Collections](https://payloadcms.com/docs/configuration/collections) docs for details on how to extend this functionality.

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel.

  For additional help, see the official [Auth Example](https://github.com/payloadcms/payload/tree/main/examples/auth) or the [Authentication](https://payloadcms.com/docs/authentication/overview#authentication-overview) docs.

- #### Media

  This is the uploads enabled collection. It features pre-configured sizes, focal point and manual resizing to help you manage your pictures.

### Docker

Alternatively, you can use [Docker](https://www.docker.com) to spin up this template locally. To do so, follow these steps:

1. Follow [steps 1 and 2 from above](#development), the docker-compose file will automatically use the `.env` file in your project root
1. Next run `docker-compose up`
1. Follow [steps 4 and 5 from above](#development) to login and create your first admin user

That's it! The Docker instance will help you get up and running quickly while also standardizing the development environment across your teams.

## Admin access

- **Admin URL**: `http://localhost:3000/admin`
- Use the first user you create on startup as the admin account.

## Questions

If you have any issues or questions, reach out to us on [Discord](https://discord.com/invite/payload) or start a [GitHub discussion](https://github.com/payloadcms/payload/discussions).

## Defining scheduling rules in the admin

This project uses `RuleTemplates` and `Rules` collections to define reusable scheduling logic.

### Creating `RuleTemplates`

In the Payload admin UI:

1. Go to the `Rule templates` collection.
2. Click **Create New** (if allowed in your environment) or seed via scripts/fixtures.
3. Create a template for **MAX_HOURS_PER_WEEK**:
   - **key**: `MAX_HOURS_PER_WEEK`
   - **name**: `Max hours per week`
   - **description**: e.g. `Limit total scheduled hours per user within a rolling week`
   - **paramSchema**:
     ```json
     {
       "type": "object",
       "properties": {
         "maxHours": {
           "type": "number",
           "description": "Maximum hours allowed per user in a week"
         }
       },
       "required": ["maxHours"]
     }
     ```
4. Create a template for **PREFER_HIGHER_SKILL_LEVEL**:
   - **key**: `PREFER_HIGHER_SKILL_LEVEL`
   - **name**: `Prefer higher skill level`
   - **description**: e.g. `Prefer assigning staff with higher skill levels when available`
   - **paramSchema**:
     ```json
     {
       "type": "object",
       "properties": {
         "minimumLevel": {
           "type": "string",
           "enum": ["beginner", "intermediate", "advanced", "expert"],
           "description": "Minimum skill level to prefer"
         }
       },
       "required": ["minimumLevel"]
     }
     ```

### Example `Rules` instances

In the `Rules` collection you create concrete rules from the templates:

- **Hard max weekly hours**
  - **type**: `hard`
  - **enabled**: `true`
  - **priority**: `100`
  - **template**: `MAX_HOURS_PER_WEEK`
  - **params**:
    ```json
    {
      "maxHours": 40
    }
    ```

- **Soft preference for advanced skill**
  - **type**: `soft`
  - **enabled**: `true`
  - **priority**: `50`
  - **template**: `PREFER_HIGHER_SKILL_LEVEL`
  - **params**:
    ```json
    {
      "minimumLevel": "advanced"
    }
    ```

These instances are what the scheduler engine will read to enforce hard constraints and apply soft preferences when generating schedules.

## Running the scheduler

The scheduler is exposed as a JSON API at `POST /api/run-schedule`.

- **Request body** (JSON):

  ```json
  {
    "from": "2025-01-01T00:00:00.000Z",
    "to": "2025-01-07T23:59:59.000Z"
  }
  ```

- **Example `curl` request**:

  ```bash
  curl -X POST http://localhost:3000/api/run-schedule \
    -H "Content-Type: application/json" \
    -d '{
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-07T23:59:59.000Z"
    }'
  ```

- **Response shape**:

  ```json
  {
    "ok": true,
    "humanReadable": "...\n...",
    "result": {
      "assignments": [
        {
          "shiftId": "shift-id",
          "shiftTitle": "Shift title",
          "assignedUserIds": ["user-id-1", "user-id-2"]
        }
      ],
      "unfilled": [
        {
          "shiftId": "shift-id",
          "shiftTitle": "Shift title",
          "missingCount": 1,
          "reason": "No eligible users meet skill/level"
        }
      ]
    }
  }
  ```

## Where schedule output is stored

Each successful run of `POST /api/run-schedule` creates a document in the `Schedule runs` collection (`schedule-runs` slug) with:

- `from` / `to`: the requested window
- `result`: the JSON structure shown above
- `humanReadable`: a multi-line text summary of assignments and any unfilled shifts

You can inspect past runs directly in the Payload admin under the `Schedule runs` collection.
