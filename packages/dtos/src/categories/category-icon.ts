import z from 'zod';

export const CATEGORY_ICONS = [
  'restaurant-outline',
  'cart-outline',
  'car-outline',
  'bus-outline',
  'home-outline',
  'flash-outline',
  'medical-outline',
  'fitness-outline',
  'school-outline',
  'shirt-outline',
  'gift-outline',
  'airplane-outline',
  'card-outline',
  'wallet-outline',
  'cash-outline',
  'pricetag-outline',
  'receipt-outline',
  'cafe-outline',
  'beer-outline',
  'paw-outline'
] as const;

export const categoryIconSchema = z.enum(CATEGORY_ICONS);

export type CategoryIcon = z.infer<typeof categoryIconSchema>;
