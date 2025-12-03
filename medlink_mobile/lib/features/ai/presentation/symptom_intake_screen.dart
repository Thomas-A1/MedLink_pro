import 'dart:async';
import 'dart:math' as math;

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/language_toggle.dart';
import '../../auth/presentation/screens/login_screen.dart';
import '../data/ai_service.dart';
import '../data/models/body_part.dart';
import '../data/models/doctor_suggestion.dart';
import 'screens/body_part_selection_screen.dart';

/// Beautifully redesigned MedLink AI Intake Screen
///
/// Features:
/// - Modern, clean UI with beautiful gradients
/// - Large, prominent microphone for easy interaction
/// - Real-time transcript display
/// - Smooth animations and transitions
/// - Professional medical aesthetic
class SymptomIntakeScreen extends StatefulWidget {
  static const routeName = '/intake';

  const SymptomIntakeScreen({super.key});

  @override
  State<SymptomIntakeScreen> createState() => _SymptomIntakeScreenState();
}

class _SymptomIntakeScreenState extends State<SymptomIntakeScreen>
    with TickerProviderStateMixin {
  final stt.SpeechToText _speech = stt.SpeechToText();
  final AiService _aiService = AiService();
  bool _speechReady = false;
  List<stt.LocaleName> _availableLocales = [];
  bool _isListening = false;
  bool _speechPermanentlyFailed = false; // Track permanent failures
  String? _speechErrorMessage;
  String? _lastFailedLocale; // Track which locale failed to avoid retrying it
  String _transcript = '';
  String? _translatedTranscript;
  bool _translationSkipped = false;
  bool _isAnalyzing = false;
  List<DoctorSuggestion> _suggestions = [];
  bool _connectingOverlayVisible = false;

  late AnimationController _micPulseController;
  late AnimationController _breathingController;
  late Animation<double> _micScaleAnimation;
  late Animation<double> _micOpacityAnimation;
  late Animation<double> _breathingAnimation;

  final Map<String, List<DoctorSuggestion>> _keywordToDoctors = {
    'headache': [
      DoctorSuggestion(
        name: 'Dr. Akosua Boateng',
        specialty: 'General Practitioner',
        facility: 'MedLink Virtual Clinic',
        rating: 4.9,
        waitTime: '≈ 5 min',
        languages: ['English', 'Twi'],
      ),
      DoctorSuggestion(
        name: 'Dr. Kwesi Obeng',
        specialty: 'Neurologist',
        facility: 'Korle Bu Teaching Hospital',
        rating: 4.8,
        waitTime: '≈ 15 min',
        languages: ['English'],
      ),
    ],
    'fever': [
      DoctorSuggestion(
        name: 'Dr. Akosua Boateng',
        specialty: 'General Practitioner',
        facility: 'MedLink Virtual Clinic',
        rating: 4.9,
        waitTime: '≈ 5 min',
        languages: ['English', 'Twi'],
      ),
      DoctorSuggestion(
        name: 'Dr. Ama Serwaa',
        specialty: 'Pediatrician',
        facility: 'Ridge Hospital',
        rating: 4.7,
        waitTime: '≈ 10 min',
        languages: ['English', 'Twi', 'Ga'],
      ),
    ],
  };

  @override
  void initState() {
    super.initState();
    _initSpeech();

    _micPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );

    _breathingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _micScaleAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(
        parent: _micPulseController,
        curve: Curves.easeInOut,
      ),
    );

    _micOpacityAnimation = Tween<double>(begin: 0.0, end: 0.7).animate(
      CurvedAnimation(
        parent: _micPulseController,
        curve: Curves.easeInOut,
      ),
    );

    _breathingAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(
        parent: _breathingController,
        curve: Curves.easeInOut,
      ),
    );
  }

  Future<void> _initSpeech() async {
    _speechReady = await _speech.initialize(
      onStatus: (status) {
        debugPrint('Speech status: $status');
      },
      onError: (error) {
        debugPrint(
            'Speech error: ${error.errorMsg}, permanent: ${error.permanent}');

        // Treat error_listen_failed and error_retry as permanent to prevent loops
        final isPermanent = error.permanent ||
            error.errorMsg == 'error_listen_failed' ||
            error.errorMsg == 'error_retry';

        if (isPermanent && mounted) {
          setState(() {
            _speechReady = false;
            _speechPermanentlyFailed = true;
            _speechErrorMessage = _buildPermanentErrorMessage(error.errorMsg);
            if (_isListening) {
              _isListening = false;
            }
          });
          try {
            if (_speech.isListening) {
              _speech.stop();
            }
          } catch (e) {
            debugPrint('Error stopping speech after permanent error: $e');
          }
        }
      },
    );

    if (_speechReady) {
      try {
        _availableLocales = await _speech.locales();
        debugPrint(
            '🎙️ Available speech locales: ${_availableLocales.map((l) => l.localeId).join(', ')}');
      } catch (e) {
        debugPrint('⚠️ Failed to load speech locales: $e');
      }
    }

    if (mounted) {
      setState(() {});
    }
  }

  void _presentConnectingOverlay() {
    if (!mounted || _connectingOverlayVisible) return;
    _connectingOverlayVisible = true;
    Navigator.of(context, rootNavigator: true)
        .push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: false,
        barrierColor: Colors.black.withOpacity(0.6),
        pageBuilder: (_, __, ___) => const _AiConnectingScreen(),
      ),
    )
        .whenComplete(() {
      _connectingOverlayVisible = false;
    });
  }

  /// Handle back button press - safely stop speech and navigate
  Future<void> _handleBackButton(BuildContext context) async {
    // CRITICAL: Stop all speech recognition before navigation
    try {
      if (_isListening) {
        await _stopListening();
      }
      // Wait to ensure speech recognition is fully stopped
      await Future.delayed(const Duration(milliseconds: 200));
    } catch (e) {
      debugPrint('Error stopping speech before back navigation: $e');
    }

    if (!mounted) return;

    // Safely navigate back - check if we can pop
    // Use a mounted check to prevent BuildContext async gap issues
    final navigator = Navigator.of(context);
    if (mounted && navigator.canPop()) {
      navigator.pop();
    } else if (mounted) {
      // If we can't pop, navigate to login screen
      navigator.pushReplacementNamed(LoginScreen.routeName);
    }
  }

  @override
  void dispose() {
    // Stop all speech recognition in dispose
    try {
      if (_isListening) {
        _speech.stop();
      }
    } catch (e) {
      debugPrint('Error stopping speech in dispose: $e');
    }
    _micPulseController.dispose();
    _breathingController.dispose();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!mounted) return;

    // If speech permanently failed, try to re-initialize on manual retry
    if (_speechPermanentlyFailed || !_speechReady) {
      debugPrint('🔄 Re-initializing speech for manual retry');
      _speechPermanentlyFailed = false;
      _lastFailedLocale = null; // Reset failed locale on retry

      _speechReady = await _speech.initialize(
        onStatus: (status) {
          debugPrint('Speech status (retry): $status');
        },
        onError: (error) {
          debugPrint('Speech error (retry): ${error.errorMsg}');
          final isPermanent = error.permanent ||
              error.errorMsg == 'error_listen_failed' ||
              error.errorMsg == 'error_retry';
          if (isPermanent && mounted) {
            setState(() {
              _speechReady = false;
              _speechPermanentlyFailed = true;
              _speechErrorMessage = _buildPermanentErrorMessage(error.errorMsg);
            });
          }
        },
      );

      if (!_speechReady || !mounted) {
        debugPrint('⚠️ Speech re-initialization failed');
        if (mounted) {
          setState(() {
            _speechErrorMessage =
                'Speech recognition is not available. Please check your microphone permissions.';
          });
        }
        return;
      }

      // Reload available locales after re-initialization
      try {
        _availableLocales = await _speech.locales();
      } catch (e) {
        debugPrint('⚠️ Failed to reload speech locales: $e');
      }
    }

    if (!_speechReady || !mounted) return;

    try {
      // Check if speech is already listening
      if (_speech.isListening) {
        try {
          await _speech.stop();
          await Future.delayed(const Duration(milliseconds: 200));
        } catch (e) {
          debugPrint('Error stopping existing speech session: $e');
        }
      }

      if (!mounted) return;

      // Update UI immediately for responsive feedback
      setState(() {
        _transcript = '';
        _isListening = true;
        _suggestions = [];
        _translatedTranscript = null;
        _isAnalyzing = false;
        _translationSkipped = false;
        _speechErrorMessage = null; // Clear any previous errors
      });
      _micPulseController.repeat();

      // Get locale - support both 'tw' and 'ak' language codes for Twi
      // Avoid using a locale that previously failed
      final speechLocale = _resolveSpeechLocale();

      debugPrint(
          '🎤 Starting listening with locale: $speechLocale (app locale: ${context.locale.languageCode})');

      try {
        await _speech.listen(
          localeId: speechLocale,
          onResult: (result) {
            if (mounted) {
              // Update transcript in real-time for both partial and final results
              setState(() {
                _transcript = result.recognizedWords;
                _translatedTranscript = null;
              });

              // If this is a final result and we have text, translate if needed
              if (result.finalResult && result.recognizedWords.isNotEmpty) {
                debugPrint('Final transcript: ${result.recognizedWords}');
                // Auto-translate if user is speaking in Twi
                final locale = context.locale;
                if (locale.languageCode == 'tw' ||
                    locale.languageCode == 'ak') {
                  _translateTranscript(result.recognizedWords, locale);
                }
              }
            }
          },
          listenMode: stt.ListenMode.dictation,
          partialResults: true, // Enable partial results for real-time feedback
          cancelOnError: true, // Cancel on error to prevent hanging
          listenFor: const Duration(seconds: 30), // Allow longer listening
          pauseFor: const Duration(seconds: 3), // Pause before finalizing
        );
      } catch (e) {
        debugPrint('Error in listen call: $e');
        // Mark this locale as failed
        _lastFailedLocale = speechLocale;
        if (mounted) {
          setState(() {
            _isListening = false;
            _speechPermanentlyFailed = true;
            _speechErrorMessage =
                'Failed to start listening. Please try again or switch to English.';
          });
        }
        _micPulseController.stop();
        _micPulseController.reset();
      }
    } catch (e) {
      debugPrint('Error starting listening: $e');
      if (mounted) {
        setState(() {
          _isListening = false;
        });
        _micPulseController.stop();
        _micPulseController.reset();
      }
    }
  }

  /// Choose the most appropriate speech locale for the current app language.
  /// If Twi (`tw` / `ak`) is selected but `ak_GH` is not available on the
  /// device, we fall back to `en_GH` or another English locale instead of
  /// throwing a ListenFailedException.
  String _resolveSpeechLocale() {
    final appLocaleCode = context.locale.languageCode.toLowerCase();

    // Prefer Twi/Asante if it actually exists on the device
    if (appLocaleCode == 'tw' || appLocaleCode == 'ak') {
      final hasAkGh = _availableLocales.any((l) =>
          l.localeId.toLowerCase() == 'ak_gh' ||
          l.localeId.toLowerCase() == 'tw_gh');
      if (hasAkGh) {
        final match = _availableLocales.firstWhere(
          (l) =>
              l.localeId.toLowerCase() == 'ak_gh' ||
              l.localeId.toLowerCase() == 'tw_gh',
        );
        return match.localeId;
      }

      // Fallback to English (Ghana) if available
      final hasEnGh =
          _availableLocales.any((l) => l.localeId.toLowerCase() == 'en_gh');
      if (hasEnGh) {
        return _availableLocales
            .firstWhere((l) => l.localeId.toLowerCase() == 'en_gh')
            .localeId;
      }

      // As a last resort, try multiple English locales in order of preference
      // Prefer US English, then UK, then any other English locale
      // Skip any locale that previously failed
      final preferredEnglishLocales = [
        'en_US',
        'en_GB',
        'en_CA',
        'en_NZ',
        'en'
      ];
      for (final preferred in preferredEnglishLocales) {
        // Skip if this locale previously failed
        if (_lastFailedLocale?.toLowerCase() == preferred.toLowerCase()) {
          continue;
        }

        final match = _availableLocales.firstWhere(
          (l) => l.localeId.toLowerCase() == preferred.toLowerCase(),
          orElse: () => stt.LocaleName('', ''),
        );
        if (match.localeId.isNotEmpty) {
          debugPrint(
              '⚠️ Twi speech locale not available; falling back to ${match.localeId}');
          return match.localeId;
        }
      }

      // If no preferred English locale found, try any English locale (except failed ones)
      if (_availableLocales.isNotEmpty) {
        final englishLocales = _availableLocales
            .where(
              (l) =>
                  l.localeId.toLowerCase().startsWith('en') &&
                  l.localeId.toLowerCase() != _lastFailedLocale?.toLowerCase(),
            )
            .toList();

        if (englishLocales.isNotEmpty) {
          debugPrint(
              '⚠️ Twi speech locale not available; falling back to ${englishLocales.first.localeId}');
          return englishLocales.first.localeId;
        }

        // If all English locales failed, use the first available
        debugPrint(
            '⚠️ Twi speech locale not available; falling back to ${_availableLocales.first.localeId}');
        return _availableLocales.first.localeId;
      }

      // Fallback
      debugPrint('⚠️ Twi speech locale not available; using en_US as fallback');
      return 'en_US';
    }

    // Non-Twi: try to use an English locale that matches the region if possible
    final hasEnGh =
        _availableLocales.any((l) => l.localeId.toLowerCase() == 'en_gh');
    if (hasEnGh) {
      return _availableLocales
          .firstWhere((l) => l.localeId.toLowerCase() == 'en_gh')
          .localeId;
    }

    // Try multiple English locales in order of preference
    // Skip any locale that previously failed
    final preferredEnglishLocales = ['en_US', 'en_GB', 'en_CA', 'en_NZ', 'en'];
    for (final preferred in preferredEnglishLocales) {
      // Skip if this locale previously failed
      if (_lastFailedLocale?.toLowerCase() == preferred.toLowerCase()) {
        continue;
      }

      final match = _availableLocales.firstWhere(
        (l) => l.localeId.toLowerCase() == preferred.toLowerCase(),
        orElse: () => stt.LocaleName('', ''),
      );
      if (match.localeId.isNotEmpty) {
        return match.localeId;
      }
    }

    // If no preferred English locale found, try any English locale (except failed ones)
    if (_availableLocales.isNotEmpty) {
      final englishLocales = _availableLocales
          .where(
            (l) =>
                l.localeId.toLowerCase().startsWith('en') &&
                l.localeId.toLowerCase() != _lastFailedLocale?.toLowerCase(),
          )
          .toList();

      if (englishLocales.isNotEmpty) {
        return englishLocales.first.localeId;
      }

      // If all English locales failed, just use the first available
      return _availableLocales.first.localeId;
    }

    // Fallback
    return 'en_US';
  }

  Future<void> _stopListening() async {
    // OPTIMIZED: Stop animation immediately for responsive UI
    _micPulseController.stop();
    _micPulseController.reset();

    // Update state immediately to show UI change
    if (mounted) {
      setState(() {
        _isListening = false;
      });
    }

    // Stop speech recognition asynchronously (don't block UI)
    Future.microtask(() async {
      try {
        if (_speech.isListening) {
          await _speech.stop();
        }
      } catch (e) {
        debugPrint('Error stopping speech: $e');
      }
    });

    if (mounted) {
      // State already updated above
      setState(() {
        _isListening = false;
      });
    }
  }

  Future<void> _translateTranscript(String text, Locale locale) async {
    if (text.trim().isEmpty || locale.languageCode == 'en') {
      return;
    }

    try {
      final translated = await _aiService.translateToEnglish(text, locale);
      if (mounted && translated != text) {
        setState(() {
          _translatedTranscript = translated;
          _translationSkipped = false;
        });
        debugPrint('✅ Translated: "$text" -> "$translated"');
      }
    } catch (e) {
      debugPrint('Translation error: $e');
    }
  }

  Future<void> _analyzeTranscript() async {
    if (_transcript.trim().isEmpty) return;

    if (!mounted) return;

    // CRITICAL: Stop all speech recognition before navigation to prevent lag
    try {
      if (_isListening) {
        await _stopListening();
      }
      // Wait a bit to ensure speech recognition is fully stopped
      await Future.delayed(const Duration(milliseconds: 300));
    } catch (e) {
      debugPrint('Error stopping speech before navigation: $e');
    }

    if (!mounted) return;

    // Use translated transcript if available, otherwise use original
    final textToUse = _translatedTranscript ?? _transcript;

    final result = await Navigator.of(context).pushNamed(
      BodyPartSelectionScreen.routeName,
      arguments: {
        'complaintText': textToUse,
        'audioUrl': null,
      },
    );

    if (result == null || !mounted) return;

    final symptomComplaint = result as SymptomComplaint;

    setState(() {
      _isAnalyzing = true;
    });
    _presentConnectingOverlay();

    try {
      final locale = context.locale;
      // If already translated, use that; otherwise translate now
      final translated = _translatedTranscript ??
          await _aiService.translateToEnglish(
            symptomComplaint.complaintText,
            locale,
          );
      final text = translated.toLowerCase();
      final suggestions = <DoctorSuggestion>{};

      _keywordToDoctors.forEach((keyword, doctors) {
        if (text.contains(keyword)) {
          suggestions.addAll(doctors);
        }
      });

      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        setState(() {
          _suggestions = suggestions.toList();
          _translatedTranscript = translated;
          _translationSkipped = translated.trim().toLowerCase() ==
              symptomComplaint.complaintText.trim().toLowerCase();
          _isAnalyzing = false;
        });

        // Navigate to doctor search/booking with complaint
        if (_suggestions.isNotEmpty) {
          // TODO: Navigate to doctor selection screen with suggestions
          // For now, navigate to doctor search with complaint
          Navigator.of(context).pushNamed(
            '/doctors/search',
            arguments: {
              'complaint': symptomComplaint,
              'suggestions': _suggestions,
            },
          );
        } else {
          // No suggestions - navigate to general doctor search
          Navigator.of(context).pushNamed(
            '/doctors/search',
            arguments: {
              'complaint': symptomComplaint,
            },
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        setState(() {
          _isAnalyzing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Ensure UI is always visible, even if speech recognition has issues
    return Scaffold(
      backgroundColor: AppColors.primaryDark, // Fallback background
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.primaryDark,
              AppColors.primary,
              AppColors.primaryLight,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            stops: const [0.0, 0.5, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(context),
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      _buildHeroSection(context),
                      const SizedBox(height: 40),
                      _buildMicSection(context),
                      const SizedBox(height: 32),
                      if (_transcript.isNotEmpty) ...[
                        _buildTranscriptSection(context),
                        const SizedBox(height: 24),
                      ],
                      if (_translatedTranscript != null &&
                          !_translationSkipped) ...[
                        _buildTranslationSection(context),
                        const SizedBox(height: 24),
                      ],
                      if (_transcript.isNotEmpty && !_isAnalyzing)
                        _buildAnalyzeButton(context),
                      if (_suggestions.isNotEmpty) ...[
                        const SizedBox(height: 32),
                        _buildRecommendationsSection(context),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.arrow_back_ios_new_rounded,
                color: Colors.white,
                size: 18,
              ),
            ),
            onPressed: () => _handleBackButton(context),
          ),
          Text(
            'ai.intake_title'.tr(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
          ),
          const LanguageToggle(compact: true, textColor: Colors.white),
        ],
      ),
    );
  }

  Widget _buildHeroSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: Colors.white.withOpacity(0.3),
          width: 1.5,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MedLink AI',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ai.hero_subtitle'.tr(),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withOpacity(0.9),
                            height: 1.4,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: Colors.white,
                  size: 18,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'ai.intake_subtitle'.tr(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMicSection(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onTap: () async {
            // Immediately update UI to show responsiveness (don't wait for async)
            if (_isListening) {
              // Stop listening immediately - update UI first
              if (mounted) {
                setState(() {
                  _isListening = false;
                });
              }
              _micPulseController.stop();
              _micPulseController.reset();
              // Then stop speech asynchronously
              _stopListening();
            } else {
              // Start listening - update UI immediately for instant feedback
              if (mounted) {
                setState(() {
                  _isListening = true;
                  _transcript = '';
                  _speechErrorMessage = null;
                });
              }
              _micPulseController.repeat();
              // Then start speech recognition asynchronously
              _startListening();
            }
          },
          // Add behavior to prevent gesture conflicts
          behavior: HitTestBehavior.opaque,
          child: AnimatedBuilder(
            animation:
                Listenable.merge([_micPulseController, _breathingController]),
            builder: (context, child) {
              return Stack(
                alignment: Alignment.center,
                children: [
                  // Outer pulsating rings when listening
                  if (_isListening) ...[
                    Container(
                      width: 200 * _micScaleAnimation.value,
                      height: 200 * _micScaleAnimation.value,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(
                          _micOpacityAnimation.value * 0.3,
                        ),
                      ),
                    ),
                    Container(
                      width: 170 * _micScaleAnimation.value,
                      height: 170 * _micScaleAnimation.value,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(
                          _micOpacityAnimation.value * 0.5,
                        ),
                      ),
                    ),
                  ],
                  // Breathing animation when not listening
                  if (!_isListening)
                    Transform.scale(
                      scale: _breathingAnimation.value,
                      child: Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.1),
                        ),
                      ),
                    ),
                  // Main mic button
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: _isListening
                          ? const LinearGradient(
                              colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
                            )
                          : LinearGradient(
                              colors: [
                                Colors.white,
                                Colors.white.withOpacity(0.9),
                              ],
                            ),
                      boxShadow: [
                        BoxShadow(
                          color: (_isListening
                                  ? const Color(0xFFEF4444)
                                  : Colors.white)
                              .withOpacity(0.4),
                          blurRadius: 30,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Icon(
                      _isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                      color: _isListening ? Colors.white : AppColors.primary,
                      size: 56,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 24),
        // Show "uh huh" confirmation when wake word is detected (like Siri)
        if (_isListening && _transcript.isEmpty)
          Text(
            'Uh huh', // Siri-like confirmation
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontStyle: FontStyle.italic,
                ),
            textAlign: TextAlign.center,
          )
        else
          Text(
            _getStatusText(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
            textAlign: TextAlign.center,
          ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Text(
            _getStatusHint(),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withOpacity(0.85),
                  height: 1.5,
                ),
          ),
        ),
      ],
    );
  }

  String _getStatusText() {
    if (!_speechReady) {
      return _speechErrorMessage ?? 'ai.status_unavailable'.tr();
    } else if (_isListening) {
      return 'ai.status_recording'.tr();
    }
    return 'ai.status_ready'.tr();
  }

  String _getStatusHint() {
    if (!_speechReady) {
      return _speechErrorMessage ?? 'ai.status_unavailable_hint'.tr();
    } else if (_isListening) {
      return 'ai.status_recording_hint'.tr();
    }
    return 'ai.status_ready_hint'.tr();
  }

  /// Provide a user‑friendly explanation for permanent speech errors.
  String _buildPermanentErrorMessage(String code) {
    final appLocaleCode = context.locale.languageCode.toLowerCase();

    if (code == 'error_retry' &&
        (appLocaleCode == 'tw' || appLocaleCode == 'ak')) {
      // Device does not support Twi speech recognition reliably
      return 'Voice input is not available for Twi on this device. '
          'Please switch to English to use the microphone.';
    }

    // Generic permanent error
    return 'Voice input is currently unavailable on this device.';
  }

  Widget _buildTranscriptSection(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.text_fields_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'ai.transcript_title'.tr(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _transcript.isEmpty
                ? 'ai.transcript_placeholder'.tr()
                : _transcript,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: _transcript.isEmpty
                      ? AppColors.textTertiary
                      : AppColors.textPrimary,
                  height: 1.6,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildTranslationSection(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.infoLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.translate_rounded,
                  color: AppColors.info,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'ai.translated_summary_label'.tr(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _translatedTranscript ?? '',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.textPrimary,
                  height: 1.6,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyzeButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isAnalyzing ? null : _analyzeTranscript,
        icon: _isAnalyzing
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : const Icon(Icons.medical_services_rounded, size: 24),
        label: Text(
          'ai.analyze'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 18),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.primary,
          elevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildRecommendationsSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ai.recommendations_title'.tr(),
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
        ),
        const SizedBox(height: 16),
        ..._suggestions.map((suggestion) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _DoctorCard(doctor: suggestion),
            )),
      ],
    );
  }
}

