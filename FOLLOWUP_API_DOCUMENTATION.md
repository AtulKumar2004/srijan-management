# Follow-up Management API Documentation

This document explains how to use the follow-up management system for volunteers and admins to manage phone calls and follow-ups for temple programs.

## Overview

The follow-up system allows:
- **Admins & Volunteers** to view lists of participants, users, and outreach contacts
- **Create follow-up tasks** for specific program dates
- **Assign follow-ups** to specific volunteers
- **Track phone calls** with notes and status updates
- **View assigned follow-ups** with contact phone numbers

## Database Model Update

The `FollowUp` model now includes a `programDate` field to track follow-ups for specific program dates.

## API Endpoints

### 1. Get All Contacts for Follow-up Assignment

**Endpoint:** `GET /api/followups/contacts`

**Description:** Retrieve all participants, users, and outreach contacts that can be assigned for follow-ups.

**Authorization:** Requires authentication. Only `admin` and `volunteer` roles allowed.

**Response:**
```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "type": "user",
        "role": "participant",
        "profession": "Engineer",
        "homeTown": "Delhi"
      }
    ],
    "users": [
      {
        "id": "user_id",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1234567891",
        "type": "user",
        "role": "volunteer",
        "profession": "Teacher",
        "homeTown": "Mumbai"
      }
    ],
    "outreachContacts": [
      {
        "id": "outreach_id",
        "name": "Bob Johnson",
        "phone": "+1234567892",
        "type": "outreach",
        "location": "Bangalore",
        "interestLevel": "high",
        "notes": "Met at community event",
        "addedBy": {
          "name": "Volunteer Name",
          "email": "volunteer@example.com"
        }
      }
    ]
  }
}
```

---

### 2. Create Follow-ups for a Program Date

**Endpoint:** `POST /api/followups`

**Description:** Create follow-up tasks for selected contacts for a specific program date.

**Authorization:** Requires authentication. Only `admin` and `volunteer` roles allowed.

**Request Body:**
```json
{
  "contacts": [
    {
      "id": "user_id_or_outreach_id",
      "type": "user"
    },
    {
      "id": "outreach_id",
      "type": "outreach"
    }
  ],
  "programId": "program_id_optional",
  "programDate": "2025-12-05",
  "assignedTo": "volunteer_user_id_optional"
}
```

**Fields:**
- `contacts`: Array of contacts to create follow-ups for
  - `id`: Contact's database ID
  - `type`: Either "user" or "outreach"
- `programId`: (Optional) Program reference ID
- `programDate`: Date of the program (required)
- `assignedTo`: (Optional) User ID to assign follow-ups to. Defaults to creator.

**Response:**
```json
{
  "success": true,
  "message": "Created 5 follow-ups",
  "data": {
    "created": 5,
    "errors": [
      {
        "contactId": "some_id",
        "error": "Follow-up already exists for this contact and program date"
      }
    ]
  }
}
```

---

### 3. Get Follow-ups (with Filters)

**Endpoint:** `GET /api/followups`

**Description:** Retrieve follow-ups with optional filters. Volunteers can see their assigned follow-ups with phone numbers.

**Authorization:** Requires authentication. Only `admin` and `volunteer` roles allowed.

**Query Parameters:**
- `myFollowUps=true` - Get only follow-ups assigned to current user
- `assignedTo=user_id` - Filter by assigned volunteer
- `status=pending|done|no-response|not-interested` - Filter by status
- `programDate=2025-12-05` - Filter by program date

