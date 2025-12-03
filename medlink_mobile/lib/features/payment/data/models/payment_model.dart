import 'package:json_annotation/json_annotation.dart';

part 'payment_model.g.dart';

/// Payment Method Enum
enum PaymentMethod {
  @JsonValue('mobile_money')
  mobileMoney,
  @JsonValue('card')
  card,
  @JsonValue('wallet')
  wallet,
}

/// Payment Status Enum
enum PaymentModelStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('successful')
  successful,
  @JsonValue('failed')
  failed,
  @JsonValue('refunded')
  refunded,
}

/// Payment Model
@JsonSerializable()
class PaymentModel {
  final String id;
  final String consultationId;
  final String patientId;
  final String doctorId;
  final double amount;
  final String currency;
  final PaymentMethod paymentMethod;
  final String? paymentProvider; // e.g., "Paystack", "MTN Mobile Money"
  final String transactionReference;
  final PaymentModelStatus status;
  final double platformFee;
  final double doctorEarnings;
  final String? mobileMoneyNumber;
  final Map<String, dynamic>? metadata;
  final DateTime? paidAt;
  final DateTime? refundedAt;
  final DateTime createdAt;

  const PaymentModel({
    required this.id,
    required this.consultationId,
    required this.patientId,
    required this.doctorId,
    required this.amount,
    this.currency = 'GHS',
    required this.paymentMethod,
    this.paymentProvider,
    required this.transactionReference,
    required this.status,
    required this.platformFee,
    required this.doctorEarnings,
    this.mobileMoneyNumber,
    this.metadata,
    this.paidAt,
    this.refundedAt,
    required this.createdAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) =>
      _$PaymentModelFromJson(json);

  Map<String, dynamic> toJson() => _$PaymentModelToJson(this);

  bool get isSuccessful => status == PaymentModelStatus.successful;
  bool get isPending => status == PaymentModelStatus.pending;
  bool get isFailed => status == PaymentModelStatus.failed;
}
