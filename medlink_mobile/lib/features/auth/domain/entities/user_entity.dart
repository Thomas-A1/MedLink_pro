class UserEntity {
  final String id;
  final String role;
  final String? email;
  final String phoneNumber;
  final String? firstName;
  final String? lastName;
  final String? profilePhotoUrl;
  final String? organizationId;
  final bool isActive;

  UserEntity({
    required this.id,
    required this.role,
    this.email,
    required this.phoneNumber,
    this.firstName,
    this.lastName,
    this.profilePhotoUrl,
    this.organizationId,
    required this.isActive,
  });

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? email ?? phoneNumber;
  }

  bool get isPatient => role.toLowerCase() == 'patient';
  bool get isDoctor => role.toLowerCase() == 'doctor';
  bool get isHospitalStaff => role.toLowerCase() == 'hospital_staff';
  bool get isPharmacyStaff => role.toLowerCase() == 'pharmacy_staff';
  bool get isLabStaff => role.toLowerCase() == 'lab_staff';
  bool get isAdmin =>
      role.toLowerCase() == 'admin' || role.toLowerCase() == 'super_admin';
}
