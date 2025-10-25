// Intent: keep pricing policy separate so Srikar can tweak discounts without touching other code.
export const DISCOUNT = {
  'Good as new': 0.40,
  'Excellent':   0.40,
  'Gently used': 0.50,
  'Used':        0.60
};

export function bindAutoPrice(addForm){
  const priceInput = addForm.elements['price'];
  const mrpInput   = addForm.elements['mrp'];
  const condSelect = addForm.elements['condition'];

  function autoPrice(){
    const mrp = parseInt(mrpInput?.value ?? '', 10);
    const cond = condSelect?.value || '';
    const d = DISCOUNT[cond];
    if (!isNaN(mrp) && d != null) {
      const computed = Math.max(1, Math.round(mrp * (1 - d)));
      priceInput.value = String(computed);
    }
  }
  mrpInput?.addEventListener('input', autoPrice);
  condSelect?.addEventListener('change', autoPrice);
  return autoPrice; // expose so lookup can trigger once after it fills MRP
}
