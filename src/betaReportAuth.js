export function betaIssueAuthMode({ guestMode, hasUserPoolTokens }) {
  if (!guestMode) return undefined;
  return hasUserPoolTokens ? 'userPool' : 'iam';
}
