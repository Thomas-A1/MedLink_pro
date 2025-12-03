// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'queue_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

QueueModel _$QueueModelFromJson(Map<String, dynamic> json) => QueueModel(
      id: json['id'] as String,
      doctorId: json['doctorId'] as String,
      patientId: json['patientId'] as String,
      consultationId: json['consultationId'] as String,
      position: (json['position'] as num).toInt(),
      joinedAt: DateTime.parse(json['joinedAt'] as String),
      estimatedWaitTime: (json['estimatedWaitTime'] as num).toInt(),
      readyAt: json['readyAt'] == null
          ? null
          : DateTime.parse(json['readyAt'] as String),
      timeoutAt: json['timeoutAt'] == null
          ? null
          : DateTime.parse(json['timeoutAt'] as String),
      status: $enumDecode(_$QueueStatusEnumMap, json['status']),
      urgencyLevel: $enumDecode(_$UrgencyLevelEnumMap, json['urgencyLevel']),
      doctorName: json['doctorName'] as String?,
      doctorSpecialty: json['doctorSpecialty'] as String?,
      doctorFacility: json['doctorFacility'] as String?,
    );

Map<String, dynamic> _$QueueModelToJson(QueueModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'doctorId': instance.doctorId,
      'patientId': instance.patientId,
      'consultationId': instance.consultationId,
      'position': instance.position,
      'joinedAt': instance.joinedAt.toIso8601String(),
      'estimatedWaitTime': instance.estimatedWaitTime,
      'readyAt': instance.readyAt?.toIso8601String(),
      'timeoutAt': instance.timeoutAt?.toIso8601String(),
      'status': _$QueueStatusEnumMap[instance.status]!,
      'urgencyLevel': _$UrgencyLevelEnumMap[instance.urgencyLevel]!,
      'doctorName': instance.doctorName,
      'doctorSpecialty': instance.doctorSpecialty,
      'doctorFacility': instance.doctorFacility,
    };

const _$QueueStatusEnumMap = {
  QueueStatus.waiting: 'waiting',
  QueueStatus.ready: 'ready',
  QueueStatus.calling: 'calling',
  QueueStatus.timedOut: 'timed_out',
  QueueStatus.removed: 'removed',
};

const _$UrgencyLevelEnumMap = {
  UrgencyLevel.emergency: 'emergency',
  UrgencyLevel.urgent: 'urgent',
  UrgencyLevel.routine: 'routine',
};
