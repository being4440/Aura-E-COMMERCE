/**
 * Formats a MongoDB Order _id to display only the last 8 hexadecimal characters,
 * prefixed with # and in uppercase.
 * 
 * Example:
 * Input: "68873af3d2f8a7b51e5c9e31"
 * Output: "#1E5C9E31"
 * 
 * @param {string} id - The MongoDB Order _id or formatted string
 * @returns {string} Formatted Order ID
 */
export const formatOrderId = (id) => {
  if (!id) return '';
  const str = String(id).replace(/^#/, '');
  const last8 = str.slice(-8).toUpperCase();
  return `#${last8}`;
};

/**
 * Formats an invoice number for a given Order ID or existing invoice string.
 * Example:
 * Input: "68873af3d2f8a7b51e5c9e31" or "INV-1E5C9E31"
 * Output: "INV-1E5C9E31"
 * 
 * @param {string} idOrInvoice - The order _id or existing invoice number
 * @returns {string} Formatted Invoice Number
 */
export const formatInvoiceNumber = (idOrInvoice) => {
  if (!idOrInvoice) return '';
  const str = String(idOrInvoice);
  if (str.startsWith('INV-')) return str.toUpperCase();
  const clean = str.replace(/^#/, '');
  const last8 = clean.slice(-8).toUpperCase();
  return `INV-${last8}`;
};
