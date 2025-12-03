import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'shared/theme/app_theme.dart';
import 'core/constants/app_constants.dart';
import 'core/utils/preferences_helper.dart';
import 'features/auth/presentation/screens/splash_screen.dart';
import 'features/auth/presentation/screens/onboarding_screen.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/auth/presentation/screens/register_screen.dart';
import 'features/auth/presentation/screens/verify_otp_screen.dart';
import 'features/profile/presentation/screens/edit_profile_screen.dart';
import 'features/profile/presentation/screens/change_password_screen.dart';
import 'features/ai/presentation/symptom_intake_screen.dart';
import 'features/ai/presentation/screens/body_part_selection_screen.dart';
import 'features/home/presentation/screens/home_screen.dart';
import 'features/doctor/presentation/screens/doctor_search_screen.dart';
import 'features/doctor/presentation/screens/doctor_detail_screen.dart';
import 'features/profile/presentation/screens/profile_screen.dart';
import 'features/settings/presentation/settings_screen.dart';
import 'features/consultation/presentation/screens/consultation_booking_screen.dart';
import 'features/consultation/presentation/screens/consultations_list_screen.dart';
import 'features/payment/presentation/screens/payment_screen.dart';
import 'features/queue/presentation/screens/queue_screen.dart';
import 'features/consultation/presentation/screens/consultation_call_screen.dart';
import 'features/consultation/presentation/screens/consultation_summary_screen.dart';
import 'features/reviews/presentation/screens/review_submission_screen.dart';
import 'features/location/presentation/screens/map_search_screen.dart';
import 'features/location/presentation/screens/pharmacy_detail_screen.dart';
import 'features/location/presentation/screens/hospital_detail_screen.dart';
import 'features/settings/presentation/settings_screen.dart'
    show darkModeProvider;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  await _loadEnvFile();
  final savedLanguage = await PreferencesHelper.getLanguage();
  final startLocale = Locale(savedLanguage);
  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('tw')],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      startLocale: startLocale,
      child: const ProviderScope(
        child: MedLinkApp(),
      ),
    ),
  );
}

Future<void> _loadEnvFile() async {
  try {
    await dotenv.load(fileName: ".env");
  } on FileNotFoundError catch (_) {
    debugPrint(
      "[MedLink] .env file not found. AI features needing external keys will use defaults.",
    );
  }
}

class MedLinkApp extends ConsumerWidget {
  const MedLinkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(darkModeProvider);

    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      locale: context.locale,
      supportedLocales: context.supportedLocales,
      localizationsDelegates: [
        ...context.localizationDelegates,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        const _TwiMaterialLocalizationDelegate(),
        const _TwiCupertinoLocalizationDelegate(),
        const _TwiWidgetLocalizationDelegate(),
      ],
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
      initialRoute: SplashScreen.routeName,
      routes: {
        SplashScreen.routeName: (context) => const SplashScreen(),
        OnboardingScreen.routeName: (context) => const OnboardingScreen(),
        LoginScreen.routeName: (context) => const LoginScreen(),
        RegisterScreen.routeName: (context) => const RegisterScreen(),
        VerifyOtpScreen.routeName: (context) {
          final args =
              ModalRoute.of(context)!.settings.arguments as VerifyOtpScreen;
          return args;
        },
        HomeScreen.routeName: (context) => const HomeScreen(),
        SymptomIntakeScreen.routeName: (context) => const SymptomIntakeScreen(),
        BodyPartSelectionScreen.routeName: (context) =>
            const BodyPartSelectionScreen(),
        DoctorSearchScreen.routeName: (context) => const DoctorSearchScreen(),
        DoctorDetailScreen.routeName: (context) => const DoctorDetailScreen(),
        ConsultationBookingScreen.routeName: (context) =>
            const ConsultationBookingScreen(),
        ConsultationsListScreen.routeName: (context) =>
            const ConsultationsListScreen(),
        PaymentScreen.routeName: (context) => const PaymentScreen(),
        QueueScreen.routeName: (context) => const QueueScreen(),
        ConsultationCallScreen.routeName: (context) =>
            const ConsultationCallScreen(),
        ConsultationSummaryScreen.routeName: (context) =>
            const ConsultationSummaryScreen(),
        ReviewSubmissionScreen.routeName: (context) =>
            const ReviewSubmissionScreen(),
        MapSearchScreen.routeName: (context) => const MapSearchScreen(),
        PharmacyDetailScreen.routeName: (context) =>
            const PharmacyDetailScreen(),
        HospitalDetailScreen.routeName: (context) =>
            const HospitalDetailScreen(),
        ProfileScreen.routeName: (context) => const ProfileScreen(),
        EditProfileScreen.routeName: (context) => const EditProfileScreen(),
        ChangePasswordScreen.routeName: (context) =>
            const ChangePasswordScreen(),
        SettingsScreen.routeName: (context) => const SettingsScreen(),
      },
      onUnknownRoute: (settings) {
        // Fallback for unknown routes
        return MaterialPageRoute(
          builder: (context) => const SplashScreen(),
        );
      },
    );
  }
}

class _TwiMaterialLocalizationDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  const _TwiMaterialLocalizationDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode.toLowerCase() == 'tw';

  @override
  Future<MaterialLocalizations> load(Locale locale) {
    return GlobalMaterialLocalizations.delegate
        .load(const Locale('en')); // fallback to English strings
  }

  @override
  bool shouldReload(_TwiMaterialLocalizationDelegate old) => false;
}

class _TwiCupertinoLocalizationDelegate
    extends LocalizationsDelegate<CupertinoLocalizations> {
  const _TwiCupertinoLocalizationDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode.toLowerCase() == 'tw';

  @override
  Future<CupertinoLocalizations> load(Locale locale) {
    return GlobalCupertinoLocalizations.delegate
        .load(const Locale('en')); // reuse English copy
  }

  @override
  bool shouldReload(_TwiCupertinoLocalizationDelegate old) => false;
}

class _TwiWidgetLocalizationDelegate
    extends LocalizationsDelegate<WidgetsLocalizations> {
  const _TwiWidgetLocalizationDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode.toLowerCase() == 'tw';

  @override
  Future<WidgetsLocalizations> load(Locale locale) {
    return GlobalWidgetsLocalizations.delegate.load(const Locale('en'));
  }

  @override
  bool shouldReload(_TwiWidgetLocalizationDelegate old) => false;
}
