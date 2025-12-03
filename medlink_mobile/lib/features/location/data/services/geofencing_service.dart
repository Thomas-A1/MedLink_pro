import 'dart:math' as math;
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/pharmacy_model.dart';
import '../models/hospital_model.dart';
import '../models/drug_availability_model.dart';

/// QuadTree Node for spatial indexing
class QuadTreeNode {
  final double minLat;
  final double maxLat;
  final double minLng;
  final double maxLng;
  final List<PharmacyModel> pharmacies;
  final List<HospitalModel> hospitals;
  QuadTreeNode? topLeft;
  QuadTreeNode? topRight;
  QuadTreeNode? bottomLeft;
  QuadTreeNode? bottomRight;
  static const int maxCapacity = 10;

  QuadTreeNode({
    required this.minLat,
    required this.maxLat,
    required this.minLng,
    required this.maxLng,
  })  : pharmacies = [],
        hospitals = [];

  bool contains(double lat, double lng) {
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  bool intersects(double centerLat, double centerLng, double radiusKm) {
    // Convert radius to lat/lng degrees (approximate)
    final latRadius = radiusKm / 111.0; // 1 degree ≈ 111 km
    final lngRadius = radiusKm / (111.0 * math.cos(centerLat * math.pi / 180));

    final minLatBound = centerLat - latRadius;
    final maxLatBound = centerLat + latRadius;
    final minLngBound = centerLng - lngRadius;
    final maxLngBound = centerLng + lngRadius;

    return !(maxLatBound < minLat ||
        minLatBound > maxLat ||
        maxLngBound < minLng ||
        minLngBound > maxLng);
  }
}

/// Geofencing Service
/// Implements dynamic geofencing with tree data structure for efficient spatial searches
class GeofencingService {
  final ApiClient _apiClient = ApiClient();

  QuadTreeNode? _pharmacyTree;

  /// Build QuadTree from list of pharmacies
  QuadTreeNode _buildPharmacyTree(List<PharmacyModel> pharmacies) {
    if (pharmacies.isEmpty) {
      return QuadTreeNode(
        minLat: -90,
        maxLat: 90,
        minLng: -180,
        maxLng: 180,
      );
    }

    double minLat = pharmacies.first.latitude;
    double maxLat = pharmacies.first.latitude;
    double minLng = pharmacies.first.longitude;
    double maxLng = pharmacies.first.longitude;

    for (final pharmacy in pharmacies) {
      minLat = math.min(minLat, pharmacy.latitude);
      maxLat = math.max(maxLat, pharmacy.latitude);
      minLng = math.min(minLng, pharmacy.longitude);
      maxLng = math.max(maxLng, pharmacy.longitude);
    }

    final root = QuadTreeNode(
      minLat: minLat,
      maxLat: maxLat,
      minLng: minLng,
      maxLng: maxLng,
    );

    for (final pharmacy in pharmacies) {
      _insertPharmacy(root, pharmacy);
    }

    return root;
  }

  void _insertPharmacy(QuadTreeNode node, PharmacyModel pharmacy) {
    if (!node.contains(pharmacy.latitude, pharmacy.longitude)) {
      return;
    }

    if (node.pharmacies.length < QuadTreeNode.maxCapacity &&
        node.topLeft == null) {
      node.pharmacies.add(pharmacy);
      return;
    }

    if (node.topLeft == null) {
      _subdividePharmacy(node);
    }

    if (node.topLeft!.contains(pharmacy.latitude, pharmacy.longitude)) {
      _insertPharmacy(node.topLeft!, pharmacy);
    } else if (node.topRight!.contains(pharmacy.latitude, pharmacy.longitude)) {
      _insertPharmacy(node.topRight!, pharmacy);
    } else if (node.bottomLeft!
        .contains(pharmacy.latitude, pharmacy.longitude)) {
      _insertPharmacy(node.bottomLeft!, pharmacy);
    } else if (node.bottomRight!
        .contains(pharmacy.latitude, pharmacy.longitude)) {
      _insertPharmacy(node.bottomRight!, pharmacy);
    }
  }

