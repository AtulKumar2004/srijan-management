# Follow-up System - Frontend Integration Examples

This file contains example code snippets for integrating the follow-up API into your frontend.

## Example: Fetch All Contacts for Follow-up Assignment

```typescript
// Fetch all contacts
async function fetchContactsForFollowUp() {
  try {
    const response = await fetch('/api/followups/contacts', {
      method: 'GET',
      credentials: 'include', // Important: includes cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch contacts');
    }

    const data = await response.json();
    
    // data.data.participants - array of participants
    // data.data.users - array of users
    // data.data.outreachContacts - array of outreach contacts
    
    return data.data;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}
```

## Example: Create Follow-ups for Selected Contacts

```typescript
interface Contact {
  id: string;
  type: 'user' | 'outreach';
}

async function createFollowUps(
  selectedContacts: Contact[],
  programDate: string,
  programId?: string,
  assignedToUserId?: string
) {
  try {
    const response = await fetch('/api/followups', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contacts: selectedContacts,
        programDate: programDate, // e.g., "2025-12-05"
        programId: programId, // optional
        assignedTo: assignedToUserId, // optional, defaults to current user
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create follow-ups');
    }

    const data = await response.json();
    console.log(`Created ${data.data.created} follow-ups`);
    
    if (data.data.errors && data.data.errors.length > 0) {
      console.warn('Some follow-ups failed:', data.data.errors);
    }
    
    return data;
  } catch (error) {
    console.error('Error creating follow-ups:', error);
    throw error;
  }
}

// Usage example:
const selectedContacts = [
  { id: 'user123', type: 'user' },
  { id: 'outreach456', type: 'outreach' },
];

createFollowUps(selectedContacts, '2025-12-05', 'program123', 'volunteer789');
```

## Example: Fetch My Assigned Follow-ups

```typescript
async function fetchMyFollowUps(filters?: {
  status?: 'pending' | 'done' | 'no-response' | 'not-interested';
  programDate?: string;
}) {
  try {
    const params = new URLSearchParams({
      myFollowUps: 'true',
    });

    if (filters?.status) {
      params.append('status', filters.status);
    }

    if (filters?.programDate) {
      params.append('programDate', filters.programDate);
    }

    const response = await fetch(`/api/followups?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch follow-ups');
    }

    const data = await response.json();
    console.log(`Found ${data.count} follow-ups`);
    
    // data.data is an array of follow-ups with contact details and phone numbers
    return data.data;
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    throw error;
  }
}

// Usage examples:
// Get all my pending follow-ups
fetchMyFollowUps({ status: 'pending' });

// Get my follow-ups for specific date
fetchMyFollowUps({ programDate: '2025-12-05' });

// Get all my follow-ups
fetchMyFollowUps();
```

## Example: Update Follow-up After Phone Call

```typescript
async function updateFollowUpAfterCall(
  followUpId: string,
  updateData: {
    status?: 'pending' | 'done' | 'no-response' | 'not-interested';
    notes?: string;
    nextActionAt?: string; // ISO date string
    channel?: 'phone' | 'whatsapp' | 'email' | 'inperson';
  }
) {
  try {
    const response = await fetch(`/api/followups/${followUpId}/update`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error('Failed to update follow-up');
    }

    const data = await response.json();
    console.log('Follow-up updated successfully');
    
    return data.data;
  } catch (error) {
    console.error('Error updating follow-up:', error);
    throw error;
  }
}

// Usage examples:

// After successful call
updateFollowUpAfterCall('followup123', {
  status: 'done',
  notes: 'Called and confirmed attendance. Very enthusiastic about the program!',
});

// After no response
updateFollowUpAfterCall('followup456', {
  status: 'no-response',
  notes: 'No answer. Will try again tomorrow evening.',
  nextActionAt: new Date('2025-11-30T18:00:00').toISOString(),
});

