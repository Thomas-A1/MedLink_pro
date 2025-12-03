import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/providers/session_provider.dart';
import '../../../../shared/widgets/profile_avatar.dart';
import 'edit_profile_screen.dart';

/// Profile Screen - User profile and settings
class ProfileScreen extends ConsumerStatefulWidget {
  static const routeName = '/profile';

  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    // Refresh user data when screen is opened
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionProvider.notifier).refreshUser();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppColors.background,
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: isDark ? Colors.white : AppColors.textPrimary,
      ),
      body: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F172A) : AppColors.background,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Profile Header
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    ProfileAvatar(
                      radius: 50,
                      backgroundColor: AppColors.primaryLight.withOpacity(0.2),
                      iconColor: AppColors.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      user?.fullName ?? 'User',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white : null,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.email ?? user?.phoneNumber ?? '',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isDark
                                ? Colors.white70
                                : AppColors.textSecondary,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Menu Items
              _ProfileMenuItem(
                icon: Icons.person_outline_rounded,
                title: 'Edit Profile',
                onTap: () async {
                  // Navigate to edit profile and refresh when returning
                  final result = await Navigator.of(context)
                      .pushNamed(EditProfileScreen.routeName);
                  // Refresh user data to get updated profile image
                  if (mounted && result == true) {
                    // Wait a bit for backend to process
                    await Future.delayed(const Duration(milliseconds: 500));
                    await ref.read(sessionProvider.notifier).refreshUser();
                    // Refresh again to ensure we get the latest
                    await Future.delayed(const Duration(milliseconds: 300));
                    if (mounted) {
                      ref.read(sessionProvider.notifier).refreshUser();
                    }
                  }
                },
              ),
              _ProfileMenuItem(
                icon: Icons.history_rounded,
                title: 'Consultation History',
                onTap: () {
                  // TODO: Navigate to consultation history
                },
              ),
              _ProfileMenuItem(
                icon: Icons.payment_outlined,
                title: 'Payments',
                onTap: () {
                  // TODO: Navigate to payments
                },
              ),
              _ProfileMenuItem(
                icon: Icons.help_outline_rounded,
                title: 'Help & Support',
                onTap: () {
                  // TODO: Navigate to help
                },
              ),
              _ProfileMenuItem(
                icon: Icons.logout_rounded,
                title: 'Logout',
                onTap: () async {
                  await ref.read(sessionProvider.notifier).logout();
                  if (context.mounted) {
                    Navigator.of(context).pushNamedAndRemoveUntil(
                      '/login',
                      (route) => false,
                    );
                  }
                },
                isDestructive: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileMenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool isDestructive;

  const _ProfileMenuItem({
    required this.icon,
    required this.title,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: (isDestructive ? AppColors.error : AppColors.primary)
                .withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: isDestructive ? AppColors.error : AppColors.primary,
          ),
        ),
        title: Text(
          title,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: isDestructive
                    ? AppColors.error
                    : (isDark ? Colors.white : AppColors.textPrimary),
              ),
        ),
        trailing: Icon(
          Icons.chevron_right_rounded,
          color: isDark ? Colors.white60 : AppColors.textTertiary,
        ),
        onTap: onTap,
      ),
    );
  }
}
