import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/data/models/user_model.dart';
import '../../features/auth/data/repositories/auth_repository.dart';

/// Holds the authenticated user session and exposes helper methods
class SessionNotifier extends StateNotifier<UserModel?> {
  SessionNotifier(this._authRepository) : super(null);

  final AuthRepository _authRepository;
  bool _isLoading = false;

  Future<void> refreshUser() async {
    if (_isLoading) return;
    _isLoading = true;
    try {
      final user = await _authRepository.getCurrentUser();
      state = user;
    } finally {
      _isLoading = false;
    }
  }

  void setUser(UserModel? user) {
    state = user;
  }

  Future<void> logout() async {
    await _authRepository.logout();
    state = null;
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final sessionProvider =
    StateNotifierProvider<SessionNotifier, UserModel?>((ref) {
  final notifier = SessionNotifier(ref.read(authRepositoryProvider));
  // Eagerly refresh session once provider is created
  notifier.refreshUser();
  return notifier;
});
