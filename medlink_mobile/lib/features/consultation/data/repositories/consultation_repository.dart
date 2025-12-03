import '../../../../core/network/api_client.dart';
import '../models/consultation_model.dart';
import '../../../ai/data/models/body_part.dart';

class ConsultationRepository {
  final ApiClient _apiClient;

  ConsultationRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  /// Start a consultation call
  Future<Map<String, dynamic>> startCall(String consultationId) async {
    final response = await _apiClient.patch(
      '/consultations/$consultationId/start-call',
      data: {},
    );
    return response.data as Map<String, dynamic>;
  }

  /// End a consultation call
  Future<Map<String, dynamic>> endCall(
    String consultationId, {
    int? durationSeconds,
    String? summary,
  }) async {
    final response = await _apiClient.patch(
      '/consultations/$consultationId/end-call',
      data: {
        if (durationSeconds != null) 'duration': durationSeconds,
        if (summary != null) 'summary': summary,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Get call summary
  Future<Map<String, dynamic>> getCallSummary(String consultationId,
      {String? transcript}) async {
    if (transcript != null && transcript.isNotEmpty) {
      // Generate summary with transcript using AI
      final response = await _apiClient.post(
        '/consultations/$consultationId/summary/generate',
        data: {'transcript': transcript},
      );
      return response.data as Map<String, dynamic>;
    } else {
      final response =
          await _apiClient.get('/consultations/$consultationId/summary');
      return response.data as Map<String, dynamic>;
    }
  }

  /// Get consultation details
  Future<Map<String, dynamic>> getConsultation(String consultationId) async {
    final response = await _apiClient.get('/consultations/$consultationId');
    return response.data as Map<String, dynamic>;
  }

  /// Create a new consultation
  Future<ConsultationModel> createConsultation({
    required String doctorId,
    required ConsultationType consultationType,
    required UrgencyLevel urgencyLevel,
    SymptomComplaint? complaint,
    double? paymentAmount,
  }) async {
    final Map<String, dynamic> requestData = {
      'doctorId': doctorId,
      'consultationType':
          consultationType.toString().split('.').last, // 'video' or 'voice'
      'urgencyLevel': urgencyLevel
          .toString()
          .split('.')
          .last, // 'routine', 'urgent', 'emergency'
    };

    if (complaint != null) {
      requestData['chiefComplaint'] = complaint.complaintText;
      if (complaint.audioUrl != null) {
        requestData['audioComplaintUrl'] = complaint.audioUrl;
      }
    }

    final response = await _apiClient.post(
      '/consultations',
      data: requestData,
    );
    return ConsultationModel.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch user's consultations
  Future<List<ConsultationModel>> fetchMyConsultations() async {
    final response = await _apiClient.get('/consultations/my');
    final data = response.data;
    List<dynamic> consultationsList;

    if (data is List) {
      consultationsList = data;
    } else if (data is Map<String, dynamic> && data['data'] != null) {
      consultationsList = data['data'] as List<dynamic>? ?? [];
    } else {
      consultationsList = [];
    }

    return consultationsList
        .map((e) => ConsultationModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
