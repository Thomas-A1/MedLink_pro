class DoctorModel {
  final String id;
  final String name;
  final String specialty;
  final String facility;
  final double rating;
  final int reviewCount;
  final double consultationFee;
  final int waitTimeMinutes;
  final bool isOnline;
  final List<String> languages;
  final int experienceYears;
  final String? imageUrl;
  final String? bio;

  const DoctorModel({
    required this.id,
    required this.name,
    required this.specialty,
    required this.facility,
    required this.rating,
    required this.reviewCount,
    required this.consultationFee,
    required this.waitTimeMinutes,
    required this.isOnline,
    this.languages = const [],
    required this.experienceYears,
    this.imageUrl,
    this.bio,
  });

  factory DoctorModel.fromJson(Map<String, dynamic> json) {
    return DoctorModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      specialty: json['specialty']?.toString() ?? '',
      facility: json['facility']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      consultationFee: (json['consultationFee'] as num?)?.toDouble() ?? 0,
      waitTimeMinutes: (json['waitTimeMinutes'] as num?)?.toInt() ?? 5,
      isOnline: json['isOnline'] as bool? ?? false,
      languages: (json['languages'] as List<dynamic>?)
              ?.map((lang) => lang.toString())
              .toList() ??
          const [],
      experienceYears: (json['experienceYears'] as num?)?.toInt() ?? 1,
      imageUrl: json['imageUrl'] as String?,
      bio: json['bio'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'specialty': specialty,
        'facility': facility,
        'rating': rating,
        'reviewCount': reviewCount,
        'consultationFee': consultationFee,
        'waitTimeMinutes': waitTimeMinutes,
        'isOnline': isOnline,
        'languages': languages,
        'experienceYears': experienceYears,
        'imageUrl': imageUrl,
        'bio': bio,
      };

  String get waitTimeLabel => '≈ $waitTimeMinutes min';
}