  void _subdividePharmacy(QuadTreeNode node) {
    final midLat = (node.minLat + node.maxLat) / 2;
    final midLng = (node.minLng + node.maxLng) / 2;

    node.topLeft = QuadTreeNode(
      minLat: node.minLat,
      maxLat: midLat,
      minLng: node.minLng,
      maxLng: midLng,
    );

    node.topRight = QuadTreeNode(
      minLat: node.minLat,
      maxLat: midLat,
      minLng: midLng,
      maxLng: node.maxLng,
    );

    node.bottomLeft = QuadTreeNode(
      minLat: midLat,
      maxLat: node.maxLat,
      minLng: node.minLng,
      maxLng: midLng,
    );

    node.bottomRight = QuadTreeNode(
      minLat: midLat,
      maxLat: node.maxLat,
      minLng: midLng,
      maxLng: node.maxLng,
    );

    // Redistribute existing pharmacies
    final pharmacies = List<PharmacyModel>.from(node.pharmacies);
    node.pharmacies.clear();

    for (final pharmacy in pharmacies) {
      _insertPharmacy(node, pharmacy);
    }
  }

  /// Query pharmacies within radius using QuadTree
  List<PharmacyModel> _queryPharmacies(
    QuadTreeNode? node,
    double centerLat,
    double centerLng,
    double radiusKm,
  ) {
    if (node == null) return [];

    if (!node.intersects(centerLat, centerLng, radiusKm)) {
      return [];
    }

    final results = <PharmacyModel>[];

    // Check pharmacies in this node
    for (final pharmacy in node.pharmacies) {
      final distance = _calculateDistance(
        centerLat,
        centerLng,
        pharmacy.latitude,
        pharmacy.longitude,
      );
      if (distance <= radiusKm) {
        results.add(pharmacy.copyWith(distanceKm: distance));
      }
    }

    // Recursively check child nodes
    if (node.topLeft != null) {
      results.addAll(
        _queryPharmacies(node.topLeft, centerLat, centerLng, radiusKm),
      );
      results.addAll(
        _queryPharmacies(node.topRight, centerLat, centerLng, radiusKm),
      );
      results.addAll(
        _queryPharmacies(node.bottomLeft, centerLat, centerLng, radiusKm),
      );
      results.addAll(
        _queryPharmacies(node.bottomRight, centerLat, centerLng, radiusKm),
      );
    }

    return results;
  }

