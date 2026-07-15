'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useModalStore } from '@/store/modalStore';
import { ArrowLeft, Plus, Users, Calendar, Copy, Check, ExternalLink, Trash2, Lock } from 'lucide-react';

interface CustomForm {
  _id: string;
  title: string;
  templeName: string;
  adminName: string;
  adminId?: string;
  contactCount: number;
  createdAt: string;
}

export default function TargetedOutreachPage() {
  const router = useRouter();
  const { showAlert, showConfirm } = useModalStore();

  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthAndForms();
  }, []);

  const fetchAuthAndForms = async () => {
    setLoading(true);
    try {
      // Get current logged in user
      const authRes = await fetch('/api/auth/me');
      let user = null;
      if (authRes.ok) {
        const authData = await authRes.json();
        user = authData.user;
        setCurrentUser(user);
      }

      // Get all custom forms
      const res = await fetch('/api/outreach/custom-forms');
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms || []);
      }
    } catch (err) {
      console.error('Error fetching custom forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (form: CustomForm) => {
    if (!currentUser) {
      await showAlert({
        title: 'Authentication Required',
        message: 'Please log in to access Targeted Outreach cards.',
        type: 'warning'
      });
      router.push('/login');
      return;
    }

    // Enforce admin ownership check: only the card belonging to a particular admin can be accessed
    if (currentUser.role === 'admin') {
      const isOwnerById = form.adminId && form.adminId === currentUser._id;
      const isOwnerByName = form.adminName && form.adminName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();

      if (!isOwnerById && !isOwnerByName) {
        await showAlert({
          title: 'Access Denied',
          message: `This targeted outreach card belongs to admin "${form.adminName}". You can only access customized form cards created for/belonging to you.`,
          type: 'danger'
        });
        return;
      }
    }

    router.push(`/outreach/targeted/${form._id}`);
  };

  const handleCopyLink = (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const link = `${baseUrl}/outreach-form/custom/${formId}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedId(formId);
      setTimeout(() => setCopiedId(null), 3000);
      showAlert({
        title: 'Link Copied!',
        message: 'Public shareable link copied to clipboard.',
        type: 'success'
      });
    }
  };

  const handleDeleteForm = async (e: React.MouseEvent, form: CustomForm) => {
    e.stopPropagation();
    if (currentUser?.role === 'admin') {
      const isOwnerById = form.adminId && form.adminId === currentUser._id;
      const isOwnerByName = form.adminName && form.adminName.trim().toLowerCase() === currentUser.name?.trim().toLowerCase();
      if (!isOwnerById && !isOwnerByName) {
        await showAlert({
          title: 'Access Denied',
          message: `You cannot delete a form belonging to admin "${form.adminName}".`,
          type: 'danger'
        });
        return;
      }
    }

    const confirmed = await showConfirm({
      title: 'Delete Targeted Outreach Form',
      message: `Are you sure you want to delete "${form.title}"? This cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/outreach/custom-forms/${form._id}`, { method: 'DELETE' });
      if (res.ok) {
        setForms(forms.filter(f => f._id !== form._id));
        await showAlert({
          title: 'Deleted',
          message: 'Custom form card deleted successfully.',
          type: 'success'
        });
      } else {
        await showAlert({
          title: 'Error',
          message: 'Failed to delete custom form.',
          type: 'danger'
        });
      }
    } catch (err) {
      console.error('Error deleting form:', err);
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
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#A65353]">Targeted Outreach Cards</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage customized outreach registration forms and their respective registrations & follow-ups
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => router.push('/outreach-form/builder')}
                className="px-4 py-2.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer flex-1 sm:flex-none"
              >
                <Plus size={18} />
                <span>Create Personalized Form</span>
              </button>
              <button
                onClick={() => router.push('/outreach')}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A65353] mx-auto"></div>
            <p className="text-gray-600 mt-3 font-medium">Loading targeted outreach cards...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-orange-200">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#A65353]">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">No Customized Forms Yet</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mt-2 mb-6">
              Create your first personalized outreach form to attach temple branches, configure custom questions, and manage registrations in distinct targeted cards.
            </p>
            <button
              onClick={() => router.push('/outreach-form/builder')}
              className="px-6 py-3 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg font-bold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={18} />
              <span>Create Personalized Form</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => {
              const isOwner = !currentUser || currentUser.role !== 'admin' ||
                (form.adminId && form.adminId === currentUser._id) ||
                (form.adminName && form.adminName.trim().toLowerCase() === currentUser.name?.trim().toLowerCase());

              const createdDate = form.createdAt ? new Date(form.createdAt).toLocaleDateString() : 'N/A';

              return (
                <div
                  key={form._id}
                  onClick={() => handleCardClick(form)}
                  className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-2 overflow-hidden flex flex-col cursor-pointer ${
                    isOwner ? 'border-orange-200 hover:border-[#A65353]' : 'border-gray-200 opacity-80'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="bg-[#FFF8E7] px-5 py-4 border-b border-orange-200 flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2.5 py-1 bg-yellow-200 text-yellow-900 rounded text-xs font-bold mb-2">
                        {form.templeName}
                      </span>
                      <h3 className="text-lg font-extrabold text-[#A65353] line-clamp-2 leading-snug">
                        {form.title}
                      </h3>
                    </div>
                    {!isOwner && (
                      <span className="p-1.5 bg-gray-200 text-gray-600 rounded-full" title="Locked: Belongs to another admin">
                        <Lock size={16} />
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span className="font-semibold text-gray-500">Responsible Admin:</span>
                        <span className="font-bold text-gray-800">{form.adminName || 'Admin'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span className="font-semibold text-gray-500 flex items-center gap-1">
                          <Users size={15} /> Registrations:
                        </span>
                        <span className="font-extrabold text-[#A65353] text-base bg-red-50 px-2 py-0.5 rounded">
                          {form.contactCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="font-semibold text-gray-500 flex items-center gap-1">
                          <Calendar size={15} /> Created:
                        </span>
                        <span>{createdDate}</span>
                      </div>
                    </div>

                    {/* Action buttons inside card */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleCopyLink(e, form._id)}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy Public Link"
                      >
                        {copiedId === form._id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        <span>{copiedId === form._id ? 'Copied' : 'Share Link'}</span>
                      </button>

                      <button
                        onClick={() => handleCardClick(form)}
                        className={`flex-1 px-3 py-2 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm ${
                          isOwner ? 'bg-[#A65353] hover:bg-[#8e4545]' : 'bg-gray-400 hover:bg-gray-500'
                        }`}
                      >
                        <span>Manage</span>
                        <ExternalLink size={14} />
                      </button>

                      {isOwner && (
                        <button
                          onClick={(e) => handleDeleteForm(e, form)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Card"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
