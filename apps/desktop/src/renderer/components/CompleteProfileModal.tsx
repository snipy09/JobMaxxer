import React, { useState, useEffect } from 'react';
import {
  X, User, Phone, Mail, Briefcase, FileText,
  Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight,
  Shield, Check, Paperclip
} from 'lucide-react';
import { MasterProfile, ResumeRecord, getApi } from '../types';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfile;
  onSaveProfile: (updated: MasterProfile) => Promise<void>;
  onProfileCompleted: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onProfileCompleted,
}) => {
  const [firstName, setFirstName] = useState<string>(profile.firstName || '');
  const [lastName, setLastName] = useState<string>(profile.lastName || '');
  const [phone, setPhone] = useState<string>(profile.phone || '');
  const [email, setEmail] = useState<string>(profile.email || '');
  const [desiredTitle, setDesiredTitle] = useState<string>(profile.desiredTitle || 'Full Stack Engineer');
  const [techStack, setTechStack] = useState<string>(profile.techStack || 'TypeScript, React, Node.js, PostgreSQL');

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [isPickingResume, setIsPickingResume] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadExistingResumes = async () => {
    const api = getApi();
    if (!api || !api.getResumes) return;
    try {
      const list = await api.getResumes();
      setResumes(list || []);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setDesiredTitle(profile.desiredTitle || 'Full Stack Engineer');
      setTechStack(profile.techStack || 'TypeScript, React, Node.js, PostgreSQL');
      setErrorMessage(null);
      loadExistingResumes();
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handlePickResume = async () => {
    const api = getApi();
    if (!api || !api.pickResumeFile) return;
    setIsPickingResume(true);
    setErrorMessage(null);

    try {
      const res = await api.pickResumeFile();
      if (!res.canceled && res.filePath) {
        const resumeName = res.fileName || res.filePath.split(/[/\\]/).pop() || 'Resume.pdf';
        if (api.saveResume) {
          await api.saveResume({
            name: resumeName,
            targetRole: desiredTitle || 'General',
            filePath: res.filePath,
            isDefault: true,
          });
        }
        await loadExistingResumes();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error selecting resume file.');
    } finally {
      setIsPickingResume(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!firstName.trim()) {
      setErrorMessage('First Name is required for ATS applications.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Contact phone number is required for recruiter applications.');
      return;
    }
    if (resumes.length === 0 && !profile.resumeFilePath) {
      setErrorMessage('Please upload a resume (.pdf or .docx) to attach to job applications.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated: MasterProfile = {
        ...profile,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || profile.email || 'user@nomadic.app',
        desiredTitle: desiredTitle.trim() || 'Software Engineer',
        techStack: techStack.trim() || 'TypeScript, React, Node.js',
        onboardingCompleted: true,
      };

      await onSaveProfile(updated);
      onProfileCompleted();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasResume = resumes.length > 0 || Boolean(profile.resumeFilePath);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-200 font-sans">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-900 dark:text-white" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Complete Candidate Profile & Resume
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              ATS portals require candidate contact info and a verified resume file before auto-applying.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="email"
                  value={email || profile.email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Target Role Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={desiredTitle}
                onChange={(e) => setDesiredTitle(e.target.value)}
                placeholder="e.g. Full Stack Engineer"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Core Tech Stack (Comma-separated)
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="TypeScript, React, Node.js, PostgreSQL, Docker"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono"
            />
          </div>

          {/* Resume Upload Box */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Attached Resume <span className="text-red-500">*</span>
            </label>

            {hasResume ? (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-black dark:text-white shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {resumes[0]?.name || profile.resumeFilePath?.split(/[/\\]/).pop() || 'Primary_Resume.pdf'}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      ✓ Ready for ATS attachment
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePickResume}
                  className="text-xs text-slate-600 dark:text-zinc-400 hover:text-black dark:hover:text-white underline font-medium"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div
                onClick={handlePickResume}
                className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500 bg-slate-50/50 dark:bg-zinc-800/30 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {isPickingResume ? 'Selecting file...' : 'Upload Resume (.pdf, .docx)'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Select your primary resume to auto-attach during applications
                </span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAndContinue}
            className="px-5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>Save & Continue to Application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
