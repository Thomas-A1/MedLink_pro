// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'consultation_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ConsultationModel _$ConsultationModelFromJson(Map<String, dynamic> json) =>
    ConsultationModel(
      id: json['id'] as String,
      patientId: json['patientId'] as String,
      doctorId: json['doctorId'] as String,
      status: $enumDecode(_$ConsultationStatusEnumMap, json['status']),
      urgencyLevel: $enumDecode(_$UrgencyLevelEnumMap, json['urgencyLevel']),
      chiefComplaint: json['chiefComplaint'] as String?,
      audioComplaintUrl: json['audioComplaintUrl'] as String?,
      consultationType:
          $enumDecode(_$ConsultationTypeEnumMap, json['consultationType']),
      paymentStatus: $enumDecode(_$PaymentStatusEnumMap, json['paymentStatus']),
      paymentAmount: (json['paymentAmount'] as num?)?.toDouble(),
      paymentTransactionId: json['paymentTransactionId'] as String?,
      queuePosition: (json['queuePosition'] as num?)?.toInt(),
      queueJoinedAt: json['queueJoinedAt'] == null
          ? null
          : DateTime.parse(json['queueJoinedAt'] as String),
      estimatedWaitTime: (json['estimatedWaitTime'] as num?)?.toInt(),
      callStartedAt: json['callStartedAt'] == null
          ? null
          : DateTime.parse(json['callStartedAt'] as String),
      callEndedAt: json['callEndedAt'] == null
          ? null
          : DateTime.parse(json['callEndedAt'] as String),
      callDuration: (json['callDuration'] as num?)?.toInt(),
      callRecordingUrl: json['callRecordingUrl'] as String?,
      transcript: json['transcript'] as String?,
      doctorNotes: json['doctorNotes'] as String?,
      diagnosis: json['diagnosis'] as String?,
      treatmentPlan: json['treatmentPlan'] as String?,
      followUpRequired: json['followUpRequired'] as bool? ?? false,
      followUpDate: json['followUpDate'] == null
          ? null
          : DateTime.parse(json['followUpDate'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      doctorName: json['doctorName'] as String?,
      doctorSpecialty: json['doctorSpecialty'] as String?,
      doctorFacility: json['doctorFacility'] as String?,
      patientName: json['patientName'] as String?,
    );

Map<String, dynamic> _$ConsultationModelToJson(ConsultationModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'patientId': instance.patientId,
      'doctorId': instance.doctorId,
      'status': _$ConsultationStatusEnumMap[instance.status]!,
      'urgencyLevel': _$UrgencyLevelEnumMap[instance.urgencyLevel]!,
      'chiefComplaint': instance.chiefComplaint,
      'audioComplaintUrl': instance.audioComplaintUrl,
      'consultationType': _$ConsultationTypeEnumMap[instance.consultationType]!,
      'paymentStatus': _$PaymentStatusEnumMap[instance.paymentStatus]!,
      'paymentAmount': instance.paymentAmount,
      'paymentTransactionId': instance.paymentTransactionId,
      'queuePosition': instance.queuePosition,
      'queueJoinedAt': instance.queueJoinedAt?.toIso8601String(),
      'estimatedWaitTime': instance.estimatedWaitTime,
      'callStartedAt': instance.callStartedAt?.toIso8601String(),
      'callEndedAt': instance.callEndedAt?.toIso8601String(),
      'callDuration': instance.callDuration,
      'callRecordingUrl': instance.callRecordingUrl,
      'transcript': instance.transcript,
      'doctorNotes': instance.doctorNotes,
      'diagnosis': instance.diagnosis,
      'treatmentPlan': instance.treatmentPlan,
      'followUpRequired': instance.followUpRequired,
      'followUpDate': instance.followUpDate?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'doctorName': instance.doctorName,
      'doctorSpecialty': instance.doctorSpecialty,
      'doctorFacility': instance.doctorFacility,
      'patientName': instance.patientName,
    };

const _$ConsultationStatusEnumMap = {
  ConsultationStatus.requested: 'requested',
  ConsultationStatus.queued: 'queued',
  ConsultationStatus.inProgress: 'in_progress',
  ConsultationStatus.completed: 'completed',
  ConsultationStatus.cancelled: 'cancelled',
  ConsultationStatus.noShow: 'no_show',
};

const _$UrgencyLevelEnumMap = {
  UrgencyLevel.emergency: 'emergency',
  UrgencyLevel.urgent: 'urgent',
  UrgencyLevel.routine: 'routine',
};

const _$ConsultationTypeEnumMap = {
  ConsultationType.voice: 'voice',
  ConsultationType.video: 'video',
};

const _$PaymentStatusEnumMap = {
  PaymentStatus.pending: 'pending',
  PaymentStatus.paid: 'paid',
  PaymentStatus.refunded: 'refunded',
  PaymentStatus.failed: 'failed',
};
