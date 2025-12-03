import 'package:flutter/material.dart';

/// Parser for SVG path data to Flutter Path objects
/// Converts SVG path strings (like "M 10 20 L 30 40") to Flutter Path objects
class SvgPathParser {
  /// Parse SVG path string to Flutter Path
  /// Supports: M, L, H, V, C, S, Q, T, Z commands
  static Path parsePath(String pathData,
      {double scaleX = 1.0,
      double scaleY = 1.0,
      double offsetX = 0.0,
      double offsetY = 0.0}) {
    final path = Path();
    final commands = _tokenizePath(pathData);

    double currentX = 0;
    double currentY = 0;
    double startX = 0;
    double startY = 0;
    double? lastControlX;
    double? lastControlY;

    for (int i = 0; i < commands.length; i++) {
      final command = commands[i];
      if (command.isEmpty) continue;

      final cmd = command[0];
      final values = command.length > 1
          ? command
              .substring(1)
              .trim()
              .split(RegExp(r'[\s,]+'))
              .where((v) => v.isNotEmpty)
              .map((v) => double.tryParse(v) ?? 0.0)
              .toList()
          : <double>[];

      switch (cmd.toUpperCase()) {
        case 'M': // MoveTo
          if (values.length >= 2) {
            currentX = values[0] * scaleX + offsetX;
            currentY = values[1] * scaleY + offsetY;
            startX = currentX;
            startY = currentY;
            path.moveTo(currentX, currentY);
            // Handle multiple coordinates (implicit LineTo)
            for (int j = 2; j < values.length; j += 2) {
              if (j + 1 < values.length) {
                currentX = values[j] * scaleX + offsetX;
                currentY = values[j + 1] * scaleY + offsetY;
                path.lineTo(currentX, currentY);
              }
            }
          }
          break;
        case 'L': // LineTo
          for (int j = 0; j < values.length; j += 2) {
            if (j + 1 < values.length) {
              currentX = values[j] * scaleX + offsetX;
              currentY = values[j + 1] * scaleY + offsetY;
              path.lineTo(currentX, currentY);
            }
          }
          break;
        case 'H': // Horizontal LineTo
          for (int j = 0; j < values.length; j++) {
            currentX = values[j] * scaleX + offsetX;
            path.lineTo(currentX, currentY);
          }
          break;
        case 'V': // Vertical LineTo
          for (int j = 0; j < values.length; j++) {
            currentY = values[j] * scaleY + offsetY;
            path.lineTo(currentX, currentY);
          }
          break;
        case 'C': // Cubic Bezier
          for (int j = 0; j < values.length; j += 6) {
            if (j + 5 < values.length) {
              final x1 = values[j] * scaleX + offsetX;
              final y1 = values[j + 1] * scaleY + offsetY;
              final x2 = values[j + 2] * scaleX + offsetX;
              final y2 = values[j + 3] * scaleY + offsetY;
              final x = values[j + 4] * scaleX + offsetX;
              final y = values[j + 5] * scaleY + offsetY;
              path.cubicTo(x1, y1, x2, y2, x, y);
              currentX = x;
              currentY = y;
              lastControlX = x2;
              lastControlY = y2;
            }
          }
          break;
        case 'S': // Smooth Cubic Bezier
          for (int j = 0; j < values.length; j += 4) {
            if (j + 3 < values.length) {
              final x2 = values[j] * scaleX + offsetX;
              final y2 = values[j + 1] * scaleY + offsetY;
              final x = values[j + 2] * scaleX + offsetX;
              final y = values[j + 3] * scaleY + offsetY;
              final x1 =
                  lastControlX != null ? 2 * currentX - lastControlX : currentX;
              final y1 =
                  lastControlY != null ? 2 * currentY - lastControlY : currentY;
              path.cubicTo(x1, y1, x2, y2, x, y);
              currentX = x;
              currentY = y;
              lastControlX = x2;
              lastControlY = y2;
            }
          }
          break;
        case 'Q': // Quadratic Bezier
          for (int j = 0; j < values.length; j += 4) {
            if (j + 3 < values.length) {
              final x1 = values[j] * scaleX + offsetX;
              final y1 = values[j + 1] * scaleY + offsetY;
              final x = values[j + 2] * scaleX + offsetX;
              final y = values[j + 3] * scaleY + offsetY;
              path.quadraticBezierTo(x1, y1, x, y);
              currentX = x;
              currentY = y;
              lastControlX = x1;
              lastControlY = y1;
            }
          }
          break;
        case 'T': // Smooth Quadratic Bezier
          for (int j = 0; j < values.length; j += 2) {
            if (j + 1 < values.length) {
              final x = values[j] * scaleX + offsetX;
              final y = values[j + 1] * scaleY + offsetY;
              final x1 =
                  lastControlX != null ? 2 * currentX - lastControlX : currentX;
              final y1 =
                  lastControlY != null ? 2 * currentY - lastControlY : currentY;
              path.quadraticBezierTo(x1, y1, x, y);
              currentX = x;
              currentY = y;
              lastControlX = x1;
              lastControlY = y1;
            }
          }
          break;
        case 'Z': // ClosePath
        case 'z':
          path.close();
          currentX = startX;
          currentY = startY;
          break;
      }
    }

    return path;
  }

  /// Tokenize SVG path string into commands
  static List<String> _tokenizePath(String pathData) {
    final commands = <String>[];
    final buffer = StringBuffer();
    bool inNumber = false;
    bool hadDecimal = false;

    for (int i = 0; i < pathData.length; i++) {
      final char = pathData[i];

      if (char == ' ' || char == ',' || char == '\t' || char == '\n') {
        if (inNumber) {
          commands.add(buffer.toString());
          buffer.clear();
          inNumber = false;
          hadDecimal = false;
        }
        continue;
      }

      if (char == '-' && !inNumber) {
        // Start of negative number
        buffer.write(char);
        inNumber = true;
        hadDecimal = false;
      } else if (char == '.' && !hadDecimal) {
        // Decimal point
        buffer.write(char);
        inNumber = true;
        hadDecimal = true;
      } else if (char == 'e' || char == 'E') {
        // Scientific notation
        buffer.write(char);
        inNumber = true;
      } else if (RegExp(r'[0-9]').hasMatch(char)) {
        // Digit
        buffer.write(char);
        inNumber = true;
      } else {
        // Command letter (M, L, C, etc.)
        if (buffer.isNotEmpty) {
          commands.add(buffer.toString());
          buffer.clear();
        }
        buffer.write(char);
        commands.add(buffer.toString());
        buffer.clear();
        inNumber = false;
        hadDecimal = false;
      }
    }

    if (buffer.isNotEmpty) {
      commands.add(buffer.toString());
    }

    return commands;
  }
}
