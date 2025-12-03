import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage.dart';
import '../models/auth_response_model.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorage _storage;

  AuthRepository({
    ApiClient? apiClient,
    SecureStorage? storage,
  })  : _apiClient = apiClient ?? ApiClient(),
        _storage = storage ?? SecureStorage();

  Future<AuthResponseModel> login({
    required String identifier,
    required String password,
  }) async {
    try {
      final response = await _apiClient.post(
        '/auth/login',
        data: {
          'identifier': identifier,
          'password': password,
        },
      );

      final authResponse = AuthResponseModel.fromJson(response.data);

      // Store tokens
      await _storage.setAccessToken(authResponse.accessToken);
      if (authResponse.refreshToken != null) {
        await _storage.setRefreshToken(authResponse.refreshToken!);
      }

      return authResponse;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> register({
    required String role,
    required String firstName,
    required String lastName,
    required String phoneNumber,
    String? email,
    required String password,
    DateTime? dateOfBirth,
    String? gender,
    String? region,
    String? district,
  }) async {
    try {
      final data = {
        'role': role,
        'firstName': firstName,
        'lastName': lastName,
        'phoneNumber': phoneNumber,
        'password': password,
        if (email != null && email.isNotEmpty) 'email': email,
        if (dateOfBirth != null) 'dateOfBirth': dateOfBirth.toIso8601String(),
        if (gender != null) 'gender': gender,
        if (region != null) 'region': region,
        if (district != null) 'district': district,
      };

      final response = await _apiClient.post(
        '/auth/register',
        data: data,
      );

      // Registration now returns userId and otpSent, not tokens
      return response.data as Map<String, dynamic>;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.post('/auth/logout');
    } catch (e) {
      // Continue with logout even if API call fails
    } finally {
      await _storage.clearTokens();
    }
  }

  Future<UserModel?> getCurrentUser() async {
    try {
      final token = await _storage.getAccessToken();
      if (token == null) return null;

      final response = await _apiClient.get('/auth/me');
      return UserModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.getAccessToken();
    return token != null;
  }

  Future<AuthResponseModel> verifyOtp({
    required String phoneNumber,
    required String otpCode,
  }) async {
    try {
      final response = await _apiClient.post(
        '/auth/verify-otp',
        data: {
          'phoneNumber': phoneNumber,
          'otpCode': otpCode,
        },
      );

      final authResponse = AuthResponseModel.fromJson(response.data);

      // Store tokens
      await _storage.setAccessToken(authResponse.accessToken);
      if (authResponse.refreshToken != null) {
        await _storage.setRefreshToken(authResponse.refreshToken!);
      }

      return authResponse;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> resendOtp({required String phoneNumber}) async {
    try {
      await _apiClient.post(
        '/auth/resend-otp',
        data: {
          'phoneNumber': phoneNumber,
        },
      );
    } catch (e) {
      rethrow;
    }
  }
}
