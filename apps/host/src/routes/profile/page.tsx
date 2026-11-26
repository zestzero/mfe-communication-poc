import { ProfileRemote, RemoteReady } from '../../remotes';

export default function ProfilePage() {
  return (
    <RemoteReady name="profile" testId="mfe-profile">
      <ProfileRemote />
    </RemoteReady>
  );
}
