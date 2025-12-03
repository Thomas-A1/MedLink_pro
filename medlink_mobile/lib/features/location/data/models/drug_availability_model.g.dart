// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'drug_availability_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DrugAvailabilityModel _$DrugAvailabilityModelFromJson(
        Map<String, dynamic> json) =>
    DrugAvailabilityModel(
      drugId: json['drugId'] as String,
      drugName: json['drugName'] as String,
      strength: json['strength'] as String?,
      dosage: json['dosage'] as String?,
      quantityAvailable: (json['quantityAvailable'] as num).toInt(),
      price: (json['price'] as num?)?.toDouble(),
      pharmacyId: json['pharmacyId'] as String,
      pharmacyName: json['pharmacyName'] as String,
      pharmacyLatitude: (json['pharmacyLatitude'] as num).toDouble(),
      pharmacyLongitude: (json['pharmacyLongitude'] as num).toDouble(),
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$DrugAvailabilityModelToJson(
        DrugAvailabilityModel instance) =>
    <String, dynamic>{
      'drugId': instance.drugId,
      'drugName': instance.drugName,
      'strength': instance.strength,
      'dosage': instance.dosage,
      'quantityAvailable': instance.quantityAvailable,
      'price': instance.price,
      'pharmacyId': instance.pharmacyId,
      'pharmacyName': instance.pharmacyName,
      'pharmacyLatitude': instance.pharmacyLatitude,
      'pharmacyLongitude': instance.pharmacyLongitude,
      'distanceKm': instance.distanceKm,
    };
