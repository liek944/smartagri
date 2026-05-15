/**
 * Client-side constants.
 * Product seed data now comes from the single authoritative source in server/seed-data.ts.
 */

import { Product } from './types';
import { SEED_PRODUCTS } from './server/seed-data';

export const INITIAL_PRODUCTS: Product[] = SEED_PRODUCTS.map((p, i) => ({
  ...p,
  id: String(i + 1),
}));
