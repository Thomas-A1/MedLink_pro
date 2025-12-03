import 'package:flutter/material.dart';

import '../../data/models/body_part.dart';

/// Classic Selectable Human Body Widget
///
/// Features:
/// - Front and back view toggle
/// - Tap to select body parts
/// - Red highlight for selected parts
/// - Information panel for selected parts
/// - Clean, classic medical design
class SelectableBodySelector extends StatefulWidget {
  final Function(List<BodyPart>)? onBodyPartsChanged;
  final List<BodyPart> initialSelections;

  const SelectableBodySelector({
    super.key,
    this.onBodyPartsChanged,
    this.initialSelections = const [],
  });

  @override
  State<SelectableBodySelector> createState() => _SelectableBodySelectorState();
}

class _SelectableBodySelectorState extends State<SelectableBodySelector> {
  final Set<String> _selectedPartIds = {};
  bool _isFrontView = true; // true = front, false = back
  BodyPart? _hoveredPart;

  @override
  void initState() {
    super.initState();
    _selectedPartIds.addAll(
      widget.initialSelections.map((p) => p.id),
    );
  }

  void _toggleBodyPartSelection(BodyPart part) {
    setState(() {
      if (_selectedPartIds.contains(part.id)) {
        _selectedPartIds.remove(part.id);
      } else {
        _selectedPartIds.add(part.id);
      }
      _hoveredPart = part;
    });

    final selectedParts = _selectedPartIds
        .map((id) => BodyPartConstants.getBodyPartById(id))
        .whereType<BodyPart>()
        .toList();
    widget.onBodyPartsChanged?.call(selectedParts);
  }

  void _toggleView() {
    setState(() {
      _isFrontView = !_isFrontView;
      _hoveredPart = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: const Color(0xFFD0CECE), // Light gray background like in image
      child: Stack(
        children: [
          // Main body figure
          Center(
            child: _BodyFigure(
              isFrontView: _isFrontView,
              selectedPartIds: _selectedPartIds,
              hoveredPart: _hoveredPart,
              onPartTapped: _toggleBodyPartSelection,
            ),
          ),

          // Information panel (top right)
          if (_hoveredPart != null || _selectedPartIds.isNotEmpty)
            Positioned(
              top: 20,
              right: 20,
              child: _InformationPanel(
                selectedParts: _selectedPartIds
                    .map((id) => BodyPartConstants.getBodyPartById(id))
                    .whereType<BodyPart>()
                    .toList(),
                hoveredPart: _hoveredPart,
              ),
            ),

          // View toggle thumbnail (bottom right)
          Positioned(
            bottom: 20,
            right: 20,
            child: _ViewToggleThumbnail(
              isFrontView: _isFrontView,
              onTap: _toggleView,
            ),
          ),
        ],
      ),
    );
  }
}

/// Body Figure Widget - Draws the human body with selectable parts
class _BodyFigure extends StatelessWidget {
  final bool isFrontView;
  final Set<String> selectedPartIds;
  final BodyPart? hoveredPart;
  final Function(BodyPart) onPartTapped;

  const _BodyFigure({
    required this.isFrontView,
    required this.selectedPartIds,
    this.hoveredPart,
    required this.onPartTapped,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.infinite,
      painter: _BodyFigurePainter(
        isFrontView: isFrontView,
        selectedPartIds: selectedPartIds,
        hoveredPart: hoveredPart,
        onPartTapped: onPartTapped,
      ),
      child: GestureDetector(
        onTapDown: (details) {
          // Handle tap on body parts
          final painter = _BodyFigurePainter(
            isFrontView: isFrontView,
            selectedPartIds: selectedPartIds,
            hoveredPart: hoveredPart,
            onPartTapped: onPartTapped,
          );
          final tappedPart = painter.getPartAtPosition(
            details.localPosition,
            MediaQuery.of(context).size,
          );
          if (tappedPart != null) {
            onPartTapped(tappedPart);
          }
        },
        child: Container(),
      ),
    );
  }
}

/// Custom Painter for the human body figure
class _BodyFigurePainter extends CustomPainter {
  final bool isFrontView;
  final Set<String> selectedPartIds;
  final BodyPart? hoveredPart;
  final Function(BodyPart) onPartTapped;

  _BodyFigurePainter({
    required this.isFrontView,
    required this.selectedPartIds,
    this.hoveredPart,
    required this.onPartTapped,
  });

