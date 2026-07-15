'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  isDefault?: boolean;
}

interface CustomForm {
  _id: string;
  title: string;
  templeName: string;
  adminName: string;
  fields: CustomField[];
}

export default function PublicCustomOutreachFormPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();

  const [form, setForm] = useState<CustomForm | null>(null);
  const [loadingForm, setLoadingForm] = useState(true);

  // QR Code State
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrImage, setQrImage] = useState<string>('');

  // Default fields state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');

  // Custom fields state: { [label]: value }
  const [customAnswers, setCustomAnswers] = useState<{ [key: string]: any }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const professionsList = [
    'Student',
    'Engineer',
    'Doctor',
    'Teacher',
    'Business',
    'Government Employee',
    'Private Employee',
    'Homemaker',
    'Retired',
    'Other'
  ];

  useEffect(() => {
    fetchFormDetails();
    try {
      const savedQR = localStorage.getItem(`customOutreachQR_${id}`);
      if (savedQR) {
        setQrImage(savedQR);
      }
    } catch (err) {
      console.error('Failed to load saved QR:', err);
    }
  }, [id]);

  const fetchFormDetails = async () => {
    setLoadingForm(true);
    try {
      const res = await fetch(`/api/outreach/custom-forms/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data.form);
      } else {
        setError('Custom form not found or deleted.');
      }
    } catch (err) {
      setError('Error loading custom form.');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleQRImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSide = 800;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/jpeg', 0.75);
            setQrImage(compressed);
            try {
              localStorage.setItem(`customOutreachQR_${id}`, compressed);
            } catch (e) {}
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!name.trim() || !profession) {
      setError('Name and Profession are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/outreach/custom-forms/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizedPhone,
          profession,
          customFields: customAnswers
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSuccess('Registration submitted successfully! 🎉');
      setTimeout(() => {
        setName('');
        setPhone('');
        setProfession('');
        setCustomAnswers({});
        setSuccess('');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error submitting registration');
    } finally {
      setLoading(false);
    }
  };

  if (loadingForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8E7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A65353]"></div>
      </div>
    );
  }

  if (!form && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8E7] p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-red-300 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Form Unavailable</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/outreach-form')}
            className="px-4 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg font-semibold text-sm cursor-pointer"
          >
            Go to Main Outreach Form
          </button>
        </div>
      </div>
    );
  }

  const customFieldsOnly = form?.fields?.filter(f => !f.isDefault) || [];

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(to bottom, #FFF8E7, #FFEFD5)',
      backgroundImage: 'url(/backgrou.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '25%'
    }}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/outreach-form')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>Back to Forms</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image src="/Krishna.png" alt="Krishna" width={64} height={64} className="object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#A65353]">
                {form?.title}
              </h1>
              <p className="text-sm font-semibold text-gray-600">
                Temple Branch: <span className="text-gray-800">{form?.templeName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <label className="cursor-pointer px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              <span className="text-gray-700 font-medium">Upload QR Code</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleQRImageUpload}
                className="hidden"
              />
            </label>
            {qrImage && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQRModal(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-bold cursor-pointer"
                >
                  View QR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrImage('');
                    try { localStorage.removeItem(`customOutreachQR_${id}`); } catch (e) {}
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium cursor-pointer"
                >
                  Clear QR
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#FFF8E7] rounded-xl shadow-xl p-6 border-2 border-orange-200">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg text-center font-bold text-base shadow-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white text-gray-800"
                placeholder="Enter full name"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white text-gray-800"
                placeholder="Enter 10-digit phone number"
              />
            </div>

            {/* Profession */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Profession <span className="text-red-600">*</span>
              </label>
              <select
                required
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white text-gray-800"
              >
                <option value="">Select Profession</option>
                {professionsList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Custom Fields */}
            {customFieldsOnly.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-600">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    required={field.required}
                    value={customAnswers[field.label] || ''}
                    onChange={(e) => setCustomAnswers({ ...customAnswers, [field.label]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white text-gray-800"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    required={field.required}
                    value={customAnswers[field.label] || ''}
                    onChange={(e) => setCustomAnswers({ ...customAnswers, [field.label]: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white text-gray-800"
                    placeholder={`Enter ${field.label}`}
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    required={field.required}
                    value={customAnswers[field.label] || ''}
                    onChange={(e) => setCustomAnswers({ ...customAnswers, [field.label]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white text-gray-800"
                    placeholder={`Enter ${field.label}`}
                  />
                )}
              </div>
            ))}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg font-bold text-base shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting Registration...' : 'Submit Registration'}
              </button>
            </div>
          </form>
        </div>

        {/* QR Modal */}
        {showQRModal && qrImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">QR Code</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4 bg-white p-2 rounded border border-gray-200 inline-block">
                <img src={qrImage} alt="QR Code" className="w-64 h-64 object-contain mx-auto" />
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
