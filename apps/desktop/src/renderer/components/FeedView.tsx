import React, { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, Briefcase, Zap, 
  CheckCircle2, X
} from 'lucide-react';
import { Job, MasterProfile } from '../types';

interface FeedViewProps {
  profile: MasterProfile;
  jobs: Job[];
  savedJobs: Job[];
  onToggleSaveJob: (job: Job) => void;
  onLaunchAutoApply: (urls: string[]) => void;
  onRefresh: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  jobs,
  savedJobs,
  onToggleSaveJob,
  onLaunchAutoApply,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    type: 'all',
    workplace: 'all',
    experience: 'all',
  });

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesQuery = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           job.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filters.type === 'all' || job.employmentType === filters.type;
      const matchesWorkplace = filters.workplace === 'all' || job.workplaceType === filters.workplace;
      const matchesExperience = filters.experience === 'all' || job.experienceLevel === filters.experience;
      
      return matchesQuery && matchesType && matchesWorkplace && matchesExperience;
    });
  }, [jobs, searchQuery, filters]);

  const activeFilterCount = Object.values(filters).filter(f => f !== 'all').length;

  const clearFilters = () => {
    setFilters({ type: 'all', workplace: 'all', experience: 'all' });
    setSearchQuery('');
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar Filters */}
      <aside className="w-64 shrink-0 border-r border-slate-200 pr-6 hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-950">Filters</h2>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-[10px] text-slate-950 dark:text-white font-bold hover:underline">
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">Type</label>
            {['all', 'job', 'internship'].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={filters.type === t} onChange={() => setFilters({...filters, type: t as any})} className="accent-brand-600" />
                <span className="text-xs text-slate-700 capitalize">{t}</span>
              </label>
            ))}
          </div>
          {/* Add more filter sections here... */}
        </div>
      </aside>

      {/* Main Feed */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles or companies..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <button onClick={onRefresh} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50">
            Refresh
          </button>
        </div>

        {/* Empty State Redesign */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <Briefcase className="w-12 h-12 text-slate-200 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">No positions found</h3>
              <p className="text-xs text-slate-500">
                It looks like there are no active listings with your current criteria.
              </p>
            </div>
            
            {activeFilterCount > 0 && (
              <div className="pt-4">
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {Object.entries(filters).filter(([_, val]) => val !== 'all').map(([key, val]) => (
                    <span key={key} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-[10px] font-mono text-slate-600">
                      {val} <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({...filters, [key]: 'all'})}/>
                    </span>
                  ))}
                </div>
                <button 
                  onClick={clearFilters}
                  className="text-xs font-bold text-slate-950 dark:text-white hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredJobs.map(job => (
              <div key={job.applyUrl} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-500 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-950">{job.title}</h4>
                  <p className="text-xs text-slate-500">{job.company} · {job.location}</p>
                </div>
                <button 
                  onClick={() => onLaunchAutoApply([job.applyUrl])}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-lg text-[10px] font-bold"
                >
                  <Zap className="w-3 h-3"/> Auto-Apply
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
