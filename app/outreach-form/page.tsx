'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';

interface TempleOption {
  temple: string;
  creatorName: string;
  label: string;
}

export default function OutreachFormPage() {
  const router = useRouter();
  const [showQRModal, setShowQRModal] = useState(false);
  const [admins, setAdmins] = useState<{ _id: string; name: string }[]>([]);
  const [templeList, setTempleList] = useState<TempleOption[]>([]);
  const [qrImage, setQrImage] = useState<string>('');
  const [qrStorageWarning, setQrStorageWarning] = useState('');
  const [selectedTempleOption, setSelectedTempleOption] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    profession: '',
    motherTongue: '',
    currentLocation: '',
    registeredBy: '',
    numberOfRounds: '0',
    branch: '',
    paidStatus: '',
    underWhichAdmin: '',
    comment: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdmins();
    fetchTemples();
    // Load QR code from localStorage
    try {
      const savedQR = localStorage.getItem('outreachQRCode');
      if (savedQR) {
        setQrImage(savedQR);
      }
    } catch (error) {
      console.error('Failed to load saved QR code:', error);
    }
  }, []);

  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new window.Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSide = 900;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));

          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);

          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Unable to process image'));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          // JPEG with quality keeps data size far smaller than raw/base64 PNG uploads.
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          resolve(compressed);
        };

        image.onerror = () => reject(new Error('Invalid image file'));
        image.src = reader.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const handleQRImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrStorageWarning('');

      compressImageToDataUrl(file)
        .then((imageData) => {
          setQrImage(imageData);

          // Save to localStorage for persistence, but don't break if quota is exceeded.
          try {
            localStorage.setItem('outreachQRCode', imageData);
          } catch (error) {
            console.error('Failed to persist QR image in localStorage:', error);
            setQrStorageWarning('QR uploaded for now, but could not be saved permanently. Please use a smaller image.');
          }
        })
        .catch((error) => {
          console.error('QR upload failed:', error);
          setQrStorageWarning('Failed to upload QR image. Please try another file.');
        });

      // Allow re-selecting the same file in a later upload attempt.
      e.target.value = '';
    }
  };

  const handleClearQR = () => {
    setQrImage('');
    setQrStorageWarning('');
    try {
      localStorage.removeItem('outreachQRCode');
    } catch (error) {
      console.error('Failed to clear saved QR code:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      console.log('Fetching admins...');
      const response = await fetch('/api/users/by-role?role=admin');
      console.log('Admin fetch response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Admins fetched:', data.users);
        setAdmins(data.users || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch admins:', response.status, errorData);
        // Don't block the form - just log the error and continue with empty admins
        setAdmins([]);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      // Don't block the form - just continue with empty admins
      setAdmins([]);
    }
  };

  const fetchTemples = async () => {
    try {
      const response = await fetch('/api/programs/all');
      if (response.ok) {
        const data = await response.json();
        const programs = data.programs || [];
        const uniqueTemplesMap = new Map<string, TempleOption>();
        
        programs.forEach((prog: any) => {
          if (prog.temple && typeof prog.temple === 'string' && prog.temple.trim()) {
            const templeName = prog.temple.trim();
            const creator = prog.createdBy?.name || 'Admin';
            const lowerKey = templeName.toLowerCase();
            if (!uniqueTemplesMap.has(lowerKey)) {
              uniqueTemplesMap.set(lowerKey, {
                temple: templeName,
                creatorName: creator,
                label: `${templeName} (${creator})`
              });
            }
          }
        });
        setTempleList(Array.from(uniqueTemplesMap.values()));
      }
    } catch (error) {
      console.error('Error fetching temples:', error);
    }
  };

  const professions = [
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

  const motherTongues = [
    'Hindi',
    'English',
    'Bengali',
    'Tamil',
    'Telugu',
    'Marathi',
    'Gujarati',
    'Kannada',
    'Malayalam',
    'Punjabi',
    'Odia',
    'Assamese',
    'Other'
  ];

  const paidStatuses = [
    'Paid',
    'Unpaid',
    'Partially Paid',
    'Sponsored'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedPhone = formData.phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/outreach/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...formData, 
          phone: normalizedPhone,
          underWhichAdmin: formData.underWhichAdmin || admins[0]?.name || 'Admin'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register outreach contact');
      }
      
      setSuccess('Outreach contact registered successfully! 🎉');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          phone: '',
          profession: '',
          motherTongue: '',
          currentLocation: '',
          registeredBy: '',
          numberOfRounds: '0',
          branch: '',
          paidStatus: '',
          underWhichAdmin: '',
          comment: ''
        });
        setSelectedTempleOption('');
        setSuccess('');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to register outreach contact');
    } finally {
      setLoading(false);
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
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
              <Image src="/Krishna.png" alt="Krishna" width={64} height={64} className="object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Outreach Registration of Participants for
              </h1>
              <p className="text-sm text-gray-600">
                Srijan Youth Festival.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
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
                    className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer px-2 py-1"
                  >
                    View QR
                  </button>
                  <button
                    type="button"
                    onClick={handleClearQR}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium cursor-pointer px-2 py-1"
                  >
                    Clear QR
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => router.push('/outreach-form/builder')}
              className="px-4 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-sm sm:text-base font-semibold shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              Create Personalized Form
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#FFF8E7] rounded-lg shadow-md p-6 border border-orange-200">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {qrStorageWarning && (
            <div className="mb-4 p-3 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-sm">
              {qrStorageWarning}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name<span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                placeholder="Enter full name"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone Number<span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                placeholder="Enter 10-digit phone number"
              />
            </div>

            {/* Profession */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Profession<span className="text-red-600">*</span>
              </label>
              <select
                required
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
              >
                <option value="">Select Profession</option>
                {professions.map((prof) => (
                  <option key={prof} value={prof}>{prof}</option>
                ))}
              </select>
            </div>

            {/* Mother Tongue */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Mother Tongue
              </label>
              <select
                value={formData.motherTongue}
                onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
              >
                <option value="">Select Mother Tongue</option>
                {motherTongues.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Current Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Current Location
              </label>
              <input
                type="text"
                value={formData.currentLocation}
                onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                placeholder="Current Location"
              />
            </div>

            {/* Registered By */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Registered By<span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.registeredBy}
                onChange={(e) => setFormData({ ...formData, registeredBy: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                placeholder="Registered By"
              />
            </div>

            {/* No. of Rounds */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                No. of Rounds
              </label>
              <input
                type="number"
                min="0"
                value={formData.numberOfRounds}
                onChange={(e) => setFormData({ ...formData, numberOfRounds: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                placeholder="0"
              />
            </div>

            {/* Temple Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Temple Name<span className="text-red-600">*</span>
              </label>
              <select
                required
                value={selectedTempleOption}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedTempleOption(value);
                  if (value && value !== 'Other') {
                    const found = templeList.find(t => t.temple === value);
                    setFormData({ 
                      ...formData, 
                      branch: value,
                      underWhichAdmin: found ? found.creatorName : (admins[0]?.name || 'Admin')
                    });
                  } else {
                    setFormData({ 
                      ...formData, 
                      branch: '',
                      underWhichAdmin: admins[0]?.name || 'Admin'
                    });
                  }
                }}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
              >
                <option value="">Select Temple Name</option>
                {templeList.map((t) => (
                  <option key={t.temple} value={t.temple}>{t.label}</option>
                ))}
                <option value="Other">Other</option>
              </select>

              {selectedTempleOption === 'Other' && (
                <input
                  type="text"
                  required
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="mt-3 w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                  placeholder="Enter temple name"
                />
              )}
            </div>

            {/* Paid Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Paid Status
              </label>
              <select
                value={formData.paidStatus}
                onChange={(e) => setFormData({ ...formData, paidStatus: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
              >
                <option value="">Select Paid Status</option>
                {paidStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Comment
              </label>
              <textarea
                rows={3}
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white resize-none"
                placeholder="Add any comments..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-lg bg-[#A65353] text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Registering...
                  </span>
                ) : (
                  'Register'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={24} className="text-gray-600" />
            </button>

            {/* Modal Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                Temple QR Code
              </h2>
              <p className="text-sm text-gray-600 mb-4 text-center">
                Scan for quick access
              </p>
              
              <div className="flex justify-center mb-4">
                {qrImage ? (
                  <img
                    src={qrImage}
                    alt="Uploaded QR Code"
                    className="max-w-full h-auto rounded-lg shadow-md max-h-96"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No QR Code Uploaded</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowQRModal(false)}
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
