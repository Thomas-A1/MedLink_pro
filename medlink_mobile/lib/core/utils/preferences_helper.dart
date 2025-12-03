import 'package:shared_preferences/shared_preferences.dart';

class PreferencesHelper {
  static const String _hasSeenOnboardingKey = 'has_seen_onboarding';
  static const String _languageSelectedKey = 'has_selected_language';
  static const String _languageKey = 'language';
  static const String _themeKey = 'theme';

  static Future<SharedPreferences> get _prefs async =>
      await SharedPreferences.getInstance();

  // Onboarding
  static Future<bool> getHasSeenOnboarding() async {
    final prefs = await _prefs;
    return prefs.getBool(_hasSeenOnboardingKey) ?? false;
  }

  static Future<void> setHasSeenOnboarding(bool value) async {
    final prefs = await _prefs;
    await prefs.setBool(_hasSeenOnboardingKey, value);
  }

  // Language
  static Future<bool> getHasSelectedLanguage() async {
    final prefs = await _prefs;
    return prefs.getBool(_languageSelectedKey) ?? false;
  }

  static Future<void> setHasSelectedLanguage(bool value) async {
    final prefs = await _prefs;
    await prefs.setBool(_languageSelectedKey, value);
  }

  static Future<String> getLanguage() async {
    final prefs = await _prefs;
    return prefs.getString(_languageKey) ?? 'en';
  }

  static Future<void> setLanguage(String language) async {
    final prefs = await _prefs;
    await prefs.setString(_languageKey, language);
  }

  // Theme
  static Future<String> getTheme() async {
    final prefs = await _prefs;
    return prefs.getString(_themeKey) ?? 'light';
  }

  static Future<void> setTheme(String theme) async {
    final prefs = await _prefs;
    await prefs.setString(_themeKey, theme);
  }
}