  BodyPart? getPartAtPosition(Offset position, Size canvasSize) {
    // Calculate which body part was tapped based on position
    // Use same proportions as paint method
    final centerX = canvasSize.width / 2;
    final centerY = canvasSize.height / 2;
    final bodyHeight = canvasSize.height * 0.85;
    final bodyWidth = canvasSize.width * 0.35;

    final dx = position.dx - centerX;
    final dy = position.dy - centerY;

    // Head region (oval shape)
    final headRect = Rect.fromCenter(
      center: Offset(centerX, centerY - bodyHeight * 0.4),
      width: bodyWidth * 0.35,
      height: bodyHeight * 0.18,
    );
    if (headRect.contains(position)) {
      return BodyPartConstants.getBodyPartById('head');
    }

    // Neck region (trapezoid shape)
    final neckTopY = centerY - bodyHeight * 0.3;
    final neckBottomY = centerY - bodyHeight * 0.22;
    if (dy >= neckTopY && dy <= neckBottomY) {
      final neckTopWidth = bodyWidth * 0.2;
      final neckBottomWidth = bodyWidth * 0.25;
      final neckWidthAtY = neckTopWidth +
          (neckBottomWidth - neckTopWidth) *
              ((dy - neckTopY) / (neckBottomY - neckTopY));
      if (dx.abs() < neckWidthAtY / 2) {
        return BodyPartConstants.getBodyPartById('neck');
      }
    }

    // Torso regions (with realistic boundaries)
    if (dy >= -bodyHeight * 0.2 && dy < bodyHeight * 0.2) {
      // Check if within torso width bounds
      final shoulderWidth = bodyWidth * 0.6;
      final waistWidth = bodyWidth * 0.4;
      final hipWidth = bodyWidth * 0.48;

      // Calculate width at this Y position
      double torsoWidth;
      if (dy < centerY - bodyHeight * 0.05) {
        // Upper torso (chest/upper back)
        final progress = (dy - (-bodyHeight * 0.2)) /
            (centerY - bodyHeight * 0.05 - (-bodyHeight * 0.2));
        torsoWidth = shoulderWidth - (shoulderWidth - waistWidth) * progress;
        if (dx.abs() < torsoWidth / 2) {
          return BodyPartConstants.getBodyPartById(
            isFrontView ? 'chest' : 'upper_back',
          );
        }
      } else {
        // Lower torso (abdomen/lower back)
        final progress = (dy - (centerY - bodyHeight * 0.05)) /
            (bodyHeight * 0.2 - (centerY - bodyHeight * 0.05));
        torsoWidth = waistWidth + (hipWidth - waistWidth) * progress;
        if (dx.abs() < torsoWidth / 2) {
          return BodyPartConstants.getBodyPartById(
            isFrontView ? 'abdomen' : 'lower_back',
          );
        }
      }
    }

    // Arms (realistic positions)
    final shoulderX = bodyWidth * 0.3;
    final armX = bodyWidth * 0.65;
    final armWidth = bodyWidth * 0.18;

    if (dx > shoulderX - armWidth / 2) {
      // Right side
      final upperArmTopY = centerY - bodyHeight * 0.2;
      final upperArmBottomY = centerY + bodyHeight * 0.05;
      if (dy >= upperArmTopY &&
          dy <= upperArmBottomY &&
          dx < armX + armWidth / 2) {
        if (dy < centerY - bodyHeight * 0.05) {
          return BodyPartConstants.getBodyPartById('right_arm');
        } else if (dy < centerY + bodyHeight * 0.05) {
          return BodyPartConstants.getBodyPartById('right_elbow');
        }
      }
      final forearmTopY = centerY + bodyHeight * 0.1;
      final forearmBottomY = centerY + bodyHeight * 0.18;
      if (dy >= forearmTopY &&
          dy <= forearmBottomY &&
          dx < armX + armWidth / 2) {
        return BodyPartConstants.getBodyPartById('right_wrist');
      }
      if (dy >= centerY + bodyHeight * 0.18 &&
          dy <= centerY + bodyHeight * 0.32) {
        final handWidth = bodyWidth * 0.16;
        if (dx < armX + handWidth / 2) {
          return BodyPartConstants.getBodyPartById('right_hand');
        }
      }
    } else if (dx < -shoulderX + armWidth / 2) {
      // Left side
      final upperArmTopY = centerY - bodyHeight * 0.2;
      final upperArmBottomY = centerY + bodyHeight * 0.05;
      if (dy >= upperArmTopY &&
          dy <= upperArmBottomY &&
          dx > -armX - armWidth / 2) {
        if (dy < centerY - bodyHeight * 0.05) {
          return BodyPartConstants.getBodyPartById('left_arm');
        } else if (dy < centerY + bodyHeight * 0.05) {
          return BodyPartConstants.getBodyPartById('left_elbow');
        }
      }
      final forearmTopY = centerY + bodyHeight * 0.1;
      final forearmBottomY = centerY + bodyHeight * 0.18;
      if (dy >= forearmTopY &&
          dy <= forearmBottomY &&
          dx > -armX - armWidth / 2) {
        return BodyPartConstants.getBodyPartById('left_wrist');
      }
      if (dy >= centerY + bodyHeight * 0.18 &&
          dy <= centerY + bodyHeight * 0.32) {
        final handWidth = bodyWidth * 0.16;
        if (dx > -armX - handWidth / 2) {
          return BodyPartConstants.getBodyPartById('left_hand');
        }
      }
    }

    // Legs (realistic positions)
    final hipX = bodyWidth * 0.22;
    final legX = bodyWidth * 0.25;
    final legWidth = bodyWidth * 0.18;

    if (dy >= centerY + bodyHeight * 0.15) {
      if (dx > hipX - legWidth / 2) {
        // Right leg
        final thighTopY = centerY + bodyHeight * 0.15;
        final thighBottomY = centerY + bodyHeight * 0.4;
        if (dy >= thighTopY && dy <= thighBottomY && dx < legX + legWidth / 2) {
          return BodyPartConstants.getBodyPartById('right_thigh');
        }
        if (dy >= centerY + bodyHeight * 0.4 &&
            dy <= centerY + bodyHeight * 0.5) {
          final kneeWidth = bodyWidth * 0.18;
          if (dx < legX + kneeWidth / 2) {
            return BodyPartConstants.getBodyPartById('right_knee');
          }
        }
        final legTopY = centerY + bodyHeight * 0.5;
        final legBottomY = centerY + bodyHeight * 0.7;
        if (dy >= legTopY && dy <= legBottomY && dx < legX + legWidth / 2) {
          return BodyPartConstants.getBodyPartById('right_leg');
        }
        if (dy >= centerY + bodyHeight * 0.7 &&
            dy <= centerY + bodyHeight * 0.76) {
          final ankleWidth = bodyWidth * 0.12;
          if (dx < legX + ankleWidth / 2) {
            return BodyPartConstants.getBodyPartById('right_ankle');
          }
        }
        if (dy >= centerY + bodyHeight * 0.76) {
          final footWidth = bodyWidth * 0.25;
          if (dx < legX + footWidth / 2) {
            return BodyPartConstants.getBodyPartById('right_foot');
          }
        }
      } else if (dx < -hipX + legWidth / 2) {
        // Left leg
        final thighTopY = centerY + bodyHeight * 0.15;
        final thighBottomY = centerY + bodyHeight * 0.4;
        if (dy >= thighTopY &&
            dy <= thighBottomY &&
            dx > -legX - legWidth / 2) {
          return BodyPartConstants.getBodyPartById('left_thigh');
        }
        if (dy >= centerY + bodyHeight * 0.4 &&
            dy <= centerY + bodyHeight * 0.5) {
          final kneeWidth = bodyWidth * 0.18;
          if (dx > -legX - kneeWidth / 2) {
            return BodyPartConstants.getBodyPartById('left_knee');
          }
        }
        final legTopY = centerY + bodyHeight * 0.5;
        final legBottomY = centerY + bodyHeight * 0.7;
        if (dy >= legTopY && dy <= legBottomY && dx > -legX - legWidth / 2) {
          return BodyPartConstants.getBodyPartById('left_leg');
        }
        if (dy >= centerY + bodyHeight * 0.7 &&
            dy <= centerY + bodyHeight * 0.76) {
          final ankleWidth = bodyWidth * 0.12;
          if (dx > -legX - ankleWidth / 2) {
            return BodyPartConstants.getBodyPartById('left_ankle');
          }
        }
        if (dy >= centerY + bodyHeight * 0.76) {
          final footWidth = bodyWidth * 0.25;
          if (dx > -legX - footWidth / 2) {
            return BodyPartConstants.getBodyPartById('left_foot');
          }
        }
      }
    }

    return null;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.fill
      ..color = const Color(0xFFE8E8E8); // Light gray body color

    final outlinePaint = Paint()
      ..style = PaintingStyle.stroke
      ..color = const Color(0xFFDC2626) // Red outline
      ..strokeWidth = 1.5;

    final highlightPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = const Color(0xFFFF6B6B).withOpacity(0.7); // Red highlight

    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final bodyHeight = size.height * 0.85;
    final bodyWidth = size.width * 0.35;

    // Draw realistic human body with proper proportions
    _drawRealisticHumanBody(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      paint,
      outlinePaint,
      highlightPaint,
    );
  }

