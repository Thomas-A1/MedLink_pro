import 'dart:async';
import 'dart:math' as math;

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/language_toggle.dart';
import '../../settings/presentation/settings_screen.dart';
import '../data/ai_service.dart';
import '../data/models/body_part.dart';
import 'screens/body_part_selection_screen.dart';

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
  bool _isListening = false;
  bool _keywordDetected = false;
  String _transcript = '';
  String? _translatedTranscript;
  bool _isAnalyzing = false;
  late final AnimationController _micPulseController;
  List<DoctorSuggestion> _suggestions = [];
  bool _translationSkipped = false;
  bool _connectingOverlayVisible = false;

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
        specialty: 'Neurology',
        facility: 'Korle Bu Teaching Hospital',
        rating: 4.7,
        waitTime: '≈ 12 min',
        languages: ['English'],
      ),
    ],
    'fever': [
      DoctorSuggestion(
        name: 'Dr. Nana Owusu',
        specialty: 'Infectious Disease',
        facility: 'Cape Coast Teaching Hospital',
        rating: 4.8,
        waitTime: '≈ 8 min',
        languages: ['English', 'Twi'],
      ),
    ],
    'pregnancy': [
      DoctorSuggestion(
        name: 'Dr. Abena Mensima',
        specialty: 'Obstetrics & Gynaecology',
        facility: '37 Military Hospital',
        rating: 4.9,
        waitTime: '≈ 6 min',
        languages: ['English', 'Twi'],
      ),
    ],
    'child': [
      DoctorSuggestion(
        name: 'Dr. Kofi Adjei',
        specialty: 'Paediatrics',
        facility: 'Greater Accra Regional Hospital',
        rating: 4.8,
        waitTime: '≈ 7 min',
        languages: ['English', 'Ga', 'Twi'],
      ),
    ],
    'breathing': [
      DoctorSuggestion(
        name: 'Dr. Esi Donkor',
        specialty: 'Pulmonology',
        facility: 'Komfo Anokye Teaching Hospital',
        rating: 4.8,
        waitTime: '≈ 10 min',
        languages: ['English'],
      ),
    ],
  };

  final List<String> _twiKeywords = [
    'ti',
    'tɔ',
    'yare',
    'fitaa',
    'ɛhuru',
    'ɛho yɛ me ya',
    'asow',
    'ayaresa',
    'me ba',
  ];

  @override
  void initState() {
    super.initState();
    _initSpeech();
    _micPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..addListener(() => setState(() {}));
  }

  Future<void> _initSpeech() async {
    final available = await _speech.initialize(
      debugLogging: false,
      onStatus: (status) {
        if (status == 'done') {
          setState(() => _isListening = false);
        }
      },
    );
    setState(() => _speechReady = available);
  }

  void _presentConnectingOverlay() {
    if (!mounted || _connectingOverlayVisible) return;
    _connectingOverlayVisible = true;
    Navigator.of(context, rootNavigator: true)
        .push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: false,
        barrierColor: Colors.black.withOpacity(0.5),
        pageBuilder: (_, __, ___) => const AiConnectingScreen(),
      ),
    )
        .whenComplete(() {
      _connectingOverlayVisible = false;
    });
  }

  @override
  void dispose() {
    _speech.stop();
    _micPulseController.dispose();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!_speechReady) return;
    setState(() {
      _transcript = '';
      _keywordDetected = false;
      _isListening = true;
      _suggestions = [];
      _translatedTranscript = null;
      _isAnalyzing = false;
      _translationSkipped = false;
    });
    _micPulseController.repeat(); // Start ripple animation
    await _speech.listen(
      localeId: context.locale.languageCode == 'tw' ? 'ak_GH' : 'en_GH',
      onResult: (result) {
        final text = result.recognizedWords.toLowerCase();
        setState(() {
          _transcript = result.recognizedWords;
          _translatedTranscript = null;
          if (text.contains('medlink')) {
            _keywordDetected = true;
          }
        });
      },
      listenMode: stt.ListenMode.dictation,
    );
  }

  Future<void> _stopListening() async {
    await _speech.stop();
    _micPulseController.stop(); // Stop ripple animation
    _micPulseController.reset();
    setState(() => _isListening = false);
  }

  Future<void> _analyzeTranscript() async {
    if (_transcript.trim().isEmpty) return;

    // Navigate to body part selection screen first
    if (!mounted) return;

    final complaint = await Navigator.of(context).pushNamed(
      BodyPartSelectionScreen.routeName,
      arguments: {
        'complaintText': _transcript,
        'audioUrl': null, // TODO: Add audio URL if recording is saved
      },
    );

    // User cancelled or didn't select a body part
    if (complaint == null || !mounted) return;

    // Import the SymptomComplaint model
    final symptomComplaint = complaint as SymptomComplaint;

    setState(() {
      _isAnalyzing = true;
    });
    _presentConnectingOverlay();

    try {
      final locale = context.locale;
      final translated =
          await _aiService.translateToEnglish(_transcript, locale);
      final text = translated.toLowerCase();
      final suggestions = <DoctorSuggestion>{};

      _keywordToDoctors.forEach((keyword, doctors) {
        if (text.contains(keyword)) {
          suggestions.addAll(doctors);
        }
      });

      for (final keyword in _twiKeywords) {
        if (text.contains(keyword)) {
          suggestions.addAll(_keywordToDoctors['headache'] ?? []);
        }
      }

      // Also consider body parts in doctor matching
      for (final bodyPartId in symptomComplaint.selectedBodyParts) {
        final bodyPart = bodyPartId.toLowerCase();
        // Map body parts to potential specialties
        if (bodyPart.contains('head') || bodyPart.contains('face')) {
          suggestions.addAll(_keywordToDoctors['headache'] ?? []);
        }
        if (bodyPart.contains('chest') || bodyPart.contains('back')) {
          // Add relevant doctors for chest/back issues
        }
      }

      if (!mounted) return;
      setState(() {
        _suggestions = suggestions.toList();
        _translatedTranscript = translated;
        _translationSkipped =
            translated.trim().toLowerCase() == _transcript.trim().toLowerCase();
        _isAnalyzing = false;
      });
    } finally {
      if (_connectingOverlayVisible && mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final headline = Theme.of(context).textTheme.displaySmall;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF04121F), Color(0xFF0A2D40), Color(0xFFF6FFF9)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ai.intake_title'.tr(),
                            style: headline?.copyWith(
                              color: Colors.white,
                              fontSize: 30,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'ai.intake_subtitle'.tr(),
                            style: Theme.of(context)
                                .textTheme
                                .bodyLarge
                                ?.copyWith(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    const LanguageToggle(compact: true),
                    IconButton(
                      icon: const Icon(Icons.settings_outlined,
                          color: Colors.white70),
                      onPressed: () => Navigator.of(context)
                          .pushNamed(SettingsScreen.routeName),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const _HeroCard(),
                const SizedBox(height: 20),
                _InstructionChips(isListening: _isListening),
                const SizedBox(height: 20),
                Center(
                  child: _MicVisualizer(
                    controller: _micPulseController,
                    isListening: _isListening,
                    onTap: _isListening ? _stopListening : _startListening,
                  ),
                ),
                const SizedBox(height: 28),
                _buildStatusCard(),
                const SizedBox(height: 16),
                _buildTranscriptCard(context),
                if (!_translationSkipped &&
                    _translatedTranscript != null &&
                    _translatedTranscript!.trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _TranslationCard(translatedText: _translatedTranscript!),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.auto_awesome),
                    onPressed: _transcript.isEmpty ? null : _analyzeTranscript,
                    label: _isAnalyzing
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Text('ai.analyze'.tr()),
                  ),
                ),
                if (_suggestions.isNotEmpty) ...[
                  const SizedBox(height: 28),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'ai.recommendations_title'.tr(),
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._suggestions
                      .map((doctor) => DoctorSuggestionCard(doctor: doctor))
                      .toList(),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    String title;
    String subtitle;

    if (!_speechReady) {
      title = 'ai.status_unavailable'.tr();
      subtitle = 'ai.status_unavailable_hint'.tr();
    } else if (_isListening && !_keywordDetected) {
      title = 'ai.status_listening'.tr();
      subtitle = 'ai.status_listening_hint'.tr();
    } else if (_keywordDetected) {
      title = 'ai.status_recording'.tr();
      subtitle = 'ai.status_recording_hint'.tr();
    } else {
      title = 'ai.status_ready'.tr();
      subtitle = 'ai.status_ready_hint'.tr();
    }

    return _FrostedCard(
      child: ListTile(
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(subtitle),
        trailing: Icon(
          _keywordDetected ? Icons.check_circle : Icons.podcasts_rounded,
          color: _keywordDetected ? AppColors.success : AppColors.primary,
        ),
      ),
    );
  }

  Widget _buildTranscriptCard(BuildContext context) {
    return _FrostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ai.transcript_title'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: AppColors.background,
              border: Border.all(color: AppColors.border),
            ),
            child: Text(
              _transcript.isEmpty
                  ? 'ai.transcript_placeholder'.tr()
                  : _transcript,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: _transcript.isEmpty
                        ? AppColors.textTertiary
                        : AppColors.textPrimary,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FrostedCard extends StatelessWidget {
  final Widget child;

  const _FrostedCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: Colors.white.withOpacity(0.85),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 25,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _MicVisualizer extends StatelessWidget {
  final AnimationController controller;
  final bool isListening;
  final VoidCallback onTap;

  const _MicVisualizer({
    required this.controller,
    required this.isListening,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final rings = [1.0, 0.75, 0.5];
    return GestureDetector(
      onTap: onTap,
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          final progress = controller.value;
          final baseOpacity = isListening ? 1.0 : 0.35;
          return SizedBox(
            width: 240,
            height: 240,
            child: Stack(
              alignment: Alignment.center,
              children: [
                for (final ring in rings)
                  Opacity(
                    opacity:
                        (baseOpacity * (1 - progress)).clamp(0.15, baseOpacity),
                    child: Transform.scale(
                      scale: ring + (isListening ? progress * 0.6 : 0.08),
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              AppColors.primary.withOpacity(
                                isListening ? 0.25 : 0.12,
                              ),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFF2AFADF),
                        Color(0xFF4C83FF),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.4),
                        blurRadius: 40,
                      ),
                    ],
                  ),
                  child: Icon(
                    isListening ? Icons.mic : Icons.mic_none_outlined,
                    color: Colors.white,
                    size: 56,
                  ),
                ),
                Positioned(
                  bottom: 6,
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 300),
                    opacity: isListening ? 1 : 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.95),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'ai.status_recording'.tr(),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _InstructionChips extends StatelessWidget {
  final bool isListening;

  const _InstructionChips({required this.isListening});

  @override
  Widget build(BuildContext context) {
    final items = <Map<String, dynamic>>[
      {
        'icon': Icons.graphic_eq,
        'label': 'ai.intake_title'.tr(),
      },
      {
        'icon': Icons.translate_rounded,
        'label':
            '${'common.language_name_en'.tr()} · ${'common.language_name_tw'.tr()}',
      },
      {
        'icon': isListening ? Icons.hearing : Icons.touch_app,
        'label': isListening ? 'ai.chip_listening'.tr() : 'ai.chip_tap'.tr(),
      },
    ];
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: items
          .map(
            (item) => Chip(
              avatar: Icon(item['icon'] as IconData,
                  size: 18, color: AppColors.primary),
              label: Text(item['label'] as String),
              backgroundColor: Colors.white.withOpacity(0.92),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: AppColors.border.withOpacity(0.8)),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2ECC71), Color(0xFF27AE60)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.25),
            blurRadius: 32,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ai.intake_title'.tr(),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            'ai.hero_subtitle'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withOpacity(0.85),
                ),
          ),
          const SizedBox(height: 18),
          Row(
            children: const [
              _HeroStat(label: 'Avg. wait', value: '≈ 6 min'),
              SizedBox(width: 16),
              _HeroStat(label: 'Doctors online', value: '48'),
            ],
          ),
        ],
      ),
    );
  }
}

class _TranslationCard extends StatelessWidget {
  final String translatedText;

  const _TranslationCard({required this.translatedText});

  @override
  Widget build(BuildContext context) {
    return _FrostedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ai.translated_summary_label'.tr(),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            translatedText,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.primaryDark,
                ),
          ),
        ],
      ),
    );
  }
}

