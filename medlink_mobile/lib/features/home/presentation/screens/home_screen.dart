import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/providers/session_provider.dart';
import '../../../../shared/widgets/profile_avatar.dart';
import '../../../ai/presentation/symptom_intake_screen.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../doctor/presentation/screens/doctor_search_screen.dart';
import '../../../location/presentation/screens/map_search_screen.dart';
import '../../../queue/presentation/screens/queue_screen.dart';
import '../../../settings/presentation/settings_screen.dart';
import '../../../consultation/presentation/screens/consultations_list_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  static const routeName = '/home';

  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentTipIndex = 0;
  Timer? _tipTimer;

  final List<String> _healthTips = [
    'Stay hydrated, get regular exercise, and maintain a balanced diet for optimal health.',
    'Get at least 7-8 hours of sleep each night to support your immune system and mental health.',
    'Wash your hands regularly with soap and water for at least 20 seconds to prevent infections.',
    'Schedule regular check-ups with your doctor to catch health issues early.',
    'Practice stress management techniques like meditation or deep breathing exercises.',
    'Limit processed foods and sugar intake. Focus on whole grains, fruits, and vegetables.',
    'Stay active with at least 30 minutes of moderate exercise most days of the week.',
    'Protect your skin from UV rays by wearing sunscreen and protective clothing.',
    'Stay connected with friends and family for better mental and emotional well-being.',
    'Take breaks from screens every hour to reduce eye strain and improve posture.',
  ];

  @override
  void initState() {
    super.initState();
    _startTipRotation();
  }

  @override
  void dispose() {
    _tipTimer?.cancel();
    super.dispose();
  }

  void _startTipRotation() {
    _tipTimer = Timer.periodic(const Duration(seconds: 8), (timer) {
      if (mounted) {
        setState(() {
          _currentTipIndex = (_currentTipIndex + 1) % _healthTips.length;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider);
    final isDoctor = user?.isDoctor ?? false;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hasUnreadNotifications =
        false; // TODO: Get from notification provider

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppColors.background,
      appBar: AppBar(
        backgroundColor:
            isDark ? const Color(0xFF0F172A) : AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.settings_rounded,
            color: isDark ? Colors.white : AppColors.primaryDark,
          ),
          onPressed: () {
            Navigator.of(context).pushNamed(SettingsScreen.routeName);
          },
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: ProfileAvatarWithNavigation(
              radius: 20,
              showBorder: false,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Content
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 8),
                  _buildHeader(context, user, isDark, hasUnreadNotifications),
                  const SizedBox(height: 24),
                  _buildQuickActions(context, isDoctor, isDark),
                  const SizedBox(height: 24),
                  _buildMainOptions(context, isDoctor, isDark),
                  const SizedBox(height: 24),
                  _buildHealthTips(context, isDark),
                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, UserModel? user, bool isDark,
      bool hasUnreadNotifications) {
    final roleLabel = _roleLabel(user?.role);
    final firstName = user?.fullName.split(' ').first ?? 'Guest';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primaryDark,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // "Hello," and name on the same line
                Row(
                  children: [
                    Text(
                      'Hello,',
                      style:
                          Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                fontSize: 28,
                                letterSpacing: -0.5,
                              ),
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        firstName,
                        style: Theme.of(context)
                            .textTheme
                            .headlineMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              fontSize: 28,
                              letterSpacing: -0.5,
                            ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                // "Welcome to MedLink" on the same line
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        'home.welcome'.tr(),
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Colors.white.withOpacity(0.95),
                              fontSize: 15,
                            ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.verified_user_rounded,
                          color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        roleLabel,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Notification icon on the right side - bigger
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.25),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.notifications_outlined,
                    color: Colors.white,
                    size: 28,
                  ),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Notifications coming soon'),
                        backgroundColor: Colors.white,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                ),
              ),
              if (hasUnreadNotifications)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      color: Color(0xFFEF4444),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Color(0xFFEF4444),
                          blurRadius: 4,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, bool isDoctor, bool isDark) {
    if (isDoctor) {
      return Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _QuickActionCard(
                  icon: Icons.people_alt_rounded,
                  title: 'Patient Queue',
                  subtitle: 'Manage your queue',
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  iconColor: AppColors.primary,
                  textColor: isDark ? Colors.white : AppColors.textPrimary,
                  subtitleColor:
                      isDark ? Colors.white70 : AppColors.textSecondary,
                  isDark: isDark,
                  onTap: () {
                    Navigator.of(context).pushNamed(QueueScreen.routeName);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuickActionCard(
                  icon: Icons.map_rounded,
                  title: 'Find Care',
                  subtitle: 'Locations nearby',
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  iconColor: AppColors.secondary,
                  textColor: isDark ? Colors.white : AppColors.textPrimary,
                  subtitleColor:
                      isDark ? Colors.white70 : AppColors.textSecondary,
                  isDark: isDark,
                  onTap: () {
                    Navigator.of(context).pushNamed(MapSearchScreen.routeName);
                  },
                ),
              ),
            ],
          ),
        ],
      );
    }

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _QuickActionCard(
                icon: Icons.history_rounded,
                title: 'My Consultations',
                subtitle: 'View history',
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                iconColor: AppColors.primary,
                textColor: isDark ? Colors.white : AppColors.textPrimary,
                subtitleColor:
                    isDark ? Colors.white70 : AppColors.textSecondary,
                isDark: isDark,
                onTap: () {
                  Navigator.of(context)
                      .pushNamed(ConsultationsListScreen.routeName);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _QuickActionCard(
                icon: Icons.emergency_rounded,
                title: 'Emergency',
                subtitle: 'Get immediate help',
                color: AppColors.error,
                iconColor: Colors.white,
                textColor: Colors.white,
                subtitleColor: Colors.white.withOpacity(0.9),
                isDark: isDark,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Emergency feature coming soon'),
                      backgroundColor: Colors.white,
                    ),
                  );
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: _QuickActionCardWithArrow(
            icon: Icons.map_rounded,
            title: 'Find Care Nearby',
            subtitle: 'Map pharmacies, hospitals, and labs around you',
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            iconColor: AppColors.secondary,
            textColor: isDark ? Colors.white : AppColors.textPrimary,
            subtitleColor: isDark ? Colors.white70 : AppColors.textSecondary,
            isDark: isDark,
            onTap: () {
              Navigator.of(context).pushNamed(MapSearchScreen.routeName);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMainOptions(BuildContext context, bool isDoctor, bool isDark) {
    if (isDoctor) {
      return _buildDoctorMainOptions(context, isDark);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'How can we help you today?',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : AppColors.textPrimary,
                fontSize: 22,
              ),
        ),
        const SizedBox(height: 16),
        _MainOptionCard(
          icon: Icons.mic_rounded,
          title: 'MedLink AI Intake',
          subtitle: 'Describe symptoms and get matched with specialists',
          gradient: const LinearGradient(
            colors: [Color(0xFF10B981), Color(0xFF059669)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          onTap: () {
            Navigator.of(context).pushNamed(SymptomIntakeScreen.routeName);
          },
        ),
        const SizedBox(height: 16),
        _MainOptionCard(
          icon: Icons.search_rounded,
          title: 'Search Doctors',
          subtitle: 'Browse and book appointments directly',
          gradient: const LinearGradient(
            colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          onTap: () {
            Navigator.of(context).pushNamed(DoctorSearchScreen.routeName);
          },
        ),
      ],
    );
  }

  Widget _buildDoctorMainOptions(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'How can we help you today?',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : AppColors.textPrimary,
                fontSize: 22,
              ),
        ),
        const SizedBox(height: 16),
        _MainOptionCard(
          icon: Icons.medical_services_rounded,
          title: 'Manage Patients',
          subtitle: 'View and manage your patient queue',
          gradient: const LinearGradient(
            colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          onTap: () {
            Navigator.of(context).pushNamed(QueueScreen.routeName);
          },
        ),
        const SizedBox(height: 16),
        _MainOptionCard(
          icon: Icons.location_on_rounded,
          title: 'Find Care Locations',
          subtitle: 'Explore nearby healthcare facilities',
          gradient: const LinearGradient(
            colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          onTap: () {
            Navigator.of(context).pushNamed(MapSearchScreen.routeName);
          },
        ),
      ],
    );
  }

  Widget _buildHealthTips(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
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
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.health_and_safety_rounded,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Health Tips',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppColors.textPrimary,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 500),
            transitionBuilder: (child, animation) {
              return FadeTransition(
                opacity: animation,
                child: child,
              );
            },
            child: Text(
              _healthTips[_currentTipIndex],
              key: ValueKey(_currentTipIndex),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isDark ? Colors.white70 : AppColors.textSecondary,
                    height: 1.5,
                  ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              _healthTips.length,
              (index) => Container(
                width: 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: index == _currentTipIndex
                      ? AppColors.primary
                      : (isDark
                          ? Colors.white24
                          : AppColors.textTertiary.withOpacity(0.3)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _roleLabel(String? role) {
  final normalized = role?.toLowerCase();
  switch (normalized) {
    case 'doctor':
      return 'Doctor';
    case 'patient':
      return 'Patient';
    case 'hospital_admin':
      return 'Hospital Admin';
    case 'pharmacy_admin':
      return 'Pharmacy Admin';
    case 'super_admin':
      return 'Super Admin';
    default:
      return 'Guest';
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final Color iconColor;
  final Color textColor;
  final Color subtitleColor;
  final bool isDark;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.iconColor,
    required this.textColor,
    required this.subtitleColor,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: iconColor, size: 30),
            const SizedBox(height: 12),
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: textColor,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: subtitleColor,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionCardWithArrow extends StatefulWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final Color iconColor;
  final Color textColor;
  final Color subtitleColor;
  final bool isDark;
  final VoidCallback onTap;

  const _QuickActionCardWithArrow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.iconColor,
    required this.textColor,
    required this.subtitleColor,
    required this.isDark,
    required this.onTap,
  });

  @override
  State<_QuickActionCardWithArrow> createState() =>
      _QuickActionCardWithArrowState();
}

class _QuickActionCardWithArrowState extends State<_QuickActionCardWithArrow>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _slideAnimation = Tween<double>(begin: 0.0, end: 4.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );
    _animationController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: widget.color,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(widget.isDark ? 0.3 : 0.1),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(widget.icon, color: widget.iconColor, size: 30),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: widget.textColor,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: widget.subtitleColor,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            AnimatedBuilder(
              animation: _slideAnimation,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(_slideAnimation.value, 0),
                  child: Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: widget.iconColor,
                    size: 18,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MainOptionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Gradient gradient;
  final VoidCallback onTap;

  const _MainOptionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: Colors.white, size: 32),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.white70,
                        ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: Colors.white,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
