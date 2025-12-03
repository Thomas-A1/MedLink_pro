import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_colors.dart';
import '../../core/providers/session_provider.dart';
import '../../features/auth/data/models/user_model.dart';

typedef RoleGuardBuilder = Widget Function(
  BuildContext context,
  UserModel? user,
);

/// Simple utility widget that ensures only allowed roles can see a section.
/// When `allowedRoles` is empty, any authenticated user may access it.
/// Set [allowGuests] to true when sections should remain visible without login.
class RoleGuard extends ConsumerWidget {
  const RoleGuard({
    super.key,
    required this.builder,
    this.allowedRoles = const [],
    this.allowGuests = false,
    this.fallback,
  });

  final RoleGuardBuilder builder;
  final List<String> allowedRoles;
  final bool allowGuests;
  final Widget? fallback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider);
    if (user == null) {
      if (allowGuests) {
        return builder(context, null);
      }
      return fallback ?? _UnauthorizedState(message: 'login.sign_in'.tr());
    }

    final normalizedRole = user.role.toLowerCase();
    final isAllowed = allowedRoles.isEmpty ||
        allowedRoles.map((r) => r.toLowerCase()).contains(normalizedRole);

    if (!isAllowed) {
      return fallback ??
          _UnauthorizedState(message: 'You don’t have permission to view this');
    }

    return builder(context, user);
  }
}

class _UnauthorizedState extends StatelessWidget {
  const _UnauthorizedState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.errorLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.error),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline_rounded, color: AppColors.error),
            const SizedBox(width: 12),
            Flexible(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.error,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