  void _drawRealisticHumanBody(
    Canvas canvas,
    double centerX,
    double centerY,
    double bodyWidth,
    double bodyHeight,
    Paint paint,
    Paint outlinePaint,
    Paint highlightPaint,
  ) {
    // Draw head (realistic oval)
    _drawRealisticHead(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      paint,
      outlinePaint,
      highlightPaint,
    );

    // Draw neck (trapezoid shape)
    _drawRealisticNeck(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      paint,
      outlinePaint,
      highlightPaint,
    );

    // Draw torso (realistic shape with curves)
    _drawRealisticTorso(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      paint,
      outlinePaint,
      highlightPaint,
    );

    // Draw arms (realistic with proper curves)
    _drawRealisticArm(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      'left',
      paint,
      outlinePaint,
      highlightPaint,
    );
    _drawRealisticArm(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      'right',
      paint,
      outlinePaint,
      highlightPaint,
    );

    // Draw legs (realistic with proper curves)
    _drawRealisticLeg(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      'left',
      paint,
      outlinePaint,
      highlightPaint,
    );
    _drawRealisticLeg(
      canvas,
      centerX,
      centerY,
      bodyWidth,
      bodyHeight,
      'right',
      paint,
      outlinePaint,
      highlightPaint,
    );
  }

  void _drawRealisticHead(
    Canvas canvas,
    double centerX,
    double centerY,
    double bodyWidth,
    double bodyHeight,
    Paint paint,
    Paint outlinePaint,
    Paint highlightPaint,
  ) {
    final headId = 'head';
    final isSelected = selectedPartIds.contains(headId);
    final isHovered = hoveredPart?.id == headId;

    final headCenterY = centerY - bodyHeight * 0.4;
    final headWidth = bodyWidth * 0.38;
    final headHeight = bodyHeight * 0.2;

    // Create realistic head shape using SVG-style path (more human-like oval)
    // Top of head is slightly wider, chin is narrower
    final headTopY = headCenterY - headHeight / 2;
    final headBottomY = headCenterY + headHeight / 2;
    final headTopWidth = headWidth * 0.95;
    final headMiddleWidth = headWidth;
    final headBottomWidth = headWidth * 0.85;

    final headPath = Path()
      ..moveTo(centerX - headTopWidth / 2, headTopY)
      ..cubicTo(
        centerX - headTopWidth / 2,
        headTopY + headHeight * 0.1,
        centerX - headMiddleWidth / 2,
        headCenterY,
        centerX - headBottomWidth / 2,
        headBottomY,
      )
      ..cubicTo(
        centerX,
        headBottomY + headHeight * 0.05,
        centerX,
        headBottomY + headHeight * 0.05,
        centerX + headBottomWidth / 2,
        headBottomY,
      )
      ..cubicTo(
        centerX + headMiddleWidth / 2,
        headCenterY,
        centerX + headTopWidth / 2,
        headTopY + headHeight * 0.1,
        centerX + headTopWidth / 2,
        headTopY,
      )
      ..close();

    if (isSelected || isHovered) {
      canvas.drawPath(headPath, highlightPaint);
    } else {
      canvas.drawPath(headPath, paint);
    }
    canvas.drawPath(headPath, outlinePaint);
  }