class _DoctorCard extends StatelessWidget {
  final DoctorSuggestion doctor;

  const _DoctorCard({required this.doctor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryLight.withOpacity(0.2),
            ),
            child: Icon(
              Icons.person_rounded,
              color: AppColors.primary,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doctor.name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  doctor.specialty,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.star_rounded,
                      color: AppColors.warning,
                      size: 16,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${doctor.rating}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(width: 16),
                    Icon(
                      Icons.access_time_rounded,
                      size: 14,
                      color: AppColors.textTertiary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      doctor.waitTime,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textTertiary,
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Navigate to doctor detail
            },
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text('ai.connect_now'.tr()),
          ),
        ],
      ),
    );
  }
}

class _AiConnectingScreen extends StatefulWidget {
  const _AiConnectingScreen();

  @override
  State<_AiConnectingScreen> createState() => _AiConnectingScreenState();
}

class _AiConnectingScreenState extends State<_AiConnectingScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Center(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(32),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 40,
                offset: const Offset(0, 20),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 180,
                height: 180,
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    final angle = _controller.value * 6.28318;
                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        for (int i = 0; i < 3; i++)
                          _OrbitingDot(
                            angle: angle + (i * 2.094),
                            radius: 70,
                            icon: [
                              Icons.favorite_outline,
                              Icons.local_hospital_outlined,
                              Icons.biotech_outlined
                            ][i],
                          ),
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              colors: [
                                AppColors.primary,
                                AppColors.primaryDark
                              ],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.4),
                                blurRadius: 30,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.person_search_rounded,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'ai.connecting.title'.tr(),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'ai.connecting.subtitle'.tr(),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
              const SizedBox(height: 20),
              LinearProgressIndicator(
                minHeight: 6,
                valueColor:
                    const AlwaysStoppedAnimation<Color>(AppColors.primary),
                backgroundColor: AppColors.inputBackground,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrbitingDot extends StatelessWidget {
  final double angle;
  final double radius;
  final IconData icon;

  const _OrbitingDot({
    required this.angle,
    required this.radius,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final offsetX = radius * math.cos(angle);
    final offsetY = radius * math.sin(angle);
    return Transform.translate(
      offset: Offset(offsetX, offsetY),
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.primaryLight.withOpacity(0.2),
          border: Border.all(
            color: AppColors.primary.withOpacity(0.5),
            width: 1.5,
          ),
        ),
        child: Icon(
          icon,
          color: AppColors.primary,
          size: 24,
        ),
      ),
    );
  }
}
