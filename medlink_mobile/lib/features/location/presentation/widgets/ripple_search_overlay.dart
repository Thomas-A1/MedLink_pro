import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../../core/constants/app_colors.dart';

/// Ripple Search Overlay
///
/// Beautiful animated ripple effect that expands outward
/// to visualize the expanding search radius
class RippleSearchOverlay extends StatelessWidget {
  final LatLng center;
  final double radius; // in km
  final Animation<double> animation;

  const RippleSearchOverlay({
    super.key,
    required this.center,
    required this.radius,
    required this.animation,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        return CustomPaint(
          painter: _RipplePainter(
            center: center,
            radius: radius,
            animationValue: animation.value,
          ),
          child: const SizedBox.expand(),
        );
      },
    );
  }
}

class _RipplePainter extends CustomPainter {
  final LatLng center;
  final double radius; // in km
  final double animationValue;

  _RipplePainter({
    required this.center,
    required this.radius,
    required this.animationValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Convert lat/lng to screen coordinates
    // This is a simplified conversion - in production, use proper map projection
    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Convert radius from km to screen pixels (approximate)
    // Reduced multiplier to keep ripple within search container bounds
    // 1 km ≈ 111 pixels at zoom level 13, but we reduce it significantly
    final radiusPixels = radius * 30 * animationValue; // Reduced from 111 to 30

    // Draw multiple ripple rings for beautiful effect
    for (int i = 0; i < 3; i++) {
      final ringRadius = radiusPixels * (1.0 + i * 0.3);
      final opacity = (1.0 - animationValue) * (1.0 - i * 0.2);

      if (opacity > 0) {
        final paint = Paint()
          ..color = AppColors.primary.withValues(alpha: opacity * 0.3)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3.0
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5.0);

        canvas.drawCircle(
          Offset(centerX, centerY),
          ringRadius,
          paint,
        );

        // Inner glow
        final innerPaint = Paint()
          ..color = AppColors.primaryLight.withValues(alpha: opacity * 0.5)
          ..style = PaintingStyle.fill;

        canvas.drawCircle(
          Offset(centerX, centerY),
          ringRadius * 0.95,
          innerPaint,
        );
      }
    }

    // Center pulse
    final centerPaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(
      Offset(centerX, centerY),
      8.0 * (1.0 + math.sin(animationValue * 2 * math.pi) * 0.3),
      centerPaint,
    );
  }

  @override
  bool shouldRepaint(_RipplePainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.radius != radius;
  }
}
