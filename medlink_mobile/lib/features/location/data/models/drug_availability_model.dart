import 'package:json_annotation/json_annotation.dart';

part 'drug_availability_model.g.dart';

/// Drug Availability Model
/// Represents a drug available at a pharmacy
@JsonSerializable()
class DrugAvailabilityModel {
  final String drugId;
  final String drugName;
  final String? strength;
  final String? dosage;
  final int quantityAvailable;
  final double? price;
  final String pharmacyId;
  final String pharmacyName;
  final double pharmacyLatitude;
  final double pharmacyLongitude;
  final double? distanceKm;

  const DrugAvailabilityModel({
    required this.drugId,
    required this.drugName,
    this.strength,
    this.dosage,
    required this.quantityAvailable,
    this.price,
    required this.pharmacyId,
    required this.pharmacyName,
    required this.pharmacyLatitude,
    required this.pharmacyLongitude,
    this.distanceKm,
  });

  factory DrugAvailabilityModel.fromJson(Map<String, dynamic> json) =>
      _$DrugAvailabilityModelFromJson(json);

  Map<String, dynamic> toJson() => _$DrugAvailabilityModelToJson(this);

  bool get isAvailable => quantityAvailable > 0;
  bool get isLowStock => quantityAvailable > 0 && quantityAvailable < 10;
}
