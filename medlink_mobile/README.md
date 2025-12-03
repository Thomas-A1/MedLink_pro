# MedLink Mobile App

MedLink is a telemedicine platform mobile application designed for Ghana and Sub-Saharan Africa. It connects patients with healthcare providers through mobile consultations, prescription management, and pharmacy integration.

## Features

- 🏥 **Telemedicine Consultations**: Voice and video calls with doctors
- 📋 **Prescription Management**: Receive and manage prescriptions
- 💊 **Pharmacy Integration**: Find nearby pharmacies with required medications
- 🔬 **Lab Request Management**: Request and view lab test results
- 📍 **Location-Based Services**: Find healthcare providers near you
- 🌍 **Multi-Language Support**: English and Twi (Akan)
- 💳 **Payment Integration**: Secure payments via Paystack
- 📱 **Offline-First**: Works without internet connectivity

## Technology Stack

- **Framework**: Flutter 3.29+
- **Language**: Dart 3.7+
- **State Management**: Riverpod 2.4+
- **Architecture**: Clean Architecture (Feature-based)
- **Local Storage**: SQLite (sqflite)
- **Secure Storage**: flutter_secure_storage
- **Networking**: Dio with Retrofit
- **Real-time**: Socket.io & WebRTC
- **Maps**: Google Maps Flutter
- **Notifications**: Firebase Cloud Messaging

## Project Structure

```
lib/
├── core/                    # Core functionality
│   ├── constants/           # App constants, colors
│   ├── errors/             # Error handling
│   ├── network/            # API client, interceptors
│   ├── storage/           # Local storage
│   └── utils/             # Utility functions
├── features/               # Feature modules
│   ├── auth/              # Authentication
│   ├── consultation/      # Consultations
│   ├── doctor/            # Doctor features
│   ├── payment/           # Payments
│   ├── prescription/      # Prescriptions
│   ├── queue/             # Queue management
│   └── profile/           # User profile
├── l10n/                  # Localization files
├── routes/                # Navigation & routing
├── services/              # External services (FCM, WebRTC, etc.)
├── shared/                # Shared widgets & theme
│   ├── widgets/           # Reusable widgets
│   └── theme/             # App theme
└── main.dart              # App entry point
```

## Getting Started

### Prerequisites

- Flutter SDK 3.29+ ([Install Flutter](https://flutter.dev/docs/get-started/install))
- Dart SDK 3.7+
- Android Studio / Xcode (for mobile development)
- VS Code or Android Studio (recommended IDE)

### Installation

1. **Clone the repository** (if applicable) or navigate to the project:

   ```bash
   cd medlink_mobile
   ```

2. **Install dependencies**:

   ```bash
   flutter pub get
   ```

3. **Run code generation** (for Retrofit, JSON serialization):

   ```bash
   flutter pub run build_runner build --delete-conflicting-outputs
   ```

4. **Run the app**:
   ```bash
   flutter run
   ```

### Configuration

1. **Update API Base URL**:

   - Edit `lib/core/constants/app_constants.dart`
   - Update `baseUrl` to your backend API URL

2. **Configure Firebase** (for push notifications):

   - Add `google-services.json` to `android/app/`
   - Add `GoogleService-Info.plist` to `ios/Runner/`

3. **Configure Google Maps**:
   - Add your Google Maps API key to:
     - `android/app/src/main/AndroidManifest.xml`
     - `ios/Runner/AppDelegate.swift`

## Development

### Running Tests

```bash
flutter test
```

### Building for Production

**Android:**

```bash
flutter build apk --release
# or
flutter build appbundle --release
```

**iOS:**

```bash
flutter build ios --release
```

## Architecture

The app follows **Clean Architecture** principles with feature-based organization:

- **Data Layer**: API clients, repositories, data models
- **Domain Layer**: Entities, use cases, business logic
- **Presentation Layer**: UI screens, widgets, state management

Each feature is self-contained with its own data, domain, and presentation layers.

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

Private - All rights reserved

## Support

For issues and questions, please contact the development team.
