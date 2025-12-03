import 'dart:convert';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class AiService {
  static final AiService _instance = AiService._internal();
  factory AiService() => _instance;
  AiService._internal();

  final _client = http.Client();

  // Use LibreTranslate API (free and open source) for Twi to English translation
  // Fallback to Google Translate API if available
  final String _libreTranslateUrl = 'https://libretranslate.com/translate';
  final String _googleTranslateUrl =
      'https://translate.googleapis.com/translate_a/single';

  Future<String> translateToEnglish(String text, Locale locale) async {
    if (text.trim().isEmpty || locale.languageCode == 'en') {
      return text;
    }

    // Try LibreTranslate first (free, no API key needed)
    try {
      final translated = await _translateWithLibreTranslate(text, locale);
      if (translated != text && translated.isNotEmpty) {
        debugPrint(
            '[MedLink] ✅ Translated via LibreTranslate: "$text" -> "$translated"');
        return translated;
      }
    } catch (e) {
      debugPrint('[MedLink] LibreTranslate failed: $e');
    }

    // Fallback to Google Translate (no API key needed for basic usage)
    try {
      final translated = await _translateWithGoogle(text, locale);
      if (translated != text && translated.isNotEmpty) {
        debugPrint(
            '[MedLink] ✅ Translated via Google: "$text" -> "$translated"');
        return translated;
      }
    } catch (e) {
      debugPrint('[MedLink] Google Translate failed: $e');
    }

    debugPrint('[MedLink] ⚠️ Translation failed, returning original text');
    return text;
  }

  Future<String> _translateWithLibreTranslate(
      String text, Locale locale) async {
    try {
      final sourceLang =
          locale.languageCode == 'tw' ? 'ak' : locale.languageCode;
      final response = await _client
          .post(
            Uri.parse(_libreTranslateUrl),
            headers: {
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'q': text,
              'source': sourceLang,
              'target': 'en',
              'format': 'text',
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['translatedText'] != null) {
          return data['translatedText'] as String;
        }
      }
    } catch (e) {
      debugPrint('[MedLink] LibreTranslate error: $e');
    }
    return text;
  }

  Future<String> _translateWithGoogle(String text, Locale locale) async {
    try {
      final sourceLang =
          locale.languageCode == 'tw' ? 'ak' : locale.languageCode;
      final url = Uri.parse(
        '$_googleTranslateUrl?client=gtx&sl=$sourceLang&tl=en&dt=t&q=${Uri.encodeComponent(text)}',
      );

      final response =
          await _client.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List && data.isNotEmpty && data[0] is List) {
          final translations = data[0] as List;
          if (translations.isNotEmpty && translations[0] is List) {
            final firstTranslation = translations[0] as List;
            if (firstTranslation.isNotEmpty && firstTranslation[0] != null) {
              return firstTranslation[0] as String;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[MedLink] Google Translate error: $e');
    }
    return text;
  }
}
