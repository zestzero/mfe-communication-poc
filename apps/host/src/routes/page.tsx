import { useLanguage } from '@platform/mfe-communication';
import { shellCopy } from '../shell';

export function HomePanel() {
  const language = useLanguage();
  return <p className="text-lg" data-testid="home-copy">{shellCopy[language.locale].welcome}</p>;
}

export default HomePanel;
