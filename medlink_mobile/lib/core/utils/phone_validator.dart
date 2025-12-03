/// Phone number validation and normalization utilities for Ghana phone numbers
class PhoneValidator {
  /// Normalizes a Ghana phone number to a standard format
  /// Converts +233 to 0 prefix and vice versa
  /// Returns normalized phone number (10 digits starting with 0)
  /// Examples: +233548200410 -> 0548200410, 233548200410 -> 0548200410
  static String normalizePhoneNumber(String phone) {
    if (phone.trim().isEmpty) return phone;

    // Remove all non-digit characters
    final digitsOnly = phone.replaceAll(RegExp(r'[^\d]'), '');

    // If starts with 233 (with or without +), convert to 0 prefix
    // Handles: +233548200410 (13 chars with +) or 233548200410 (12 digits)
    if (digitsOnly.startsWith('233')) {
      if (digitsOnly.length == 12 || digitsOnly.length == 13) {
        return '0${digitsOnly.substring(3)}';
      }
    }

    // If 9 digits (without leading 0), add 0 prefix
    if (digitsOnly.length == 9) {
      return '0$digitsOnly';
    }

    // If already 10 digits starting with 0, return as is
    if (digitsOnly.length == 10 && digitsOnly.startsWith('0')) {
      return digitsOnly;
    }

    // Return original if can't normalize
    return phone;
  }

  /// Validates a Ghana phone number
  /// Accepts formats: 0XX XXX XXXX, +233XX XXX XXXX, 233XX XXX XXXX, XX XXX XXXX
  /// Treats +233 and 0 as equivalent (e.g., +233548200410 = 0548200410)
  static bool isValidGhanaPhoneNumber(String phone) {
    if (phone.trim().isEmpty) return false;

    // Normalize first - this handles +233 to 0 conversion
    final normalized = normalizePhoneNumber(phone);

    // Remove all non-digit characters for validation
    final digitsOnly = normalized.replaceAll(RegExp(r'[^\d]'), '');

    // Must be 10 digits starting with 0
    if (digitsOnly.length != 10 || !digitsOnly.startsWith('0')) {
      return false;
    }

    // Valid prefixes: 020, 024, 026, 027, 050, 054, 055, 056, 057, 059
    final prefix = digitsOnly.substring(1, 3);
    final validPrefixes = [
      '20',
      '24',
      '26',
      '27',
      '50',
      '54',
      '55',
      '56',
      '57',
      '59'
    ];

    return validPrefixes.contains(prefix);
  }

  /// Compares two phone numbers, treating +233 and 0 as equivalent
  static bool arePhoneNumbersEqual(String phone1, String phone2) {
    return normalizePhoneNumber(phone1) == normalizePhoneNumber(phone2);
  }

  /// Formats phone number for display (0XX XXX XXXX)
  static String formatPhoneNumber(String phone) {
    final normalized = normalizePhoneNumber(phone);
    final digitsOnly = normalized.replaceAll(RegExp(r'[^\d]'), '');

    if (digitsOnly.length == 10) {
      return '${digitsOnly.substring(0, 3)} ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6)}';
    }

    return phone;
  }
}
