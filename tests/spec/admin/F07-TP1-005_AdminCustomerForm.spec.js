import { readFileSync } from 'node:fs';
import { TextDecoder, TextEncoder } from 'node:util';

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder;
}

const adminHtmlUrl = new URL('../../../admin.html', import.meta.url);

describe('SPEC F07-TP1-005: Admin customer form is present without country code input', () => {
  test('admin.html exposes the add customer form fields but hides country code', async () => {
    const { JSDOM } = await import('jsdom');
    const html = readFileSync(adminHtmlUrl, 'utf-8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const customerForm = doc.querySelector('#customerForm');
    expect(customerForm).toBeTruthy();

    const requiredSelectors = [
      'input[name="customerName"]',
      'textarea[name="customerAddress"]',
      'input[name="customerLocation"]',
      'input[name="customerWhatsApp"]',
    ];

    requiredSelectors.forEach((selector) => {
      expect(customerForm.querySelector(selector)).toBeTruthy();
    });

    const countryCodeField = customerForm.querySelector(
      'input[name="countryCode"], select[name="countryCode"], #customerCountryCode'
    );
    expect(countryCodeField).toBeNull();
  });
});
