import 'dart:async';
import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../../../../core/constants/app_colors.dart';
import '../../data/models/pharmacy_model.dart';
import '../../data/models/hospital_model.dart';
import '../../data/services/geofencing_service.dart';
import '../widgets/ripple_search_overlay.dart';
import 'pharmacy_detail_screen.dart';
import 'hospital_detail_screen.dart';

/// Map Search Screen
///
/// Features:
/// - Interactive Google Maps with pharmacy/hospital markers
/// - Dynamic geofencing with expanding search radius
/// - Beautiful ripple effect during search
/// - Drug/medication search functionality
/// - Real-time location updates
class MapSearchScreen extends StatefulWidget {
  static const routeName = '/map/search';

  const MapSearchScreen({super.key});

  @override
  State<MapSearchScreen> createState() => _MapSearchScreenState();
}

class _MapSearchScreenState extends State<MapSearchScreen>
    with TickerProviderStateMixin {
  final GeofencingService _geofencingService = GeofencingService();
  GoogleMapController? _mapController;
  Position? _currentPosition;
  List<PharmacyModel> _pharmacies = [];
  List<HospitalModel> _hospitals = [];
  String _searchQuery = '';
  bool _isSearching = false;
  double _searchRadius = 2.0; // km
  Timer? _searchTimer;
  String _selectedType = 'all'; // 'all', 'pharmacy', 'hospital'
  String? _drugSearchQuery;
  String? _mapError; // Track map initialization errors

  // Animation controllers for ripple effect
  late AnimationController _rippleController;
  late Animation<double> _rippleAnimation;

  // Set of markers
  final Set<Marker> _markers = {};
  final Set<Circle> _circles = {};
  final Set<Polyline> _polylines = {};

  // Custom marker icons (cached)
  BitmapDescriptor? _pharmacyMarkerIcon;
  BitmapDescriptor? _hospitalMarkerIcon;

  @override
  void initState() {
    super.initState();
    _initRippleAnimation();
    _createCustomMarkers();
    // Request location after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getCurrentLocation().then((_) {
        // Once location is obtained, perform initial search
        if (_currentPosition != null) {
          _performSearch();
        }
      });
    });
  }

  Future<void> _createCustomMarkers() async {
    // Create custom pharmacy marker (green with pharmacy icon)
    _pharmacyMarkerIcon = await _createMarkerIcon(
      icon: Icons.local_pharmacy_rounded,
      color: Colors.green,
      backgroundColor: Colors.white,
    );

    // Create custom hospital marker (red with hospital icon)
    _hospitalMarkerIcon = await _createMarkerIcon(
      icon: Icons.local_hospital_rounded,
      color: Colors.red,
      backgroundColor: Colors.white,
    );

    if (mounted) {
      setState(() {}); // Refresh to show custom markers
    }
  }

  Future<BitmapDescriptor> _createMarkerIcon({
    required IconData icon,
    required Color color,
    required Color backgroundColor,
  }) async {
    final size = 100.0;
    final pictureRecorder = ui.PictureRecorder();
    final canvas = Canvas(pictureRecorder);

    // Draw shadow
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
    canvas.drawCircle(
        Offset(size / 2 + 2, size / 2 + 2), size / 2 - 4, shadowPaint);

    // Draw background circle with gradient effect
    final backgroundPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.fill;
    canvas.drawCircle(
        Offset(size / 2, size / 2), size / 2 - 4, backgroundPaint);

    // Draw border
    final borderPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;
    canvas.drawCircle(Offset(size / 2, size / 2), size / 2 - 4, borderPaint);

    // Draw icon using text
    final textSpan = TextSpan(
      text: String.fromCharCode(icon.codePoint),
      style: TextStyle(
        fontSize: size * 0.4,
        fontFamily: icon.fontFamily,
        color: color,
        fontWeight: FontWeight.w600,
      ),
    );

    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(
        (size - textPainter.width) / 2,
        (size - textPainter.height) / 2 - 2,
      ),
    );

    final picture = pictureRecorder.endRecording();
    final image = await picture.toImage(size.toInt(), size.toInt());
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final byteData = bytes!.buffer.asUint8List();

    return BitmapDescriptor.fromBytes(byteData);
  }

  void _initRippleAnimation() {
    _rippleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _rippleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _rippleController,
        curve: Curves.easeOut,
      ),
    );
  }

  Future<void> _getCurrentLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        // Open location settings - let the system handle it
        await Geolocator.openLocationSettings();
        _setDefaultLocation();
        return;
      }

      // Check location permission - let the system show the native dialog
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        // Request permission - system will show native dialog
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _setDefaultLocation();
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        // Open app settings - let the system handle it
        await Geolocator.openAppSettings();
        _setDefaultLocation();
        return;
      }

      // Permission granted, get current position - use real GPS location (not mocked)
      // Use high accuracy for real location
      // Use best accuracy to get actual device GPS location
      debugPrint('🔍 Requesting high-accuracy GPS location...');

      Position? position;
      int attempts = 0;
      const maxAttempts = 3;

      // Try to get real GPS location, reject mocked locations
      while (attempts < maxAttempts) {
        try {
          final currentPosition = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high, // Use high accuracy for GPS
            timeLimit: const Duration(seconds: 15),
            forceAndroidLocationManager: false, // Use GPS provider
          );

          // Verify the position is valid (not null coordinates)
          if (currentPosition.latitude == 0.0 &&
              currentPosition.longitude == 0.0) {
            debugPrint('⚠️ Invalid location (0,0), retrying...');
            attempts++;
            await Future.delayed(const Duration(seconds: 1));
            continue;
          }

          // STRICTLY reject mocked locations - never accept them
          if (currentPosition.isMocked) {
            debugPrint(
                '⚠️ Mocked location detected (${currentPosition.latitude}, ${currentPosition.longitude}), retrying for real GPS...');
            attempts++;
            // Wait a bit before retrying
            await Future.delayed(const Duration(seconds: 1));
            continue;
          }

          // Got a valid, non-mocked location
          debugPrint(
              '✅ Got real GPS location: ${currentPosition.latitude}, ${currentPosition.longitude}');
          position = currentPosition;
          break;
        } catch (e) {
          debugPrint('❌ Error getting location (attempt ${attempts + 1}): $e');
          attempts++;
          if (attempts < maxAttempts) {
            await Future.delayed(const Duration(seconds: 1));
          }
        }
      }

      // If we still don't have a real location, try last known position
      if (position == null) {
        debugPrint('⚠️ Attempting to get location from location service...');
        try {
          final lastKnown = await Geolocator.getLastKnownPosition();
          if (lastKnown != null && !lastKnown.isMocked) {
            // Validate location is in Ghana
            final isInGhana = lastKnown.latitude >= 4.7 &&
                lastKnown.latitude <= 11.2 &&
                lastKnown.longitude >= -3.3 &&
                lastKnown.longitude <= 1.3;
            if (isInGhana) {
              debugPrint('✅ Using last known real GPS location');
              position = lastKnown;
            } else {
              debugPrint(
                  '⚠️ Last known location (${lastKnown.latitude}, ${lastKnown.longitude}) is outside Ghana. Using default location.');
              if (mounted) {
                _setDefaultLocation();
              }
              return;
            }
          } else {
            // Don't accept mocked locations - use default location instead
            debugPrint(
                '⚠️ No real GPS location available. Using default location (Accra, Ghana).');
            debugPrint(
                '⚠️ Please enable location services and disable location mocking in device settings.');
            if (mounted) {
              _setDefaultLocation();
            }
            return;
          }
        } catch (e) {
          debugPrint('❌ Failed to get location: $e');
          debugPrint('⚠️ Using default location (Accra, Ghana)');
          if (mounted) {
            _setDefaultLocation();
          }
          return;
        }
      }

      // Final check - reject any mocked locations or locations outside Ghana
      // Ghana coordinates: Lat 4.7-11.2, Lng -3.3 to 1.3
      final isInGhana = position.latitude >= 4.7 &&
          position.latitude <= 11.2 &&
          position.longitude >= -3.3 &&
          position.longitude <= 1.3;

      if (position.isMocked || !isInGhana) {
        if (position.isMocked) {
          debugPrint(
              '⚠️ Rejecting mocked location. Using default location (Accra, Ghana).');
        } else {
          debugPrint(
              '⚠️ Location (${position.latitude}, ${position.longitude}) is outside Ghana. Using default location (Accra, Ghana).');
        }
        // Use default location (Accra, Ghana) instead of mocked/invalid location
        if (mounted) {
          _setDefaultLocation();
        }
        return; // Don't set _currentPosition, just show default location on map
      }

      debugPrint(
          '📍 GPS Location received: ${position.latitude}, ${position.longitude}');
      debugPrint('📍 Accuracy: ${position.accuracy}m');
      debugPrint(
          '📍 Source: ${position.isMocked ? "Mocked (WARNING)" : "Real GPS"}');

      if (mounted) {
        setState(() {
          _currentPosition = position!;
        });

        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(
            LatLng(position.latitude, position.longitude),
            15.0, // Increased zoom for better visibility
          ),
        );

        // Automatically perform search with real location (non-blocking)
        _performSearch();
      }
    } catch (e) {
      debugPrint('Location error: $e');
      if (mounted) {
        _setDefaultLocation();
      }
    }
  }

  void _setDefaultLocation() {
    // Default to Accra, Ghana if location is not available
    // Set _currentPosition to default location so search can work
    final defaultPosition = Position(
      latitude: 5.6037,
      longitude: -0.1870,
      timestamp: DateTime.now(),
      accuracy: 0,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );

    if (mounted) {
      setState(() {
        _currentPosition = defaultPosition;
      });

      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(
          const LatLng(5.6037, -0.1870), // Accra, Ghana
          13.0,
        ),
      );

      // Perform search with default location
      _performSearch();
    }
  }

  Future<void> _performSearch() async {
    if (_currentPosition == null) return;

    // Start search indicator (non-blocking)
    if (mounted) {
      setState(() {
        _isSearching = true;
        _searchRadius = 2.0;
      });
      _rippleController.repeat();
    }

    // Load data in background - don't block UI
    Future.microtask(() async {
      try {
        List<PharmacyModel> pharmacies = [];
        List<HospitalModel> hospitals = [];

        // Use optimized endpoint for "all" to get both in one call
        if (_selectedType == 'all') {
          try {
            final allLocations = await _geofencingService.loadAllLocations(
              _currentPosition!.latitude,
              _currentPosition!.longitude,
              radiusKm: 20.0,
            );
            pharmacies = (allLocations['pharmacies'] as List)
                .cast<PharmacyModel>()
                .toList();
            hospitals = (allLocations['hospitals'] as List)
                .cast<HospitalModel>()
                .toList();
          } catch (e) {
            debugPrint('Error loading all locations: $e');
          }
        } else {
          // Load specific type
          if (_selectedType == 'pharmacy') {
            try {
              pharmacies = await _geofencingService.searchPharmacies(
                _currentPosition!.latitude,
                _currentPosition!.longitude,
                initialRadiusKm: 2.0,
                maxRadiusKm: 20.0,
                radiusIncrementKm: 2.0,
                drugName: _drugSearchQuery,
              );
            } catch (e) {
              debugPrint('Error loading pharmacies: $e');
            }
          } else if (_selectedType == 'hospital') {
            try {
              hospitals = await _geofencingService.loadHospitals(
                _currentPosition!.latitude,
                _currentPosition!.longitude,
                radiusKm: 20.0,
              );
            } catch (e) {
              debugPrint('Error loading hospitals: $e');
            }
          }
        }

        // Note: Distance is calculated on-the-fly in the model's distanceText getter
        // No need to pre-calculate here since models handle it dynamically

        if (mounted) {
          setState(() {
            _pharmacies = pharmacies;
            _hospitals = hospitals;
            _isSearching = false;
          });
          _updateMarkers();
          _updateCircles();
          _rippleController.stop();
        }
      } catch (e) {
        debugPrint('Search error: $e');
        if (mounted) {
          setState(() {
            _isSearching = false;
          });
          _rippleController.stop();
        }
      }
    });
  }

  void _updateMarkers() {
    _markers.clear();

    // Add pharmacy markers (only if 'all' or 'pharmacy' is selected)
    if (_selectedType == 'all' || _selectedType == 'pharmacy') {
      for (final pharmacy in _pharmacies) {
        _markers.add(
          Marker(
            markerId: MarkerId('pharmacy_${pharmacy.id}'),
            position: LatLng(pharmacy.latitude, pharmacy.longitude),
            icon: _pharmacyMarkerIcon ??
                BitmapDescriptor.defaultMarkerWithHue(
                  BitmapDescriptor.hueGreen,
                ),
            infoWindow: InfoWindow(
              title: pharmacy.name,
              snippet: pharmacy.distanceText,
            ),
            onTap: () => _showPharmacyDetail(pharmacy),
          ),
        );
      }
    }

    // Add hospital markers (only if 'all' or 'hospital' is selected)
    if (_selectedType == 'all' || _selectedType == 'hospital') {
      for (final hospital in _hospitals) {
        _markers.add(
          Marker(
            markerId: MarkerId('hospital_${hospital.id}'),
            position: LatLng(hospital.latitude, hospital.longitude),
            icon: _hospitalMarkerIcon ??
                BitmapDescriptor.defaultMarkerWithHue(
                  BitmapDescriptor.hueRed,
                ),
            infoWindow: InfoWindow(
              title: hospital.name,
              snippet: hospital.distanceText,
            ),
            onTap: () => _showHospitalDetail(hospital),
          ),
        );
      }
    }
  }

  void _updateCircles() {
    _circles.clear();

    if (_currentPosition != null && _isSearching) {
      // Convert radius from km to meters
      final radiusMeters = _searchRadius * 1000;

      _circles.add(
        Circle(
          circleId: const CircleId('search_radius'),
          center: LatLng(
            _currentPosition!.latitude,
            _currentPosition!.longitude,
          ),
          radius: radiusMeters,
          strokeWidth: 2,
          strokeColor: AppColors.primary.withValues(alpha: 0.5),
          fillColor: AppColors.primaryLight.withValues(alpha: 0.1),
        ),
      );
    }
  }

  void _showPharmacyDetail(PharmacyModel pharmacy) async {
    final result = await Navigator.of(context).pushNamed(
      PharmacyDetailScreen.routeName,
      arguments: pharmacy,
    );
    // If user clicked "Navigate" from detail screen, show route
    if (result is PharmacyModel) {
      _showRouteToLocation(result.latitude, result.longitude);
    }
  }

  void _showHospitalDetail(HospitalModel hospital) async {
    final result = await Navigator.of(context).pushNamed(
      HospitalDetailScreen.routeName,
      arguments: hospital,
    );
    // If user clicked "Navigate" from detail screen, show route
    if (result is HospitalModel) {
      _showRouteToLocation(result.latitude, result.longitude);
    }
  }

  Future<void> _showRouteToLocation(double destLat, double destLng) async {
    if (_currentPosition == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                const Text('Please wait for your location to be determined.'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    if (_mapController == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Map is not ready. Please wait a moment.'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    try {
      // Use Google Maps Directions API to get actual route
      final origin =
          '${_currentPosition!.latitude},${_currentPosition!.longitude}';
      final destination = '$destLat,$destLng';

      // Get Google Maps API key from environment
      final apiKey = dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

      if (apiKey.isEmpty) {
        debugPrint(
            '⚠️ Google Maps API key not found in .env file. Add GOOGLE_MAPS_API_KEY to use actual routes.');
        // Fallback to straight line if no API key
        final points = [
          LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          LatLng(destLat, destLng),
        ];
        setState(() {
          _polylines.clear();
          _polylines.add(
            Polyline(
              polylineId: const PolylineId('route'),
              points: points,
              color: Colors.blue,
              width: 5,
              patterns: [],
            ),
          );
        });
        final bounds = LatLngBounds(
          southwest: LatLng(
            _currentPosition!.latitude < destLat
                ? _currentPosition!.latitude
                : destLat,
            _currentPosition!.longitude < destLng
                ? _currentPosition!.longitude
                : destLng,
          ),
          northeast: LatLng(
            _currentPosition!.latitude > destLat
                ? _currentPosition!.latitude
                : destLat,
            _currentPosition!.longitude > destLng
                ? _currentPosition!.longitude
                : destLng,
          ),
        );
        _mapController
            ?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 100));
        return;
      }

      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/directions/json?'
        'origin=$origin&'
        'destination=$destination&'
        'key=$apiKey&'
        'mode=driving',
      );

      try {
        final response = await http.get(url);
        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          if (data['status'] == 'OK' && data['routes'].isNotEmpty) {
            final route = data['routes'][0];
            final leg = route['legs'][0];

            // Get distance and duration
            final distanceText = leg['distance']['text'];
            final durationText = leg['duration']['text'];

            // Decode polyline
            final overviewPolyline = route['overview_polyline']['points'];
            final points = _decodePolyline(overviewPolyline);

            setState(() {
              _polylines.clear();
              _polylines.add(
                Polyline(
                  polylineId: const PolylineId('route'),
                  points: points,
                  color: Colors.blue,
                  width: 5,
                  patterns: [],
                ),
              );
            });

            // Show distance and time in a snackbar
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content:
                      Text('Distance: $distanceText • Time: $durationText'),
                  duration: const Duration(seconds: 4),
                  backgroundColor: Colors.blue,
                ),
              );
            }

            // Animate camera to show route
            final bounds = _getBoundsForPoints(points);
            _mapController?.animateCamera(
              CameraUpdate.newLatLngBounds(bounds, 100),
            );
            return;
          }
        }
      } catch (e) {
        debugPrint('Directions API error: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to get directions: ${e.toString()}'),
              backgroundColor: AppColors.error,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      }

      // Fallback: Draw straight line if API fails
      final points = [
        LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
        LatLng(destLat, destLng),
      ];

      setState(() {
        _polylines.clear();
        _polylines.add(
          Polyline(
            polylineId: const PolylineId('route'),
            points: points,
            color: Colors.blue,
            width: 5,
            patterns: [],
          ),
        );
      });

      // Animate camera to show both locations
      final bounds = LatLngBounds(
        southwest: LatLng(
          _currentPosition!.latitude < destLat
              ? _currentPosition!.latitude
              : destLat,
          _currentPosition!.longitude < destLng
              ? _currentPosition!.longitude
              : destLng,
        ),
        northeast: LatLng(
          _currentPosition!.latitude > destLat
              ? _currentPosition!.latitude
              : destLat,
          _currentPosition!.longitude > destLng
              ? _currentPosition!.longitude
              : destLng,
        ),
      );

      _mapController?.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, 100),
      );
    } catch (e) {
      debugPrint('Error showing route: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error getting directions: ${e.toString()}'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 4),
          ),
        );
      }
      debugPrint('Error showing route: $e');
    }
  }

  List<LatLng> _decodePolyline(String encoded) {
    List<LatLng> points = [];
    int index = 0;
    int len = encoded.length;
    int lat = 0;
    int lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.add(LatLng(lat / 1e5, lng / 1e5));
    }
    return points;
  }

  LatLngBounds _getBoundsForPoints(List<LatLng> points) {
    double? minLat, maxLat, minLng, maxLng;
    for (var point in points) {
      minLat = minLat == null
          ? point.latitude
          : (minLat < point.latitude ? minLat : point.latitude);
      maxLat = maxLat == null
          ? point.latitude
          : (maxLat > point.latitude ? maxLat : point.latitude);
      minLng = minLng == null
          ? point.longitude
          : (minLng < point.longitude ? minLng : point.longitude);
      maxLng = maxLng == null
          ? point.longitude
          : (maxLng > point.longitude ? maxLng : point.longitude);
    }
    return LatLngBounds(
      southwest: LatLng(minLat!, minLng!),
      northeast: LatLng(maxLat!, maxLng!),
    );
  }

  void _onSearchChanged(String query) {
    _searchQuery = query;
    _searchTimer?.cancel();
    _searchTimer = Timer(const Duration(milliseconds: 500), () {
      if (_searchQuery.isNotEmpty) {
        _drugSearchQuery = _searchQuery;
        _performSearch();
      } else {
        setState(() {
          _drugSearchQuery = null;
        });
        _performSearch();
      }
    });
  }

  @override
  void dispose() {
    _rippleController.dispose();
    _searchTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Force light theme for maps screen
    return Theme(
      data: ThemeData.light(),
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: AppColors.textPrimary),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(
            'Find Care Nearby',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
        body: Stack(
          children: [
            // Google Map
            _buildMap(),
            // Combined Search Bar and Filters
            _buildSearchContainer(),
            // Results List
            _buildResultsList(),
            // Ripple Effect Overlay - Reduced radius to stay within search container
            if (_isSearching && _currentPosition != null)
              RippleSearchOverlay(
                center: LatLng(
                  _currentPosition!.latitude,
                  _currentPosition!.longitude,
                ),
                radius: _searchRadius *
                    0.3, // Reduced radius multiplier to constrain within container
                animation: _rippleAnimation,
              ),
            // Location Button - Sticky on map
            _buildLocationButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildMap() {
    // Show error message if map failed to initialize
    if (_mapError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline_rounded,
                size: 64,
                color: AppColors.error,
              ),
              const SizedBox(height: 16),
              Text(
                'Map Unavailable',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                _mapError ??
                    'Google Maps is not properly configured. Please check your API key settings.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _mapError = null;
                  });
                  _getCurrentLocation();
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // Always show map, even if location is not available yet
    // Default to Accra, Ghana if no current position
    final defaultLatLng = _currentPosition != null
        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
        : const LatLng(5.6037, -0.1870); // Accra, Ghana

    try {
      return GoogleMap(
        initialCameraPosition: CameraPosition(
          target: defaultLatLng,
          zoom: 13.0,
        ),
        onMapCreated: (controller) {
          _mapController = controller;
          // If we have a current position, animate to it
          if (_currentPosition != null) {
            controller.animateCamera(
              CameraUpdate.newLatLngZoom(
                LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                15.0, // Increased zoom for better map visibility
              ),
            );
          } else {
            // Ensure map tiles load even without location
            controller.animateCamera(
              CameraUpdate.newLatLngZoom(
                const LatLng(5.6037, -0.1870), // Accra, Ghana
                15.0,
              ),
            );
          }
        },
        mapToolbarEnabled: false,
        liteModeEnabled: false, // Ensure full map tiles load
        onCameraMoveStarted: () {
          // Clear any previous errors when map starts working
          if (_mapError != null) {
            setState(() {
              _mapError = null;
            });
          }
        },
        markers: _markers,
        circles: _circles,
        polylines: _polylines,
        myLocationEnabled: _currentPosition != null,
        myLocationButtonEnabled: false,
        mapType: MapType.normal,
        zoomControlsEnabled: false,
        compassEnabled: true,
      );
    } catch (e) {
      // If map creation fails, show error
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() {
            _mapError = 'Failed to load map: ${e.toString()}';
          });
        }
      });
      return Center(
        child: CircularProgressIndicator(
          color: AppColors.primary,
        ),
      );
    }
  }

  Widget _buildSearchContainer() {
    return Positioned(
      top: 16,
      left: 16,
      right: 16,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Input
            Row(
              children: [
                Icon(Icons.search_rounded,
                    color: AppColors.textSecondary, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    onChanged: _onSearchChanged,
                    style: const TextStyle(
                      fontSize: 16,
                      height: 1.5,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search medication, doctor, or service...',
                      border: InputBorder.none,
                      hintStyle: TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                        letterSpacing: 0.15,
                        fontFamily: 'SF Pro Display', // iOS system font
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        vertical: 12,
                        horizontal: 8,
                      ),
                    ),
                  ),
                ),
                if (_isSearching)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            // Filter Chips Row
            Row(
              children: [
                _buildFilterChip('all', Icons.all_inclusive_rounded, 'All'),
                const SizedBox(width: 8),
                _buildFilterChip(
                    'pharmacy', Icons.local_pharmacy_rounded, 'Pharmacies'),
                const SizedBox(width: 8),
                _buildFilterChip(
                    'hospital', Icons.local_hospital_rounded, 'Hospitals'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationButton() {
    return Positioned(
      bottom: 300,
      right: 16,
      child: Material(
        elevation: 4,
        shape: const CircleBorder(),
        color: Colors.white,
        child: InkWell(
          onTap: _centerMapOnCurrentLocation,
          borderRadius: BorderRadius.circular(28),
          child: Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
            ),
            child: CustomPaint(
              painter: _TargetIconPainter(),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _centerMapOnCurrentLocation() async {
    try {
      // Check if we already have a current position
      if (_currentPosition != null) {
        // Animate to current position
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(
            LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
            15.0,
          ),
        );
        return;
      }

      // Otherwise, get fresh location
      debugPrint('🎯 Location button tapped - getting current location...');

      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        await Geolocator.openLocationSettings();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Please enable location services'),
              backgroundColor: AppColors.error,
            ),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Location permission is required'),
                backgroundColor: AppColors.error,
              ),
            );
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        await Geolocator.openAppSettings();
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 15),
        forceAndroidLocationManager: false,
      );

      if (mounted) {
        setState(() {
          _currentPosition = position;
        });

        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(
            LatLng(position.latitude, position.longitude),
            15.0,
          ),
        );

        // Trigger search for nearby pharmacies (non-blocking)
        _performSearch();
      }
    } catch (e) {
      debugPrint('Error centering on location: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to get location: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Widget _buildFilterChip(String type, IconData icon, String label) {
    final isSelected = _selectedType == type;
    return GestureDetector(
      onTap: () {
        // Update state immediately for instant UI response
        setState(() {
          _selectedType = type;
        });
        // Load data in background without blocking UI
        _performSearch();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.textSecondary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsList() {
    if (!_isSearching && _pharmacies.isEmpty && _hospitals.isEmpty) {
      return const SizedBox.shrink();
    }

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.4,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Results count
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    '${_pharmacies.length + _hospitals.length} care locations nearby',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
            // Results list
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: [
                  ..._pharmacies
                      .map((pharmacy) => _buildPharmacyCard(pharmacy)),
                  ..._hospitals.map((hospital) => _buildHospitalCard(hospital)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPharmacyCard(PharmacyModel pharmacy) {
    return ListTile(
      leading: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(
          Icons.local_pharmacy_rounded,
          color: AppColors.primary,
        ),
      ),
      title: Text(
        pharmacy.name,
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(pharmacy.address),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.location_on_rounded,
                  size: 14, color: AppColors.primary),
              Flexible(
                child: Text(
                  _currentPosition != null && pharmacy.distanceKm == null
                      ? pharmacy.getDistanceTextFrom(
                          _currentPosition!.latitude,
                          _currentPosition!.longitude,
                        )
                      : pharmacy.distanceText,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (pharmacy.rating != null) ...[
                const SizedBox(width: 8),
                Icon(Icons.star_rounded, size: 14, color: Colors.amber),
                Flexible(
                  child: Text(
                    '${pharmacy.rating}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
      trailing:
          Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary),
      onTap: () => _showPharmacyDetail(pharmacy),
    );
  }

  Widget _buildHospitalCard(HospitalModel hospital) {
    return ListTile(
      leading: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: AppColors.errorLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(
          Icons.local_hospital_rounded,
          color: AppColors.error,
        ),
      ),
      title: Text(
        hospital.name,
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(hospital.address),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.location_on_rounded, size: 14, color: AppColors.error),
              Flexible(
                child: Text(
                  _currentPosition != null && hospital.distanceKm == null
                      ? hospital.getDistanceTextFrom(
                          _currentPosition!.latitude,
                          _currentPosition!.longitude,
                        )
                      : hospital.distanceText,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (hospital.hasEmergency) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.error,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    '24/7',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
      trailing:
          Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary),
      onTap: () => _showHospitalDetail(hospital),
    );
  }
}

/// Custom Painter for Target/Crosshair Icon
class _TargetIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill
      ..strokeWidth = 2.0;

    // Draw center dot
    canvas.drawCircle(center, 3.0, paint);

    // Draw outer ring
    final ringPaint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawCircle(center, 12.0, ringPaint);

    // Draw crosshair lines (cardinal directions)
    final linePaint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;

    // Top line (12 o'clock)
    canvas.drawLine(
      Offset(center.dx, center.dy - 12.0),
      Offset(center.dx, center.dy - 20.0),
      linePaint,
    );

    // Right line (3 o'clock)
    canvas.drawLine(
      Offset(center.dx + 12.0, center.dy),
      Offset(center.dx + 20.0, center.dy),
      linePaint,
    );

    // Bottom line (6 o'clock)
    canvas.drawLine(
      Offset(center.dx, center.dy + 12.0),
      Offset(center.dx, center.dy + 20.0),
      linePaint,
    );

    // Left line (9 o'clock)
    canvas.drawLine(
      Offset(center.dx - 12.0, center.dy),
      Offset(center.dx - 20.0, center.dy),
      linePaint,
    );
  }

  @override
  bool shouldRepaint(_TargetIconPainter oldDelegate) => false;
}