**Examples:**
```
GET /api/followups?myFollowUps=true
GET /api/followups?status=pending&programDate=2025-12-05
GET /api/followups?assignedTo=volunteer_user_id
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "followup_id",
      "targetType": "user",
      "status": "pending",
      "channel": "phone",
      "notes": "[2025-11-29] Called, no answer",
      "programDate": "2025-12-05T00:00:00.000Z",
      "nextActionAt": "2025-11-30T10:00:00.000Z",
      "createdAt": "2025-11-29T08:00:00.000Z",
      "updatedAt": "2025-11-29T09:00:00.000Z",
      "assignedTo": {
        "_id": "volunteer_id",
        "name": "Volunteer Name",
        "email": "volunteer@example.com",
        "phone": "+1234567890"
      },
      "createdBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "program": {
        "_id": "program_id",
        "name": "Weekly Bhagavad Gita Class",
        "description": "Sunday program"
      },
      "contact": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "role": "participant",
        "profession": "Engineer",
        "homeTown": "Delhi"
      }
    }
  ]
}
```

---

### 4. Update Follow-up After Phone Call

**Endpoint:** `PATCH /api/followups/[id]/update`

**Description:** Update follow-up status and add notes after making a phone call.

**Authorization:** Requires authentication. Volunteers can only update their assigned follow-ups. Admins can update any follow-up.

**Request Body:**
```json
{
  "status": "done",
  "notes": "Called and confirmed attendance. Very enthusiastic!",
  "nextActionAt": "2025-12-04T18:00:00.000Z",
  "channel": "phone"
}
```

**Fields (all optional):**
- `status`: Update status ("pending", "done", "no-response", "not-interested")
- `notes`: Add notes about the phone call (automatically timestamped and appended)
- `nextActionAt`: Schedule next follow-up action
- `channel`: Update communication channel ("phone", "whatsapp", "email", "inperson")

**Response:**
```json
{
  "success": true,
  "message": "Follow-up updated successfully",
  "data": {
    "id": "followup_id",
    "targetType": "user",
    "status": "done",
    "channel": "phone",
    "notes": "[2025-11-29 14:30:45] Called and confirmed attendance. Very enthusiastic!",
    "programDate": "2025-12-05T00:00:00.000Z",
    "nextActionAt": "2025-12-04T18:00:00.000Z",
    "contact": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  }
}
```

---

### 5. Delete Follow-up (Soft Delete)

**Endpoint:** `DELETE /api/followups/[id]/update`

**Description:** Soft delete a follow-up (admin only).

**Authorization:** Requires authentication. Only `admin` role allowed.

**Response:**
```json
{
  "success": true,
  "message": "Follow-up deleted successfully"
}
```

---

### 6. Bulk Auto-Assign Follow-ups (Smart Distribution)

**Endpoint:** `POST /api/followups/bulk-assign`

**Description:** Automatically distribute hundreds of follow-ups evenly among all active volunteers. NO manual assignment needed!

**Authorization:** Requires authentication. Only `admin` role allowed.

**Request Body:**
```json
{
  "contacts": [
    {"id": "user1", "type": "user"},
    {"id": "user2", "type": "user"},
    {"id": "outreach1", "type": "outreach"}
  ],
  "programDate": "2025-12-05",
  "programId": "program_id_optional",
  "assignmentMode": "auto",
  "volunteers": ["volunteer1_id", "volunteer2_id"]
}
```

**Fields:**
- `contacts`: Array of contacts (can be hundreds!)
- `programDate`: Date of the program (required)
- `programId`: (Optional) Program reference ID
- `assignmentMode`: "auto" (uses all active volunteers) or "manual" (uses specified volunteers list)
- `volunteers`: (Optional) Array of specific volunteer IDs to assign to. If empty with "auto" mode, system finds all active volunteers

**How It Works:**
- Uses **round-robin algorithm** to distribute evenly
- Example: 100 contacts + 5 volunteers = 20 contacts each
- Automatically balances the workload

**Response:**
```json
{
  "success": true,
  "message": "Automatically assigned 100 follow-ups to 5 volunteers",
  "data": {
    "created": 100,
    "volunteers": 5,
    "distribution": {
      "Volunteer Sarah": 20,
      "Volunteer John": 20,
      "Volunteer Mary": 20,
      "Volunteer Bob": 20,
      "Volunteer Alice": 20
    },
    "errors": []
  }
}
```

