class AppConstants {
  // App Info
  static const String appName = 'MedLink';
  static const String appVersion = '1.0.0';

  // API Configuration
  // Use your Mac's IP address instead of localhost for physical device testing
  // To find your Mac's IP: ifconfig | grep "inet " | grep -v 127.0.0.1
  // For iOS Simulator, use localhost. For physical device, use your Mac's IP
  // Update this IP if your network changes
  static const String baseUrl = 'http://172.20.10.2:4100/api';

  // Alternative: Use localhost for simulator (uncomment if testing on simulator)
  // static const String baseUrl = 'http://localhost:4100/api';
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String languageKey = 'language';
  static const String themeKey = 'theme';

  // Supported Languages
  static const String defaultLanguage = 'en';
  static const List<String> supportedLanguages = ['en', 'tw']; // English, Twi

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Timeouts
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration webRtcTimeout = Duration(seconds: 60);

  // File Limits
  static const int maxFileSize = 10 * 1024 * 1024; // 10MB
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif'];
  static const List<String> allowedDocumentTypes = ['pdf', 'doc', 'docx'];
}
