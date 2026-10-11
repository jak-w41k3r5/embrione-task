export type MemberStatus = 'pending' | 'approved' | 'rejected';

export interface Member {
  id: string;
  name: string;
  domain: string;
  position: string;
  srn: string;
  email: string;
  linkedin_url: string | null;
  github_url: string | null;
  branch: string;
  semester: number;
  bio: string | null;
  photo_url: string;
  status: MemberStatus;
  created_at: string;
}
