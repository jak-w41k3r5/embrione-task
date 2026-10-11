export const DOMAINS = [
  'Web Development',
  'Design',
  'Logistics',
  'Operations',
  'Sponsorship',
  'Hospitality',
  'Social Media',
  'Event Management',
] as const;

// Order matters: it is also used to sort the /team page (Head first).
export const POSITIONS = ['Head', 'Vice-Head', 'Core Member', 'Member'] as const;

export const BRANCHES = [
  'CSE',
  'AIML',
  'ECE',
  'EEE',
  'ME',
  'Biotech',
  'Civil',
  'Other',
] as const;

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const BIO_MIN = 150;
export const BIO_MAX = 200;
