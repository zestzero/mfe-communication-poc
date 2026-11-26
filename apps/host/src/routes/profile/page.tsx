import { useLoaderData } from '@modern-js/runtime/router';
import { ProfileRemote, RemoteReady } from '../../remotes';

export default function ProfilePage() {
  const data = useLoaderData() as { route: string };
  return (
    <>
      <p data-testid="route-loader">{data.route}</p>
      <RemoteReady name="profile" testId="mfe-profile">
        <ProfileRemote />
      </RemoteReady>
    </>
  );
}
