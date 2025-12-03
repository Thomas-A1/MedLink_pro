import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/providers/session_provider.dart';

/// Reusable Profile Avatar Widget
///
/// This widget displays the user's profile image with proper caching and refresh.
/// It automatically updates when the user's profile image changes.
class ProfileAvatar extends ConsumerWidget {
  final double radius;
  final Color? backgroundColor;
  final Color? iconColor;
  final VoidCallback? onTap;
  final bool showBorder;

  const ProfileAvatar({
    super.key,
    this.radius = 24,
    this.backgroundColor,
    this.iconColor,
    this.onTap,
    this.showBorder = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final profileImageUrl = user?.profilePhotoUrl;
    // Create unique cache key that changes when profile image URL changes
    // Use a combination of user ID and image URL hash to ensure cache invalidation
    final cacheKey = profileImageUrl != null &&
            profileImageUrl.isNotEmpty &&
            user?.id != null
        ? 'profile_${user!.id}_${profileImageUrl.hashCode}_${DateTime.now().millisecondsSinceEpoch ~/ 10000}' // Changes every 10 seconds
        : 'profile_${user?.id ?? 'none'}_${DateTime.now().millisecondsSinceEpoch ~/ 10000}';

    // Add cache buster to URL to force refresh
    final imageUrlWithCacheBuster = profileImageUrl != null &&
            profileImageUrl.isNotEmpty
        ? profileImageUrl.contains('?')
            ? '$profileImageUrl&v=${DateTime.now().millisecondsSinceEpoch ~/ 10000}'
            : '$profileImageUrl?v=${DateTime.now().millisecondsSinceEpoch ~/ 10000}'
        : profileImageUrl;

    final bgColor = backgroundColor ??
        (isDark
            ? const Color(0xFF1E293B)
            : AppColors.primaryLight.withOpacity(0.1));
    final iconClr =
        iconColor ?? (isDark ? Colors.white70 : AppColors.primaryDark);

    Widget avatar = Container(
      width: radius * 2,
      height: radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: bgColor,
        border: showBorder
            ? Border.all(
                color: isDark
                    ? Colors.white.withOpacity(0.2)
                    : AppColors.primary.withOpacity(0.3),
                width: 2,
              )
            : null,
      ),
      child: profileImageUrl != null && profileImageUrl.isNotEmpty
          ? ClipOval(
              child: CachedNetworkImage(
                imageUrl: imageUrlWithCacheBuster ?? profileImageUrl,
                fit: BoxFit.cover,
                cacheKey: cacheKey, // Dynamic cache key for refresh
                httpHeaders: {
                  'Cache-Control': 'no-cache',
                },
                memCacheWidth:
                    (radius * 2 * MediaQuery.of(context).devicePixelRatio)
                        .round(),
                memCacheHeight:
                    (radius * 2 * MediaQuery.of(context).devicePixelRatio)
                        .round(),
                placeholder: (context, url) => Container(
                  color: bgColor,
                  child: Center(
                    child: SizedBox(
                      width: radius * 0.5,
                      height: radius * 0.5,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                errorWidget: (context, url, error) => Icon(
                  Icons.person_rounded,
                  color: iconClr,
                  size: radius,
                ),
              ),
            )
          : Icon(
              Icons.person_rounded,
              color: iconClr,
              size: radius,
            ),
    );

    if (onTap != null) {
      avatar = GestureDetector(
        onTap: onTap,
        child: avatar,
      );
    }

    return avatar;
  }
}

/// Profile Avatar with navigation to profile screen
class ProfileAvatarWithNavigation extends ConsumerWidget {
  final double radius;
  final Color? backgroundColor;
  final Color? iconColor;
  final bool showBorder;

  const ProfileAvatarWithNavigation({
    super.key,
    this.radius = 24,
    this.backgroundColor,
    this.iconColor,
    this.showBorder = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ProfileAvatar(
      radius: radius,
      backgroundColor: backgroundColor,
      iconColor: iconColor,
      showBorder: showBorder,
      onTap: () async {
        // Refresh user data when navigating to profile
        await ref.read(sessionProvider.notifier).refreshUser();
        if (context.mounted) {
          final result = await Navigator.of(context).pushNamed('/profile');
          // Refresh user data when returning from profile, especially if profile was updated
          if (result == true || context.mounted) {
            await ref.read(sessionProvider.notifier).refreshUser();
            // Force a rebuild by waiting a bit
            await Future.delayed(const Duration(milliseconds: 300));
            if (context.mounted) {
              ref.read(sessionProvider.notifier).refreshUser();
            }
          }
        }
      },
    );
  }
}
