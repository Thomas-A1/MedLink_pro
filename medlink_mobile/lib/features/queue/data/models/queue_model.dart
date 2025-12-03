import 'package:json_annotation/json_annotation.dart';

part 'queue_model.g.dart';

/// Queue Status Enum
enum QueueStatus {
  @JsonValue('waiting')
  waiting,
  @JsonValue('ready')
  ready,
  @JsonValue('calling')
  calling,
  @JsonValue('timed_out')
  timedOut,
  @JsonValue('removed')
  removed,
}

/// Queue Model
@JsonSerializable()
class QueueModel {
  final String id;
  final String doctorId;
  final String patientId;
  final String consultationId;
  final int position;
  final DateTime joinedAt;
  final int estimatedWaitTime; // minutes
  final DateTime? readyAt;
  final DateTime? timeoutAt;
  final QueueStatus status;
  final UrgencyLevel urgencyLevel;

  // Populated from API
  final String? doctorName;
  final String? doctorSpecialty;
  final String? doctorFacility;

  const QueueModel({
    required this.id,
    required this.doctorId,
    required this.patientId,
    required this.consultationId,
    required this.position,
    required this.joinedAt,
    required this.estimatedWaitTime,
    this.readyAt,
    this.timeoutAt,
    required this.status,
    required this.urgencyLevel,
    this.doctorName,
    this.doctorSpecialty,
    this.doctorFacility,
  });

  factory QueueModel.fromJson(Map<String, dynamic> json) =>
      _$QueueModelFromJson(json);

  Map<String, dynamic> toJson() => _$QueueModelToJson(this);

  bool get isWaiting => status == QueueStatus.waiting;
  bool get isReady => status == QueueStatus.ready;
  bool get isCalling => status == QueueStatus.calling;
  bool get isTimedOut => status == QueueStatus.timedOut;
  bool get isRemoved => status == QueueStatus.removed;

  String get positionText {
    if (position == 1) return 'You are next!';
    return 'Position #$position';
  }
}

/// Urgency Level Enum (shared with consultation)
enum UrgencyLevel {
  @JsonValue('emergency')
  emergency,
  @JsonValue('urgent')
  urgent,
  @JsonValue('routine')
  routine,
}
