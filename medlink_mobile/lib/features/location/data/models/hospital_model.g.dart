// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'hospital_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

HospitalModel _$HospitalModelFromJson(Map<String, dynamic> json) =>
    HospitalModel(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      phone: json['phone'] as String?,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      hasEmergency: json['hasEmergency'] as bool? ?? false,
      hospitalType: json['hospitalType'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      isOpen: json['isOpen'] as bool? ?? true,
      openingHours: json['openingHours'] as String?,
      imageUrl: json['imageUrl'] as String?,
      services: (json['services'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$HospitalModelToJson(HospitalModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'address': instance.address,
      'phone': instance.phone,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'distanceKm': instance.distanceKm,
      'hasEmergency': instance.hasEmergency,
      'hospitalType': instance.hospitalType,
      'rating': instance.rating,
      'isOpen': instance.isOpen,
      'openingHours': instance.openingHours,
      'imageUrl': instance.imageUrl,
      'services': instance.services,
      'metadata': instance.metadata,
    };
