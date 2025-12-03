class ReviewModel {
  final String id;
  final int rating;
  final String? comment;
  final String patientName;
  final DateTime createdAt;
  final bool isVerified;

  const ReviewModel({
    required this.id,
    required this.rating,
    this.comment,
    required this.patientName,
    required this.createdAt,
    required this.isVerified,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id: json['id'] as String,
      rating: json['rating'] as int,
      comment: json['comment'] as String?,
      patientName: json['patientName'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isVerified: json['isVerified'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'rating': rating,
        'comment': comment,
        'patientName': patientName,
        'createdAt': createdAt.toIso8601String(),
        'isVerified': isVerified,
      };
}
