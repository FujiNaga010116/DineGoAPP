/**
 * Convert Vietnamese string with accents to URL-friendly ASCII slug
 * Example: "Phở Bò Tái Nạm 123" -> "pho-bo-tai-nam-123"
 */
export function generateSlug(text: string): string {
  if (!text) return '';

  let slug = text.toLowerCase();

  // Normalize Unicode characters to decompose accents
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Replace specific Vietnamese characters like đ, Đ
  slug = slug.replace(/[đĐ]/g, 'd');

  // Remove non-alphanumeric characters (except hyphens and spaces)
  slug = slug.replace(/[^a-z0-9\s-]/g, '');

  // Replace whitespace and multiple consecutive hyphens with a single hyphen
  slug = slug.trim().replace(/[\s-]+/g, '-');

  return slug;
}
