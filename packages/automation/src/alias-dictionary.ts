export const ATS_FIELD_ALIASES: Record<string, string[]> = {
  firstName: ["first_name", "given-name", "fname", "first name", "applicant_first_name"],
  lastName: ["last_name", "family-name", "lname", "last name", "applicant_last_name"],
  fullName: ["name", "full_name", "full name", "applicant_name"],
  email: ["email", "e-mail", "user_email", "contact_email"],
  phone: ["phone", "mobile", "telephone", "phone_number", "contact_phone"],
  linkedin: ["linkedin", "linkedin_url", "linkedin profile"],
  github: ["github", "github_url", "portfolio", "website"],
  sponsorship: ["sponsorship", "require visa", "future sponsorship", "work authorization", "require sponsorship"],
  salary: ["desired salary", "expected salary", "compensation expectations", "salary expectation", "pay expectation"],
  noticePeriod: ["notice period", "start date", "how soon can you start", "availability"]
};
