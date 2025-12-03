import 'dart:math' as math;
import 'package:json_annotation/json_annotation.dart';

part 'hospital_model.g.dart';

/// Hospital Model
@JsonSerializable()
class HospitalModel {
  final String id;
  final String name;
  final String address;
  final String? phone;
  final double latitude;
  final double longitude;
  final double? distanceKm; // Distance from user location
  final bool hasEmergency;
  final String? hospitalType; // e.g., "General", "Teaching", "Specialist"
  final double? rating;
  final bool isOpen;
  final String? openingHours;
  final String? imageUrl;
  final List<String>? services;
  final Map<String, dynamic>? metadata;

  const HospitalModel({
    required this.id,
    required this.name,
    required this.address,
    this.phone,
    required this.latitude,
    required this.longitude,
    this.distanceKm,
    this.hasEmergency = false,
    this.hospitalType,
    this.rating,
    this.isOpen = true,
    this.openingHours,
    this.imageUrl,
    this.services,
    this.metadata,
  });

  factory HospitalModel.fromJson(Map<String, dynamic> json) =>
      _$HospitalModelFromJson(json);

  Map<String, dynamic> toJson() => _$HospitalModelToJson(this);

  String get distanceText {
    if (distanceKm == null) {
      return 'Calculating...';
    }
    if (distanceKm! < 1) {
      return '${(distanceKm! * 1000).toStringAsFixed(0)}m away';
    }
    return '${distanceKm!.toStringAsFixed(1)}km away';
  }

  // Helper method to get distance text with a reference point
  String getDistanceTextFrom(double? refLat, double? refLng) {
    if (refLat == null || refLng == null) {
      return 'Distance unknown';
    }
    if (distanceKm != null) {
      return distanceText;
    }
    // Calculate on the fly
    final distance = _calculateDistance(refLat, refLng, latitude, longitude);
    if (distance < 1) {
      return '${(distance * 1000).toStringAsFixed(0)}m away';
    }
    return '${distance.toStringAsFixed(1)}km away';
  }

  static double _calculateDistance(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const double earthRadius = 6371; // km
    final dLat = (lat2 - lat1) * math.pi / 180;
    final dLng = (lng2 - lng1) * math.pi / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180) *
            math.cos(lat2 * math.pi / 180) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }
}
