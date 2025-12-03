import 'dart:async';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/network/api_client.dart';
import '../../../queue/data/models/queue_model.dart';
import '../../data/models/payment_model.dart';

class PaymentRepository {
  final ApiClient _apiClient;

  PaymentRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  Future<Map<String, dynamic>> initializePayment({
    required String consultationId,
    required double amount,
    required PaymentMethod method,
    String? mobileMoneyNumber,
  }) async {
    final response = await _apiClient.post(
      '/payments/charge',
      data: {
        'consultationId': consultationId,
        'amount': amount,
        'method': _mapMethod(method),
        if (mobileMoneyNumber != null) 'mobileMoneyNumber': mobileMoneyNumber,
      },
    );

    return {
      'authorizationUrl': response.data['authorizationUrl'] as String,
      'reference': response.data['reference'] as String,
    };
  }

  Future<QueueModel> verifyPayment(String reference) async {
    final response = await _apiClient.get('/payments/verify/$reference');

    if (response.data['paid'] == true && response.data['queueEntry'] != null) {
      final queueEntryJson =
          response.data['queueEntry'] as Map<String, dynamic>;
      return QueueModel.fromJson(queueEntryJson);
    }

    throw Exception('Payment not verified or queue entry not available');
  }

  Future<bool> openPaymentUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return false;
  }

  Future<QueueModel> pollForPaymentVerification(
    String reference, {
    int maxAttempts = 30,
    Duration interval = const Duration(seconds: 2),
  }) async {
    for (int i = 0; i < maxAttempts; i++) {
      try {
        final queueEntry = await verifyPayment(reference);
        return queueEntry;
      } catch (e) {
        if (i < maxAttempts - 1) {
          await Future.delayed(interval);
        } else {
          rethrow;
        }
      }
    }
    throw TimeoutException('Payment verification timeout');
  }

  String _mapMethod(PaymentMethod method) {
    switch (method) {
      case PaymentMethod.mobileMoney:
        return 'mobile_money';
      case PaymentMethod.card:
        return 'card';
      case PaymentMethod.wallet:
        return 'wallet';
    }
  }
}
