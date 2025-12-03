import 'package:flutter/material.dart';

/// Clean, Modern Color Palette for MedLink
/// Professional healthcare app with excellent readability and aesthetics
class AppColors {
  // Primary Healthcare Green - Trustworthy, Calming
  static const Color primary = Color(0xFF10B981); // Emerald green
  static const Color primaryDark = Color(0xFF059669);
  static const Color primaryLight = Color(0xFF34D399);
  static const Color primaryUltraLight = Color(0xFFD1FAE5);

  // Accent Colors - Subtle and Professional
  static const Color secondary = Color(0xFF3B82F6); // Professional blue
  static const Color accent = Color(0xFF8B5CF6); // Soft purple
  static const Color accentLight = Color(0xFFA78BFA);

  // Neutral System - Clean and Modern
  static const Color background =
      Color(0xFFFAFBFC); // Almost white, very subtle gray
  static const Color surface = Color(0xFFFFFFFF);
  static const Color cardBackground = Color(0xFFFFFFFF);
  static const Color inputBackground = Color(0xFFF9FAFB);
  static const Color dividerBackground = Color(0xFFF3F4F6);

  // Typography - High Contrast for Readability
  static const Color textPrimary = Color(0xFF111827); // Almost black
  static const Color textSecondary = Color(0xFF6B7280); // Medium gray
  static const Color textTertiary = Color(0xFF9CA3AF); // Light gray
  static const Color textDisabled = Color(0xFFD1D5DB);

  // Status Colors - Clear and Distinct
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color error = Color(0xFFEF4444);
  static const Color errorDark = Color(0xFFDC2626);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);

  // Borders & Dividers - Subtle
  static const Color border = Color(0xFFE5E7EB);
  static const Color borderLight = Color(0xFFF3F4F6);
  static const Color divider = Color(0xFFE5E7EB);

  // Overlay & Shadows
  static const Color overlay = Color(0x80000000); // 50% black overlay
  static const Color shadow = Color(0x1A000000); // Subtle shadow

  // Gradients - Clean and Modern
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient subtleGradient = LinearGradient(
    colors: [Color(0xFFFAFBFC), Color(0xFFF3F4F6)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient overlayGradient = LinearGradient(
    colors: [Colors.transparent, Color(0xE6000000)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Glass Morphism Effect
  static Color glassBackground = Colors.white.withOpacity(0.7);
  static Color glassBorder = Colors.white.withOpacity(0.18);
}
