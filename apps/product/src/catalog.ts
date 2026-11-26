import type { Product } from '@mfe/contracts';

export const products: readonly Product[] = [
  {
    id: 'cedar-pour-over',
    name: 'Cedar Pour-Over',
    description: 'Hand-thrown dripper with a walnut collar.',
    priceCents: 4800,
  },
  {
    id: 'linen-apron',
    name: 'Linen Apron',
    description: 'Stonewashed flax with crossed back straps.',
    priceCents: 6200,
  },
  {
    id: 'stoneware-mug',
    name: 'Stoneware Mug',
    description: 'Speckled clay, twelve ounces.',
    priceCents: 2800,
  },
  {
    id: 'brass-kettle',
    name: 'Brass Kettle',
    description: 'Spun brass with an oak handle.',
    priceCents: 12400,
  },
];
