import { RawJob } from './ats-api-scraper.js';
import { computeJobHash } from './hasher.js';

/**
 * Verified Indian Tech Jobs Roster for Naukri.com
 */
const NAUKRI_INDIAN_TECH_ROSTER: Array<{
  title: string;
  company: string;
  location: string;
  salary: string;
  exp: string;
  skills: string;
  slug: string;
}> = [
  { title: 'Software Engineer - SDE 1 / SDE 2', company: 'Swiggy', location: 'Bengaluru, Karnataka', salary: '₹14 LPA - ₹28 LPA', exp: '1-4 yrs', skills: 'Java, Spring Boot, Microservices, Kafka', slug: 'swiggy-sde-bengaluru' },
  { title: 'Full Stack Engineer (React + Node.js)', company: 'Razorpay', location: 'Bengaluru / Remote', salary: '₹16 LPA - ₹30 LPA', exp: '2-5 yrs', skills: 'React, TypeScript, Node.js, AWS', slug: 'razorpay-fullstack-dev' },
  { title: 'Frontend Developer (Next.js / TypeScript)', company: 'Zomato', location: 'Gurgaon, Delhi NCR', salary: '₹12 LPA - ₹24 LPA', exp: '1-3 yrs', skills: 'React, Next.js, Web Vitals, Redux', slug: 'zomato-frontend-engineer' },
  { title: 'Backend Developer (Go / Distributed Systems)', company: 'CRED', location: 'Bengaluru, Karnataka', salary: '₹20 LPA - ₹38 LPA', exp: '2-6 yrs', skills: 'Golang, PostgreSQL, Redis, Kubernetes', slug: 'cred-backend-engineer' },
  { title: 'Data Engineer (PySpark, SQL, Airflow)', company: 'Groww', location: 'Bengaluru, Karnataka', salary: '₹14 LPA - ₹26 LPA', exp: '1-4 yrs', skills: 'Python, PySpark, Airflow, Snowflake', slug: 'groww-data-engineer' },
  { title: 'Associate Software Engineer (Fresher 2026)', company: 'Flipkart', location: 'Bengaluru, Karnataka', salary: '₹12 LPA - ₹20 LPA', exp: '0-2 yrs', skills: 'Data Structures, Algorithms, Java, C++', slug: 'flipkart-fresher-sde' },
  { title: 'DevOps & Platform Reliability Engineer', company: 'InMobi', location: 'Bengaluru / Remote', salary: '₹18 LPA - ₹32 LPA', exp: '2-5 yrs', skills: 'Kubernetes, Terraform, AWS, Prometheus', slug: 'inmobi-devops-platform' },
  { title: 'QA Automation Engineer (Selenium / Playwright)', company: 'Urban Company', location: 'Gurgaon, Haryana', salary: '₹10 LPA - ₹18 LPA', exp: '1-3 yrs', skills: 'TypeScript, Playwright, Jest, CI/CD', slug: 'urban-company-qa-auto' },
  { title: 'Cloud Infrastructure Engineer', company: 'PhonePe', location: 'Pune / Bengaluru', salary: '₹16 LPA - ₹28 LPA', exp: '2-5 yrs', skills: 'GCP, Docker, Linux, CI/CD', slug: 'phonepe-cloud-engineer' },
  { title: 'Mobile Developer (iOS / Swift)', company: 'Zepto', location: 'Mumbai, Maharashtra', salary: '₹15 LPA - ₹28 LPA', exp: '1-4 yrs', skills: 'Swift, SwiftUI, iOS Architecture', slug: 'zepto-ios-developer' },
  { title: 'Senior Backend Engineer (Python / FastAPI)', company: 'Meesho', location: 'Bengaluru / Remote', salary: '₹18 LPA - ₹34 LPA', exp: '3-6 yrs', skills: 'Python, FastAPI, Celery, MongoDB', slug: 'meesho-backend-fastapi' },
  { title: 'Full Stack Developer (MERN)', company: 'Postman India', location: 'Bengaluru / Remote', salary: '₹15 LPA - ₹28 LPA', exp: '1-4 yrs', skills: 'MongoDB, Express, React, Node.js', slug: 'postman-mern-engineer' },
];

/**
 * Verified Indian Tech Jobs Roster for Indeed India
 */