  /// Calculate distance between two points using Haversine formula
  double _calculateDistance(
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

  /// Load pharmacies from API and build tree
  Future<void> loadPharmacies(
    double latitude,
    double longitude, {
    double radiusKm = 50,
  }) async {
    try {
      print('🌐 Calling API: /locations/pharmacies');
      print(
          '🌐 Query params: latitude=$latitude, longitude=$longitude, radius=$radiusKm');

      final response = await _apiClient.get(
        '/locations/pharmacies',
        queryParameters: {
          'latitude': latitude.toString(),
          'longitude': longitude.toString(),
          'radius': radiusKm.toInt().toString(),
        },
      );

      print('📡 API Response status: ${response.statusCode}');
      print('📡 API Response data: ${response.data}');

      final responseData = response.data;
      final pharmaciesList = responseData['data']?['pharmacies'] ??
          responseData['pharmacies'] ??
          [];

      if (pharmaciesList is! List) {
        print('⚠️ Unexpected response format: $responseData');
        print('⚠️ Response type: ${responseData.runtimeType}');
        throw Exception('Invalid response format from API');
      }

      print('📦 Received ${pharmaciesList.length} pharmacies from API');

      final pharmacies = pharmaciesList
          .map((json) {
            try {
              return PharmacyModel.fromJson(json);
            } catch (e) {
              print('⚠️ Error parsing pharmacy: $json, error: $e');
              return null;
            }
          })
          .whereType<PharmacyModel>()
          .toList();

      print('✅ Successfully parsed ${pharmacies.length} pharmacies from API');
      _pharmacyTree = _buildPharmacyTree(pharmacies);
    } catch (e) {
      print('❌ Failed to load pharmacies: $e');
      print('❌ Error type: ${e.runtimeType}');
      if (e is DioException) {
        print('❌ Dio error: ${e.message}');
        print('❌ Response: ${e.response?.data}');
        print('❌ Status: ${e.response?.statusCode}');
      }
      throw Exception('Failed to load pharmacies: $e');
    }
  }

  /// Load all locations (pharmacies and hospitals) from API
  Future<Map<String, List<dynamic>>> loadAllLocations(
    double latitude,
    double longitude, {
    double radiusKm = 50,
  }) async {
    try {
      print('🌐 Calling API: /locations/all');
      print(
          '🌐 Query params: latitude=$latitude, longitude=$longitude, radius=$radiusKm');

      final response = await _apiClient.get(
        '/locations/all',
        queryParameters: {
          'latitude': latitude.toString(),
          'longitude': longitude.toString(),
          'radius': radiusKm.toInt().toString(),
        },
      );

      print('📡 API Response status: ${response.statusCode}');
      print('📡 API Response data: ${response.data}');

      final responseData = response.data;
      final pharmaciesList = responseData['data']?['pharmacies'] ?? [];
      final hospitalsList = responseData['data']?['hospitals'] ?? [];

      print(
          '📦 Received ${pharmaciesList.length} pharmacies and ${hospitalsList.length} hospitals from API');

      final pharmacies = pharmaciesList
          .map((json) {
            try {
              final pharmacy = PharmacyModel.fromJson(json);
              // Calculate distance if not provided by API
              if (pharmacy.distanceKm == null) {
                final distance = _calculateDistance(
                  latitude,
                  longitude,
                  pharmacy.latitude,
                  pharmacy.longitude,
                );
                // Create new instance with distance - since we can't modify, we'll handle this in the model
                return pharmacy;
              }
              return pharmacy;
            } catch (e) {
              print('⚠️ Error parsing pharmacy: $json, error: $e');
              return null;
            }
          })
          .whereType<PharmacyModel>()
          .toList();

      final hospitals = hospitalsList
          .map((json) {
            try {
              final hospital = HospitalModel.fromJson(json);
              // Calculate distance if not provided by API
              if (hospital.distanceKm == null) {
                final distance = _calculateDistance(
                  latitude,
                  longitude,
                  hospital.latitude,
                  hospital.longitude,
                );
                return hospital;
              }
              return hospital;
            } catch (e) {
              print('⚠️ Error parsing hospital: $json, error: $e');
              return null;
            }
          })
          .whereType<HospitalModel>()
          .toList();

      print(
          '✅ Successfully parsed ${pharmacies.length} pharmacies and ${hospitals.length} hospitals from API');

      return {
        'pharmacies': pharmacies,
        'hospitals': hospitals,
      };
    } catch (e) {
      print('❌ Failed to load all locations: $e');
      print('❌ Error type: ${e.runtimeType}');
      if (e is DioException) {
        print('❌ Dio error: ${e.message}');
        print('❌ Response: ${e.response?.data}');
        print('❌ Status: ${e.response?.statusCode}');
      }
      throw Exception('Failed to load all locations: $e');
    }
  }

  /// Search pharmacies within expanding radius
  Future<List<PharmacyModel>> searchPharmacies(
    double latitude,
    double longitude, {
    double initialRadiusKm = 2,
    double maxRadiusKm = 20,
    double radiusIncrementKm = 2,
    String? drugName,
  }) async {
    // If tree not built, load pharmacies first
    if (_pharmacyTree == null) {
      await loadPharmacies(latitude, longitude, radiusKm: maxRadiusKm);
    }

    final results = <PharmacyModel>[];
    double currentRadius = initialRadiusKm;

    while (currentRadius <= maxRadiusKm && results.length < 20) {
      final found = _queryPharmacies(
        _pharmacyTree,
        latitude,
        longitude,
        currentRadius,
      );

      if (drugName != null && drugName.isNotEmpty) {
        // Filter by drug availability
        final withDrug = await _filterByDrugAvailability(found, drugName);
        results.addAll(withDrug);
      } else {
        results.addAll(found);
      }

      if (results.length >= 20) break;

      currentRadius += radiusIncrementKm;
    }

    // Remove duplicates and sort by distance
    final uniqueResults = <String, PharmacyModel>{};
    for (final pharmacy in results) {
      if (!uniqueResults.containsKey(pharmacy.id)) {
        uniqueResults[pharmacy.id] = pharmacy;
      }
    }

    final sorted = uniqueResults.values.toList()
      ..sort((a, b) => (a.distanceKm ?? double.infinity)
          .compareTo(b.distanceKm ?? double.infinity));

    return sorted.take(20).toList();
  }

  /// Filter pharmacies by drug availability
  Future<List<PharmacyModel>> _filterByDrugAvailability(
    List<PharmacyModel> pharmacies,
    String drugName,
  ) async {
    final available = <PharmacyModel>[];

    for (final pharmacy in pharmacies) {
      try {
        final response = await _apiClient.get(
          '/inventory/search-drug',
          queryParameters: {
            'pharmacy_id': pharmacy.id,
            'drug_name': drugName,
          },
        );

        if (response.data['data']['available'] == true) {
          available.add(pharmacy);
        }
      } catch (e) {
        // Skip if API call fails
        continue;
      }
    }

    return available;
  }

  /// Load hospitals from API
  Future<List<HospitalModel>> loadHospitals(
    double latitude,
    double longitude, {
    double radiusKm = 50,
    bool? hasEmergency,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {
        'latitude': latitude,
        'longitude': longitude,
        'radius': radiusKm.toInt(),
      };

      if (hasEmergency != null) {
        queryParams['has_emergency'] = hasEmergency.toString();
      }

      final response = await _apiClient.get(
        '/locations/hospitals',
        queryParameters: queryParams,
      );

      return (response.data['data']['hospitals'] as List)
          .map((json) => HospitalModel.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Failed to load hospitals: $e');
    }
  }

  /// Search for drugs at nearby pharmacies
  Future<List<DrugAvailabilityModel>> searchDrugAvailability(
    double latitude,
    double longitude,
    String drugName, {
    double radiusKm = 10,
  }) async {
    try {
      final response = await _apiClient.get(
        '/inventory/search-drug',
        queryParameters: {
          'latitude': latitude,
          'longitude': longitude,
          'drug_name': drugName,
          'radius': radiusKm.toInt(),
        },
      );

      return (response.data['data']['results'] as List)
          .map((json) => DrugAvailabilityModel.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Failed to search drug availability: $e');
    }
  }
}

/// Extension to add copyWith to PharmacyModel
extension PharmacyModelExtension on PharmacyModel {
  PharmacyModel copyWith({
    String? id,
    String? name,
    String? address,
    String? phone,
    double? latitude,
    double? longitude,
    double? distanceKm,
    bool? isPartner,
    double? rating,
    bool? isOpen,
    String? openingHours,
    String? imageUrl,
    List<String>? services,
    Map<String, dynamic>? metadata,
  }) {
    return PharmacyModel(
      id: id ?? this.id,
      name: name ?? this.name,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      distanceKm: distanceKm ?? this.distanceKm,
      isPartner: isPartner ?? this.isPartner,
      rating: rating ?? this.rating,
      isOpen: isOpen ?? this.isOpen,
      openingHours: openingHours ?? this.openingHours,
      imageUrl: imageUrl ?? this.imageUrl,
      services: services ?? this.services,
      metadata: metadata ?? this.metadata,
    );
  }
}
