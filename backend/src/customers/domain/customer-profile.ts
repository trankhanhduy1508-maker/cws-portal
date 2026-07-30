export interface CustomerProfile {
  id: string;
  facebookId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  phone: string | null;
  preferredContact: string | null;
  marketingConsent: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UpsertCustomerProfileInput {
  facebookId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
}
