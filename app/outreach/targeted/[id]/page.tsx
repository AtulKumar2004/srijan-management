'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useModalStore } from '@/store/modalStore';
import { Search, Filter, X, ChevronDown, Phone, Download, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';

interface CustomForm {
  _id: string;
  title: string;
  templeName: string;
  adminName: string;
  adminId?: string;
  fields: any[];
}

interface OutreachContact {
  _id: string;
  name: string;
  phone: string;
  profession: string;
  motherTongue?: string;
  currentLocation?: string;
  registeredBy: string;
  numberOfRounds?: number;
  branch: string;
  paidStatus: string;
  underWhichAdmin?: string;
  comment?: string;
  customFields?: { [key: string]: any };
  createdAt?: string;
}

export default function TargetedOutreachCardDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { showAlert, showConfirm } = useModalStore();

  const [form, setForm] = useState<CustomForm | null>(null);
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<OutreachContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterProfession, setFilterProfession] = useState('');
  const [filterPaidStatus, setFilterPaidStatus] = useState('');

  // Selection & Expansion state
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [expandedContacts, setExpandedContacts] = useState<string[]>([]);

  // Bulk Edit state
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState<{ [key: string]: boolean }>({});
  const [bulkEditValues, setBulkEditValues] = useState<{ [key: string]: any }>({
    name: '',
    phone: '',
    profession: '',
    motherTongue: '',
    currentLocation: '',
    registeredBy: '',
    numberOfRounds: '',
    branch: '',
    paidStatus: '',
    underWhichAdmin: '',
    comment: ''
  });
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    fetchAuthAndData();
  }, [id]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterProfession, filterPaidStatus, contacts]);

  const fetchAuthAndData = async () => {
    setLoading(true);
    try {
      // Get current user
      const authRes = await fetch('/api/auth/me');
      let user = null;
      if (authRes.ok) {
        const authData = await authRes.json();
        user = authData.user;
        setCurrentUser(user);
      }

      // Get form details
      const formRes = await fetch(`/api/outreach/custom-forms/${id}`);
      if (formRes.ok) {
        const formData = await formRes.json();
        const f = formData.form;
        setForm(f);

        // Check admin ownership
        if (user && user.role === 'admin') {
          const isOwnerById = f.adminId && f.adminId === user._id;
          const isOwnerByName = f.adminName && f.adminName.trim().toLowerCase() === user.name?.trim().toLowerCase();
          if (!isOwnerById && !isOwnerByName) {
            await showAlert({
              title: 'Access Denied',
              message: `This targeted outreach card belongs to admin "${f.adminName}". You can only manage your own custom form cards.`,
              type: 'danger'
            });
            router.push('/outreach/targeted');
            return;
          }
        }
      } else {
        await showAlert({ title: 'Error', message: 'Custom form not found.', type: 'danger' });
        router.push('/outreach/targeted');
        return;
      }

      // Get contacts for this custom form
      const contactsRes = await fetch(`/api/outreach/custom-forms/${id}/contacts`);
      if (contactsRes.ok) {
        const cData = await contactsRes.json();
        setContacts(cData.contacts || []);
        setFilteredContacts(cData.contacts || []);
      }
    } catch (err) {
      console.error('Error fetching targeted card data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...contacts];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.profession && c.profession.toLowerCase().includes(term))
      );
    }

    if (filterProfession) {
      result = result.filter(c => c.profession && c.profession.toLowerCase().includes(filterProfession.toLowerCase()));
    }

    if (filterPaidStatus) {
      result = result.filter(c => c.paidStatus === filterPaidStatus);
    }

    setFilteredContacts(result);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProfession('');
    setFilterPaidStatus('');
  };

  const handleDownloadCSV = async () => {
    const dataToDownload = selectedContacts.length > 0
      ? filteredContacts.filter(c => selectedContacts.includes(c._id))
      : filteredContacts;

    if (dataToDownload.length === 0) {
      await showAlert({
        title: 'No Data',
        message: selectedContacts.length > 0
          ? 'No selected contacts match the current filter.'
          : 'No contacts available to download.',
        type: 'info'
      });
      return;
    }

    // Include custom fields in CSV columns dynamically
    const customFieldKeys = new Set<string>();
    dataToDownload.forEach(c => {
      if (c.customFields) {
        Object.keys(c.customFields).forEach(k => customFieldKeys.add(k));
      }
    });
    const customKeysList = Array.from(customFieldKeys);

    const headers = [
      'Name',
      'Phone',
      'Profession',
      'Mother Tongue',
      'Current Location',
      'Registered By',
      'Number of Rounds',
      'Branch',
      'Paid Status',
      'Under Which Admin',
      ...customKeysList,
      'Comment',
      'Created At'
    ];

    const rows = dataToDownload.map(c => {
      const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '';
      const customCols = customKeysList.map(key => `"${((c.customFields && c.customFields[key]) || '').toString().replace(/"/g, '""')}"`);
      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.profession || '').replace(/"/g, '""')}"`,
        `"${(c.motherTongue || '').replace(/"/g, '""')}"`,
        `"${(c.currentLocation || '').replace(/"/g, '""')}"`,
        `"${(c.registeredBy || '').replace(/"/g, '""')}"`,
        `"${c.numberOfRounds !== undefined ? c.numberOfRounds : ''}"`,
        `"${(c.branch || '').replace(/"/g, '""')}"`,
        `"${(c.paidStatus || '').replace(/"/g, '""')}"`,
        `"${(c.underWhichAdmin || '').replace(/"/g, '""')}"`,
        ...customCols,
        `"${(c.comment || '').replace(/"/g, '""')}"`,
        `"${created}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `targeted_${form?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'contacts'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkDeleteContacts = async () => {
    if (selectedContacts.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Delete Contacts',
      message: `Are you sure you want to delete ${selectedContacts.length} selected contact(s)? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete All'
    });
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedContacts.map(id => fetch(`/api/outreach/${id}`, { method: 'DELETE' }))
      );
      await fetchAuthAndData();
      setSelectedContacts([]);
      setExpandedContacts([]);
      await showAlert({
        title: 'Success',
        message: `${selectedContacts.length} contact(s) deleted successfully!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      await showAlert({
        title: 'Error',
        message: 'Error executing bulk delete.',
        type: 'danger'
      });
    }
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Contact',
      message: `Are you sure you want to delete ${contactName}? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/outreach/${contactId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchAuthAndData();
        setExpandedContacts(expandedContacts.filter(id => id !== contactId));
        await showAlert({
          title: 'Success',
          message: 'Contact deleted successfully!',
          type: 'success'
        });
      } else {
        await showAlert({
          title: 'Delete Failed',
          message: 'Failed to delete contact.',
          type: 'danger'
        });
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      await showAlert({
        title: 'Error',
        message: 'Error deleting contact.',
        type: 'danger'
      });
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkUpdating(true);
    try {
      const updates: any = {};
      const allowedFields = [
        'name', 'phone', 'profession', 'motherTongue', 'currentLocation',
        'registeredBy', 'numberOfRounds', 'branch', 'paidStatus', 'underWhichAdmin', 'comment'
      ];
      for (const key of allowedFields) {
        if (bulkEditFields[key]) {
          updates[key] = bulkEditValues[key];
        }
      }
      if (Object.keys(updates).length === 0) {
        await showAlert({ title: 'No Fields Selected', message: 'Check at least one field to update.', type: 'warning' });
        setBulkUpdating(false);
        return;
      }
      const res = await fetch('/api/outreach/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContacts,
          updates
        })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAuthAndData();
        setShowBulkEditModal(false);
        setSelectedContacts([]);
        setBulkEditFields({});
        await showAlert({ title: 'Success', message: data.message || 'Contacts updated successfully!', type: 'success' });
      } else {
        await showAlert({ title: 'Update Failed', message: data.error || 'Failed to update contacts.', type: 'danger' });
      }
    } catch (err) {
      console.error('Bulk edit error:', err);
      await showAlert({ title: 'Error', message: 'Error performing bulk update.', type: 'danger' });
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundSize: '25%',
      backgroundRepeat: 'repeat'
    }}>
      <Header />

      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Top Header Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-l-4 border-[#A65353]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 bg-yellow-100 text-[#A65353] border border-yellow-300 rounded text-xs font-bold mb-1">
                Targeted Outreach Card • {form?.templeName}
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-800 leading-tight">
                {form?.title || 'Customized Outreach Form'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Responsible Admin: <strong className="text-gray-800">{form?.adminName}</strong> • Registered Participants: <strong className="text-[#A65353]">{contacts.length}</strong>
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <button
                onClick={handleDownloadCSV}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm sm:text-base bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download size={18} />
                <span>Download Data</span>
              </button>
              <button
                onClick={() => router.push(`/outreach/targeted/${id}/followups`)}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm sm:text-base bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] font-bold whitespace-nowrap transition-colors cursor-pointer shadow-sm"
              >
                Followups
              </button>
              <button
                onClick={() => router.push('/outreach/targeted')}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm sm:text-base bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-bold whitespace-nowrap flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters bar */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:w-1/2 lg:w-2/3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, phone or profession..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full sm:w-auto px-5 py-2.5 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-bold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Profession</label>
                  <input
                    type="text"
                    value={filterProfession}
                    onChange={(e) => setFilterProfession(e.target.value)}
                    placeholder="Filter by profession..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Payment Status</label>
                  <select
                    value={filterPaidStatus}
                    onChange={(e) => setFilterPaidStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Sponsored">Sponsored</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-bold transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contacts List Card */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">
              {filteredContacts.length} Contact{filteredContacts.length !== 1 ? 's' : ''} Registered
            </h2>

            {filteredContacts.length > 0 && (() => {
              const allSelected = filteredContacts.every(c => selectedContacts.includes(c._id));
              return (
                <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                  {selectedContacts.length > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm whitespace-nowrap bg-[#A65353] text-white px-2.5 py-1.5 rounded-lg shadow-sm">
                        {selectedContacts.length} Selected
                      </span>
                      <button
                        onClick={() => setShowBulkEditModal(true)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                      >
                        Bulk Edit Fields
                      </button>
                      <button
                        onClick={handleBulkDeleteContacts}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete ({selectedContacts.length})
                      </button>
                      <button
                        onClick={() => setSelectedContacts([])}
                        className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors cursor-pointer"
                        title="Clear Selection"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 cursor-pointer hover:text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm transition-colors">
                    <input
                      type="checkbox"
                      checked={allSelected && filteredContacts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSet = new Set([...selectedContacts, ...filteredContacts.map(c => c._id)]);
                          setSelectedContacts(Array.from(newSet));
                        } else {
                          const visibleIds = new Set(filteredContacts.map(c => c._id));
                          setSelectedContacts(selectedContacts.filter(cid => !visibleIds.has(cid)));
                        }
                      }}
                      className="w-4 h-4 text-[#A65353] rounded border-gray-300 focus:ring-[#A65353] cursor-pointer accent-[#A65353]"
                    />
                    <span>Select All Visible ({filteredContacts.length})</span>
                  </label>
                </div>
              );
            })()}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#A65353] mx-auto"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium">
              No contacts registered via this customized form match your criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => {
                const isExpanded = expandedContacts.includes(contact._id);
                const createdStr = contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A';

                return (
                  <div
                    key={contact._id}
                    className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden transition-all"
                  >
                    {/* Row Main Bar */}
                    <div
                      onClick={() => setExpandedContacts(
                        isExpanded ? expandedContacts.filter(cid => cid !== contact._id) : [...expandedContacts, contact._id]
                      )}
                      className="px-4 lg:px-6 py-3.5 hover:bg-yellow-100 transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      {/* Checkbox */}
                      <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, contact._id]);
                            } else {
                              setSelectedContacts(selectedContacts.filter(cid => cid !== contact._id));
                            }
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-[#A65353] rounded border-gray-300 focus:ring-[#A65353] cursor-pointer accent-[#A65353]"
                        />
                      </div>

                      {/* Name & Basic info */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 sm:w-1/3">
                          <h3 className="text-base font-extrabold text-gray-800 truncate">
                            {contact.name}
                          </h3>
                          <span className="text-xs text-gray-500 block sm:hidden">
                            {contact.profession} • {contact.phone}
                          </span>
                        </div>

                        {/* Icons */}
                        <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {contact.phone && (
                            <>
                              <a
                                href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 cursor-pointer"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                              </a>
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-red-600 hover:text-red-700 cursor-pointer"
                              >
                                <Phone size={18} />
                              </a>
                            </>
                          )}
                        </div>

                        {/* Phone text */}
                        <div className="hidden sm:block text-gray-700 font-bold text-sm w-32 flex-shrink-0">
                          {contact.phone}
                        </div>

                        {/* Profession text */}
                        <div className="hidden sm:block text-gray-700 font-medium text-sm w-36 flex-shrink-0 truncate">
                          {contact.profession}
                        </div>

                        {/* Paid Status */}
                        <div className="flex-shrink-0">
                          <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                            contact.paidStatus === 'Paid'
                              ? 'bg-green-100 text-green-800'
                              : contact.paidStatus === 'Unpaid'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {contact.paidStatus}
                          </span>
                        </div>
                      </div>

                      {/* Expand Chevron */}
                      <button
                        className="p-1.5 cursor-pointer hover:bg-yellow-200 rounded-full transition-colors flex-shrink-0"
                      >
                        <ChevronDown
                          size={18}
                          className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-4">
                        <h4 className="text-base font-bold text-gray-800 mb-3 border-b border-yellow-200 pb-2">
                          Participant Details & Answers:
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 text-sm">
                          <div>
                            <span className="font-semibold text-gray-600">Profession:</span>
                            <span className="ml-2 font-bold text-gray-800">{contact.profession}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Mother Tongue:</span>
                            <span className="ml-2 font-bold text-gray-800">{contact.motherTongue || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Current Location:</span>
                            <span className="ml-2 font-bold text-gray-800">{contact.currentLocation || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Registered By:</span>
                            <span className="ml-2 font-bold text-gray-800">{contact.registeredBy}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Number of Rounds:</span>
                            <span className="ml-2 font-bold text-gray-800">{contact.numberOfRounds || 0}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Under Which Admin:</span>
                            <span className="ml-2 font-bold text-gray-800">{contact.underWhichAdmin || 'Admin'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Registration Date:</span>
                            <span className="ml-2 font-bold text-gray-800">{createdStr}</span>
                          </div>
                          {contact.customFields && Object.entries(contact.customFields).map(([label, val]) => (
                            <div key={label}>
                              <span className="font-semibold text-gray-600">{label}:</span>
                              <span className="ml-2 font-bold text-gray-800">{String(val || 'N/A')}</span>
                            </div>
                          ))}
                        </div>

                        {contact.comment && (
                          <div className="bg-white p-3 rounded-lg border border-yellow-300 text-sm">
                            <span className="font-semibold text-gray-600">Comment:</span>
                            <p className="mt-1 text-gray-800 font-medium">{contact.comment}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/outreach/${contact._id}`);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base cursor-pointer shadow-sm"
                          >
                            Overview
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/outreach/${contact._id}?edit=true`);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base cursor-pointer shadow-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContact(contact._id, contact.name);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base cursor-pointer shadow-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bulk Edit Fields Modal */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Bulk Edit Fields</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Updating {selectedContacts.length} selected contact(s). Check the box beside any field you want to update.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBulkEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleBulkEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {/* Name */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.name}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, name: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Name *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.name}
                        value={bulkEditValues.name || ''}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter name"
                      />
                    </div>

                    {/* Phone */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.phone}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, phone: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Phone *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.phone}
                        value={bulkEditValues.phone || ''}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, phone: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter phone number"
                      />
                    </div>

                    {/* Profession */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.profession}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, profession: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Profession *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.profession}
                        value={bulkEditValues.profession || ''}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, profession: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter profession"
                      />
                    </div>

                    {/* Paid Status */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.paidStatus}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, paidStatus: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Payment Status *</span>
                      </label>
                      <select
                        disabled={!bulkEditFields.paidStatus}
                        value={bulkEditValues.paidStatus || ''}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, paidStatus: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Select status</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Sponsored">Sponsored</option>
                      </select>
                    </div>

                    {/* Number of Rounds */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.numberOfRounds}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, numberOfRounds: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Number of Rounds</span>
                      </label>
                      <input
                        type="number"
                        disabled={!bulkEditFields.numberOfRounds}
                        value={bulkEditValues.numberOfRounds || ''}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, numberOfRounds: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter number of rounds"
                      />
                    </div>

                    {/* Comment */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.comment}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, comment: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Comment</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.comment}
                        value={bulkEditValues.comment || ''}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, comment: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter comment"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowBulkEditModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bulkUpdating}
                      className="px-6 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-sm font-semibold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {bulkUpdating ? 'Updating...' : 'Update Fields'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
