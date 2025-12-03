// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PaymentModel _$PaymentModelFromJson(Map<String, dynamic> json) => PaymentModel(
      id: json['id'] as String,
      consultationId: json['consultationId'] as String,
      patientId: json['patientId'] as String,
      doctorId: json['doctorId'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'GHS',
      paymentMethod: $enumDecode(_$PaymentMethodEnumMap, json['paymentMethod']),
      paymentProvider: json['paymentProvider'] as String?,
      transactionReference: json['transactionReference'] as String,
      status: $enumDecode(_$PaymentModelStatusEnumMap, json['status']),
      platformFee: (json['platformFee'] as num).toDouble(),
      doctorEarnings: (json['doctorEarnings'] as num).toDouble(),
      mobileMoneyNumber: json['mobileMoneyNumber'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      paidAt: json['paidAt'] == null
          ? null
          : DateTime.parse(json['paidAt'] as String),
      refundedAt: json['refundedAt'] == null
          ? null
          : DateTime.parse(json['refundedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$PaymentModelToJson(PaymentModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'consultationId': instance.consultationId,
      'patientId': instance.patientId,
      'doctorId': instance.doctorId,
      'amount': instance.amount,
      'currency': instance.currency,
      'paymentMethod': _$PaymentMethodEnumMap[instance.paymentMethod]!,
      'paymentProvider': instance.paymentProvider,
      'transactionReference': instance.transactionReference,
      'status': _$PaymentModelStatusEnumMap[instance.status]!,
      'platformFee': instance.platformFee,
      'doctorEarnings': instance.doctorEarnings,
      'mobileMoneyNumber': instance.mobileMoneyNumber,
      'metadata': instance.metadata,
      'paidAt': instance.paidAt?.toIso8601String(),
      'refundedAt': instance.refundedAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
    };

const _$PaymentMethodEnumMap = {
  PaymentMethod.mobileMoney: 'mobile_money',
  PaymentMethod.card: 'card',
  PaymentMethod.wallet: 'wallet',
};

const _$PaymentModelStatusEnumMap = {
  PaymentModelStatus.pending: 'pending',
  PaymentModelStatus.successful: 'successful',
  PaymentModelStatus.failed: 'failed',
  PaymentModelStatus.refunded: 'refunded',
};