// After person declined
updateFollowUpAfterCall('followup789', {
  status: 'not-interested',
  notes: 'Person is busy with work commitments this month.',
});
```

## Example: React Component - Follow-up List

```typescript
import React, { useState, useEffect } from 'react';

interface FollowUp {
  id: string;
  status: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  programDate: string;
  notes?: string;
}

export default function FollowUpList() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    loadFollowUps();
  }, [filter]);

  async function loadFollowUps() {
    setLoading(true);
    try {
      const data = await fetchMyFollowUps({ status: filter as any });
      setFollowUps(data);
    } catch (error) {
      console.error('Failed to load follow-ups', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(followUpId: string, status: string, notes: string) {
    try {
      await updateFollowUpAfterCall(followUpId, { status: status as any, notes });
      // Reload the list
      await loadFollowUps();
      alert('Follow-up updated successfully!');
    } catch (error) {
      alert('Failed to update follow-up');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Follow-ups</h1>
      
      {/* Filter buttons */}
      <div className="mb-4 space-x-2">
        {['pending', 'done', 'no-response', 'not-interested'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded ${
              filter === status ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {status.replace('-', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Follow-up list */}
      <div className="space-y-4">
        {followUps.map((fu) => (
          <div key={fu.id} className="border p-4 rounded shadow">
            <h3 className="font-bold">{fu.contact.name}</h3>
            <p className="text-gray-600">Phone: {fu.contact.phone}</p>
            {fu.contact.email && <p className="text-gray-600">Email: {fu.contact.email}</p>}
            <p className="text-sm">Program Date: {new Date(fu.programDate).toLocaleDateString()}</p>
            <p className="text-sm mt-2">Status: <span className="font-semibold">{fu.status}</span></p>
            
            {fu.notes && (
              <div className="mt-2 p-2 bg-gray-100 rounded">
                <p className="text-sm whitespace-pre-wrap">{fu.notes}</p>
              </div>
            )}

            {/* Quick action buttons */}
            <div className="mt-3 space-x-2">
              <a
                href={`tel:${fu.contact.phone}`}
                className="inline-block px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                📞 Call
              </a>
              <button
                onClick={() => {
                  const notes = prompt('Enter notes about this call:');
                  if (notes) {
                    handleUpdateStatus(fu.id, 'done', notes);
                  }
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                ✓ Mark Done
              </button>
              <button
                onClick={() => {
                  const notes = prompt('Enter notes:');
                  if (notes) {
                    handleUpdateStatus(fu.id, 'no-response', notes);
                  }
                }}
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                No Response
              </button>
            </div>
          </div>
        ))}
      </div>

      {followUps.length === 0 && (
        <p className="text-gray-500 text-center mt-8">No follow-ups found for this filter.</p>
      )}
    </div>
  );
}
```

## Example: Bulk Auto-Assign (For Hundreds of Contacts)

```typescript
async function bulkAutoAssign(
  selectedContacts: Contact[],
  programDate: string,
  programId?: string
) {
  try {
    const response = await fetch('/api/followups/bulk-assign', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contacts: selectedContacts,
        programDate: programDate,
        programId: programId,
        assignmentMode: 'auto' // System will distribute evenly among all volunteers
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to bulk assign follow-ups');
    }

    const data = await response.json();
    console.log(`✅ Assigned ${data.data.created} contacts to ${data.data.volunteers} volunteers`);
    console.log('Distribution:', data.data.distribution);
    
    return data;
  } catch (error) {
    console.error('Error bulk assigning:', error);
    throw error;
  }
}

// Usage: Select 300 contacts, click ONE button, done!
bulkAutoAssign(all300Contacts, '2025-12-05');
```

## Example: Check Volunteer Workload Before Assigning

```typescript
async function getVolunteerStats(programDate?: string) {
  try {
    const params = new URLSearchParams();
    if (programDate) {
      params.append('programDate', programDate);
    }

    const response = await fetch(`/api/followups/volunteers-stats?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch volunteer stats');
    }

    const data = await response.json();
    
    // data.data contains array of volunteers with their workload
    // data.summary contains overall stats
    
    return data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}

// Usage: Check who has how many calls
const stats = await getVolunteerStats('2025-12-05');
console.log(`Total volunteers: ${stats.summary.totalVolunteers}`);
console.log(`Total pending calls: ${stats.summary.totalPending}`);
```

## Example: Admin View - Smart Bulk Assignment

```typescript
import React, { useState, useEffect } from 'react';

export default function SmartBulkAssignment() {
  const [contacts, setContacts] = useState<any>({ participants: [], outreachContacts: [] });
  const [volunteerStats, setVolunteerStats] = useState<any>(null);
  const [selectedContacts, setSelectedContacts] = useState<Array<{ id: string; type: string }>>([]);
  const [programDate, setProgramDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContactsAndStats();
  }, []);

  async function loadContactsAndStats() {
    try {
      const [contactsData, statsData] = await Promise.all([
        fetchContactsForFollowUp(),
        getVolunteerStats()
      ]);
      setContacts(contactsData);
      setVolunteerStats(statsData);
    } catch (error) {
      console.error('Failed to load data', error);
    }
  }

  function selectAll() {
    const all = [
      ...contacts.participants.map((p: any) => ({ id: p.id, type: 'user' })),
      ...contacts.outreachContacts.map((o: any) => ({ id: o.id, type: 'outreach' }))
    ];
    setSelectedContacts(all);
  }

  async function handleBulkAssign() {
    if (!programDate) {
      alert('Please select a program date');
      return;
    }

    if (selectedContacts.length === 0) {
      alert('Please select at least one contact');
      return;
    }

    setLoading(true);
    try {
      const result = await bulkAutoAssign(selectedContacts, programDate);
      
      alert(`✅ Success!\nAssigned ${result.data.created} contacts to ${result.data.volunteers} volunteers\n\nDistribution:\n${Object.entries(result.data.distribution).map(([name, count]) => `${name}: ${count}`).join('\n')}`);
      
      setSelectedContacts([]);
      await loadContactsAndStats(); // Refresh stats
    } catch (error) {
      alert('Failed to bulk assign follow-ups');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Smart Bulk Assignment</h1>

      {/* Volunteer Stats Dashboard */}
      {volunteerStats && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h2 className="text-lg font-semibold mb-2">📊 Current Volunteer Workload</h2>
          <div className="grid grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-sm text-gray-600">Total Volunteers</p>
              <p className="text-2xl font-bold">{volunteerStats.summary.totalVolunteers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Follow-ups</p>
              <p className="text-2xl font-bold">{volunteerStats.summary.totalFollowUps}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{volunteerStats.summary.totalPending}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{volunteerStats.summary.totalDone}</p>
            </div>
          </div>
          
          {/* Individual volunteer stats */}
          <div className="space-y-2">
            {volunteerStats.data.slice(0, 5).map((v: any) => (
              <div key={v.volunteerId} className="flex justify-between items-center text-sm">
                <span>{v.name}</span>
                <span className="text-gray-600">
                  Pending: {v.workload.pending} | Done: {v.workload.done} ({v.completionRate}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Program Date Selection */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Program Date:</label>
        <input
          type="date"
          value={programDate}
          onChange={(e) => setProgramDate(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-4 space-x-2">
        <button
          onClick={selectAll}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ✓ Select All ({contacts.participants.length + contacts.outreachContacts.length})
        </button>
        <button
          onClick={() => setSelectedContacts([])}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Clear Selection
        </button>
        <span className="text-gray-600">Selected: {selectedContacts.length}</span>
      </div>

      {/* Contact Lists with checkboxes */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Participants ({contacts.participants.length})</h2>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {contacts.participants.map((person: any) => (
            <label key={person.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedContacts.some(c => c.id === person.id)}
                onChange={() => {
                  const exists = selectedContacts.find(c => c.id === person.id);
                  if (exists) {
                    setSelectedContacts(selectedContacts.filter(c => c.id !== person.id));
                  } else {
                    setSelectedContacts([...selectedContacts, { id: person.id, type: 'user' }]);
                  }
                }}
              />
              <span className="text-sm">{person.name} - {person.phone}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Big Action Button */}
      <button
        onClick={handleBulkAssign}
        disabled={loading || selectedContacts.length === 0 || !programDate}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading 
          ? '⏳ Assigning...' 
          : `🚀 Auto-Assign ${selectedContacts.length} Contacts to All Volunteers`
        }
      </button>

      <p className="mt-2 text-sm text-gray-600 text-center">
        System will automatically distribute contacts evenly among all {volunteerStats?.summary.totalVolunteers || 0} active volunteers
      </p>
    </div>
  );
}
```

## Example: Admin View - Create Follow-ups for Program (Manual Mode)

```typescript
import React, { useState, useEffect } from 'react';

export default function CreateFollowUps() {
  const [contacts, setContacts] = useState<any>({ participants: [], users: [], outreachContacts: [] });
  const [selectedContacts, setSelectedContacts] = useState<Array<{ id: string; type: string }>>([]);
  const [programDate, setProgramDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const data = await fetchContactsForFollowUp();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  }

  function toggleContact(id: string, type: string) {
    const exists = selectedContacts.find(c => c.id === id);
    if (exists) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== id));
    } else {
      setSelectedContacts([...selectedContacts, { id, type }]);
    }
  }

  async function handleCreateFollowUps() {
    if (!programDate) {
      alert('Please select a program date');
      return;
    }

    if (selectedContacts.length === 0) {
      alert('Please select at least one contact');
      return;
    }

    setLoading(true);
    try {
      await createFollowUps(selectedContacts, programDate);
      alert(`Successfully created follow-ups for ${selectedContacts.length} contacts!`);
      setSelectedContacts([]);
    } catch (error) {
      alert('Failed to create follow-ups');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Create Follow-ups for Program</h1>

      <div className="mb-4">
        <label className="block mb-2">Program Date:</label>
        <input
          type="date"
          value={programDate}
          onChange={(e) => setProgramDate(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <p className="mb-2">Selected: {selectedContacts.length} contacts</p>

      {/* Participants */}
      <h2 className="text-xl font-semibold mt-6 mb-2">Participants</h2>
      <div className="space-y-2">
        {contacts.participants.map((person: any) => (
          <label key={person.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedContacts.some(c => c.id === person.id)}
              onChange={() => toggleContact(person.id, 'user')}
            />
            <span>{person.name} - {person.phone}</span>
          </label>
        ))}
      </div>

      {/* Outreach Contacts */}
      <h2 className="text-xl font-semibold mt-6 mb-2">Outreach Contacts</h2>
      <div className="space-y-2">
        {contacts.outreachContacts.map((person: any) => (
          <label key={person.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedContacts.some(c => c.id === person.id)}
              onChange={() => toggleContact(person.id, 'outreach')}
            />
            <span>{person.name || 'Unnamed'} - {person.phone} ({person.interestLevel})</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleCreateFollowUps}
        disabled={loading}
        className="mt-6 px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
      >
        {loading ? 'Creating...' : 'Create Follow-ups'}
      </button>
    </div>
  );
}
```

## Notes

- All requests must include `credentials: 'include'` to send the JWT cookie
- Phone numbers can be clicked with `tel:` links to trigger phone calls on mobile devices
- Notes are automatically timestamped when added
- Follow-ups support multiple communication channels (phone, whatsapp, email, in-person)
- Admins can create and assign follow-ups to specific volunteers
- Volunteers can only update their own assigned follow-ups
- All dates should be in ISO format when sending to the API
