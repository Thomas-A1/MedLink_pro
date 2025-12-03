import 'package:json_annotation/json_annotation.dart';

part 'body_part.g.dart';

/// Represents a selectable body part in the 3D body selector
@JsonSerializable()
class BodyPart {
  final String id;
  final String name;
  final String displayName;
  final int index;
  final BodyPartCategory category;
  final String?
      parentId; // For hierarchical relationships (e.g., left_arm -> left_elbow)

  const BodyPart({
    required this.id,
    required this.name,
    required this.displayName,
    required this.index,
    required this.category,
    this.parentId,
  });

  factory BodyPart.fromJson(Map<String, dynamic> json) =>
      _$BodyPartFromJson(json);

  Map<String, dynamic> toJson() => _$BodyPartToJson(this);
}

enum BodyPartCategory {
  head,
  torso,
  upperExtremity,
  lowerExtremity,
}

/// Body part mapping index and constants
class BodyPartConstants {
  static const Map<String, int> bodyPartIndexMap = {
    'head': 1,
    'face': 2,
    'neck': 3,
    'chest': 4,
    'upper_back': 5,
    'lower_back': 6,
    'abdomen': 7,
    'left_arm': 8,
    'right_arm': 9,
    'left_elbow': 10,
    'right_elbow': 11,
    'left_wrist': 12,
    'right_wrist': 13,
    'left_hand': 14,
    'right_hand': 15,
    'left_thigh': 16,
    'right_thigh': 17,
    'left_knee': 18,
    'right_knee': 19,
    'left_leg': 20,
    'right_leg': 21,
    'left_ankle': 22,
    'right_ankle': 23,
    'left_foot': 24,
    'right_foot': 25,
  };

