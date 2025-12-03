// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pharmacy_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PharmacyModel _$PharmacyModelFromJson(Map<String, dynamic> json) =>
    PharmacyModel(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      phone: json['phone'] as String?,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      isPartner: json['isPartner'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble(),
      isOpen: json['isOpen'] as bool? ?? true,
      openingHours: json['openingHours'] as String?,
      imageUrl: json['imageUrl'] as String?,
      services: (json['services'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$PharmacyModelToJson(PharmacyModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'address': instance.address,
      'phone': instance.phone,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'distanceKm': instance.distanceKm,
      'isPartner': instance.isPartner,
      'rating': instance.rating,
      'isOpen': instance.isOpen,
      'openingHours': instance.openingHours,
      'imageUrl': instance.imageUrl,
      'services': instance.services,
      'metadata': instance.metadata,
    };
