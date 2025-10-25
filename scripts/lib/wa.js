// Intent: centralize WhatsApp message formatting so we can change copy in one place.
import { settings } from '../config.js';

export function purchaseMessage(book) {
  // Why: consistent, friendly copy that matches Srikar's flow.
  return `Hi Srikar, I was going through the book deals on your website and I found a book I liked - "${book.title}"${book.author ? ` by ${book.author}` : ''}. I would like to buy this book!`;
}

export function requestMessage(req) {
  const parts = [
    'Hi Srikar, I would like to request for a book.',
    `Title: "${req.title}"`,
    `Author: ${req.author || 'Any'}`,
  ];
  if (req.notes) parts.push(`Notes: ${req.notes}`);
  if (req.contact) parts.push(`My contact: ${req.contact}`);
  return parts.join('\n');
}

export function waLink(text) {
  return `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
