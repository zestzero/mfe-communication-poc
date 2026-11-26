import { useLoaderData } from '@modern-js/runtime/router';
import { useLanguage } from '@platform/mfe-communication';
import { shellCopy } from '../shell';

export function HomePanel() {
  const language = useLanguage();
  const data = useLoaderData() as { route: string };
  return (
    <>
      <p data-testid="route-loader">{data.route}</p>
      <p className="text-lg" data-testid="home-copy">{shellCopy[language.locale].welcome}</p>
    </>
  );
}

export default HomePanel;
