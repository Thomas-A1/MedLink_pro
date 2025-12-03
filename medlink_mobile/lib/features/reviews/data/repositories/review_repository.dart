import '../../../../core/network/api_client.dart';
import '../models/review_model.dart';

class ReviewRepository {
  final ApiClient _apiClient;

  ReviewRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  /// Submit a review for a doctor after consultation
  Future<ReviewModel> submitReview({
    required String doctorId,
    required String consultationId,
    required int rating,
    String? comment,
  }) async {
    final response = await _apiClient.post(
      '/reviews/doctors/$doctorId',
      data: {
        'consultationId': consultationId,
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );

    final data = response.data['data'] as Map<String, dynamic>;
    return ReviewModel(
      id: data['id'] as String,
      rating: data['rating'] as int,
      comment: data['comment'] as String?,
      patientName: '', // Not returned in create response
      createdAt: DateTime.parse(data['createdAt'] as String),
      isVerified: true,
    );
  }

  /// Get reviews for a doctor
  Future<Map<String, dynamic>> getDoctorReviews(
    String doctorId, {
    int limit = 10,
    int offset = 0,
  }) async {
    final response = await _apiClient.get(
      '/reviews/doctors/$doctorId',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );

    final data = response.data['data'] as Map<String, dynamic>;
    return {
      'reviews': (data['reviews'] as List<dynamic>)
          .map((r) => ReviewModel.fromJson(r as Map<String, dynamic>))
          .toList(),
      'total': data['total'] as int,
      'limit': data['limit'] as int,
      'offset': data['offset'] as int,
    };
  }

  /// Get doctor's average rating
  Future<Map<String, dynamic>> getDoctorRating(String doctorId) async {
    final response = await _apiClient.get('/reviews/doctors/$doctorId/rating');
    return response.data['data'] as Map<String, dynamic>;
  }
}
