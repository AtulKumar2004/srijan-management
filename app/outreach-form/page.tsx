'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';

export default function OutreachFormPage() {
  const router = useRouter();
  const [showQRModal, setShowQRModal] = useState(false);
  const [admins, setAdmins] = useState<{ _id: string; name: string }[]>([]);
  const [qrImage, setQrImage] = useState<string>('');
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
    // Load QR code from localStorage
    const savedQR = localStorage.getItem('outreachQRCode');
    if (savedQR) {
      setQrImage(savedQR);
    }
  }, []);

  const handleQRImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setQrImage(imageData);
        // Save to localStorage for persistence
        localStorage.setItem('outreachQRCode', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearQR = () => {
    setQrImage('');
    localStorage.removeItem('outreachQRCode');
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
        console.error('Failed to fetch admins:', response.status);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
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
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/outreach/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>Back to Login</span>
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
              <Image src="/Krishna.png" alt="Krishna" width={64} height={64} className="object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Outreach Registration of Participants for
              </h1>
              <p className="text-sm text-gray-600">
                Festival of enlightenment happening at ISKCON Patia.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <label className="cursor-pointer px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-gray-700">Upload QR Code</span>
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
                  className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
                >
                  View QR
                </button>
                <button
                  type="button"
                  onClick={handleClearQR}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium cursor-pointer"
                >
                  Clear QR
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#FFF8E7] rounded-lg shadow-md p-6 border border-orange-200">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
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
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                placeholder="Enter phone number"
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

            {/* Branch */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Temple Name<span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
                placeholder="Enter temple name"
              />
            </div>

            {/* Paid Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Paid Status<span className="text-red-600">*</span>
              </label>
              <select
                required
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

            {/* Under Which Admin */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Under Which Admin<span className="text-red-600">*</span>
              </label>
              <select
                required
                value={formData.underWhichAdmin}
                onChange={(e) => setFormData({ ...formData, underWhichAdmin: e.target.value })}
                className="w-full px-4 py-2.5 rounded border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none bg-white"
              >
                <option value="">Select Admin</option>
                {admins.length === 0 && <option value="" disabled>Loading admins...</option>}
                {admins.map((admin) => (
                  <option key={admin._id} value={admin.name}>{admin.name}</option>
                ))}
              </select>
              {admins.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {admins.length === 0 ? 'No admins found. Please contact system administrator.' : ''}
                </p>
              )}
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
