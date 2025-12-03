import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/utils/preferences_helper.dart';

class LanguageToggle extends StatelessWidget {
  final bool compact;
  final Color? textColor;

  const LanguageToggle({super.key, this.compact = false, this.textColor});

  @override
  Widget build(BuildContext context) {
    final locale = context.locale;
    final isEnglish = locale.languageCode == 'en';
    final baseColor = textColor != null
        ? Colors.white.withOpacity(0.2)
        : AppColors.cardBackground.withOpacity(compact ? 0.4 : 0.8);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: baseColor,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: textColor?.withOpacity(0.3) ?? AppColors.border,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LanguageChip(
            label: 'EN',
            isActive: isEnglish,
            textColor: textColor,
            onTap: () => _setLocale(context, const Locale('en')),
          ),
          const SizedBox(width: 4),
          _LanguageChip(
            label: 'TWI',
            isActive: !isEnglish,
            textColor: textColor,
            onTap: () => _setLocale(context, const Locale('tw')),
          ),
        ],
      ),
    );
  }

  Future<void> _setLocale(BuildContext context, Locale locale) async {
    if (context.locale == locale) return;
    await context.setLocale(locale);
    await PreferencesHelper.setLanguage(locale.languageCode);
    await PreferencesHelper.setHasSelectedLanguage(true);
  }
}

class _LanguageChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  final Color? textColor;

  const _LanguageChip({
    required this.label,
    required this.isActive,
    required this.onTap,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isActive
              ? (textColor != null
                  ? Colors.white.withOpacity(0.3)
                  : AppColors.primary)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 11,
            color: isActive
                ? (textColor ?? Colors.white)
                : (textColor?.withOpacity(0.7) ?? AppColors.textSecondary),
          ),
        ),
      ),
    );
  }
}
