import '@aws-amplify/ui-react/styles.css';
import './App.css';
import { Authenticator } from '@aws-amplify/ui-react';
import LegacyHome from './LegacyHome';

function getUserLabel(user) {
  return (
    user?.signInDetails?.loginId ||
    user?.attributes?.email ||
    user?.username ||
    'Account'
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
            <button className="signout-button" onClick={signOut} style={{ textTransform: 'none' }}>
              Sign out
              <span style={{ fontSize: '0.72em', textTransform: 'none', letterSpacing: 'normal' }}>
                {' '}{getUserLabel(user)}
              </span>
            </button>
          </div>
          <LegacyHome />
        </>
      )}
    </Authenticator>
  );
}