  static const List<BodyPart> allBodyParts = [
    // Head & Neck
    BodyPart(
      id: 'head',
      name: 'head',
      displayName: 'Head',
      index: 1,
      category: BodyPartCategory.head,
    ),
    BodyPart(
      id: 'face',
      name: 'face',
      displayName: 'Face',
      index: 2,
      category: BodyPartCategory.head,
      parentId: 'head',
    ),
    BodyPart(
      id: 'neck',
      name: 'neck',
      displayName: 'Neck',
      index: 3,
      category: BodyPartCategory.head,
    ),
    // Torso
    BodyPart(
      id: 'chest',
      name: 'chest',
      displayName: 'Chest',
      index: 4,
      category: BodyPartCategory.torso,
    ),
    BodyPart(
      id: 'upper_back',
      name: 'upper_back',
      displayName: 'Upper Back',
      index: 5,
      category: BodyPartCategory.torso,
    ),
    BodyPart(
      id: 'lower_back',
      name: 'lower_back',
      displayName: 'Lower Back',
      index: 6,
      category: BodyPartCategory.torso,
    ),
    BodyPart(
      id: 'abdomen',
      name: 'abdomen',
      displayName: 'Abdomen',
      index: 7,
      category: BodyPartCategory.torso,
    ),
    // Upper Extremities - Left
    BodyPart(
      id: 'left_arm',
      name: 'left_arm',
      displayName: 'Left Arm',
      index: 8,
      category: BodyPartCategory.upperExtremity,
    ),
    BodyPart(
      id: 'left_elbow',
      name: 'left_elbow',
      displayName: 'Left Elbow',
      index: 10,
      category: BodyPartCategory.upperExtremity,
      parentId: 'left_arm',
    ),
    BodyPart(
      id: 'left_wrist',
      name: 'left_wrist',
      displayName: 'Left Wrist',
      index: 12,
      category: BodyPartCategory.upperExtremity,
      parentId: 'left_arm',
    ),
    BodyPart(
      id: 'left_hand',
      name: 'left_hand',
      displayName: 'Left Hand',
      index: 14,
      category: BodyPartCategory.upperExtremity,
      parentId: 'left_arm',
    ),
    // Upper Extremities - Right
    BodyPart(
      id: 'right_arm',
      name: 'right_arm',
      displayName: 'Right Arm',
      index: 9,
      category: BodyPartCategory.upperExtremity,
    ),
    BodyPart(
      id: 'right_elbow',
      name: 'right_elbow',
      displayName: 'Right Elbow',
      index: 11,
      category: BodyPartCategory.upperExtremity,
      parentId: 'right_arm',
    ),
    BodyPart(
      id: 'right_wrist',
      name: 'right_wrist',
      displayName: 'Right Wrist',
      index: 13,
      category: BodyPartCategory.upperExtremity,
      parentId: 'right_arm',
    ),
    BodyPart(
      id: 'right_hand',
      name: 'right_hand',
      displayName: 'Right Hand',
      index: 15,
      category: BodyPartCategory.upperExtremity,
      parentId: 'right_arm',
    ),
    // Lower Extremities - Left
    BodyPart(
      id: 'left_thigh',
      name: 'left_thigh',
      displayName: 'Left Thigh',
      index: 16,
      category: BodyPartCategory.lowerExtremity,
    ),
    BodyPart(
      id: 'left_knee',
      name: 'left_knee',
      displayName: 'Left Knee',
      index: 18,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'left_thigh',
    ),
    BodyPart(
      id: 'left_leg',
      name: 'left_leg',
      displayName: 'Left Leg',
      index: 20,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'left_thigh',
    ),
    BodyPart(
      id: 'left_ankle',
      name: 'left_ankle',
      displayName: 'Left Ankle',
      index: 22,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'left_leg',
    ),
    BodyPart(
      id: 'left_foot',
      name: 'left_foot',
      displayName: 'Left Foot',
      index: 24,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'left_leg',
    ),
    // Lower Extremities - Right
    BodyPart(
      id: 'right_thigh',
      name: 'right_thigh',
      displayName: 'Right Thigh',
      index: 17,
      category: BodyPartCategory.lowerExtremity,
    ),
    BodyPart(
      id: 'right_knee',
      name: 'right_knee',
      displayName: 'Right Knee',
      index: 19,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'right_thigh',
    ),
    BodyPart(
      id: 'right_leg',
      name: 'right_leg',
      displayName: 'Right Leg',
      index: 21,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'right_thigh',
    ),
    BodyPart(
      id: 'right_ankle',
      name: 'right_ankle',
      displayName: 'Right Ankle',
      index: 23,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'right_leg',
    ),
    BodyPart(
      id: 'right_foot',
      name: 'right_foot',
      displayName: 'Right Foot',
      index: 25,
      category: BodyPartCategory.lowerExtremity,
      parentId: 'right_leg',
    ),
  ];

  static BodyPart? getBodyPartById(String id) {
    try {
      return allBodyParts.firstWhere((part) => part.id == id);
    } catch (e) {
      return null;
    }
  }

  static BodyPart? getBodyPartByIndex(int index) {
    try {
      return allBodyParts.firstWhere((part) => part.index == index);
    } catch (e) {
      return null;
    }
  }
}

/// Complaint data structure with body part selection (supports multiple selections)
@JsonSerializable()
class SymptomComplaint {
  final String complaintText;
  final List<String> selectedBodyParts; // Changed to support multiple
  final List<int> bodyPartIndexes; // Changed to support multiple
  final String? audioUrl;
  final DateTime createdAt;

  const SymptomComplaint({
    required this.complaintText,
    this.selectedBodyParts = const [],
    this.bodyPartIndexes = const [],
    this.audioUrl,
    required this.createdAt,
  });

  factory SymptomComplaint.fromJson(Map<String, dynamic> json) =>
      _$SymptomComplaintFromJson(json);

  Map<String, dynamic> toJson() => _$SymptomComplaintToJson(this);

  Map<String, dynamic> toApiPayload() {
    return {
      'complaint_text': complaintText,
      'selected_body_parts': selectedBodyParts,
      'body_part_indexes': bodyPartIndexes,
      'audio_url': audioUrl,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
