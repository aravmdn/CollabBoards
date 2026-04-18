import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '../lib/api';

interface UserSummary {
  id: string;
  email: string;
  name?: string | null;
}

interface Member {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: UserSummary;
}

interface Props {
  workspaceId: string;
  currentUserId: string;
}

function getErrMsg(error: unknown, fallback: string) {
  if (error instanceof AxiosError) return error.response?.data?.message ?? fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function WorkspaceMembers({ workspaceId, currentUserId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  const currentMember = members.find((m) => m.userId === currentUserId);
  const isOwner = currentMember?.role === 'OWNER';
  const canManage = isOwner || currentMember?.role === 'ADMIN';

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Member[]>(`/workspaces/${workspaceId}/members`);
      setMembers(data);
    } catch (err) {
      setError(getErrMsg(err, 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setError(null);
    try {
      await api.post(`/workspaces/${workspaceId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      await fetchMembers();
    } catch (err) {
      setError(getErrMsg(err, 'Invite failed'));
    }
  };

  const handleRoleChange = async (memberId: string, role: 'ADMIN' | 'MEMBER') => {
    setError(null);
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
      await fetchMembers();
    } catch (err) {
      setError(getErrMsg(err, 'Role update failed'));
    }
  };

  const handleRemove = async (memberId: string) => {
    setError(null);
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      await fetchMembers();
    } catch (err) {
      setError(getErrMsg(err, 'Remove failed'));
    }
  };

  return (
    <section>
      <h2>Members</h2>
      {loading ? <p className="app-subtitle">Loading...</p> : null}
      {error ? <p className="status-banner status-banner--error">{error}</p> : null}
      <div className="tile-stack">
        {members.map((m) => (
          <div className="member-row" key={m.userId}>
            <span className="member-name">
              {m.user.name || m.user.email}
              <small> ({m.role})</small>
            </span>
            {isOwner && m.userId !== currentUserId && m.role !== 'OWNER' ? (
              <select
                aria-label="Change role"
                value={m.role}
                onChange={(e) =>
                  void handleRoleChange(m.userId, e.target.value as 'ADMIN' | 'MEMBER')
                }
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MEMBER">MEMBER</option>
              </select>
            ) : null}
            {canManage && m.userId !== currentUserId && m.role !== 'OWNER' ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => void handleRemove(m.userId)}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {canManage ? (
        <form className="inline-form" onSubmit={handleInvite}>
          <input
            type="email"
            placeholder="user@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select
            aria-label="Invite role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
          >
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button className="primary-button" type="submit">
            Invite
          </button>
        </form>
      ) : null}
    </section>
  );
}
