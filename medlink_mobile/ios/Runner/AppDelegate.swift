import Flutter
import UIKit
import GoogleMaps

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Initialize Google Maps with API key from Info.plist
    if let path = Bundle.main.path(forResource: "Info", ofType: "plist"),
       let plist = NSDictionary(contentsOfFile: path),
       let apiKey = plist["GMSApiKey"] as? String,
       !apiKey.isEmpty,
       apiKey != "YOUR_GOOGLE_MAPS_API_KEY_HERE" {
      GMSServices.provideAPIKey(apiKey)
      print("✅ Google Maps initialized successfully")
    } else {
      // Don't initialize with invalid key - this will cause a crash
      // Instead, let the Flutter side handle the error gracefully
      print("⚠️ WARNING: Google Maps API key not configured!")
      print("⚠️ Please add your Google Maps API key to ios/Runner/Info.plist")
      print("⚠️ Set the GMSApiKey value in Info.plist to your actual API key")
      print("⚠️ Get your API key from: https://console.cloud.google.com/google/maps-apis")
      // Don't call GMSServices.provideAPIKey() with an invalid key
      // The map screen will show an error message instead
    }
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
