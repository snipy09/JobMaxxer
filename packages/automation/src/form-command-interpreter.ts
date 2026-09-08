export interface FormCommandResult {
  matchedFieldKey?: string;
  newValue?: string;
  action: 'UPDATE_FIELD' | 'RE_SYNTHESIZE_AI' | 'UNKNOWN';
  message: string;
}

export function interpretFieldCommand(
  command: string,
  currentFields: Array<{ fieldKey: string; label: string; value: string; fieldType: string }> = []
): FormCommandResult {
  const cmd = (command || '').toLowerCase().trim();

  // 1. Notice Period
  if (cmd.includes('notice') || cmd.includes('available')) {
    let val = 'Immediately (0 days)';
    if (cmd.includes('15') || cmd.includes('2 week')) val = '2 weeks';
    if (cmd.includes('1 month') || cmd.includes('30 days')) val = '1 month';
    return {
      matchedFieldKey: 'noticePeriod',
      newValue: val,
      action: 'UPDATE_FIELD',
      message: `Updated Notice Period to "${val}".`
    };
  }

  // 2. Salary / Compensation
  if (cmd.includes('salary') || cmd.includes('compensation') || cmd.includes('lpa') || cmd.includes('$') || cmd.includes('ctc')) {
    const match = command.match(/(\$?\d+[\d,]*(\.\d+)?\s*(lpa|k|usd|inr)?)/i);
    const salaryVal = match ? match[0].trim() : 'Competitive';
    return {
      matchedFieldKey: 'desiredSalary',
      newValue: salaryVal,
      action: 'UPDATE_FIELD',
      message: `Updated Desired Salary to "${salaryVal}".`
    };
  }

  // 3. Visa Sponsorship
  if (cmd.includes('sponsor') || cmd.includes('visa')) {
    const val = cmd.includes('yes') ? 'Yes' : 'No';
    return {
      matchedFieldKey: 'sponsorship',
      newValue: val,
      action: 'UPDATE_FIELD',
      message: `Updated Visa Sponsorship to "${val}".`
    };
  }

  // 4. Cover Letter / Essay Re-synthesis
  if (cmd.includes('cover letter') || cmd.includes('essay') || cmd.includes('why us') || cmd.includes('summary')) {
    return {
      matchedFieldKey: 'coverLetter',
      newValue: command,
      action: 'RE_SYNTHESIZE_AI',
      message: 'Re-synthesizing response based on your instructions...'
    };
  }

  // Generic direct key match
  for (const f of currentFields) {
    if (cmd.includes(f.label.toLowerCase()) || cmd.includes(f.fieldKey.toLowerCase())) {
      const parts = command.split(/to|as|is/i);
      const val = parts.length > 1 ? parts[parts.length - 1].trim() : command;
      return {
        matchedFieldKey: f.fieldKey,
        newValue: val,
        action: 'UPDATE_FIELD',
        message: `Updated ${f.label} to "${val}".`
      };
    }
  }

  return {
    action: 'UNKNOWN',
    message: 'Command processed. Review field values below.'
  };
}
