/**
 * Pure validation functions — no React dependencies.
 * Each returns null on success, or an error message string on failure.
 */

export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return 'Phone number is required.';
  if (digits.length < 11) return `${11 - digits.length} more digit${11 - digits.length > 1 ? 's' : ''} needed.`;
  if (digits.length > 11) return 'Phone number must be exactly 11 digits.';
  if (!/^09/.test(digits)) return 'Must start with 09 (e.g. 09171234567).';
  return null;
}

export function validatePhoneStrict(digits: string): string | null {
  if (digits.length !== 11) return 'Phone number must be exactly 11 digits.';
  if (!/^09/.test(digits)) return 'Must start with 09 (e.g. 09171234567).';
  return null;
}

export function validateDelivery(value: string): string | null {
  if (value.trim().length === 0) return 'Barangay is required.';
  if (value.trim().length < 3) return 'Please enter a valid barangay name.';
  return null;
}

export function validateAuthRegister(data: {
  fullName: string;
  username: string;
  email: string;
  password: string;
}): string | null {
  if (data.fullName.length < 2) return 'Full name must be at least 2 characters.';
  if (data.fullName.length > 60) return 'Full name must be 60 characters or fewer.';
  if (data.username.length < 3) return 'Username must be at least 3 characters.';
  if (data.username.length > 30) return 'Username must be 30 characters or fewer.';
  if (!/^[a-zA-Z0-9._-]+$/.test(data.username))
    return 'Username can only contain letters, numbers, dots, hyphens, or underscores.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) return 'Please enter a valid email address.';
  if (data.password.length < 6) return 'Password must be at least 6 characters.';
  if (data.password.length > 128) return 'Password must be 128 characters or fewer.';
  return null;
}

export function validateAuthLogin(data: {
  email: string;
  password: string;
}): string | null {
  if (data.email.length < 1) return 'Please enter your email or username.';
  if (data.password.length < 1) return 'Please enter your password.';
  return null;
}

export function validateProduct(data: {
  name: string;
  price: number;
  stock: number;
  description: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data.name.length < 2) errors.name = 'Product name must be at least 2 characters.';
  if (data.name.length > 80) errors.name = 'Product name must be 80 characters or fewer.';
  if (!data.price || data.price <= 0) errors.price = 'Price must be greater than 0.';
  if (data.price > 999999) errors.price = 'Price seems too high. Max is ₱999,999.';
  if (!Number.isInteger(data.price) && String(data.price).split('.')[1]?.length > 2)
    errors.price = 'Max 2 decimal places.';
  if (!data.stock || data.stock < 1) errors.stock = 'Stock must be at least 1.';
  if (data.stock > 99999) errors.stock = 'Stock seems too high. Max is 99,999.';
  if (!Number.isInteger(data.stock)) errors.stock = 'Stock must be a whole number.';
  if (data.description.length > 500)
    errors.description = `Too long — ${data.description.length}/500 characters.`;
  return errors;
}
