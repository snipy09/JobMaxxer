export interface BatchAppSnapshot {
  id: string;
  company: string;
  jobTitle: string;
  applyUrl: string;
  resumeFileName?: string;
  fields: Array<{
    fieldKey: string;
    label: string;
    value: string;
    fieldType: 'text' | 'textarea' | 'radio' | 'select' | 'checkbox' | 'file';
    isCustomQuestion?: boolean;
    options?: string[];
  }>;
  status: 'ready' | 'needs_attention' | 'submitted' | 'failed';
  errorMessage?: string;
}

export interface BatchReviewState {
  applications: BatchAppSnapshot[];
  selectedAppId: string;
  allReadyToSubmit: boolean;
  globalNoticePeriod?: string;
  globalSalary?: string;
}

export function createBatchReviewState(snapshots: BatchAppSnapshot[]): BatchReviewState {
  return {
    applications: snapshots.map(s => ({ ...s, status: s.status || 'ready' })),
    selectedAppId: snapshots.length > 0 ? snapshots[0].id : '',
    allReadyToSubmit: snapshots.every(s => s.status !== 'needs_attention' && s.status !== 'failed')
  };
}

export function updateBatchFieldGlobal(
  state: BatchReviewState,
  fieldKey: string,
  newValue: string
): BatchReviewState {
  const updatedApps = state.applications.map(app => ({
    ...app,
    fields: app.fields.map(f => f.fieldKey === fieldKey ? { ...f, value: newValue } : f)
  }));
  return {
    ...state,
    applications: updatedApps
  };
}

export function markJobAsReady(state: BatchReviewState, appId: string): BatchReviewState {
  const updatedApps = state.applications.map(app => app.id === appId ? { ...app, status: 'ready' as const } : app);
  return {
    ...state,
    applications: updatedApps,
    allReadyToSubmit: updatedApps.every(s => s.status === 'ready')
  };
}
