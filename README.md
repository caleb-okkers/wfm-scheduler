# WFM Scheduler (Payload CMS)

This project demonstrates an automatically generated shift schedule for call-center staff based on **multiple skills per user**, **skill levels**, and **configurable hard/soft rules**.

## Quick Start - local setup

### Development

1. `cp .env.example .env`
2. Edit `.env` and set:
   - `DATABASE_URL` – MongoDB connection string (example: `mongodb://127.0.0.1:27017/wfm-scheduler`)
   - `PAYLOAD_SECRET` – a random string used to sign auth tokens
3. Install dependencies and start the dev server:
   - `pnpm install`
   - `pnpm dev`
4. Open `http://localhost:3000` in your browser.

On first run, the Admin UI will prompt you to create the first admin user.

## Admin access

- **Admin URL**: `http://localhost:3000/admin`
- Use the first user you create on startup as the admin account.

## Data model (collections)

You can manage all scheduler inputs via the Admin UI:

- **Skills**
  - `name` (unique)
  - `description` (optional)
- **Users** (auth-enabled)
  - `email`, `password`
  - `skills[]`: relationship to Skills + `level` (`beginner|intermediate|advanced|expert`)
- **Shifts**
  - `title` (human readable)
  - `start`, `end`
  - `requiredSkill` (relationship to Skills)
  - `requiredLevel`
  - `staffingRequired`
- **Rule Templates**
  - reusable rule definitions (e.g. MAX_HOURS_PER_WEEK)
- **Rules**
  - concrete enabled rules with priority and params
- **Schedule Runs**
  - persisted outputs from each scheduling run

## Defining scheduling rules in the Admin UI

This project uses `RuleTemplates` (reusable definitions) and `Rules` (enabled instances).

### Create RuleTemplates

In Admin:

1. Go to **Rule Templates**
2. Click **Create New**
3. Create **MAX_HOURS_PER_WEEK**:
   - **key**: `MAX_HOURS_PER_WEEK`
   - **name**: `Max hours per week`
   - **description**: e.g. `Limit total scheduled hours per user within a rolling week`
   - **paramSchema**:
     ```json
     {
       "type": "object",
       "properties": {
         "maxHours": {
           "type": "integer",
           "minimum": 1,
           "description": "Maximum hours allowed per user in a week"
         }
       },
       "required": ["maxHours"],
       "additionalProperties": false
     }
     ```

4. Create **PREFER_HIGHER_SKILL_LEVEL** (no required params):
   - **key**: `PREFER_HIGHER_SKILL_LEVEL`
   - **name**: `Prefer higher skill level`
   - **description**: e.g. `Prefer assigning staff with higher skill levels when available`
   - **paramSchema**:
     ```json
     {
       "type": "object",
       "properties": {},
       "additionalProperties": false
     }
     ```

> Note: The scheduler code also supports an optional `minimumLevel` param for this template, but it is not required.

### Create Rules (instances)

In **Rules**, create enabled instances from the templates:

- **Hard max weekly hours**
  - **type**: `hard`
  - **enabled**: `true`
  - **priority**: `1`
  - **template**: `MAX_HOURS_PER_WEEK`
  - **params**:
    ```json
    {
      "maxHours": 40
    }
    ```

- **Soft preference for higher skill**
  - **type**: `soft`
  - **enabled**: `true`
  - **priority**: `10`
  - **template**: `PREFER_HIGHER_SKILL_LEVEL`
  - **params**:
    ```json
    {}
    ```

## Running the scheduler

### Option A (recommended): Run from Admin UI

1. Go to **Admin → Schedule Runs**
2. Use the **Run Scheduler** panel at the top
3. Enter `from` / `to` (ISO datetimes)
4. Click **Run Scheduler**

A new **Schedule Run** will be created and saved automatically.

### Option B: Run via API

The scheduler is exposed as JSON API:

- **Endpoint**: `POST /api/run-schedule`
- **Body**:
  ```json
  {
    "from": "2026-02-10T00:00:00.000Z",
    "to": "2026-02-17T23:59:59.999Z"
  }
