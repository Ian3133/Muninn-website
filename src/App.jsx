import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';
import LegacyHome from './LegacyHome';

export default function App() {
  return (
    <Authenticator>
      {({ signOut }) => (
        <>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
            <button className="signout-button" onClick={signOut}>Sign out</button>
          </div>
          <LegacyHome />
        </>
      )}
    </Authenticator>
  );
}
