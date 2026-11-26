export const products = [
  { id: 'cedar-pour-over', priceCents: 4800, name: { en: 'Cedar Pour-Over', th: 'ดริปเปอร์ซีดาร์' }, detail: { en: 'Hand-thrown dripper with a walnut collar.', th: 'ดริปเปอร์ทำมือพร้อมคอวอลนัท' } },
  { id: 'linen-apron', priceCents: 6200, name: { en: 'Linen Apron', th: 'ผ้ากันเปื้อนลินิน' }, detail: { en: 'Stonewashed flax with crossed straps.', th: 'ลินินซักหินสายไขว้' } },
  { id: 'stoneware-mug', priceCents: 2800, name: { en: 'Stoneware Mug', th: 'แก้วสโตนแวร์' }, detail: { en: 'Speckled clay, twelve ounces.', th: 'ดินจุด สิบสองออนซ์' } },
] as const;

export const productCopy = {
  en: { title: 'The atelier', add: 'Add to cart', look: 'View basket', signedOut: 'Sign in before adding pieces.', selected: 'Selected' },
  th: { title: 'ห้องทำงาน', add: 'ใส่ตะกร้า', look: 'ดูตะกร้า', signedOut: 'เข้าสู่ระบบก่อนใส่สินค้า', selected: 'กำลังดู' },
};
