import 'dart:convert';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../data/models/body_part.dart';

/// Enhanced 3D Body Part Selector Widget
///
/// Features:
/// - Realistic 3D human body model with multiple fallbacks
/// - Interactive - zoom, rotate, pan
/// - Ultra-precise body part selection
/// - Multiple selections with toggle
/// - Anatomy-style visualization for pain selection
class BodyPartSelector3D extends StatefulWidget {
  final Function(List<BodyPart>)? onBodyPartsChanged;
  final List<BodyPart> initialSelections;
  final String? modelPath;

  const BodyPartSelector3D({
    super.key,
    this.onBodyPartsChanged,
    this.initialSelections = const [],
    this.modelPath,
  });

  @override
  State<BodyPartSelector3D> createState() => _BodyPartSelector3DState();
}

class _BodyPartSelector3DState extends State<BodyPartSelector3D>
    with AutomaticKeepAliveClientMixin {
  final Set<String> _selectedPartIds = {};
  String? _modelBase64; // Base64 encoded model for iOS workaround
  static WebViewController?
      _staticWebViewController; // STATIC: Shared across all instances
  static bool _webViewInitializedGlobal =
      false; // STATIC: Global flag to prevent ANY recreation
  static Widget?
      _staticCachedWebView; // STATIC: Cache the WebView widget globally
  static _BodyPartSelector3DState?
      _activeInstance; // STATIC: Track active widget instance

  // Realistic 3D human body model - Use local asset if available
  static const String _localModelPath = 'assets/models/human_anatomy.glb';

  @override
  bool get wantKeepAlive =>
      true; // Keep widget alive to prevent WebView recreation

  @override
  void initState() {
    super.initState();
    _selectedPartIds.addAll(
      widget.initialSelections.map((p) => p.id),
    );
    // Register this instance as active
    _activeInstance = this;
    // Load model as base64 for iOS workaround
    if (Platform.isIOS) {
      _loadModelAsBase64();
    }
  }

  @override
  void dispose() {
    // Only clear active instance if this is the active one
    if (_activeInstance == this) {
      _activeInstance = null;
    }
    super.dispose();
  }

  /// Load model as base64 to embed directly in HTML (workaround for model_viewer_plus iOS bug)
  Future<void> _loadModelAsBase64() async {
    try {
      final byteData = await rootBundle.load(_localModelPath);
      final base64 = base64Encode(byteData.buffer.asUint8List());
      if (mounted) {
        setState(() {
          _modelBase64 = base64;
        });
        debugPrint('✅ Model loaded as base64 (${base64.length} chars)');
      }
    } catch (e) {
      debugPrint('❌ Error loading model as base64: $e');
    }
  }

  void _toggleBodyPartSelection(BodyPart part) {
    setState(() {
      if (_selectedPartIds.contains(part.id)) {
        _selectedPartIds.remove(part.id);
      } else {
        _selectedPartIds.add(part.id);
      }
    });

    final selectedParts = _selectedPartIds
        .map((id) => BodyPartConstants.getBodyPartById(id))
        .whereType<BodyPart>()
        .toList();
    widget.onBodyPartsChanged?.call(selectedParts);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    return Container(
      width: double.infinity,
      height: double.infinity,
      // Use a dark background so the 3D model is visible (like the image)
      decoration: const BoxDecoration(
        color:
            Colors.transparent, // Transparent background - anatomy stands alone
      ),
      child: Stack(
        children: [
          // Realistic 3D Human Body Model - Interactive and realistic
          // Use RepaintBoundary and AutomaticKeepAlive to prevent view recreation errors
          RepaintBoundary(
            key: const ValueKey('3d_model_container_stable'),
            child: _buildRealistic3DModel(),
          ),

          // Realistic Red highlights - Precise shapes matching body parts
          CustomPaint(
            painter: _RealisticBodyPartPainter(
              selectedPartIds: _selectedPartIds,
            ),
            size: Size.infinite,
          ),

          // NOTE: On iOS, body part selection is handled via JavaScript raycasting in WebView
          // The overlay is only used for Android (model_viewer_plus)
          if (!Platform.isIOS)
            _PreciseBodyPartOverlay(
              selectedPartIds: _selectedPartIds,
              onPartToggled: _toggleBodyPartSelection,
            ),

          // Instructions overlay at bottom
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.75),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.touch_app_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'body_selector.instructions'.tr(),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Realistic 3D Human Body Model - Interactive and realistic
  /// WORKAROUND: On iOS, use WebView with base64 to avoid model_viewer_plus bug
  /// On Android, use model_viewer_plus normally
  Widget _buildRealistic3DModel() {
    // CRITICAL: On iOS, NEVER create ModelViewer - it has a bug with asset paths
    // Always use WebView workaround with base64 embedded model
    if (Platform.isIOS) {
      if (_modelBase64 == null) {
        // Still loading base64 - show loading indicator
        debugPrint('⏳ Loading 3D model as base64 for iOS...');
        return const Center(
          child: CircularProgressIndicator(
            color: Colors.white,
          ),
        );
      }
      // Base64 loaded - use WebView workaround
      // Return cached WebView to prevent recreation
      return _buildIOSWebViewModel();
    }

    // Android: Use model_viewer_plus normally
    // Determine the model source
    String src;

    if (widget.modelPath != null) {
      // Custom path provided
      if (widget.modelPath!.startsWith('http://') ||
          widget.modelPath!.startsWith('https://')) {
        src = widget.modelPath!;
      } else if (widget.modelPath!.startsWith('assets/')) {
        // Asset path - use directly, model_viewer_plus will serve it
        src = widget.modelPath!;
      } else {
        // Assume it's an asset path even if not prefixed
        src = widget.modelPath!;
      }
    } else {
      // Use default asset path - model_viewer_plus will serve it through local server
      src = _localModelPath;
    }

    // Android: Use model_viewer_plus normally
    // Ensure the path is properly formatted for model_viewer_plus
    if (!src.startsWith('http') && !src.startsWith('assets/')) {
      src = 'assets/$src';
    }

    // Double-check: NEVER create ModelViewer on iOS (shouldn't reach here, but safety check)
    assert(!Platform.isIOS,
        'ModelViewer should never be created on iOS - use WebView workaround');

    debugPrint('🎯 Loading 3D model from: $src');
    debugPrint('🎯 Platform: ${Platform.operatingSystem}');

    // Use stable key to prevent view recreation errors
    return ModelViewer(
      key: const ValueKey('model_viewer_human_anatomy_stable'),
      src: src,
      alt: 'Realistic human anatomy model - Tap body parts to select',
      ar: false,
      autoRotate: false,
      cameraControls: true, // Enable zoom, rotate, pan - fully interactive
      backgroundColor: Colors.transparent, // Transparent background
      loading: Loading.auto, // Show loading indicator while model loads
      interactionPrompt: InteractionPrompt.whenFocused,
      exposure: 3.5, // Bright lighting for better visibility
      shadowIntensity: 0.8, // Realistic shadows
      environmentImage: '', // Neutral environment
      minCameraOrbit: 'auto auto 0.3m', // Allow close zoom
      maxCameraOrbit: 'auto auto 8m', // Allow far zoom
      cameraTarget: '0m 1m 0m', // Center on body
      fieldOfView:
          '25deg', // Narrower field of view to make model appear larger
      // Enable all interactions
      disableZoom: false,
      disablePan: false,
      disableTap: false,
      // Performance optimizations
      reveal: Reveal.interaction, // Only reveal when user interacts
      poster: '', // No poster image to reduce load time
    );
  }

  /// iOS WebView workaround - Embed model as base64 data URI
  /// Uses THREE.js raycasting for WORLD-CLASS precise body part detection
  Widget _buildIOSWebViewModel() {
    // CRITICAL: Use STATIC global controller and widget to ensure WebView is NEVER recreated
    if (!_webViewInitializedGlobal && _modelBase64 != null) {
      _staticWebViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.transparent)
        ..addJavaScriptChannel(
          'BodyPartChannel',
          onMessageReceived: (JavaScriptMessage message) {
            // Handle body part selection from JavaScript raycasting
            try {
              final bodyPartId = message.message.trim();
              debugPrint('📱📱📱 JS MESSAGE RECEIVED: $bodyPartId');

              // Ignore test messages
              if (bodyPartId == 'test_channel') {
                debugPrint('✅ Channel test successful - ignoring test message');
                return;
              }

              debugPrint('🔍🔍🔍 Processing body part ID: "$bodyPartId"');

              if (bodyPartId.isNotEmpty) {
                if (!mounted) {
                  debugPrint('⚠️⚠️⚠️ Widget not mounted!');
                  return;
                }

                final bodyPart = BodyPartConstants.getBodyPartById(bodyPartId);
                if (bodyPart != null) {
                  // Toggle selection - simple and reliable
                  setState(() {
                    if (_selectedPartIds.contains(bodyPart.id)) {
                      _selectedPartIds.remove(bodyPart.id);
                      debugPrint('✅ DESELECTED: ${bodyPart.displayName}');
                    } else {
                      _selectedPartIds.add(bodyPart.id);
                      debugPrint(
                          '✅✅✅ SELECTED: ${bodyPart.displayName} (Total: ${_selectedPartIds.length})');
                    }
                  });

                  // CRITICAL: Notify parent widget so it updates the complaint
                  final selectedParts = _selectedPartIds
                      .map((id) => BodyPartConstants.getBodyPartById(id)!)
                      .whereType<BodyPart>()
                      .toList();

                  // Call the callback to update parent
                  if (widget.onBodyPartsChanged != null) {
                    widget.onBodyPartsChanged!(selectedParts);
                    debugPrint(
                        '✅✅✅ Notified parent widget with ${selectedParts.length} selected parts');
                  }
                } else {
                  debugPrint(
                      '⚠️⚠️⚠️ Body part not found for ID: "$bodyPartId"');
                  debugPrint(
                      '⚠️ Available body part IDs: ${BodyPartConstants.allBodyParts.map((p) => p.id).join(", ")}');
                }
              } else {
                debugPrint('⚠️ Empty body part ID received');
              }
            } catch (e, stackTrace) {
              debugPrint('❌ Error handling JS message: $e');
              debugPrint('❌ Stack trace: $stackTrace');
            }
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (String url) {
              debugPrint('🌐🌐🌐 WebView page finished loading: $url');
              // Inject JavaScript to test channel after page loads
              Future.delayed(const Duration(milliseconds: 500), () {
                _staticWebViewController?.runJavaScript('''
                  console.log('🔍 Testing JavaScript channel...');
                  if (typeof BodyPartChannel === 'undefined') {
                    console.error('❌❌❌ BodyPartChannel is undefined!');
                  } else {
                    console.log('✅✅✅ BodyPartChannel is available!');
                    // Test sending a message
                    try {
                      BodyPartChannel.postMessage('test_channel');
                      console.log('✅ Test message sent successfully');
                    } catch (e) {
                      console.error('❌ Error sending test message:', e);
                    }
                  }
                ''');
              });
            },
          ),
        )
        ..loadRequest(
          Uri.dataFromString(
            _buildModelViewerHTML(),
            mimeType: 'text/html',
            encoding: Encoding.getByName('utf-8'),
          ),
        );

      // Create and cache the WebView widget ONCE - STATIC so it persists
      _staticCachedWebView = WebViewWidget(
        key: const ValueKey('webview_singleton_static_never_recreate'),
        controller: _staticWebViewController!,
      );

      _webViewInitializedGlobal = true; // Set STATIC flag
      debugPrint(
          '✅✅✅✅✅ STATIC WebView initialized ONCE - will NEVER be recreated');
    }

    // If controller is not ready, show loading
    if (_staticWebViewController == null || _staticCachedWebView == null) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    // Return the STATIC cached WebView widget - NEVER recreate it
    return RepaintBoundary(
      key: const ValueKey('webview_repaint_boundary_static'),
      child: _staticCachedWebView!,
    );
  }

  /// Build HTML with embedded base64 model (iOS workaround)
  /// Model is centered, LARGE, with transparent background
  /// Uses JavaScript raycasting to detect taps on actual 3D model
  String _buildModelViewerHTML() {
    return '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      background: transparent !important;
      object-fit: contain;
    }
  </style>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
</head>
<body>
  <div id="model-container" style="width: 100%; height: 100%; position: relative; background: transparent;">
    <model-viewer
      id="anatomy-model"
      src="data:model/gltf-binary;base64,$_modelBase64"
      alt="Realistic human anatomy model"
      camera-controls
      interaction-prompt="when-focused"
      camera-target="0m 1.2m 0m"
      field-of-view="12deg"
      max-camera-orbit="auto auto 15m"
      min-camera-orbit="auto auto 0.1m"
      exposure="6.0"
      shadow-intensity="0.8"
      auto-rotate-delay="0"
      style="width: 100%; height: 100%; background: transparent !important; pointer-events: auto;">
    </model-viewer>
    
    <!-- Body Part Labels Overlay - Shows labels when hovering/near body parts -->
    <div id="body-labels" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 998;">
      <!-- Labels will be dynamically positioned -->
    </div>
    
    <!-- Visual feedback for clicks -->
    <div id="click-indicator" style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: red; display: none; pointer-events: none; z-index: 999; transform: translate(-50%, -50%);"></div>
    
    <!-- Selected Body Part Label -->
    <div id="selected-label" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); color: white; padding: 10px 20px; border-radius: 20px; display: none; pointer-events: none; z-index: 1000; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold;">
    </div>
  </div>
  
  <script>
    const modelViewer = document.querySelector('#anatomy-model');
    const modelContainer = document.querySelector('#model-container');
    const clickIndicator = document.querySelector('#click-indicator');
    let modelLoaded = false;
    let isZooming = false;
    let lastClickTime = 0;
    const CLICK_DEBOUNCE_MS = 200; // Prevent rapid duplicate clicks
    
    // Wait for model to load
    modelViewer.addEventListener('load', () => {
      modelLoaded = true;
      console.log('✅✅✅ 3D Model loaded successfully - ready for interaction');
      // Ensure camera controls are enabled
      modelViewer.cameraControls = true;
      
      // Test channel availability
      setTimeout(() => {
        if (typeof BodyPartChannel !== 'undefined') {
          console.log('✅✅✅ BodyPartChannel is available');
          // Send a test message
          try {
            BodyPartChannel.postMessage('test_channel');
            console.log('✅ Test message sent on load');
          } catch (e) {
            console.error('❌ Error sending test message:', e);
          }
        } else {
          console.error('❌❌❌ BodyPartChannel is NOT available!');
        }
        
        // Verify event listeners are registered
        console.log('✅✅✅ Event listeners should be registered now');
        console.log('✅✅✅ Ready to detect clicks on 3D model');
      }, 500);
    });
    
    // Prevent default zoom behavior that might interfere
    modelViewer.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        isZooming = true; // Multi-touch = zooming
        console.log('🔍 Multi-touch detected - zooming mode');
      } else {
        isZooming = false; // Single touch = selection
      }
    });
    
    modelViewer.addEventListener('touchend', (e) => {
      // Only reset zoom flag after a delay if it was actually zooming
      if (isZooming) {
        setTimeout(() => { isZooming = false; }, 200);
      } else {
        isZooming = false; // Immediately allow selection for single touch
      }
    });
    
    // SIMPLE: Click handler - just detect and send
    function handleBodyPartClick(event) {
      // Debounce rapid clicks
      const now = Date.now();
      if (now - lastClickTime < CLICK_DEBOUNCE_MS) {
        console.log('🚫 Click debounced');
        return;
      }
      lastClickTime = now;
      
      if (isZooming || !modelLoaded) {
        console.log('🚫 Ignoring click - zooming:', isZooming, 'modelLoaded:', modelLoaded);
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      
      const rect = modelViewer.getBoundingClientRect();
      const clientX = event.clientX || (event.changedTouches?.[0]?.clientX ?? 0);
      const clientY = event.clientY || (event.changedTouches?.[0]?.clientY ?? 0);
      
      if (!clientX || !clientY) {
        console.log('🚫 Invalid click coordinates');
        return;
      }
      
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      
      console.log('🎯🎯🎯 CLICK DETECTED at normalized:', x.toFixed(3), y.toFixed(3));
      
      // Validate coordinates are within bounds
      if (x < 0 || y < 0 || x > 1 || y > 1) {
        console.log('🚫 Click outside model bounds');
        return;
      }
      
      // Show visual feedback
      if (clickIndicator) {
        clickIndicator.style.left = clientX + 'px';
        clickIndicator.style.top = clientY + 'px';
        clickIndicator.style.display = 'block';
        setTimeout(() => {
          if (clickIndicator) clickIndicator.style.display = 'none';
        }, 300);
      }
      
      const bodyPart = detectBodyPartFrom2D(x, y);
      if (bodyPart) {
        console.log('✅✅✅ BODY PART DETECTED:', bodyPart);
        const labelDiv = document.querySelector('#selected-label');
        if (labelDiv) {
          labelDiv.textContent = getBodyPartLabel(bodyPart);
          labelDiv.style.display = 'block';
          setTimeout(() => {
            if (labelDiv) labelDiv.style.display = 'none';
          }, 2000);
        }
        sendToFlutter(bodyPart);
      } else {
        console.log('⚠️ No body part detected at coordinates:', x.toFixed(3), y.toFixed(3));
      }
    }
    
    // WORLD-CLASS: Precise 3D position-based detection
    // Uses actual 3D coordinates from raycasting, not screen approximations
    function detectBodyPartFrom3DPosition(position, normal) {
      const x = position.x;
      const y = position.y; // Vertical (head to toe)
      const z = position.z; // Depth (front to back)
      const nx = normal.x;
      const ny = normal.y;
      const nz = normal.z;
      
      console.log('🔍🔍🔍 Analyzing 3D position:', {
        x: x.toFixed(3),
        y: y.toFixed(3),
        z: z.toFixed(3),
        normal: {x: nx.toFixed(3), y: ny.toFixed(3), z: nz.toFixed(3)}
      });
      
      // Model is typically ~1.7m tall, centered around y=1.0-1.5m
      // Normalize Y: head is around y=1.8-2.0, feet around y=0.2-0.4
      const headY = 1.9;
      const feetY = 0.3;
      const bodyHeight = headY - feetY; // ~1.6m
      const normalizedY = Math.max(0, Math.min(1, (y - feetY) / bodyHeight));
      
      // Determine if front or back based on normal Z component
      const isFront = nz > 0.3; // Front-facing if normal Z is positive
      const isBack = nz < -0.3; // Back-facing if normal Z is negative
      
      console.log('📏 Normalized Y:', normalizedY.toFixed(3), 'Front:', isFront, 'Back:', isBack);
      
      // HEAD (top 8%: normalizedY 0.92-1.0)
      if (normalizedY > 0.92) {
        if (normalizedY > 0.96 && Math.abs(x) < 0.15 && isFront) {
          return 'face';
        }
        if (Math.abs(x) < 0.20) {
          return 'head';
        }
      }
      
      // NECK (8-11%: normalizedY 0.89-0.92)
      if (normalizedY > 0.89 && normalizedY <= 0.92) {
        if (Math.abs(x) < 0.12) {
          return 'neck';
        }
      }
      
      // CHEST (50-75%: normalizedY 0.25-0.50, FRONT)
      if (normalizedY > 0.25 && normalizedY <= 0.50) {
        if (isFront && Math.abs(x) < 0.30) {
          return 'chest';
        }
        if (isBack && Math.abs(x) < 0.30) {
          return 'upper_back';
        }
      }
      
      // ABDOMEN (25-40%: normalizedY 0.15-0.25, FRONT)
      if (normalizedY > 0.15 && normalizedY <= 0.25) {
        if (isFront && Math.abs(x) < 0.30) {
          return 'abdomen';
        }
        if (isBack && Math.abs(x) < 0.30) {
          return 'lower_back';
        }
      }
      
      // ARMS - Left (x < -0.15) or Right (x > 0.15)
      if (normalizedY > 0.20 && normalizedY <= 0.55) {
        if (x < -0.15) {
          // Left arm
          if (normalizedY > 0.50) return 'left_hand';
          if (normalizedY > 0.45) return 'left_wrist';
          if (normalizedY > 0.38) return 'left_elbow';
          return 'left_arm';
        } else if (x > 0.15) {
          // Right arm
          if (normalizedY > 0.50) return 'right_hand';
          if (normalizedY > 0.45) return 'right_wrist';
          if (normalizedY > 0.38) return 'right_elbow';
          return 'right_arm';
        }
      }
      
      // LEGS - Left (x < 0) or Right (x > 0)
      if (normalizedY <= 0.20) {
        if (x < 0) {
          // Left leg
          if (normalizedY > 0.18) return 'left_thigh';
          if (normalizedY > 0.15) return 'left_knee';
          if (normalizedY > 0.08) return 'left_leg';
          if (normalizedY > 0.04) return 'left_ankle';
          return 'left_foot';
        } else if (x > 0) {
          // Right leg
          if (normalizedY > 0.18) return 'right_thigh';
          if (normalizedY > 0.15) return 'right_knee';
          if (normalizedY > 0.08) return 'right_leg';
          if (normalizedY > 0.04) return 'right_ankle';
          return 'right_foot';
        }
      }
      
      return null;
    }
    
    // CRITICAL: Register click events with capture phase to ensure we catch all clicks
    // Use capture phase (true) to ensure our handler runs before others
    modelViewer.addEventListener('click', handleBodyPartClick, true);
    modelViewer.addEventListener('touchend', handleBodyPartClick, true);
    modelViewer.addEventListener('pointerup', handleBodyPartClick, true);
    modelContainer.addEventListener('click', handleBodyPartClick, true);
    modelContainer.addEventListener('touchend', handleBodyPartClick, true);
    
    console.log('✅✅✅ Click listeners registered with capture phase - ready to select body parts!');
    
    // Get human-readable label for body part
    function getBodyPartLabel(partId) {
      const labels = {
        'head': 'Head',
        'face': 'Face',
        'neck': 'Neck',
        'chest': 'Chest',
        'upper_back': 'Upper Back',
        'lower_back': 'Lower Back',
        'abdomen': 'Abdomen',
        'left_arm': 'Left Arm',
        'right_arm': 'Right Arm',
        'left_elbow': 'Left Elbow',
        'right_elbow': 'Right Elbow',
        'left_wrist': 'Left Wrist',
        'right_wrist': 'Right Wrist',
        'left_hand': 'Left Hand',
        'right_hand': 'Right Hand',
        'left_thigh': 'Left Thigh',
        'right_thigh': 'Right Thigh',
        'left_knee': 'Left Knee',
        'right_knee': 'Right Knee',
        'left_leg': 'Left Leg',
        'right_leg': 'Right Leg',
        'left_ankle': 'Left Ankle',
        'right_ankle': 'Right Ankle',
        'left_foot': 'Left Foot',
        'right_foot': 'Right Foot',
      };
      return labels[partId] || partId;
    }
    
    // Helper function to send body part to Flutter
    function sendToFlutter(bodyPart) {
      console.log('📤📤📤 ATTEMPTING TO SEND TO FLUTTER:', bodyPart);
      
      // Check if channel exists
      if (typeof BodyPartChannel === 'undefined') {
        console.error('❌❌❌ BodyPartChannel is UNDEFINED!');
        // Retry after a short delay
        setTimeout(() => {
          if (typeof BodyPartChannel !== 'undefined') {
            console.log('✅ BodyPartChannel now available, retrying...');
            try {
              BodyPartChannel.postMessage(bodyPart);
              console.log('✅✅✅ SENT VIA BodyPartChannel (retry):', bodyPart);
            } catch (e) {
              console.error('❌ Retry error:', e);
            }
          } else {
            console.error('❌ BodyPartChannel still not available after retry');
          }
        }, 100);
        return;
      }
      
      try {
        // Direct channel call (webview_flutter)
        BodyPartChannel.postMessage(bodyPart);
        console.log('✅✅✅ SENT VIA BodyPartChannel:', bodyPart);
      } catch (e) {
        console.error('❌❌❌ BodyPartChannel.postMessage ERROR:', e);
        console.error('Error details:', e.message, e.stack);
      }
    }
    
    // PRIMARY: 2D coordinate-based detection (more reliable than 3D raycasting)
    // Simplified and more generous bounds to ensure detection works
    function detectBodyPartFrom2D(x, y) {
      // x and y are normalized 0-1 (left-right, top-bottom)
      console.log('🔍🔍🔍 Detecting body part from 2D:', x.toFixed(3), y.toFixed(3));
      
      // Make bounds more generous to ensure detection
      // HEAD (top 0-15%)
      if (y >= 0.0 && y <= 0.15) {
        if (x >= 0.30 && x <= 0.70) {
          if (y <= 0.08) {
            console.log('✅ Detected: face');
            return 'face';
          }
          console.log('✅ Detected: head');
          return 'head';
        }
      }
      
      // NECK (15-18%)
      if (y > 0.15 && y <= 0.18) {
        if (x >= 0.35 && x <= 0.65) {
          console.log('✅ Detected: neck');
          return 'neck';
        }
      }
      
      // CHEST (18-32%, center torso) - more generous bounds
      if (y > 0.18 && y <= 0.32) {
        if (x >= 0.20 && x <= 0.80) {
          console.log('✅ Detected: chest');
          return 'chest';
        }
      }
      
      // ABDOMEN (32-42%, center torso)
      if (y > 0.32 && y <= 0.42) {
        if (x >= 0.20 && x <= 0.80) {
          console.log('✅ Detected: abdomen');
          return 'abdomen';
        }
      }
      
      // LEFT ARM (18-55%, left side: x < 0.30) - more generous
      if (x < 0.30 && y > 0.18 && y <= 0.55) {
        if (y > 0.50) {
          console.log('✅ Detected: left_hand');
          return 'left_hand';
        }
        if (y > 0.45) {
          console.log('✅ Detected: left_wrist');
          return 'left_wrist';
        }
        if (y > 0.35) {
          console.log('✅ Detected: left_elbow');
          return 'left_elbow';
        }
        console.log('✅ Detected: left_arm');
        return 'left_arm';
      }
      
      // RIGHT ARM (18-55%, right side: x > 0.70) - more generous
      if (x > 0.70 && y > 0.18 && y <= 0.55) {
        if (y > 0.50) {
          console.log('✅ Detected: right_hand');
          return 'right_hand';
        }
        if (y > 0.45) {
          console.log('✅ Detected: right_wrist');
          return 'right_wrist';
        }
        if (y > 0.35) {
          console.log('✅ Detected: right_elbow');
          return 'right_elbow';
        }
        console.log('✅ Detected: right_arm');
        return 'right_arm';
      }
      
      // LEFT LEG (42-100%, left side: 0.20 <= x < 0.50) - more generous
      if (x >= 0.20 && x < 0.50 && y > 0.42) {
        if (y > 0.95) {
          console.log('✅ Detected: left_foot');
          return 'left_foot';
        }
        if (y > 0.90) {
          console.log('✅ Detected: left_ankle');
          return 'left_ankle';
        }
        if (y > 0.80) {
          console.log('✅ Detected: left_leg');
          return 'left_leg';
        }
        if (y > 0.70) {
          console.log('✅ Detected: left_knee');
          return 'left_knee';
        }
        console.log('✅ Detected: left_thigh');
        return 'left_thigh';
      }
      
      // RIGHT LEG (42-100%, right side: 0.50 <= x < 0.80) - more generous
      if (x >= 0.50 && x < 0.80 && y > 0.42) {
        if (y > 0.95) {
          console.log('✅ Detected: right_foot');
          return 'right_foot';
        }
        if (y > 0.90) {
          console.log('✅ Detected: right_ankle');
          return 'right_ankle';
        }
        if (y > 0.80) {
          console.log('✅ Detected: right_leg');
          return 'right_leg';
        }
        if (y > 0.70) {
          console.log('✅ Detected: right_knee');
          return 'right_knee';
        }
        console.log('✅ Detected: right_thigh');
        return 'right_thigh';
      }
      
      // UPPER BACK (18-32%, center)
      if (y > 0.18 && y <= 0.32) {
        if (x >= 0.20 && x <= 0.80) {
          console.log('✅ Detected: upper_back');
          return 'upper_back';
        }
      }
      
      // LOWER BACK (32-42%, center)
      if (y > 0.32 && y <= 0.42) {
        if (x >= 0.20 && x <= 0.80) {
          console.log('✅ Detected: lower_back');
          return 'lower_back';
        }
      }
      
      console.log('⚠️⚠️⚠️ No body part matched for coordinates:', x.toFixed(3), y.toFixed(3));
      return null;
    }
    
    // Detect body part from 3D position using actual model dimensions
    function detectBodyPart(position) {
      const x = position.x;
      const y = position.y; // Y is vertical (head to toe)
      const z = position.z; // Z is depth (front to back)
      
      // Model is typically ~1.7m tall, centered at y=1.2m
      // Normalize Y: head is around y=2.0, feet around y=0.4
      const headY = 2.0;
      const feetY = 0.4;
      const bodyHeight = headY - feetY; // ~1.6m
      const normalizedY = (y - feetY) / bodyHeight; // 0 = feet, 1 = head
      
      // HEAD (top 8% of body: normalizedY 0.92-1.0)
      if (normalizedY > 0.92) {
        if (normalizedY > 0.96) return 'face';
        return 'head';
      }
      
      // NECK (8-11% of body: normalizedY 0.89-0.92)
      if (normalizedY > 0.89 && normalizedY <= 0.92) {
        if (Math.abs(x) < 0.15) return 'neck'; // Narrow, centered
      }
      
      // CHEST (50-75% of body: normalizedY 0.25-0.50, front: z > 0.1)
      if (normalizedY > 0.25 && normalizedY <= 0.50 && z > 0.1) {
        if (Math.abs(x) < 0.35) return 'chest'; // Center torso, front
      }
      
      // UPPER BACK (50-75% of body: normalizedY 0.25-0.50, back: z < -0.1)
      if (normalizedY > 0.25 && normalizedY <= 0.50 && z < -0.1) {
        if (Math.abs(x) < 0.35) return 'upper_back'; // Center torso, back
      }
      
      // ABDOMEN (35-50% of body: normalizedY 0.15-0.25, front: z > 0.1)
      if (normalizedY > 0.15 && normalizedY <= 0.25 && z > 0.1) {
        if (Math.abs(x) < 0.35) return 'abdomen'; // Lower torso, front
      }
      
      // LOWER BACK (35-50% of body: normalizedY 0.15-0.25, back: z < -0.1)
      if (normalizedY > 0.15 && normalizedY <= 0.25 && z < -0.1) {
        if (Math.abs(x) < 0.35) return 'lower_back'; // Lower torso, back
      }
      
      // ARMS - Left (x < -0.25) or Right (x > 0.25)
      if (normalizedY > 0.20 && normalizedY <= 0.55) {
        if (x < -0.25) {
          // Left arm
          if (normalizedY > 0.48 && normalizedY <= 0.55) return 'left_hand';
          if (normalizedY > 0.44 && normalizedY <= 0.48) return 'left_wrist';
          if (normalizedY > 0.36 && normalizedY <= 0.44) return 'left_elbow';
          if (normalizedY > 0.20 && normalizedY <= 0.36) return 'left_arm';
        } else if (x > 0.25) {
          // Right arm
          if (normalizedY > 0.48 && normalizedY <= 0.55) return 'right_hand';
          if (normalizedY > 0.44 && normalizedY <= 0.48) return 'right_wrist';
          if (normalizedY > 0.36 && normalizedY <= 0.44) return 'right_elbow';
          if (normalizedY > 0.20 && normalizedY <= 0.36) return 'right_arm';
        }
      }
      
      // LEGS - Left (x < -0.1) or Right (x > 0.1)
      if (normalizedY <= 0.20) {
        if (x < -0.1) {
          // Left leg
          if (normalizedY > 0.15 && normalizedY <= 0.20) return 'left_thigh';
          if (normalizedY > 0.12 && normalizedY <= 0.15) return 'left_knee';
          if (normalizedY > 0.05 && normalizedY <= 0.12) return 'left_leg';
          if (normalizedY > 0.02 && normalizedY <= 0.05) return 'left_ankle';
          if (normalizedY <= 0.02) return 'left_foot';
        } else if (x > 0.1) {
          // Right leg
          if (normalizedY > 0.15 && normalizedY <= 0.20) return 'right_thigh';
          if (normalizedY > 0.12 && normalizedY <= 0.15) return 'right_knee';
          if (normalizedY > 0.05 && normalizedY <= 0.12) return 'right_leg';
          if (normalizedY > 0.02 && normalizedY <= 0.05) return 'right_ankle';
          if (normalizedY <= 0.02) return 'right_foot';
        }
      }
      
      return null;
    }
  </script>
</body>
</html>
''';
  }
}

/// Ultra-precise interactive overlay - Only detects taps directly on body parts
/// Uses smaller, more accurate hit areas to prevent accidental selections
class _PreciseBodyPartOverlay extends StatelessWidget {
  final Set<String> selectedPartIds;
  final Function(BodyPart) onPartToggled;

  const _PreciseBodyPartOverlay({
    required this.selectedPartIds,
    required this.onPartToggled,
  });

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    // CRITICAL: Model fills the entire container (100% width/height)
    // The 3D model is centered and fills the available space
    // We need to be VERY strict - only detect taps in the CENTER area where the model actually is
    // Model typically occupies center 70% width, 85% height of the container
    final modelLeft = screenSize.width * 0.15; // 15% margin on left
    final modelRight = screenSize.width * 0.85; // 15% margin on right
    final modelTop = screenSize.height * 0.08; // 8% margin on top
    final modelBottom = screenSize.height * 0.92; // 8% margin on bottom

    return Positioned.fill(
      child: GestureDetector(
        onTapDown: (details) {
          final tapX = details.localPosition.dx;
          final tapY = details.localPosition.dy;

          // CRITICAL: STRICT validation - only process taps in the EXACT model area
          // Reject any tap outside the model bounds immediately
          if (tapX < modelLeft ||
              tapX > modelRight ||
              tapY < modelTop ||
              tapY > modelBottom) {
            debugPrint(
                '🚫 Tap REJECTED: outside model area (x: $tapX, y: $tapY, bounds: $modelLeft-$modelRight, $modelTop-$modelBottom)');
            return; // IGNORE - do nothing
          }

          // Tap is within model bounds - now check for precise body part
          final tappedPart = _getPreciseBodyPartAtPosition(
            details.localPosition,
            screenSize,
          );

          // Only toggle if we hit a body part precisely
          if (tappedPart != null) {
            debugPrint(
                '✅ Body part selected: ${tappedPart.name} at (x: $tapX, y: $tapY)');
            onPartToggled(tappedPart);
          } else {
            // Tap was within model bounds but not on any specific body part
            debugPrint(
                '🚫 Tap REJECTED: within model area but not on a body part (x: $tapX, y: $tapY)');
          }
        },
        behavior: HitTestBehavior.translucent,
        child: Container(color: Colors.transparent),
      ),
    );
  }

  /// Ultra-precise body part detection - Based on actual human anatomy proportions
  /// Coordinates are normalized to the model's centered display area
  /// Layout based on standard human body proportions (head ~8%, torso ~30%, legs ~50%)
  BodyPart? _getPreciseBodyPartAtPosition(Offset position, Size screenSize) {
    // CRITICAL: Model occupies center 70% width, 85% height of screen
    // This matches the strict bounds check in the GestureDetector
    final modelWidth = screenSize.width * 0.70; // 70% width
    final modelHeight = screenSize.height *
        0.84; // 84% height (8% top + 8% bottom = 16% margin)
    final modelLeft = screenSize.width * 0.15; // 15% margin on left
    final modelTop = screenSize.height * 0.08; // 8% margin on top

    // Convert tap position to model-relative coordinates
    final relativeX = (position.dx - modelLeft) / modelWidth;
    final relativeY = (position.dy - modelTop) / modelHeight;

    // STRICT validation - reject if outside normalized bounds
    if (relativeX < 0.0 ||
        relativeX > 1.0 ||
        relativeY < 0.0 ||
        relativeY > 1.0) {
      return null; // Tap is outside model area
    }

    // Normalize to 0-1 range for body part detection
    final normalizedX = relativeX;
    final normalizedY = relativeY;

    // ANATOMY LAYOUT ANALYSIS:
    // Based on standard human proportions (standing, front view):
    // - Head: ~8% of total height (top 0-8%)
    // - Neck: ~3% (8-11%)
    // - Upper torso (chest/shoulders): ~15% (11-26%)
    // - Mid torso (abdomen): ~10% (26-36%)
    // - Lower torso (pelvis): ~8% (36-44%)
    // - Thighs: ~20% (44-64%)
    // - Lower legs: ~20% (64-84%)
    // - Feet: ~8% (84-92%)
    // Width: Body center ~45-55%, arms extend to ~15% and ~85%

    // HEAD - Top 8% of body, centered (43-57% width)
    if (normalizedY >= 0.0 && normalizedY < 0.08) {
      if (normalizedX >= 0.43 && normalizedX < 0.57) {
        // Face is lower part of head (5-8% height)
        if (normalizedY >= 0.05 && normalizedY < 0.08) {
          return BodyPartConstants.getBodyPartById('face');
        }
        return BodyPartConstants.getBodyPartById('head');
      }
    }

    // NECK - Narrow vertical strip (8-11% height, 47-53% width)
    if (normalizedY >= 0.08 && normalizedY < 0.11) {
      if (normalizedX >= 0.47 && normalizedX < 0.53) {
        return BodyPartConstants.getBodyPartById('neck');
      }
    }

    // CHEST - Upper torso front (11-22% height, 38-62% width)
    // ONLY select chest when tapping the front center area, NOT the sides
    if (normalizedY >= 0.11 && normalizedY < 0.22) {
      // Chest is the front center - exclude arm areas
      if (normalizedX >= 0.38 && normalizedX < 0.62) {
        // Exclude areas that are clearly arms (outside 35-65%)
        if (normalizedX >= 0.35 && normalizedX < 0.65) {
          return BodyPartConstants.getBodyPartById('chest');
        }
      }
    }

    // UPPER BACK - Same vertical as chest but detected from back (11-22% height, 38-62% width)
    // Only if not already chest (this would be for back view - for now, prioritize chest)
    // Note: In front view, upper_back would be behind chest, so we'll skip it for front view

    // LEFT ARM - Left side (10-30% width, 11-50% height)
    if (normalizedX >= 0.10 &&
        normalizedX < 0.30 &&
        normalizedY >= 0.11 &&
        normalizedY < 0.50) {
      if (normalizedY >= 0.44 && normalizedY < 0.50) {
        return BodyPartConstants.getBodyPartById('left_hand');
      }
      if (normalizedY >= 0.40 && normalizedY < 0.44) {
        return BodyPartConstants.getBodyPartById('left_wrist');
      }
      if (normalizedY >= 0.32 && normalizedY < 0.40) {
        return BodyPartConstants.getBodyPartById('left_elbow');
      }
      if (normalizedY >= 0.11 && normalizedY < 0.32) {
        return BodyPartConstants.getBodyPartById('left_arm');
      }
    }

    // RIGHT ARM - Right side (70-90% width, 11-50% height)
    if (normalizedX >= 0.70 &&
        normalizedX < 0.90 &&
        normalizedY >= 0.11 &&
        normalizedY < 0.50) {
      if (normalizedY >= 0.44 && normalizedY < 0.50) {
        return BodyPartConstants.getBodyPartById('right_hand');
      }
      if (normalizedY >= 0.40 && normalizedY < 0.44) {
        return BodyPartConstants.getBodyPartById('right_wrist');
      }
      if (normalizedY >= 0.32 && normalizedY < 0.40) {
        return BodyPartConstants.getBodyPartById('right_elbow');
      }
      if (normalizedY >= 0.11 && normalizedY < 0.32) {
        return BodyPartConstants.getBodyPartById('right_arm');
      }
    }

    // ABDOMEN/STOMACH - Mid torso (26-36% height, 35-65% width)
    // This is BELOW the chest, so it shouldn't conflict
    if (normalizedY >= 0.26 && normalizedY < 0.36) {
      if (normalizedX >= 0.35 && normalizedX < 0.65) {
        return BodyPartConstants.getBodyPartById('abdomen');
      }
    }

    // LOWER BACK - Same vertical as abdomen but back side (26-36% height, 35-65% width)
    // For front view, we'll skip this (would be behind abdomen)

    // LEFT THIGH - Upper leg (44-58% height, 38-48% width)
    if (normalizedY >= 0.44 && normalizedY < 0.58) {
      if (normalizedX >= 0.38 && normalizedX < 0.48) {
        return BodyPartConstants.getBodyPartById('left_thigh');
      }
    }

    // RIGHT THIGH - Upper leg (44-58% height, 52-62% width)
    if (normalizedY >= 0.44 && normalizedY < 0.58) {
      if (normalizedX >= 0.52 && normalizedX < 0.62) {
        return BodyPartConstants.getBodyPartById('right_thigh');
      }
    }

    // LEFT KNEE - Joint area (58-62% height, 38-48% width)
    if (normalizedY >= 0.58 && normalizedY < 0.62) {
      if (normalizedX >= 0.38 && normalizedX < 0.48) {
        return BodyPartConstants.getBodyPartById('left_knee');
      }
    }

    // RIGHT KNEE - Joint area (58-62% height, 52-62% width)
    if (normalizedY >= 0.58 && normalizedY < 0.62) {
      if (normalizedX >= 0.52 && normalizedX < 0.62) {
        return BodyPartConstants.getBodyPartById('right_knee');
      }
    }

    // LEFT LEG - Lower leg (62-78% height, 38-48% width)
    if (normalizedY >= 0.62 && normalizedY < 0.78) {
      if (normalizedX >= 0.38 && normalizedX < 0.48) {
        return BodyPartConstants.getBodyPartById('left_leg');
      }
    }

    // RIGHT LEG - Lower leg (62-78% height, 52-62% width)
    if (normalizedY >= 0.62 && normalizedY < 0.78) {
      if (normalizedX >= 0.52 && normalizedX < 0.62) {
        return BodyPartConstants.getBodyPartById('right_leg');
      }
    }

    // LEFT ANKLE - Joint area (78-82% height, 38-48% width)
    if (normalizedY >= 0.78 && normalizedY < 0.82) {
      if (normalizedX >= 0.38 && normalizedX < 0.48) {
        return BodyPartConstants.getBodyPartById('left_ankle');
      }
    }

    // RIGHT ANKLE - Joint area (78-82% height, 52-62% width)
    if (normalizedY >= 0.78 && normalizedY < 0.82) {
      if (normalizedX >= 0.52 && normalizedX < 0.62) {
        return BodyPartConstants.getBodyPartById('right_ankle');
      }
    }

    // LEFT FOOT - Bottom (82-92% height, 35-48% width)
    if (normalizedY >= 0.82 && normalizedY < 0.92) {
      if (normalizedX >= 0.35 && normalizedX < 0.48) {
        return BodyPartConstants.getBodyPartById('left_foot');
      }
    }

    // RIGHT FOOT - Bottom (82-92% height, 52-65% width)
    if (normalizedY >= 0.82 && normalizedY < 0.92) {
      if (normalizedX >= 0.52 && normalizedX < 0.65) {
        return BodyPartConstants.getBodyPartById('right_foot');
      }
    }

    // Return null if tap is not on any body part - prevents accidental selections
    return null;
  }
}

/// Realistic custom painter - Draws red highlights that match actual body part shapes
class _RealisticBodyPartPainter extends CustomPainter {
  final Set<String> selectedPartIds;

  _RealisticBodyPartPainter({
    required this.selectedPartIds,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (selectedPartIds.isEmpty) return;

    // REALISTIC 3D SHADING - Multi-layer effect for depth and realism

    // Layer 1: Deep shadow/glow (outermost, most transparent)
    final outerGlowPaint = Paint()
      ..color = const Color(0xFFEF4444).withValues(alpha: 0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8.0);

    // Layer 2: Medium glow (middle layer)
    final mediumGlowPaint = Paint()
      ..color = const Color(0xFFEF4444).withValues(alpha: 0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5.0);

    // Layer 3: Inner glow (closer to body part)
    final innerGlowPaint = Paint()
      ..color = const Color(0xFFEF4444).withValues(alpha: 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3.0);

    // Layer 4: Main fill with gradient-like effect (realistic 3D shading)
    final fillPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color(0xFFFF6B6B), // Lighter red (highlight)
          Color(0xFFEF4444), // Medium red (main)
          Color(0xFFDC2626), // Darker red (shadow)
        ],
        stops: [0.0, 0.5, 1.0],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill
      ..blendMode = BlendMode.srcATop;

    // Layer 5: Enhanced border with 3D depth effect
    final strokePaint = Paint()
      ..color = const Color(0xFFDC2626)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    // Layer 6: Inner highlight (for 3D pop effect)
    final highlightPaint = Paint()
      ..color = const Color(0xFFFF8A80).withValues(alpha: 0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.0);

    // Draw all selected body parts with realistic 3D multi-layer shading
    _drawBodyPart3D(canvas, size, 'head', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'face', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'neck', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'chest', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'upper_back', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'lower_back', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'abdomen', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_arm', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_elbow', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_wrist', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_hand', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_arm', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_elbow', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_wrist', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_hand', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_thigh', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_knee', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_leg', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_ankle', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'left_foot', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_thigh', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_knee', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_leg', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_ankle', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
    _drawBodyPart3D(canvas, size, 'right_foot', fillPaint, strokePaint,
        outerGlowPaint, mediumGlowPaint, innerGlowPaint, highlightPaint);
  }

  /// Draw body part with realistic 3D multi-layer shading effect
  void _drawBodyPart3D(
    Canvas canvas,
    Size size,
    String partId,
    Paint fillPaint,
    Paint strokePaint,
    Paint outerGlowPaint,
    Paint mediumGlowPaint,
    Paint innerGlowPaint,
    Paint highlightPaint,
  ) {
    if (!selectedPartIds.contains(partId)) return;

    switch (partId) {
      case 'head':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.5, size.height * 0.12),
          width: size.width * 0.16,
          height: size.height * 0.10,
        );
        // Multi-layer 3D shading: outer -> medium -> inner -> fill -> stroke -> highlight
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'face':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.5, size.height * 0.14),
          width: size.width * 0.14,
          height: size.height * 0.06,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'neck':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.5, size.height * 0.20),
          width: size.width * 0.06,
          height: size.height * 0.04,
        );
        final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(5));
        canvas.drawRRect(rrect, outerGlowPaint);
        canvas.drawRRect(rrect, mediumGlowPaint);
        canvas.drawRRect(rrect, innerGlowPaint);
        canvas.drawRRect(rrect, fillPaint);
        canvas.drawRRect(rrect, strokePaint);
        canvas.drawRRect(rrect, highlightPaint);
        break;
      case 'chest':
        final path = Path()
          ..moveTo(size.width * 0.35, size.height * 0.24)
          ..lineTo(size.width * 0.65, size.height * 0.24)
          ..lineTo(size.width * 0.67, size.height * 0.38)
          ..lineTo(size.width * 0.33, size.height * 0.38)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'upper_back':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.5, size.height * 0.30),
          width: size.width * 0.30,
          height: size.height * 0.10,
        );
        final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(16));
        canvas.drawRRect(rrect, outerGlowPaint);
        canvas.drawRRect(rrect, mediumGlowPaint);
        canvas.drawRRect(rrect, innerGlowPaint);
        canvas.drawRRect(rrect, fillPaint);
        canvas.drawRRect(rrect, strokePaint);
        canvas.drawRRect(rrect, highlightPaint);
        break;
      case 'lower_back':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.5, size.height * 0.48),
          width: size.width * 0.30,
          height: size.height * 0.08,
        );
        final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(16));
        canvas.drawRRect(rrect, outerGlowPaint);
        canvas.drawRRect(rrect, mediumGlowPaint);
        canvas.drawRRect(rrect, innerGlowPaint);
        canvas.drawRRect(rrect, fillPaint);
        canvas.drawRRect(rrect, strokePaint);
        canvas.drawRRect(rrect, highlightPaint);
        break;
      case 'abdomen':
        final path = Path()
          ..moveTo(size.width * 0.35, size.height * 0.40)
          ..quadraticBezierTo(
            size.width * 0.35,
            size.height * 0.47,
            size.width * 0.37,
            size.height * 0.52,
          )
          ..lineTo(size.width * 0.63, size.height * 0.52)
          ..quadraticBezierTo(
            size.width * 0.65,
            size.height * 0.47,
            size.width * 0.65,
            size.height * 0.40,
          )
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'left_arm':
        final path = Path()
          ..moveTo(size.width * 0.33, size.height * 0.24)
          ..quadraticBezierTo(
            size.width * 0.20,
            size.height * 0.30,
            size.width * 0.14,
            size.height * 0.38,
          )
          ..lineTo(size.width * 0.12, size.height * 0.48)
          ..quadraticBezierTo(
            size.width * 0.14,
            size.height * 0.52,
            size.width * 0.18,
            size.height * 0.54,
          )
          ..lineTo(size.width * 0.24, size.height * 0.36)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'left_elbow':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.16, size.height * 0.42),
          width: size.width * 0.06,
          height: size.height * 0.06,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'left_wrist':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.13, size.height * 0.50),
          width: size.width * 0.04,
          height: size.height * 0.03,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'left_hand':
        final path = Path()
          ..moveTo(size.width * 0.11, size.height * 0.52)
          ..lineTo(size.width * 0.11, size.height * 0.58)
          ..lineTo(size.width * 0.17, size.height * 0.58)
          ..lineTo(size.width * 0.17, size.height * 0.54)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'right_arm':
        final path = Path()
          ..moveTo(size.width * 0.67, size.height * 0.24)
          ..quadraticBezierTo(
            size.width * 0.80,
            size.height * 0.30,
            size.width * 0.86,
            size.height * 0.38,
          )
          ..lineTo(size.width * 0.88, size.height * 0.48)
          ..quadraticBezierTo(
            size.width * 0.86,
            size.height * 0.52,
            size.width * 0.82,
            size.height * 0.54,
          )
          ..lineTo(size.width * 0.76, size.height * 0.36)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'right_elbow':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.84, size.height * 0.42),
          width: size.width * 0.06,
          height: size.height * 0.06,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'right_wrist':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.87, size.height * 0.50),
          width: size.width * 0.04,
          height: size.height * 0.03,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'right_hand':
        final path = Path()
          ..moveTo(size.width * 0.83, size.height * 0.52)
          ..lineTo(size.width * 0.83, size.height * 0.58)
          ..lineTo(size.width * 0.89, size.height * 0.58)
          ..lineTo(size.width * 0.89, size.height * 0.54)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'left_thigh':
        final path = Path()
          ..moveTo(size.width * 0.38, size.height * 0.54)
          ..lineTo(size.width * 0.50, size.height * 0.54)
          ..lineTo(size.width * 0.48, size.height * 0.68)
          ..lineTo(size.width * 0.40, size.height * 0.68)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'left_knee':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.44, size.height * 0.70),
          width: size.width * 0.06,
          height: size.height * 0.05,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'left_leg':
        final rect = Rect.fromLTWH(
          size.width * 0.38,
          size.height * 0.74,
          size.width * 0.12,
          size.height * 0.10,
        );
        final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(10));
        canvas.drawRRect(rrect, outerGlowPaint);
        canvas.drawRRect(rrect, mediumGlowPaint);
        canvas.drawRRect(rrect, innerGlowPaint);
        canvas.drawRRect(rrect, fillPaint);
        canvas.drawRRect(rrect, strokePaint);
        canvas.drawRRect(rrect, highlightPaint);
        break;
      case 'left_ankle':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.44, size.height * 0.86),
          width: size.width * 0.04,
          height: size.height * 0.03,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'left_foot':
        final path = Path()
          ..moveTo(size.width * 0.40, size.height * 0.88)
          ..lineTo(size.width * 0.40, size.height * 0.94)
          ..lineTo(size.width * 0.48, size.height * 0.94)
          ..lineTo(size.width * 0.48, size.height * 0.90)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'right_thigh':
        final path = Path()
          ..moveTo(size.width * 0.50, size.height * 0.54)
          ..lineTo(size.width * 0.62, size.height * 0.54)
          ..lineTo(size.width * 0.60, size.height * 0.68)
          ..lineTo(size.width * 0.52, size.height * 0.68)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      case 'right_knee':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.56, size.height * 0.70),
          width: size.width * 0.06,
          height: size.height * 0.05,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'right_leg':
        final rect = Rect.fromLTWH(
          size.width * 0.50,
          size.height * 0.74,
          size.width * 0.12,
          size.height * 0.10,
        );
        final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(10));
        canvas.drawRRect(rrect, outerGlowPaint);
        canvas.drawRRect(rrect, mediumGlowPaint);
        canvas.drawRRect(rrect, innerGlowPaint);
        canvas.drawRRect(rrect, fillPaint);
        canvas.drawRRect(rrect, strokePaint);
        canvas.drawRRect(rrect, highlightPaint);
        break;
      case 'right_ankle':
        final rect = Rect.fromCenter(
          center: Offset(size.width * 0.56, size.height * 0.86),
          width: size.width * 0.04,
          height: size.height * 0.03,
        );
        canvas.drawOval(rect, outerGlowPaint);
        canvas.drawOval(rect, mediumGlowPaint);
        canvas.drawOval(rect, innerGlowPaint);
        canvas.drawOval(rect, fillPaint);
        canvas.drawOval(rect, strokePaint);
        canvas.drawOval(rect, highlightPaint);
        break;
      case 'right_foot':
        final path = Path()
          ..moveTo(size.width * 0.52, size.height * 0.88)
          ..lineTo(size.width * 0.52, size.height * 0.94)
          ..lineTo(size.width * 0.60, size.height * 0.94)
          ..lineTo(size.width * 0.60, size.height * 0.90)
          ..close();
        canvas.drawPath(path, outerGlowPaint);
        canvas.drawPath(path, mediumGlowPaint);
        canvas.drawPath(path, innerGlowPaint);
        canvas.drawPath(path, fillPaint);
        canvas.drawPath(path, strokePaint);
        canvas.drawPath(path, highlightPaint);
        break;
      default:
        break;
    }
  }

  @override
  bool shouldRepaint(_RealisticBodyPartPainter oldDelegate) {
    return oldDelegate.selectedPartIds != selectedPartIds;
  }
}
