import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getUserState } from './graphql/queries';
import { createUserState, updateUserState } from './graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

export default function UserStateTest() {
  const [noteText, setNoteText] = useState('');
  const [flag, setFlag] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setUserId(user.userId);

      const response = await client.graphql({
        query: getUserState,
        variables: { id: user.userId }
      });

      if (response.data.getUserState) {
        setNoteText(response.data.getUserState.noteText || '');
        setFlag(response.data.getUserState.flag || false);
      }
    }

    loadUser();
  }, []);

  async function saveState() {
    if (!userId) return;

    const existing = await client.graphql({
      query: getUserState,
      variables: { id: userId }
    });

    if (!existing.data.getUserState) {
      await client.graphql({
        query: createUserState,
        variables: {
          input: {
            id: userId,
            noteText,
            flag,
            updatedAt: new Date().toISOString()
          }
        }
      });
    } else {
      await client.graphql({
        query: updateUserState,
        variables: {
          input: {
            id: userId,
            noteText,
            flag,
            updatedAt: new Date().toISOString()
          }
        }
      });
    }

    alert('Saved');
  }

  return (
    <div>
      <h2>User State Test</h2>

      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
      />

      <br />

      <label>
        <input
          type="checkbox"
          checked={flag}
          onChange={(e) => setFlag(e.target.checked)}
        />
        Check me
      </label>

      <br />

      <button onClick={saveState}>Save</button>
    </div>
  );
}
