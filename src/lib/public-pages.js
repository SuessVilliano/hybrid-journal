// Pages accessible without authentication. Shared by App.jsx (routing) and
// Layout.jsx (auth/onboarding redirects) so the two never disagree.
export const PUBLIC_PAGES = new Set([
  'Landing',
  'PublicDashboard',
  'Pricing',
  'Onboarding',
  'PlatformTour',
  'SocialFeed',
  'Help'
]);
