import { useAuth, useLanguage, useRuntime } from '@platform/mfe-communication';
import { requestLanguageChange, requestLogout, requestNavigation } from '@platform/mfe-communication';
import './styles.css';

const copy = {
  en: { title: 'Profile', guest: 'No one is signed in.', language: 'Use Thai', products: 'Back to products', logout: 'Log out from profile' },
  th: { title: 'โปรไฟล์', guest: 'ยังไม่มีผู้ใช้', language: 'ใช้ภาษาอังกฤษ', products: 'กลับไปสินค้า', logout: 'ออกจากระบบจากโปรไฟล์' },
};

export function ProfileView() {
  const auth = useAuth();
  const language = useLanguage();
  const runtime = useRuntime();
  const text = copy[language.locale];
  const next = language.locale === 'en' ? 'th' : 'en';
  return (
    <section className="rounded-2xl bg-white p-5" data-testid="mfe-profile" data-runtime-id={runtime.id}>
      <h2 className="font-serif text-3xl">{text.title}</h2>
      <p data-testid="profile-name">{auth.user?.displayName ?? text.guest}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-full bg-orange-700 px-3 py-1 text-white" data-testid="profile-language" onClick={() => requestLanguageChange(runtime, next, 'profile-mfe')}>{text.language}</button>
        <button type="button" className="rounded-full border px-3 py-1" data-testid="profile-products" onClick={() => requestNavigation(runtime, '/products', 'profile-mfe')}>{text.products}</button>
        <button type="button" className="rounded-full border px-3 py-1" data-testid="profile-logout" onClick={() => requestLogout(runtime, 'profile-mfe')}>{text.logout}</button>
      </div>
    </section>
  );
}
