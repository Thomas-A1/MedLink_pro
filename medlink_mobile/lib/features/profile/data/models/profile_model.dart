class ProfileModel {
  final String id;
  final String? email;
  final String phoneNumber;
  final String? firstName;
  final String? lastName;
  final String? profilePhotoUrl;
  final String role;
  final String? languagePreference;

  ProfileModel({
    required this.id,
    this.email,
    required this.phoneNumber,
    this.firstName,
    this.lastName,
    this.profilePhotoUrl,
    required this.role,
    this.languagePreference,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) {
    return ProfileModel(
      id: json['id']?.toString() ?? '',
      email: json['email'] as String?,
      phoneNumber: json['phoneNumber']?.toString() ?? '',
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      profilePhotoUrl: json['profilePhotoUrl'] as String?,
      role: json['role']?.toString() ?? '',
      languagePreference: json['languagePreference'] as String?,
    );
  }

  String get fullName {
    final parts =
        [firstName, lastName].where((p) => p != null && p.isNotEmpty).toList();
    return parts.isEmpty ? 'User' : parts.join(' ');
  }
}
