// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'body_part.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

BodyPart _$BodyPartFromJson(Map<String, dynamic> json) => BodyPart(
      id: json['id'] as String,
      name: json['name'] as String,
      displayName: json['displayName'] as String,
      index: (json['index'] as num).toInt(),
      category: $enumDecode(_$BodyPartCategoryEnumMap, json['category']),
      parentId: json['parentId'] as String?,
    );

Map<String, dynamic> _$BodyPartToJson(BodyPart instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'displayName': instance.displayName,
      'index': instance.index,
      'category': _$BodyPartCategoryEnumMap[instance.category]!,
      'parentId': instance.parentId,
    };

const _$BodyPartCategoryEnumMap = {
  BodyPartCategory.head: 'head',
  BodyPartCategory.torso: 'torso',
  BodyPartCategory.upperExtremity: 'upperExtremity',
  BodyPartCategory.lowerExtremity: 'lowerExtremity',
};

SymptomComplaint _$SymptomComplaintFromJson(Map<String, dynamic> json) =>
    SymptomComplaint(
      complaintText: json['complaintText'] as String,
      selectedBodyParts: (json['selectedBodyParts'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      bodyPartIndexes: (json['bodyPartIndexes'] as List<dynamic>?)
              ?.map((e) => (e as num).toInt())
              .toList() ??
          const [],
      audioUrl: json['audioUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$SymptomComplaintToJson(SymptomComplaint instance) =>
    <String, dynamic>{
      'complaintText': instance.complaintText,
      'selectedBodyParts': instance.selectedBodyParts,
      'bodyPartIndexes': instance.bodyPartIndexes,
      'audioUrl': instance.audioUrl,
      'createdAt': instance.createdAt.toIso8601String(),
    };