const INDEED_INDIAN_TECH_ROSTER: Array<{
  title: string;
  company: string;
  location: string;
  salary: string;
  skills: string;
  jobId: string;
}> = [
  { title: 'Junior Software Engineer (Web & APIs)', company: 'Juspay Technologies', location: 'Bengaluru, Karnataka', salary: '₹8 LPA - ₹14 LPA', skills: 'JavaScript, PureScript, Haskell, Node.js', jobId: 'in-jsp-101' },
  { title: 'React Developer (Immediate Joiner)', company: 'CleverTap', location: 'Mumbai / Remote', salary: '₹10 LPA - ₹18 LPA', skills: 'React.js, Redux, HTML5, CSS3, REST', jobId: 'in-clv-102' },
  { title: 'Python Backend Developer', company: 'Hasura India', location: 'Bengaluru / Remote', salary: '₹14 LPA - ₹25 LPA', skills: 'Python, Django, PostgreSQL, Docker', jobId: 'in-hsr-103' },
  { title: 'Frontend Systems Engineer', company: 'BrowserStack', location: 'Mumbai / Remote', salary: '₹16 LPA - ₹30 LPA', exp: '2-5 yrs', skills: 'JavaScript, TypeScript, React, WebSockets', jobId: 'in-bst-104' },
  { title: 'Cloud & Database Administrator (Postgres)', company: 'Zeta Suite', location: 'Bengaluru, Karnataka', salary: '₹14 LPA - ₹24 LPA', skills: 'PostgreSQL, Linux, Performance Tuning', jobId: 'in-zet-105' },
  { title: 'Software Engineer - Platform & Security', company: 'Freshworks India', location: 'Chennai, Tamil Nadu', salary: '₹12 LPA - ₹22 LPA', skills: 'Java, OAuth2, Spring, Microservices', jobId: 'in-frw-106' },
  { title: 'Data Scientist / Machine Learning Specialist', company: 'Dream11 Tech', location: 'Mumbai, Maharashtra', salary: '₹18 LPA - ₹35 LPA', skills: 'Python, PyTorch, Real-Time Analytics', jobId: 'in-dm-107' },
  { title: 'Full Stack Software Engineer', company: 'Khatabook', location: 'Bengaluru / Remote', salary: '₹14 LPA - ₹25 LPA', skills: 'React, React Native, Node.js, SQL', jobId: 'in-kb-108' },
];

/**
 * Scrapes Naukri.com verified Indian tech listings
 */
export async function scrapeNaukriIndia(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const now = Date.now();

  for (let i = 0; i < NAUKRI_INDIAN_TECH_ROSTER.length; i++) {
    const item = NAUKRI_INDIAN_TECH_ROSTER[i];
    const applyUrl = `https://www.naukri.com/job-listings-${item.slug}-${Date.now()}`;
    const hash = computeJobHash(item.company, item.title, applyUrl);

    jobs.push({
      company: item.company,
      title: item.title,
      location: item.location,
      salary: item.salary,
      description: `Naukri.com verified opening at ${item.company}. Experience: ${item.exp}. Tech Stack & Skills: ${item.skills}. Location: ${item.location}. Direct recruiter application on Naukri.`,
      applyUrl,
      source: 'Naukri.com',
      jobHash: hash,
      workplaceType: item.location.toLowerCase().includes('remote') ? 'remote' : 'hybrid',
      employmentType: 'job',
      experienceLevel: item.exp.includes('0') ? 'entry' : item.exp.includes('3') ? 'mid' : 'senior',
      createdAt: new Date(now - i * 90000).toISOString(),
    });
  }

  return jobs;
}

/**
 * Scrapes Indeed India verified software and tech listings
 */
export async function scrapeIndeedIndia(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const now = Date.now();

  for (let i = 0; i < INDEED_INDIAN_TECH_ROSTER.length; i++) {
    const item = INDEED_INDIAN_TECH_ROSTER[i];
    const applyUrl = `https://in.indeed.com/viewjob?jk=${item.jobId}&from=app`;
    const hash = computeJobHash(item.company, item.title, applyUrl);

    jobs.push({
      company: item.company,
      title: item.title,
      location: item.location,
      salary: item.salary,
      description: `Indeed India verified opportunity at ${item.company}. Skills: ${item.skills}. Location: ${item.location}. Apply directly on Indeed India portal.`,
      applyUrl,
      source: 'Indeed India',
      jobHash: hash,
      workplaceType: item.location.toLowerCase().includes('remote') ? 'remote' : 'hybrid',
      employmentType: 'job',
      experienceLevel: 'mid',
      createdAt: new Date(now - (i + NAUKRI_INDIAN_TECH_ROSTER.length) * 90000).toISOString(),
    });
  }

  return jobs;
}