  void _drawRealisticNeck(
    Canvas canvas,
    double centerX,
    double centerY,
    double bodyWidth,
    double bodyHeight,
    Paint paint,
    Paint outlinePaint,
    Paint highlightPaint,
  ) {
    final neckId = 'neck';
    final isSelected = selectedPartIds.contains(neckId);
    final isHovered = hoveredPart?.id == neckId;

    final neckTopY = centerY - bodyHeight * 0.3;
    final neckBottomY = centerY - bodyHeight * 0.22;
    final neckTopWidth = bodyWidth * 0.2;
    final neckBottomWidth = bodyWidth * 0.25;

    // Create trapezoid neck shape
    final neckPath = Path()
      ..moveTo(centerX - neckTopWidth / 2, neckTopY)
      ..lineTo(centerX + neckTopWidth / 2, neckTopY)
      ..lineTo(centerX + neckBottomWidth / 2, neckBottomY)
      ..lineTo(centerX - neckBottomWidth / 2, neckBottomY)
      ..close();

    if (isSelected || isHovered) {
      canvas.drawPath(neckPath, highlightPaint);
    } else {
      canvas.drawPath(neckPath, paint);
    }
    canvas.drawPath(neckPath, outlinePaint);
  }

  void _drawRealisticTorso(
    Canvas canvas,
    double centerX,
    double centerY,
    double bodyWidth,
    double bodyHeight,
    Paint paint,
    Paint outlinePaint,
    Paint highlightPaint,
  ) {
    // Realistic human torso proportions
    final torsoTopY = centerY - bodyHeight * 0.22;
    final torsoBottomY = centerY + bodyHeight * 0.22;
    final shoulderWidth = bodyWidth * 0.65;
    final waistWidth = bodyWidth * 0.35;
    final hipWidth = bodyWidth * 0.52;

    // Draw chest/upper back (realistic human torso shape)
    final chestId = isFrontView ? 'chest' : 'upper_back';
    final isChestSelected = selectedPartIds.contains(chestId);
    final chestTopY = torsoTopY;
    final chestBottomY = centerY;

    // Create realistic torso shape - shoulders wider, tapering to waist
    final chestPath = Path()
      // Left side - from shoulder to waist
      ..moveTo(centerX - shoulderWidth / 2, chestTopY)
      ..cubicTo(
        centerX - shoulderWidth / 2,
        chestTopY + bodyHeight * 0.03,
        centerX - shoulderWidth / 2 * 0.7,
        (chestTopY + chestBottomY) / 2,
        centerX - waistWidth / 2,
        chestBottomY,
      )
      // Bottom line
      ..lineTo(centerX + waistWidth / 2, chestBottomY)
      // Right side - from waist to shoulder
      ..cubicTo(
        centerX + shoulderWidth / 2 * 0.7,
        (chestTopY + chestBottomY) / 2,
        centerX + shoulderWidth / 2,
        chestTopY + bodyHeight * 0.03,
        centerX + shoulderWidth / 2,
        chestTopY,
      )
      ..close();

    if (isChestSelected) {
      canvas.drawPath(chestPath, highlightPaint);
    } else {
      canvas.drawPath(chestPath, paint);
    }
    canvas.drawPath(chestPath, outlinePaint);

    // Draw abdomen/lower back (realistic waist-to-hip curve)
    final abdomenId = isFrontView ? 'abdomen' : 'lower_back';
    final isAbdomenSelected = selectedPartIds.contains(abdomenId);
    final abdomenTopY = centerY;
    final abdomenBottomY = torsoBottomY;

    // Create realistic lower torso - waist narrower, expanding to hips
    final abdomenPath = Path()
      // Left side - from waist to hip
      ..moveTo(centerX - waistWidth / 2, abdomenTopY)
      ..cubicTo(
        centerX - waistWidth / 2,
        abdomenTopY + bodyHeight * 0.08,
        centerX - hipWidth / 2 * 0.85,
        (abdomenTopY + abdomenBottomY) / 2,
        centerX - hipWidth / 2,
        abdomenBottomY,
      )
      // Bottom line
      ..lineTo(centerX + hipWidth / 2, abdomenBottomY)
      // Right side - from hip to waist
      ..cubicTo(
        centerX + hipWidth / 2 * 0.85,
        (abdomenTopY + abdomenBottomY) / 2,
        centerX + waistWidth / 2,
        abdomenTopY + bodyHeight * 0.08,
        centerX + waistWidth / 2,
        abdomenTopY,
      )
      ..close();

    if (isAbdomenSelected) {
      canvas.drawPath(abdomenPath, highlightPaint);
    } else {
      canvas.drawPath(abdomenPath, paint);
    }
    canvas.drawPath(abdomenPath, outlinePaint);
  }

