import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:medlink_mobile/main.dart';
import 'package:medlink_mobile/core/constants/app_constants.dart';

void main() {
  testWidgets('App launches and shows splash screen',
      (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: MedLinkApp(),
      ),
    );

    // Wait for the splash screen to render
    await tester.pump();

    // Verify that the app name is displayed
    expect(find.text(AppConstants.appName), findsOneWidget);

    // Verify that the tagline is displayed
    expect(find.text('Telemedicine Platform'), findsOneWidget);

    // Advance time by 3 seconds to trigger navigation
    await tester.pump(const Duration(seconds: 3));
    await tester.pump();
  });

  testWidgets('Splash screen contains logo and app name',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MedLinkApp(),
      ),
    );

    await tester.pump();

    // Verify splash screen elements
    expect(find.text(AppConstants.appName), findsOneWidget);
    expect(find.text('Telemedicine Platform'), findsOneWidget);

    // Verify loading indicator is present
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Advance time to complete the timer
    await tester.pump(const Duration(seconds: 3));
    await tester.pump();
  });
}