class AiConnectingScreen extends StatefulWidget {
  const AiConnectingScreen({super.key});

  @override
  State<AiConnectingScreen> createState() => _AiConnectingScreenState();
}

class _AiConnectingScreenState extends State<AiConnectingScreen>
    with TickerProviderStateMixin {
  late final AnimationController _orbitController;
  late final AnimationController _pulseController;
  late final AnimationController _fadeController;
  late final Animation<double> _pulseAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _orbitController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _fadeAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _orbitController.dispose();
    _pulseController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black.withOpacity(0.7),
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.5,
            colors: [
              AppColors.primary.withOpacity(0.1),
              Colors.transparent,
            ],
          ),
        ),
        child: Center(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 32),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(32),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 50,
                  offset: const Offset(0, 20),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 220,
                  height: 220,
                  child: AnimatedBuilder(
                    animation: Listenable.merge([
                      _orbitController,
                      _pulseController,
                      _fadeController,
                    ]),
                    builder: (context, child) {
                      final angle = _orbitController.value * 6.28318;
                      return Stack(
                        alignment: Alignment.center,
                        children: [
                          // Outer pulsing rings
                          for (int i = 0; i < 3; i++)
                            Opacity(
                              opacity: _fadeAnimation.value * (1 - i * 0.2),
                              child: Transform.scale(
                                scale: _pulseAnimation.value + (i * 0.3),
                                child: Container(
                                  width: 180 - (i * 20),
                                  height: 180 - (i * 20),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppColors.primary.withOpacity(0.2),
                                      width: 2,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          // Orbiting doctor icons
                          for (int i = 0; i < 3; i++)
                            _OrbitingDot(
                              angle: angle + (i * 2.094), // 120° apart
                              radius: 75,
                              icon: [
                                Icons.favorite_rounded,
                                Icons.local_hospital_rounded,
                                Icons.biotech_rounded
                              ][i],
                            ),
                          // Center pulsing icon
                          Transform.scale(
                            scale: _pulseAnimation.value,
                            child: Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFF3949FF),
                                    Color(0xFF2D3DE3),
                                  ],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withOpacity(0.5),
                                    blurRadius: 40,
                                    spreadRadius: 5,
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.person_search_rounded,
                                color: Colors.white,
                                size: 48,
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                const SizedBox(height: 32),
                FadeTransition(
                  opacity: _fadeAnimation,
                  child: Text(
                    'ai.connecting.title'.tr(),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'ai.connecting.subtitle'.tr(),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                ),
                const SizedBox(height: 28),
                SizedBox(
                  height: 6,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      minHeight: 6,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        AppColors.primary,
                      ),
                      backgroundColor: AppColors.border,
                    ),
                  ),
                ),
              ],
            ),
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
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: [
              AppColors.primary.withOpacity(0.2),
              AppColors.primary.withOpacity(0.1),
            ],
          ),
          border: Border.all(
            color: AppColors.primary.withOpacity(0.3),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.2),
              blurRadius: 15,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Icon(
          icon,
          color: AppColors.primary,
          size: 28,
        ),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String label;
  final String value;

  const _HeroStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white70,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class DoctorSuggestion {
  final String name;
  final String specialty;
  final String facility;
  final double rating;
  final String waitTime;
  final List<String> languages;

  const DoctorSuggestion({
    required this.name,
    required this.specialty,
    required this.facility,
    required this.rating,
    required this.waitTime,
    required this.languages,
  });
}

class DoctorSuggestionCard extends StatelessWidget {
  final DoctorSuggestion doctor;

  const DoctorSuggestionCard({super.key, required this.doctor});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 25,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: AppColors.primary.withOpacity(0.12),
                child: Text(
                  doctor.name.substring(0, 1),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
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
                    Text(
                      doctor.specialty,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 18),
                      const SizedBox(width: 4),
                      Text(doctor.rating.toStringAsFixed(1)),
                    ],
                  ),
                  Text(
                    doctor.waitTime,
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.location_on_outlined,
                  color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Expanded(child: Text(doctor.facility)),
            ],
          ),
          if (doctor.languages.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'ai.language_label'.tr(),
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              children: doctor.languages
                  .map(
                    (lang) => Chip(
                      label: Text(lang),
                      backgroundColor: AppColors.background,
                      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () {},
                  child: Text('ai.connect_now'.tr()),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: () {},
                child: const Icon(Icons.info_outline),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
