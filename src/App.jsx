import '@aws-amplify/ui-react/styles.css';
import './App.css';
import './Redesign.css';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import AdminReview, { AdminAccessDenied } from './AdminReview';
import LegacyHome from './LegacyHome';

const ENABLE_AUTH = import.meta.env.VITE_ENABLE_AUTH === 'true';
const ADMIN_VIEW = new URLSearchParams(window.location.search).get('view') === 'admin';
const ADMIN_GROUPS = (import.meta.env.VITE_ADMIN_GROUPS || 'Admins').split(',').map((item) => item.trim()).filter(Boolean);
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);

function getUserLabel(user) {
  return (
    user?.signInDetails?.loginId ||
    user?.attributes?.email ||
    user?.username ||
    'Account'
  );
}

export default function App() {
  if (!ENABLE_AUTH) {
    return ADMIN_VIEW ? <AdminReview localPreview /> : <LegacyHome />;
  }

  return (
    <Authenticator>
      {({ signOut, user }) => <AuthenticatedApp signOut={signOut} user={user} />}
    </Authenticator>
  );
}

function AuthenticatedApp({ signOut, user }) {
  const [adminAccess, setAdminAccess] = useState(null);
  const email = getUserLabel(user).toLowerCase();

  useEffect(() => {
    let mounted = true;
    fetchAuthSession().then((session) => {
      const groups = session.tokens?.idToken?.payload?.['cognito:groups'] || [];
      const allowed = groups.some((group) => ADMIN_GROUPS.includes(group)) || ADMIN_EMAILS.includes(email);
      if (mounted) setAdminAccess(allowed);
    }).catch(() => {
      if (mounted) setAdminAccess(ADMIN_EMAILS.includes(email));
    });
    return () => { mounted = false; };
  }, [email]);

  if (ADMIN_VIEW) {
    if (adminAccess === null) return <div className="admin-auth-loading">Checking admin access…</div>;
    if (!adminAccess) return <AdminAccessDenied onSignOut={signOut} />;
    return <AdminReview accountLabel={getUserLabel(user)} onSignOut={signOut} />;
  }

  return (
    <>
      <div className="account-controls">
        {adminAccess ? <a className="admin-review-link" href="/?view=admin">Admin review</a> : null}
        <button className="signout-button" onClick={signOut} style={{ textTransform: 'none' }}>
          Sign out <span>{getUserLabel(user)}</span>
        </button>
      </div>
      <LegacyHome />
    </>
  );
}
