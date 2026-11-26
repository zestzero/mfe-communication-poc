import { z } from 'zod';

export const CONTRACT_VERSION = 1 as const;

export const LocaleSchema = z.enum(['en', 'th']);
export const UserSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  roles: z.array(z.string()),
});
export const AuthStateSchema = z.object({
  status: z.enum(['anonymous', 'authenticated']),
  user: UserSchema.nullable(),
});
export const LanguageStateSchema = z.object({
  locale: LocaleSchema,
});
export const NavigationStateSchema = z.object({
  pathname: z.string().min(1),
  search: z.string(),
});
export const PlatformContextSchema = z.object({
  auth: AuthStateSchema,
  language: LanguageStateSchema,
  navigation: NavigationStateSchema,
});

export const appPaths = ['/', '/products', '/cart', '/profile'] as const;
export const protectedPaths = ['/cart', '/profile'] as const;
export const AppPathSchema = z.enum(appPaths);

export const LoginCommandSchema = z.object({
  username: z.string().min(1),
});
export const LogoutCommandSchema = z.object({});
export const LanguageCommandSchema = z.object({
  locale: LocaleSchema,
});
export const NavigationCommandSchema = z.object({
  destination: z.string().min(1),
});
export const AddCartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});
export const CartSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  userId: z.string().nullable(),
});

const envelope = <T extends z.ZodTypeAny>(type: string, payload: T) =>
  z.object({
    id: z.string().uuid(),
    type: z.literal(type),
    version: z.literal(CONTRACT_VERSION),
    source: z.string().min(1),
    timestamp: z.number().int().nonnegative(),
    correlationId: z.string().min(1).optional(),
    payload,
  });

export const AuthLoginRequestedSchema = envelope('auth.login.requested', LoginCommandSchema);
export const AuthLogoutRequestedSchema = envelope('auth.logout.requested', LogoutCommandSchema);
export const AuthChangedSchema = envelope('auth.changed', AuthStateSchema);
export const LanguageChangeRequestedSchema = envelope('language.change.requested', LanguageCommandSchema);
export const LanguageChangedSchema = envelope('language.changed', LanguageStateSchema);
export const NavigationRequestedSchema = envelope('navigation.requested', NavigationCommandSchema);
export const NavigationChangedSchema = envelope('navigation.changed', NavigationStateSchema);
export const CartItemAddRequestedSchema = envelope('cart.item.add.requested', AddCartItemSchema);
export const CartUpdatedSchema = envelope('cart.updated', CartSummarySchema);

export const PlatformMessageSchema = z.discriminatedUnion('type', [
  AuthLoginRequestedSchema,
  AuthLogoutRequestedSchema,
  AuthChangedSchema,
  LanguageChangeRequestedSchema,
  LanguageChangedSchema,
  NavigationRequestedSchema,
  NavigationChangedSchema,
  CartItemAddRequestedSchema,
  CartUpdatedSchema,
]);

export type Locale = z.infer<typeof LocaleSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthState = z.infer<typeof AuthStateSchema>;
export type LanguageState = z.infer<typeof LanguageStateSchema>;
export type NavigationState = z.infer<typeof NavigationStateSchema>;
export type PlatformContext = z.infer<typeof PlatformContextSchema>;
export type AppPath = z.infer<typeof AppPathSchema>;
export type PlatformMessage = z.infer<typeof PlatformMessageSchema>;
export type CartSummary = z.infer<typeof CartSummarySchema>;
export type AddCartItem = z.infer<typeof AddCartItemSchema>;

export const publicUsers: readonly User[] = [
  { id: 'user-mara', displayName: 'Mara Ellison', roles: ['buyer'] },
  { id: 'user-somchai', displayName: 'สมชาย ใจดี', roles: ['buyer'] },
];

export const anonymousContext: PlatformContext = {
  auth: { status: 'anonymous', user: null },
  language: { locale: 'en' },
  navigation: { pathname: '/', search: '' },
};

export const sharedModuleVersions = {
  react: '^19.3.1',
  reactDom: '^19.3.1',
  communication: '^1.0.0',
  contracts: '^1.0.0',
} as const;