---

### 7. Get Volunteer Workload Stats

**Endpoint:** `GET /api/followups/volunteers-stats`

**Description:** See how many follow-ups each volunteer has (total, pending, completed). Helps admins balance workload.

**Authorization:** Requires authentication. Only `admin` role allowed.

**Query Parameters:**
- `programDate=2025-12-05` - (Optional) Filter stats for specific program date

**Examples:**
```
GET /api/followups/volunteers-stats
GET /api/followups/volunteers-stats?programDate=2025-12-05
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "volunteerId": "volunteer1_id",
      "name": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "+1234567890",
      "workload": {
        "total": 25,
        "pending": 5,
        "done": 18,
        "noResponse": 1,
        "notInterested": 1
      },
      "completionRate": 72
    },
    {
      "volunteerId": "volunteer2_id",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567891",
      "workload": {
        "total": 25,
        "pending": 15,
        "done": 8,
        "noResponse": 2,
        "notInterested": 0
      },
      "completionRate": 32
    }
  ],
  "summary": {
    "totalVolunteers": 5,
    "totalFollowUps": 125,
    "totalPending": 35,
    "totalDone": 85
  }
}
```

---

## Workflow Example

### Step 1: Admin/Volunteer Views Contacts
```bash
GET /api/followups/contacts
```
Returns all participants, users, and outreach contacts with phone numbers.

### Step 2: Create Follow-ups for Upcoming Program

**Option A: Bulk Auto-Assign (Recommended for 100+ contacts)**
```bash
POST /api/followups/bulk-assign
{
  "contacts": [
    {"id": "user1_id", "type": "user"},
    {"id": "user2_id", "type": "user"},
    ... 300 more contacts ...
  ],
  "programDate": "2025-12-05",
  "assignmentMode": "auto"
}
```
System automatically distributes to all volunteers evenly!

**Option B: Manual Assignment (For small groups)**
```bash
POST /api/followups
{
  "contacts": [
    {"id": "user1_id", "type": "user"},
    {"id": "user2_id", "type": "user"}
  ],
  "programDate": "2025-12-05",
  "assignedTo": "specific_volunteer_id"
}
```

### Step 3: Volunteer Views Assigned Follow-ups
```bash
GET /api/followups?myFollowUps=true&status=pending
```
Shows list with phone numbers for calling.

### Step 4: Volunteer Makes Phone Call and Updates
After calling John Doe:
```bash
PATCH /api/followups/[followup_id]/update
{
  "status": "done",
  "notes": "Called at 2 PM. Confirmed attendance. Bringing a friend!"
}
```

After calling Jane Smith with no response:
```bash
PATCH /api/followups/[followup_id]/update
{
  "status": "no-response",
  "notes": "No answer. Will try again tomorrow evening.",
  "nextActionAt": "2025-11-30T18:00:00.000Z"
}
```

### Step 5: Monitor Progress
Admin checks overall status:
```bash
GET /api/followups?programDate=2025-12-05&status=pending
```

---

## Status Values

- **pending**: Follow-up not yet completed
- **done**: Successfully contacted and confirmed
- **no-response**: Called but no answer
- **not-interested**: Contact declined participation

## Channel Values

- **phone**: Phone call
- **whatsapp**: WhatsApp message/call
- **email**: Email communication
- **inperson**: In-person conversation

---

## Notes Feature

When updating notes, the system automatically:
- Adds a timestamp: `[2025-11-29 14:30:45]`
- Appends to existing notes (preserves history)
- Creates a conversation log of all interactions

Example of notes after multiple updates:
```
[2025-11-29 10:00:00] First call - no answer
[2025-11-29 16:30:00] Called again - spoke with person. Confirmed attendance!
[2025-12-01 09:00:00] Reminder call - still planning to attend
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Resource created
- `400`: Bad request (validation error)
- `401`: Unauthorized (no token)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `500`: Server error

Error response format:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```
