export interface Group {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  description: string;
  members: number;
  location: string;
  scope: 'Domain local' | 'Global' | 'Universal';
}

const locations = ['Entra 1', 'Entra 2', 'AD-1\\Users', 'AD-2\\OU1'];
const names = ['Platform Admins', 'Helpdesk Operators', 'Finance Approvers', 'Security Readers', 'Application Owners', 'Engineering Leads', 'Regional Managers', 'Audit Reviewers'];

export const MOCK_GROUPS: Group[] = Array.from({ length: 48 }, (_, index) => ({
  id: `group-${index + 1}`,
  name: names[index % names.length],
  status: index % 7 === 0 ? 'Inactive' : 'Active',
  description: index % 2 === 0 ? 'Reusable access-control group for delegated administration.' : 'Directory group used to manage access and membership.',
  members: 4 + ((index * 7) % 86),
  location: locations[index % locations.length],
  scope: index % 3 === 0 ? 'Global' : index % 3 === 1 ? 'Domain local' : 'Universal',
}));