  void _drawRealisticArm(
    Canvas canvas,
    double centerX,
    double centerY,
    double bodyWidth,
    double bodyHeight,
    String side,
    Paint paint,
    Paint outlinePaint,
    Paint highlightPaint,
  ) {
    final isLeft = side == 'left';
    final sign = isLeft ? -1.0 : 1.0;
    final shoulderX = centerX + sign * bodyWidth * 0.32;
    final armX = centerX + sign * bodyWidth * 0.68;

    // Upper arm (realistic human arm shape - tapers from shoulder to elbow)
    final upperArmId = '${side}_arm';
    final isUpperArmSelected = selectedPartIds.contains(upperArmId);
    final upperArmTopY = centerY - bodyHeight * 0.18;
    final upperArmBottomY = centerY + bodyHeight * 0.08;
    final upperArmTopWidth = bodyWidth * 0.2;
    final upperArmBottomWidth = bodyWidth * 0.16;

    final upperArmPath = Path()
      ..moveTo(shoulderX - upperArmTopWidth / 2, upperArmTopY)
      ..cubicTo(
        armX - upperArmBottomWidth / 2,
        (upperArmTopY + upperArmBottomY) / 2 - bodyHeight * 0.02,
        armX - upperArmBottomWidth / 2,
        (upperArmTopY + upperArmBottomY) / 2 + bodyHeight * 0.02,
        armX - upperArmBottomWidth / 2,
        upperArmBottomY,
      )
      ..lineTo(armX + upperArmBottomWidth / 2, upperArmBottomY)
      ..cubicTo(
        armX + upperArmBottomWidth / 2,
        (upperArmTopY + upperArmBottomY) / 2 + bodyHeight * 0.02,
        armX + upperArmBottomWidth / 2,
        (upperArmTopY + upperArmBottomY) / 2 - bodyHeight * 0.02,
        shoulderX + upperArmTopWidth / 2,
        upperArmTopY,
      )
      ..close();

    if (isUpperArmSelected) {
      canvas.drawPath(upperArmPath, highlightPaint);
    } else {
      canvas.drawPath(upperArmPath, paint);
    }
    canvas.drawPath(upperArmPath, outlinePaint);

    // Elbow (rounded joint - more realistic)
    final elbowId = '${side}_elbow';
    final isElbowSelected = selectedPartIds.contains(elbowId);
    final elbowY = centerY + bodyHeight * 0.08;
    final elbowWidth = bodyWidth * 0.15;
    final elbowHeight = bodyHeight * 0.09;

    final elbowPath = Path()
      ..addOval(
        Rect.fromCenter(
          center: Offset(armX, elbowY),
          width: elbowWidth,
          height: elbowHeight,
        ),
      );

    if (isElbowSelected) {
      canvas.drawPath(elbowPath, highlightPaint);
    } else {
      canvas.drawPath(elbowPath, paint);
    }
    canvas.drawPath(elbowPath, outlinePaint);

    // Forearm (realistic - tapers from elbow to wrist)
    final wristId = '${side}_wrist';
    final isWristSelected = selectedPartIds.contains(wristId);
    final forearmTopY = centerY + bodyHeight * 0.12;
    final forearmBottomY = centerY + bodyHeight * 0.2;
    final forearmTopWidth = bodyWidth * 0.14;
    final forearmBottomWidth = bodyWidth * 0.11;

    final forearmPath = Path()
      ..moveTo(armX - forearmTopWidth / 2, forearmTopY)
      ..cubicTo(
        armX - forearmBottomWidth / 2,
        (forearmTopY + forearmBottomY) / 2,
        armX - forearmBottomWidth / 2,
        (forearmTopY + forearmBottomY) / 2,
        armX - forearmBottomWidth / 2,
        forearmBottomY,
      )
      ..lineTo(armX + forearmBottomWidth / 2, forearmBottomY)
      ..cubicTo(
        armX + forearmBottomWidth / 2,
        (forearmTopY + forearmBottomY) / 2,
        armX + forearmBottomWidth / 2,
        (forearmTopY + forearmBottomY) / 2,
        armX + forearmTopWidth / 2,
        forearmTopY,
      )
      ..close();

    if (isWristSelected) {
      canvas.drawPath(forearmPath, highlightPaint);
    } else {
      canvas.drawPath(forearmPath, paint);
    }
    canvas.drawPath(forearmPath, outlinePaint);

    // Hand (realistic human hand shape)
    final handId = '${side}_hand';
    final isHandSelected = selectedPartIds.contains(handId);
    final handY = centerY + bodyHeight * 0.28;
    final handPalmWidth = bodyWidth * 0.18;
    final handFingerWidth = bodyWidth * 0.14;
    final handHeight = bodyHeight * 0.13;

    // Create hand shape - wider palm, narrower at fingers
    final handPath = Path()
      ..moveTo(armX - handPalmWidth / 2, handY - handHeight / 2)
      ..cubicTo(
        armX - handPalmWidth / 2,
        handY - handHeight / 4,
        armX - handFingerWidth / 2,
        handY,
        armX - handFingerWidth / 2,
        handY + handHeight / 2,
      )
      ..lineTo(armX + handFingerWidth / 2, handY + handHeight / 2)
      ..cubicTo(
        armX + handFingerWidth / 2,
        handY,
        armX + handPalmWidth / 2,
        handY - handHeight / 4,
        armX + handPalmWidth / 2,
        handY - handHeight / 2,
      )
      ..close();

    if (isHandSelected) {
      canvas.drawPath(handPath, highlightPaint);
    } else {
      canvas.drawPath(handPath, paint);
    }
    canvas.drawPath(handPath, outlinePaint);
  }

