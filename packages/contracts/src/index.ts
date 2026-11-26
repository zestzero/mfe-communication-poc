import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  priceCents: z.number().int().nonnegative(),
});

export const CartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

export const UserSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
});

export const SourceSchema = z.enum(['host', 'product', 'cart', 'profile']);

export const CatalogProductSelectedSchema = z.object({
  type: z.literal('catalog.product.selected'),
  source: SourceSchema,
  product: ProductSchema,
});

export const CartItemAddedSchema = z.object({
  type: z.literal('cart.item.added'),
  source: SourceSchema,
  item: CartItemSchema,
});

export const CartItemRemovedSchema = z.object({
  type: z.literal('cart.item.removed'),
  source: SourceSchema,
  productId: z.string().min(1),
  name: z.string().min(1),
});

export const ProfileUserSwitchedSchema = z.object({
  type: z.literal('profile.user.switched'),
  source: SourceSchema,
  user: UserSchema,
});

export const AppEventSchema = z.discriminatedUnion('type', [
  CatalogProductSelectedSchema,
  CartItemAddedSchema,
  CartItemRemovedSchema,
  ProfileUserSwitchedSchema,
]);

export type Product = z.infer<typeof ProductSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type User = z.infer<typeof UserSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type AppEvent = z.infer<typeof AppEventSchema>;

export const defaultUser: User = {
  id: 'user-mara',
  displayName: 'Mara Ellison',
  email: 'mara@northwind.example',
};

export const alternateUser: User = {
  id: 'user-julian',
  displayName: 'Julian Cho',
  email: 'julian@northwind.example',
};

const priceFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatPrice(cents: number): string {
  return priceFormat.format(cents / 100);
}
