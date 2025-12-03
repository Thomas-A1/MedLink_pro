import '../../../../core/network/api_client.dart';
import '../models/doctor_model.dart';

class DoctorRepository {
  final ApiClient _apiClient;

  DoctorRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  Future<List<DoctorModel>> fetchDoctors({
    String? search,
    String? specialty,
    bool? isOnline,
    double? maxFee,
  }) async {
    final response = await _apiClient.get(
      '/doctors',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (specialty != null && specialty.isNotEmpty) 'specialty': specialty,
        if (isOnline != null) 'isOnline': isOnline.toString(),
        if (maxFee != null) 'maxFee': maxFee.toString(),
      },
    );

    final doctors = (response.data['data']['doctors'] as List)
        .map((json) => DoctorModel.fromJson(json as Map<String, dynamic>))
        .toList();

    return doctors;
  }
}
