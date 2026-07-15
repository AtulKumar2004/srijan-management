'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Copy, Check, Share2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useModalStore } from '@/store/modalStore';

interface TempleOption {
  temple: string;
  creatorName: string;
  label: string;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required: boolean;
  options: string[];
  isDefault?: boolean;
}

export default function CustomOutreachFormBuilder() {
  const router = useRouter();
  const { showAlert } = useModalStore();

  // Step state: 1 = Basic Info (Title & Temple), 2 = Fields, 3 = Success/Link
  const [step, setStep] = useState(1);

  // Step 1 data
  const [title, setTitle] = useState('');
  const [selectedTempleOption, setSelectedTempleOption] = useState('');
  const [templeName, setTempleName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [templeList, setTempleList] = useState<TempleOption[]>([]);
  const [admins, setAdmins] = useState<{ _id: string; name: string }[]>([]);

  // Step 2 fields
  const [fields, setFields] = useState<CustomField[]>([
    { id: 'default_name', label: 'Name', type: 'text', required: true, options: [], isDefault: true },
    { id: 'default_phone', label: 'Phone Number', type: 'text', required: true, options: [], isDefault: true },
    { id: 'default_profession', label: 'Profession', type: 'select', required: true, options: ['Student', 'Engineer', 'Doctor', 'Teacher', 'Business', 'Government Employee', 'Private Employee', 'Homemaker', 'Retired', 'Other'], isDefault: true }
  ]);

  // New field state
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);

  // Step 3 result
  const [createdFormId, setCreatedFormId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemples();
    fetchAdmins();
  }, []);

  const fetchTemples = async () => {
    try {
      const response = await fetch('/api/programs/all');
      if (response.ok) {
        const data = await response.json();
        const programs = data.programs || [];
        const uniqueTemplesMap = new Map<string, TempleOption>();

        programs.forEach((prog: any) => {
          if (prog.temple && typeof prog.temple === 'string' && prog.temple.trim()) {
            const tName = prog.temple.trim();
            const creator = prog.createdBy?.name || 'Admin';
            const lowerKey = tName.toLowerCase();
            if (!uniqueTemplesMap.has(lowerKey)) {
              uniqueTemplesMap.set(lowerKey, {
                temple: tName,
                creatorName: creator,
                label: `${tName} (${creator})`
              });
            }
          }
        });
        setTempleList(Array.from(uniqueTemplesMap.values()));
      }
    } catch (err) {
      console.error('Error fetching temples:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/users?role=admin,program_manager');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.users || []);
        if (data.users && data.users.length > 0 && !adminName) {
          setAdminName(data.users[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const handleTempleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedTempleOption(value);
    if (value && value !== 'Other') {
      const found = templeList.find(t => t.temple === value);
      setTempleName(value);
      if (found) {
        setAdminName(found.creatorName);
      }
    } else {
      setTempleName('');
      if (admins.length > 0 && !adminName) {
        setAdminName(admins[0].name);
      }
    }
  };

  const handleNextToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title || !title.trim()) {
      setError('Form Title is compulsory');
      return;
    }
    if (!templeName || !templeName.trim()) {
      setError('Temple Name is compulsory');
      return;
    }
    setStep(2);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;

    const optionsList = newFieldType === 'select'
      ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options: optionsList,
      isDefault: false
    };

    setFields([...fields, newField]);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldOptions('');
    setShowAddFieldForm(false);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSaveForm = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/outreach/custom-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          templeName: templeName.trim(),
          adminName: adminName || 'Admin',
          fields
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customized form');
      }

      setCreatedFormId(data.form._id);
      setStep(3);
      await showAlert({
        title: 'Success!',
        message: 'Your customized outreach form has been created successfully.',
        type: 'success'
      });
    } catch (err: any) {
      setError(err.message || 'Error creating form');
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const publicFormLink = `${baseUrl}/outreach-form/custom/${createdFormId}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publicFormLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showAlert({
        title: 'Link Copied!',
        message: 'Public shareable link has been copied to your clipboard.',
        type: 'success'
      });
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(to bottom, #FFF8E7, #FFEFD5)',
      backgroundImage: 'url(/backgrou.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '25%'
    }}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => step > 1 && step < 3 ? setStep(step - 1) : router.push('/outreach-form')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>{step > 1 && step < 3 ? 'Back to Step 1' : 'Back to Outreach Form'}</span>
          </button>
          <span className="text-sm font-semibold text-[#A65353] bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full">
            Step {step} of 3
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#FFF8E7] rounded-xl shadow-xl p-6 border-2 border-orange-200">
          <div className="border-b border-orange-200 pb-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#A65353]">
              Create Personalized Outreach Form
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 && 'Configure form title and compulsory temple name to get started.'}
              {step === 2 && 'Review default fields and add custom fields as needed.'}
              {step === 3 && 'Your customized form is ready to be shared publicly!'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <form onSubmit={handleNextToStep2} className="space-y-6">
              {/* Form Title */}
              <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Form Title <span className="text-red-600">* (Compulsory)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  This title will be displayed prominently at the top of the public registration page.
                </p>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded border border-gray-300 focus:border-[#A65353] focus:ring-2 focus:ring-red-100 outline-none font-medium text-gray-800"
                  placeholder="Rath Yatra"
                />
              </div>

              {/* Attach Temple Name & Responsible Admin (Merged) */}
              <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Attach Temple Name & Responsible Admin <span className="text-red-600">* (Compulsory)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  All participants who register via this form will be associated with the selected temple branch and managed by its responsible admin shown in brackets.
                </p>
                <select
                  required
                  value={selectedTempleOption}
                  onChange={handleTempleChange}
                  className="w-full px-4 py-2.5 rounded border border-gray-300 focus:border-[#A65353] focus:ring-2 focus:ring-red-100 outline-none bg-white font-medium text-gray-800"
                >
                  <option value="">Select Temple Name</option>
                  {templeList.map((t) => (
                    <option key={t.temple} value={t.temple}>{t.label}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {selectedTempleOption === 'Other' && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Custom Temple Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={templeName}
                        onChange={(e) => setTempleName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded border border-gray-300 focus:border-[#A65353] focus:ring-2 focus:ring-red-100 outline-none bg-white font-medium text-gray-800 text-sm"
                        placeholder="Enter custom temple name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Responsible Admin / Card Owner <span className="text-red-600">*</span>
                      </label>
                      <p className="text-[11px] text-gray-500 mb-1">
                        Select which admin will have exclusive access to manage this custom form card.
                      </p>
                      {admins.length > 0 ? (
                        <select
                          required
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded border border-gray-300 focus:border-[#A65353] focus:ring-2 focus:ring-red-100 outline-none bg-white font-medium text-gray-800 text-sm"
                        >
                          {admins.map((admin) => (
                            <option key={admin._id} value={admin.name}>{admin.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded border border-gray-300 focus:border-[#A65353] focus:ring-2 focus:ring-red-100 outline-none bg-white font-medium text-gray-800 text-sm"
                          placeholder="Enter Admin Name"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Next: Configure Fields</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Configure Fields */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <h3 className="text-base font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  Default Fields (Included Automatically)
                </h3>
                <div className="space-y-2">
                  {fields.filter(f => f.isDefault).map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div>
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">{f.label}</span>
                        <span className="ml-2 text-xs text-red-600 font-bold">* Compulsory</span>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded capitalize font-medium">
                        {f.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                  <h3 className="text-base font-bold text-gray-800">
                    Additional Custom Fields ({fields.filter(f => !f.isDefault).length})
                  </h3>
                  {!showAddFieldForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddFieldForm(true)}
                      className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-md text-xs sm:text-sm font-semibold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    >
                      <Plus size={16} />
                      Add More Fields
                    </button>
                  )}
                </div>

                {fields.filter(f => !f.isDefault).length === 0 && !showAddFieldForm && (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    No custom fields added yet. Click "+ Add More Fields" to add personalized fields like Age, College, City, etc.
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {fields.filter(f => !f.isDefault).map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-md border border-yellow-200">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">{f.label}</span>
                        {f.required && (
                          <span className="text-xs text-red-600 font-bold">* Compulsory</span>
                        )}
                        {f.type === 'select' && f.options && f.options.length > 0 && (
                          <span className="text-xs text-gray-500">
                            (Options: {f.options.join(', ')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-yellow-200 text-yellow-900 px-2.5 py-1 rounded capitalize font-medium">
                          {f.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(f.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded cursor-pointer transition-colors"
                          title="Remove Field"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Field Form */}
                {showAddFieldForm && (
                  <form onSubmit={handleAddField} className="bg-yellow-100 p-4 rounded-lg border border-yellow-300 space-y-3 mt-4">
                    <h4 className="text-sm font-bold text-gray-800">Add New Custom Field</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Field Label *</label>
                        <input
                          type="text"
                          required
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          placeholder="e.g., College / University Name"
                          className="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded focus:border-[#A65353] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Field Type</label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as any)}
                          className="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded focus:border-[#A65353] outline-none"
                        >
                          <option value="text">Text Input</option>
                          <option value="number">Number Input</option>
                          <option value="select">Dropdown Select</option>
                          <option value="textarea">Multi-line Textarea</option>
                        </select>
                      </div>
                    </div>

                    {newFieldType === 'select' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Dropdown Options (comma-separated) *
                        </label>
                        <input
                          type="text"
                          required
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          placeholder="e.g., Undergraduate, Postgraduate, Ph.D, Other"
                          className="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded focus:border-[#A65353] outline-none"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="newFieldReq"
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                        className="w-4 h-4 text-[#A65353] rounded border-gray-300 focus:ring-[#A65353] cursor-pointer accent-[#A65353]"
                      />
                      <label htmlFor="newFieldReq" className="text-xs font-semibold text-gray-700 cursor-pointer">
                        Make this field compulsory (Required)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddFieldForm(false)}
                        className="px-3 py-1.5 border border-gray-400 bg-white hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded text-xs font-bold cursor-pointer shadow-sm"
                      >
                        Add Field
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={loading}
                  className="px-6 py-3 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Creating Form...' : 'Save & Generate Public Link'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Success & Link */}
          {step === 3 && (
            <div className="bg-white p-6 rounded-xl border border-green-300 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <Check size={36} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Your Custom Form is Ready!</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Anyone can now fill out your customized outreach form using the link below. Registrations will automatically appear inside your admin card in Targeted Outreach.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Shareable Public Link
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicFormLink}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm flex-shrink-0"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Please register using our outreach form "${title}":\n${publicFormLink}`
                    )}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                >
                  <Share2 size={18} />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/outreach/targeted')}
                  className="px-5 py-2.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-sm font-bold shadow transition-all cursor-pointer"
                >
                  View in Targeted Outreach Cards
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
