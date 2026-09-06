export interface ATSPortal {
  name: string;
  domain: string;
  selectors: {
    applyButton: string[];       // Priority-ordered selectors
    formContainer: string[];
    submitButton: string[];
    confirmationSignatures: string[];
    // Modal/popup detection
    modalFrame: string[];
    newTabMarker: string;
  };
  navigation: {
    type: 'direct' | 'modal' | 'new-tab' | 'stepper';
    formOpensAfterClick: boolean;
    waitAfterClick: number; // ms
  };
  fieldMapping: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    linkedIn?: string;
    github?: string;
    portfolio?: string;
    resume?: string;
    workAuthorization?: string;
    sponsorshipRequired?: string;
    [key: string]: string | undefined;
  };
  radioBehavior: {
    patterns: Array<{
      questionMatch: RegExp;        // Match question text
      selectValue: string;          // Value to select
      valueSelector?: string;       // If custom
    }>;
  };
  customQuestions?: Array<{
    selector: string;
    type: 'text' | 'textarea' | 'dropdown';
    fallbackToAI: boolean;
  }>;
}

export const ATS_PORTALS: Record<string, ATSPortal> = {
  'internshala': {
    name: 'Internshala',
    domain: 'internshala.com',
    selectors: {
      applyButton: [
        '#apply_now_button',
        'button#apply_now_button',
        'a#apply_now_button',
        '.apply_now_button',
        'button.apply_now_button',
        'a[id="apply_now_button"]',
        'button:has-text("Apply now")',
        'a:has-text("Apply now")',
        'button:has-text("Apply")',
        '.apply-btn'
      ],
      formContainer: [
        '#application_modal',
        '.application_modal',
        '#application-form',
        '.application-form',
        '#application_form',
        '.modal-body',
        '.modal-content'
      ],
      submitButton: [
        '#submit',
        'button#submit',
        'input[type="submit"]',
        'button[type="submit"]',
        'button:has-text("Submit application")',
        'button:has-text("Submit")',
        '.submit_button',
        '.submit-btn'
      ],
      confirmationSignatures: [
        ':has-text("Application submitted")',
        ':has-text("Applied successfully")',
        ':has-text("Thank you for applying")',
        ':has-text("Application sent")',
        '.success-message',
        '.toast-success'
      ],
      modalFrame: ['dialog', '.modal', '[role="dialog"]', '#application_modal'],
      newTabMarker: 'target="_blank"'
    },
    navigation: {
      type: 'modal',
      formOpensAfterClick: true,
      waitAfterClick: 500
    },
    fieldMapping: {
      firstName: 'input[name*="first" i], input[id*="first" i]',
      lastName: 'input[name*="last" i], input[id*="last" i]',
      fullName: 'input[name*="name" i], input[id*="name" i]',
      email: 'input[type="email"], input[name*="email" i]',
      phone: 'input[type="tel"], input[name*="phone" i], input[name*="mobile" i]',
      linkedIn: 'input[placeholder*="linkedin" i], input[name*="linkedin" i]',
      github: 'input[placeholder*="github" i], input[name*="github" i]',
      portfolio: 'input[placeholder*="portfolio" i], input[name*="portfolio" i], input[placeholder*="website" i]',
      resume: 'input[type="file"]'
    },
    radioBehavior: {
      patterns: [
        {
          questionMatch: /laptop|computer|device|working laptop/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /internet|connection|broadband|wifi/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /9am.*6pm|working hours|schedule|full-time|hours/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /built.*project|smart contract|experience|skill/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /immediate|availability|start immediately/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /work.*authorization|eligible to work/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /visa.*sponsorship|require.*sponsorship/i,
          selectValue: 'no'
        }
      ]
    }
  },

  'lever': {
    name: 'Lever',
    domain: 'lever.co',
    selectors: {
      applyButton: [
        'a.postings-btn',
        'a[href$="/apply"]',
        'a[href*="/apply?"]',
        'a[href*="/apply/"]',
        'button:has-text("Apply for this job")',
        'a:has-text("Apply for this job")',
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        '.apply-link'
      ],
      formContainer: ['form', '.application-form', '#application-form', '.postings-btn-wrapper', '.container'],
      submitButton: [
        'button[type="submit"]',
        'button#btn-submit',
        'button:has-text("Submit application")',
        'button:has-text("Submit Application")',
        'button:has-text("Submit")',
        '.submit-btn'
      ],
      confirmationSignatures: [
        ':has-text("Thank you for applying")',
        ':has-text("Application received")',
        ':has-text("Thank you")',
        '.thank-you',
        '.application-confirmation'
      ],
      modalFrame: [],
      newTabMarker: ''
    },
    navigation: {
      type: 'direct',
      formOpensAfterClick: false,
      waitAfterClick: 300
    },
    fieldMapping: {
      fullName: 'input[name="name"], input[name*="name" i]',
      firstName: 'input[name*="first" i]',
      lastName: 'input[name*="last" i]',
      email: 'input[type="email"], input[name="email"]',
      phone: 'input[type="tel"], input[name="phone"]',
      linkedIn: 'input[name*="urls[LinkedIn]"], input[placeholder*="linkedin" i]',
      github: 'input[name*="urls[GitHub]"], input[placeholder*="github" i]',
      portfolio: 'input[name*="urls[Portfolio]"], input[placeholder*="portfolio" i], input[name*="urls[Other]"]',
      resume: 'input[type="file"], input#resume-upload-input'
    },
    radioBehavior: {
      patterns: [
        {
          questionMatch: /authorized|legally authorized|eligible to work/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /visa|sponsorship|require.*sponsorship/i,
          selectValue: 'no'
        },
        {
          questionMatch: /18 years|over 18|age/i,
          selectValue: 'yes'
        }
      ]
    }
  },

  'greenhouse': {
    name: 'Greenhouse',
    domain: 'greenhouse.io',
    selectors: {
      applyButton: [
        '#apply_button',
        'a#apply_button',
        'a[href*="#app"]',
        'a:has-text("Apply for this job")',
        'button:has-text("Apply for this job")',
        'a:has-text("Apply now")',
        'button:has-text("Apply now")',
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        'button[data-action="apply"]'
      ],
      formContainer: [
        '#application',
        '#application-form',
        '#application_form',
        'form#application_form',
        '.application-form'
      ],
      submitButton: [
        '#submit_app',
        'input[type="submit"]',
        'button[type="submit"]',
        'button#submit_app',
        'button:has-text("Submit application")',
        'button:has-text("Submit Application")',
        'button:has-text("Submit")'
      ],
      confirmationSignatures: [
        ':has-text("Thank you for applying")',
        ':has-text("Application submitted")',
        ':has-text("Thank you")',
        '#application_confirmation',
        '.confirmation'
      ],
      modalFrame: [],
      newTabMarker: ''
    },
    navigation: {
      type: 'direct',
      formOpensAfterClick: false,
      waitAfterClick: 300
    },
    fieldMapping: {
      firstName: 'input#first_name, input[name="first_name"]',
      lastName: 'input#last_name, input[name="last_name"]',
      fullName: 'input[name="full_name"], input#full_name',
      email: 'input#email, input[name="email"], input[type="email"]',
      phone: 'input#phone, input[name="phone"], input[type="tel"]',
      linkedIn: 'input[name*="linkedin" i], input[id*="linkedin" i], input[data-qa*="linkedin" i]',
      github: 'input[name*="github" i], input[id*="github" i]',
      portfolio: 'input[name*="website" i], input[id*="website" i], input[name*="portfolio" i]',
      resume: 'input[type="file"], input#resume_file'
    },
    radioBehavior: {
      patterns: [
        {
          questionMatch: /authorized|legally authorized|eligible to work/i,
          selectValue: 'yes'
        },
        {
          questionMatch: /visa|sponsorship|require.*sponsorship/i,
          selectValue: 'no'
        },
        {
          questionMatch: /18 years|over 18|age/i,
          selectValue: 'yes'
        }
      ]
    }
  },

  'remotive': {
    name: 'Remotive',
    domain: 'remotive.com',
    selectors: {
      applyButton: [
        'button:has-text("Apply for this position")',
        'a:has-text("Apply for this position")',
        'button:has-text("Apply for this job")',
        'a:has-text("Apply for this job")',
        'button:has-text("Apply now")',
        'a:has-text("Apply now")',
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        'a[href*="/apply"]',
        '.apply-btn'
      ],
      formContainer: ['form', 'dialog', '[role="dialog"]', '.application-form', '.modal-content'],
      submitButton: [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Submit application")',
        'button:has-text("Submit Application")',
        'button:has-text("Submit")'
      ],
      confirmationSignatures: [
        ':has-text("Application submitted")',
        ':has-text("Thank you for applying")',
        ':has-text("Application received")',
        '.success'
      ],
      modalFrame: ['dialog', '[role="dialog"]', '.modal'],
      newTabMarker: 'target="_blank"'
    },
    navigation: {
      type: 'modal',
      formOpensAfterClick: true,
      waitAfterClick: 500
    },
    fieldMapping: {
      firstName: 'input[name*="first" i]',
      lastName: 'input[name*="last" i]',
      fullName: 'input[name*="name" i]',
      email: 'input[type="email"], input[name*="email" i]',
      phone: 'input[type="tel"], input[name*="phone" i]',
      linkedIn: 'input[placeholder*="linkedin" i]',
      github: 'input[placeholder*="github" i]',
      resume: 'input[type="file"]'
    },
    radioBehavior: {
      patterns: [
        { questionMatch: /authorized|eligible/i, selectValue: 'yes' },
        { questionMatch: /visa|sponsorship/i, selectValue: 'no' }
      ]
    }
  },

  'ashby': {
    name: 'Ashby',
    domain: 'ashbyhq.com',
    selectors: {
      applyButton: [
        'button:has-text("Apply for this position")',
        'button:has-text("Apply for this job")',
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        'a[href*="/application"]'
      ],
      formContainer: ['form', '[data-qa="application-form"]', '.application-form', 'main'],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Submit Application")',
        'button:has-text("Submit application")',
        'button:has-text("Submit")'
      ],
      confirmationSignatures: [
        ':has-text("Application Submitted")',
        ':has-text("Thank you for applying")',
        ':has-text("Application received")'
      ],
      modalFrame: [],
      newTabMarker: ''
    },
    navigation: {
      type: 'direct',
      formOpensAfterClick: false,
      waitAfterClick: 300
    },
    fieldMapping: {
      firstName: 'input[name*="first" i]',
      lastName: 'input[name*="last" i]',
      fullName: 'input[name*="name" i]',
      email: 'input[type="email"], input[name*="email" i]',
      phone: 'input[type="tel"], input[name*="phone" i]',
      linkedIn: 'input[name*="linkedin" i], input[placeholder*="linkedin" i]',
      github: 'input[name*="github" i], input[placeholder*="github" i]',
      portfolio: 'input[name*="portfolio" i], input[placeholder*="portfolio" i], input[placeholder*="website" i]',
      resume: 'input[type="file"]'
    },
    radioBehavior: {
      patterns: [
        { questionMatch: /authorized|eligible/i, selectValue: 'yes' },
        { questionMatch: /visa|sponsorship/i, selectValue: 'no' }
      ]
    }
  },

  'smartrecruiters': {
    name: 'SmartRecruiters',
    domain: 'smartrecruiters.com',
    selectors: {
      applyButton: [
        'button:has-text("I\'m interested")',
        'a:has-text("I\'m interested")',
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        'a[href*="/apply"]'
      ],
      formContainer: ['form', '#application-form', '.apply-form', 'st-apply'],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Next")',
        'button:has-text("Send")'
      ],
      confirmationSignatures: [
        ':has-text("Thank you")',
        ':has-text("Application sent")',
        ':has-text("Applied")'
      ],
      modalFrame: ['.modal', 'dialog'],
      newTabMarker: ''
    },
    navigation: {
      type: 'direct',
      formOpensAfterClick: true,
      waitAfterClick: 500
    },
    fieldMapping: {
      firstName: 'input[name*="first" i], input[id*="first" i]',
      lastName: 'input[name*="last" i], input[id*="last" i]',
      email: 'input[type="email"], input[name*="email" i]',
      phone: 'input[type="tel"], input[name*="phone" i]',
      linkedIn: 'input[placeholder*="linkedin" i]',
      resume: 'input[type="file"]'
    },
    radioBehavior: {
      patterns: [
        { questionMatch: /authorized|eligible/i, selectValue: 'yes' },
        { questionMatch: /visa|sponsorship/i, selectValue: 'no' }
      ]
    }
  },

  'generic': {
    name: 'Generic ATS',
    domain: '*',
    selectors: {
      applyButton: [
        'button:has-text("Apply for this position")',
        'a:has-text("Apply for this position")',
        'button:has-text("Apply for this job")',
        'a:has-text("Apply for this job")',
        'button:has-text("Apply for role")',
        'a:has-text("Apply for role")',
        'button:has-text("Apply now")',
        'a:has-text("Apply now")',
        'button:has-text("Apply with Resume")',
        'a:has-text("Apply with Resume")',
        'button:has-text("Start application")',
        'a:has-text("Start application")',
        'button:has-text("Quick Apply")',
        'button:has-text("Easy Apply")',
        'button:has-text("Apply online")',
        'a:has-text("Apply online")',
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        'a[href$="/apply"]',
        'a[href$="/application"]',
        'a[href*="/apply?"]',
        'a[href*="/apply/"]',
        'button[aria-label*="Apply" i]',
        '.apply-btn',
        '[data-action="apply"]'
      ],
      formContainer: [
        'form',
        '.form-container',
        '.application-form',
        '#application-form',
        '#application_form',
        '[role="form"]',
        '.modal-body'
      ],
      submitButton: [
        '#submit',
        'button#submit',
        'input[type="submit"]',
        'button[type="submit"]',
        'button:has-text("Submit application")',
        'button:has-text("Submit Application")',
        'button:has-text("Submit")',
        'button[aria-label*="submit" i]',
        '#submit_button',
        '.submit_button',
        '.btn-primary.submit'
      ],
      confirmationSignatures: [
        ':has-text("Application submitted")',
        ':has-text("Thank you for applying")',
        ':has-text("Application received")',
        ':has-text("Applied successfully")',
        ':has-text("Thank you")',
        ':has-text("submitted")',
        ':has-text("received")',
        '.success',
        '.confirmation'
      ],
      modalFrame: ['dialog', '.modal', '[role="dialog"]'],
      newTabMarker: 'target="_blank"'
    },
    navigation: {
      type: 'direct',
      formOpensAfterClick: false,
      waitAfterClick: 500
    },
    fieldMapping: {
      firstName: 'input[name*="first" i], input[id*="first" i], input[placeholder*="first name" i]',
      lastName: 'input[name*="last" i], input[id*="last" i], input[placeholder*="last name" i]',
      fullName: 'input[name*="full_name" i], input[id*="full_name" i], input[placeholder*="full name" i], input[name="name" i]',
      email: 'input[type="email"], input[name*="email" i], input[id*="email" i]',
      phone: 'input[type="tel"], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]',
      linkedIn: 'input[placeholder*="linkedin" i], input[name*="linkedin" i], input[id*="linkedin" i]',
      github: 'input[placeholder*="github" i], input[name*="github" i], input[id*="github" i]',
      portfolio: 'input[placeholder*="portfolio" i], input[name*="portfolio" i], input[placeholder*="website" i], input[name*="website" i]',
      resume: 'input[type="file"]'
    },
    radioBehavior: {
      patterns: [
        { questionMatch: /laptop|computer|device/i, selectValue: 'yes' },
        { questionMatch: /internet|connection|broadband|wifi/i, selectValue: 'yes' },
        { questionMatch: /schedule|hours|full-time/i, selectValue: 'yes' },
        { questionMatch: /authorized|legally authorized|eligible/i, selectValue: 'yes' },
        { questionMatch: /visa|sponsorship|require.*sponsorship/i, selectValue: 'no' },
        { questionMatch: /yes|agree|confirm/i, selectValue: 'yes' },
        { questionMatch: /no|decline|reject/i, selectValue: 'no' }
      ]
    }
  }
};

export function getATSConfig(url: string): ATSPortal {
  const lowerUrl = (url || '').toLowerCase();
  for (const [key, config] of Object.entries(ATS_PORTALS)) {
    if (key === 'generic') continue;
    if (lowerUrl.includes(config.domain.toLowerCase())) {
      return config;
    }
  }
  return ATS_PORTALS['generic'];
}
