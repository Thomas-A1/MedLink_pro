import '../../../../core/network/api_client.dart';
import '../models/queue_model.dart';

class QueueRepository {
  final ApiClient _apiClient;

  QueueRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  /// Get queue status for a consultation
  Future<QueueModel> getQueueStatus(String consultationId) async {
    final response =
        await _apiClient.get('/consultations/$consultationId/queue-status');

    final data = response.data as Map<String, dynamic>;
    return QueueModel.fromJson({
      'id': data['consultationId'] as String,
      'consultationId': consultationId,
      'position': data['position'] as int,
      'estimatedWaitTime': data['estimatedWaitTime'] as int,
      'status': 'waiting',
      'urgencyLevel': 'routine',
      'joinedAt': data['queueJoinedAt'] as String,
      'doctorId': '', // Will be populated from consultation
      'patientId': '', // Will be populated from consultation
    });
  }

  /// Get doctor's queue (for doctor view)
  Future<Map<String, dynamic>> getDoctorQueue(String doctorId) async {
    final response =
        await _apiClient.get('/consultations/doctors/$doctorId/queue');
    return response.data as Map<String, dynamic>;
  }

  /// Get consultation details
  Future<Map<String, dynamic>> getConsultation(String consultationId) async {
    final response = await _apiClient.get('/consultations/$consultationId');
    return response.data as Map<String, dynamic>;
  }
}