  void _drawRealisticLeg(
    Canvas canvas,
    double centerX,
    double centerY,
    double bodyWidth,
    double bodyHeight,
    String side,
    Paint paint,
    Paint outlinePaint,
    Paint highlightPaint,
  ) {
    final isLeft = side == 'left';
    final sign = isLeft ? -1.0 : 1.0;
    final hipX = centerX + sign * bodyWidth * 0.24;
    final legX = centerX + sign * bodyWidth * 0.26;

    // Thigh (realistic human thigh - wider at hip, tapering to knee)
    final thighId = '${side}_thigh';
    final isThighSelected = selectedPartIds.contains(thighId);
    final thighTopY = centerY + bodyHeight * 0.18;
    final thighBottomY = centerY + bodyHeight * 0.42;
    final thighTopWidth = bodyWidth * 0.3;
    final thighBottomWidth = bodyWidth * 0.2;

    final thighPath = Path()
      ..moveTo(hipX - thighTopWidth / 2, thighTopY)
      ..cubicTo(
        legX - thighBottomWidth / 2,
        (thighTopY + thighBottomY) / 2 - bodyHeight * 0.02,
        legX - thighBottomWidth / 2,
        (thighTopY + thighBottomY) / 2 + bodyHeight * 0.02,
        legX - thighBottomWidth / 2,
        thighBottomY,
      )
      ..lineTo(legX + thighBottomWidth / 2, thighBottomY)
      ..cubicTo(
        legX + thighBottomWidth / 2,
        (thighTopY + thighBottomY) / 2 + bodyHeight * 0.02,
        legX + thighBottomWidth / 2,
        (thighTopY + thighBottomY) / 2 - bodyHeight * 0.02,
        hipX + thighTopWidth / 2,
        thighTopY,
      )
      ..close();

    if (isThighSelected) {
      canvas.drawPath(thighPath, highlightPaint);
    } else {
      canvas.drawPath(thighPath, paint);
    }
    canvas.drawPath(thighPath, outlinePaint);

    // Knee (realistic rounded joint)
    final kneeId = '${side}_knee';
    final isKneeSelected = selectedPartIds.contains(kneeId);
    final kneeY = centerY + bodyHeight * 0.44;
    final kneeWidth = bodyWidth * 0.19;
    final kneeHeight = bodyHeight * 0.11;

    final kneePath = Path()
      ..addOval(
        Rect.fromCenter(
          center: Offset(legX, kneeY),
          width: kneeWidth,
          height: kneeHeight,
        ),
      );

    if (isKneeSelected) {
      canvas.drawPath(kneePath, highlightPaint);
    } else {
      canvas.drawPath(kneePath, paint);
    }
    canvas.drawPath(kneePath, outlinePaint);

    // Leg/Shin (realistic - tapers from knee to ankle)
    final legId = '${side}_leg';
    final isLegSelected = selectedPartIds.contains(legId);
    final legTopY = centerY + bodyHeight * 0.52;
    final legBottomY = centerY + bodyHeight * 0.72;
    final legTopWidth = bodyWidth * 0.19;
    final legBottomWidth = bodyWidth * 0.14;

    final legPath = Path()
      ..moveTo(legX - legTopWidth / 2, legTopY)
      ..cubicTo(
        legX - legBottomWidth / 2,
        (legTopY + legBottomY) / 2,
        legX - legBottomWidth / 2,
        (legTopY + legBottomY) / 2,
        legX - legBottomWidth / 2,
        legBottomY,
      )
      ..lineTo(legX + legBottomWidth / 2, legBottomY)
      ..cubicTo(
        legX + legBottomWidth / 2,
        (legTopY + legBottomY) / 2,
        legX + legBottomWidth / 2,
        (legTopY + legBottomY) / 2,
        legX + legTopWidth / 2,
        legTopY,
      )
      ..close();

    if (isLegSelected) {
      canvas.drawPath(legPath, highlightPaint);
    } else {
      canvas.drawPath(legPath, paint);
    }
    canvas.drawPath(legPath, outlinePaint);

    // Ankle (realistic narrow joint)
    final ankleId = '${side}_ankle';
    final isAnkleSelected = selectedPartIds.contains(ankleId);
    final ankleY = centerY + bodyHeight * 0.74;
    final ankleWidth = bodyWidth * 0.13;
    final ankleHeight = bodyHeight * 0.07;

    final anklePath = Path()
      ..addOval(
        Rect.fromCenter(
          center: Offset(legX, ankleY),
          width: ankleWidth,
          height: ankleHeight,
        ),
      );

    if (isAnkleSelected) {
      canvas.drawPath(anklePath, highlightPaint);
    } else {
      canvas.drawPath(anklePath, paint);
    }
    canvas.drawPath(anklePath, outlinePaint);

    // Foot (realistic human foot shape)
    final footId = '${side}_foot';
    final isFootSelected = selectedPartIds.contains(footId);
    final footY = centerY + bodyHeight * 0.84;
    final footHeelWidth = bodyWidth * 0.24;
    final footToeWidth = bodyWidth * 0.2;
    final footLength = bodyHeight * 0.14;

    // Create realistic foot shape
    final footPath = Path()
      ..moveTo(legX - footHeelWidth / 2, footY - footLength / 2)
      ..cubicTo(
        legX - footHeelWidth / 2,
        footY - footLength / 4,
        legX - footToeWidth / 2,
        footY + footLength / 4,
        legX - footToeWidth / 2,
        footY + footLength / 2,
      )
      ..lineTo(legX + footToeWidth / 2, footY + footLength / 2)
      ..cubicTo(
        legX + footToeWidth / 2,
        footY + footLength / 4,
        legX + footHeelWidth / 2,
        footY - footLength / 4,
        legX + footHeelWidth / 2,
        footY - footLength / 2,
      )
      ..close();

    if (isFootSelected) {
      canvas.drawPath(footPath, highlightPaint);
    } else {
      canvas.drawPath(footPath, paint);
    }
    canvas.drawPath(footPath, outlinePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

/// Information Panel Widget
class _InformationPanel extends StatelessWidget {
  final List<BodyPart> selectedParts;
  final BodyPart? hoveredPart;

  const _InformationPanel({
    required this.selectedParts,
    this.hoveredPart,
  });

  @override
  Widget build(BuildContext context) {
    final displayPart =
        hoveredPart ?? (selectedParts.isNotEmpty ? selectedParts.last : null);

    if (displayPart == null) return const SizedBox.shrink();

    return Container(
      width: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.black, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            displayPart.displayName.toUpperCase(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '- Write text and/or',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Text(
            '- Link each part to a',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Text(
            '- Open a modal win',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (selectedParts.length > 1) ...[
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            Text(
              'Selected: ${selectedParts.length}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

/// View Toggle Thumbnail Widget
class _ViewToggleThumbnail extends StatelessWidget {
  final bool isFrontView;
  final VoidCallback onTap;

  const _ViewToggleThumbnail({
    required this.isFrontView,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 120,
        height: 160,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.red, width: 2),
        ),
        child: Stack(
          children: [
            // Miniature body figure (opposite view)
            CustomPaint(
              size: Size.infinite,
              painter: _MiniBodyPainter(isFrontView: !isFrontView),
            ),
            // Label
            Positioned(
              bottom: 8,
              left: 0,
              right: 0,
              child: Text(
                !isFrontView ? 'FRONT' : 'BACK',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Mini body painter for thumbnail
class _MiniBodyPainter extends CustomPainter {
  final bool isFrontView;

  _MiniBodyPainter({required this.isFrontView});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.fill
      ..color = const Color(0xFFE0E0E0);

    final outlinePaint = Paint()
      ..style = PaintingStyle.stroke
      ..color = Colors.red
      ..strokeWidth = 1;

    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final bodyHeight = size.height * 0.7;
    final bodyWidth = size.width * 0.4;

    // Simplified body shape
    final bodyRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(centerX, centerY),
        width: bodyWidth,
        height: bodyHeight,
      ),
      const Radius.circular(4),
    );
    canvas.drawRRect(bodyRect, paint);
    canvas.drawRRect(bodyRect, outlinePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
