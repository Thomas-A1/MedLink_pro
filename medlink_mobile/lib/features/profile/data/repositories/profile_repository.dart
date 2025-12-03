import 'dart:io';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/profile_model.dart';

class ProfileRepository {
  final ApiClient _apiClient;

  ProfileRepository({
    ApiClient? apiClient,
  }) : _apiClient = apiClient ?? ApiClient();

  Future<ProfileModel> getProfile() async {
    try {
      final response = await _apiClient.get('/users/profile');
      return ProfileModel.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<ProfileModel> updateProfile({
    String? firstName,
    String? lastName,
    File? profilePhoto,
  }) async {
    try {
      // If profile photo is provided, use multipart form data
      if (profilePhoto != null) {
        final formData = FormData.fromMap({
          if (firstName != null) 'firstName': firstName,
          if (lastName != null) 'lastName': lastName,
          'profilePhoto': await MultipartFile.fromFile(
            profilePhoto.path,
            filename: profilePhoto.path.split('/').last,
          ),
        });

        final response = await _apiClient.dio.patch(
          '/users/profile',
          data: formData,
          options: Options(
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          ),
        );
        return ProfileModel.fromJson(response.data);
      } else {
        // Regular JSON update without image
        final data = <String, dynamic>{};
        if (firstName != null) data['firstName'] = firstName;
        if (lastName != null) data['lastName'] = lastName;

        final response = await _apiClient.patch('/users/profile', data: data);
        return ProfileModel.fromJson(response.data);
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _apiClient.patch(
        '/users/password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    } catch (e) {
      rethrow;
    }
  }
}
