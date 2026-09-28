export function toppingMap(menu) {
  return new Map(menu.toppingCategories.flatMap((c) => c.items).map((t) => [t.id, t]));
}

/** Price a cart line against the current menu; flags anything that changed or sold out. */
export function priceLine(menu, line, tmap = toppingMap(menu)) {
  const egg = menu.eggs.find((e) => e.id === line.eggId);
  const base = menu.bases.find((b) => b.id === line.baseId);
  const style = menu.styles.find((s) => s.id === line.styleId);
  const tops = line.toppings.map((id) => tmap.get(id));
  const soldOut = tops.filter((t) => t && !t.available).map((t) => t.name);
  const valid = !!egg && !!base && !!style && tops.every(Boolean) && soldOut.length === 0;
  const unit = Math.max(0, (egg?.price || 0) + (base?.delta || 0) + tops.reduce((s, t) => s + (t?.price || 0), 0));
  return {
    valid,
    soldOut,
    unit,
    total: unit * line.qty,
    title: egg && base ? `ไข่เจียว ${egg.label} · ${base.label}` : 'เมนูนี้มีการเปลี่ยนแปลง',
    style: style?.label || '',
    eggCount: egg?.count || 1,
    toppingNames: tops.filter(Boolean).map((t) => `${t.emoji} ${t.name}`),
  };
}

export const newKey = () => Math.random().toString(36).slice(2, 10);

export function defaultDraft(menu) {
  const egg = menu.eggs.find((e) => e.popular) || menu.eggs[0];
  const style = menu.styles.find((s) => s.id === 'standard') || menu.styles[Math.floor(menu.styles.length / 2)];
  return { eggId: egg?.id, baseId: menu.bases[0]?.id, styleId: style?.id, toppings: [], qty: 1 };
}
