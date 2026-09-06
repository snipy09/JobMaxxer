export const ATS_FIELD_ALIASES: Record<string, string[]> = {
  firstName: ["first_name", "given-name", "fname", "first name", "applicant_first_name", "given name"],
  lastName: ["last_name", "family-name", "lname", "last name", "applicant_last_name", "family name", "surname"],
  fullName: ["name", "full_name", "full name", "applicant_name", "candidate_name", "your name"],
  email: ["email", "e-mail", "user_email", "contact_email", "email address", "email_address"],
  phone: ["phone", "mobile", "telephone", "phone_number", "contact_phone", "contact number", "mobile number"],
  linkedin: ["linkedin", "linkedin_url", "linkedin-url", "linkedin profile", "urls[linkedin]"],
  github: ["github", "github_url", "github-url", "github profile", "urls[github]"],
  portfolio: ["portfolio", "portfolio_url", "portfolio-url", "website", "personal_website", "personal_url", "website_url", "homepage", "urls[portfolio]"],
  projects: ["project_link", "project_url", "projects_url", "project_links", "projects_link", "live_demo", "demo_link", "deployed_url", "work_sample", "work_samples", "code_sample", "project url", "project link", "projects"],
  coverLetter: ["cover_letter", "coverletter", "cover-letter", "why_us", "why_hire", "why_are_you_interested", "additional_info", "additional_information", "why do you want", "tell us about"],
  sponsorship: ["sponsorship", "require visa", "future sponsorship", "work authorization", "require sponsorship", "authorized to work"],
  salary: ["desired salary", "expected salary", "compensation expectations", "salary expectation", "pay expectation", "desired compensation", "expected compensation", "ctc"],
  noticePeriod: ["notice period", "start date", "how soon can you start", "availability", "available from", "earliest start date"]
};
