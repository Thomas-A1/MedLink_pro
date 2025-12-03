import 'package:json_annotation/json_annotation.dart';

part 'consultation_model.g.dart';

/// Consultation Status Enum
enum ConsultationStatus {
  @JsonValue('requested')
  requested,
  @JsonValue('queued')
  queued,
  @JsonValue('in_progress')
  inProgress,
  @JsonValue('completed')
  completed,
  @JsonValue('cancelled')
  cancelled,
  @JsonValue('no_show')
  noShow,
}

/// Urgency Level Enum
enum UrgencyLevel {
  @JsonValue('emergency')
  emergency,
  @JsonValue('urgent')
  urgent,
  @JsonValue('routine')
  routine,
}

/// Consultation Type Enum
enum ConsultationType {
  @JsonValue('voice')
  voice,
  @JsonValue('video')
  video,
}

/// Payment Status Enum
enum PaymentStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('paid')
  paid,
  @JsonValue('refunded')
  refunded,
  @JsonValue('failed')
  failed,
}

/// Consultation Model
@JsonSerializable()
class ConsultationModel {
  final String id;
  final String patientId;
  final String doctorId;
  final ConsultationStatus status;
  final UrgencyLevel urgencyLevel;
  final String? chiefComplaint;
  final String? audioComplaintUrl;
  final ConsultationType consultationType;
  final PaymentStatus paymentStatus;
  final double? paymentAmount;
  final String? paymentTransactionId;
  final int? queuePosition;
  final DateTime? queueJoinedAt;
  final int? estimatedWaitTime; // minutes
  final DateTime? callStartedAt;
  final DateTime? callEndedAt;
  final int? callDuration; // seconds
  final String? callRecordingUrl;
  final String? transcript;
  final String? doctorNotes;
  final String? diagnosis;
  final String? treatmentPlan;
  final bool followUpRequired;
  final DateTime? followUpDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Doctor info (populated from API)
  final String? doctorName;
  final String? doctorSpecialty;
  final String? doctorFacility;

  // Patient info (populated from API)
  final String? patientName;

  const ConsultationModel({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.status,
    required this.urgencyLevel,
    this.chiefComplaint,
    this.audioComplaintUrl,
    required this.consultationType,
    required this.paymentStatus,
    this.paymentAmount,
    this.paymentTransactionId,
    this.queuePosition,
    this.queueJoinedAt,
    this.estimatedWaitTime,
    this.callStartedAt,
    this.callEndedAt,
    this.callDuration,
    this.callRecordingUrl,
    this.transcript,
    this.doctorNotes,
    this.diagnosis,
    this.treatmentPlan,
    this.followUpRequired = false,
    this.followUpDate,
    required this.createdAt,
    required this.updatedAt,
    this.doctorName,
    this.doctorSpecialty,
    this.doctorFacility,
    this.patientName,
  });

  factory ConsultationModel.fromJson(Map<String, dynamic> json) =>
      _$ConsultationModelFromJson(json);

  Map<String, dynamic> toJson() => _$ConsultationModelToJson(this);

  ConsultationModel copyWith({
    String? id,
    String? patientId,
    String? doctorId,
    ConsultationStatus? status,
    UrgencyLevel? urgencyLevel,
    String? chiefComplaint,
    String? audioComplaintUrl,
    ConsultationType? consultationType,
    PaymentStatus? paymentStatus,
    double? paymentAmount,
    String? paymentTransactionId,
    int? queuePosition,
    DateTime? queueJoinedAt,
    int? estimatedWaitTime,
    DateTime? callStartedAt,
    DateTime? callEndedAt,
    int? callDuration,
    String? callRecordingUrl,
    String? transcript,
    String? doctorNotes,
    String? diagnosis,
    String? treatmentPlan,
    bool? followUpRequired,
    DateTime? followUpDate,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? doctorName,
    String? doctorSpecialty,
    String? doctorFacility,
    String? patientName,
  }) {
    return ConsultationModel(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      doctorId: doctorId ?? this.doctorId,
      status: status ?? this.status,
      urgencyLevel: urgencyLevel ?? this.urgencyLevel,
      chiefComplaint: chiefComplaint ?? this.chiefComplaint,
      audioComplaintUrl: audioComplaintUrl ?? this.audioComplaintUrl,
      consultationType: consultationType ?? this.consultationType,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentAmount: paymentAmount ?? this.paymentAmount,
      paymentTransactionId: paymentTransactionId ?? this.paymentTransactionId,
      queuePosition: queuePosition ?? this.queuePosition,
      queueJoinedAt: queueJoinedAt ?? this.queueJoinedAt,
      estimatedWaitTime: estimatedWaitTime ?? this.estimatedWaitTime,
      callStartedAt: callStartedAt ?? this.callStartedAt,
      callEndedAt: callEndedAt ?? this.callEndedAt,
      callDuration: callDuration ?? this.callDuration,
      callRecordingUrl: callRecordingUrl ?? this.callRecordingUrl,
      transcript: transcript ?? this.transcript,
      doctorNotes: doctorNotes ?? this.doctorNotes,
      diagnosis: diagnosis ?? this.diagnosis,
      treatmentPlan: treatmentPlan ?? this.treatmentPlan,
      followUpRequired: followUpRequired ?? this.followUpRequired,
      followUpDate: followUpDate ?? this.followUpDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      doctorName: doctorName ?? this.doctorName,
      doctorSpecialty: doctorSpecialty ?? this.doctorSpecialty,
      doctorFacility: doctorFacility ?? this.doctorFacility,
      patientName: patientName ?? this.patientName,
    );
  }

  bool get isPaid => paymentStatus == PaymentStatus.paid;
  bool get isInQueue => status == ConsultationStatus.queued;
  bool get isInProgress => status == ConsultationStatus.inProgress;
  bool get isCompleted => status == ConsultationStatus.completed;
  bool get canJoinCall => isPaid && (isInQueue || isInProgress);
}
