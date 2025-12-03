import 'dart:async';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../shared/widgets/role_guard.dart';
import '../../../doctor/data/models/doctor_model.dart';
import '../../data/models/consultation_model.dart';
import '../../data/repositories/consultation_repository.dart';
import '../../data/services/webrtc_service.dart';

/// Consultation Call Screen
///
/// Handles video/voice call with doctor using WebRTC
class ConsultationCallScreen extends StatefulWidget {
  static const routeName = '/consultation/call';

  const ConsultationCallScreen({super.key});

  @override
  State<ConsultationCallScreen> createState() => _ConsultationCallScreenState();
}

class _ConsultationCallScreenState extends State<ConsultationCallScreen> {
  bool _isMuted = false;
  bool _isVideoEnabled = true;
  Duration _callDuration = Duration.zero;
  Timer? _callTimer;
  DateTime? _callStartTime;
  bool _isCallActive = false;
  String? _consultationId;
  String? _userId;
  String? _doctorId;
  final ConsultationRepository _consultationRepository =
      ConsultationRepository();
  final WebRTCService _webrtcService = WebRTCService();
  final SecureStorage _storage = SecureStorage();

  RTCVideoRenderer? _localRenderer;
  RTCVideoRenderer? _remoteRenderer;
  bool _isWebRTCInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeCall();
    });
  }

  @override
  void dispose() {
    _callTimer?.cancel();
    _webrtcService.endCall();
    _localRenderer?.dispose();
    _remoteRenderer?.dispose();
    super.dispose();
  }

  Future<void> _initializeCall() async {
    final arguments =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    _consultationId = arguments?['consultationId'] as String?;
    final doctor = arguments?['doctor'] as DoctorModel?;
    _doctorId = doctor?.id;

    // Initialize video renderers
    _localRenderer = RTCVideoRenderer();
    _remoteRenderer = RTCVideoRenderer();
    await _localRenderer!.initialize();
    await _remoteRenderer!.initialize();

    if (_consultationId != null && _doctorId != null) {
      // Fetch consultation to get patient ID
      try {
        final consultation =
            await _consultationRepository.getConsultation(_consultationId!);
        _userId = consultation['patient']?['id'] as String?;
      } catch (e) {
        // If we can't get consultation, we'll skip WebRTC for now
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not load consultation: ${e.toString()}'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }

    if (_consultationId != null && _userId != null && _doctorId != null) {
      try {
        // Start call in backend
        await _consultationRepository.startCall(_consultationId!);

        // Initialize WebRTC
        final authToken = await _storage.getAccessToken();
        final signalingUrl = AppConstants.baseUrl.replaceAll('/api', '');

        _webrtcService.onRemoteStream = (stream) {
          if (mounted) {
            _remoteRenderer!.srcObject = stream;
            setState(() {});
          }
        };

        _webrtcService.onCallStateChanged = (state) {
          if (mounted) {
            if (state == 'connected') {
              setState(() {
                _isCallActive = true;
                _callStartTime = DateTime.now();
              });
              _startCallTimer();
            }
          }
        };

        _webrtcService.onError = (error) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('WebRTC Error: $error'),
                backgroundColor: AppColors.error,
              ),
            );
          }
        };

        await _webrtcService.initialize(
          consultationId: _consultationId!,
          userId: _userId!,
          otherUserId: _doctorId!,
          signalingServerUrl: signalingUrl,
          authToken: authToken,
        );

        // Start WebRTC call
        await _webrtcService.startCall(
          enableVideo: arguments?['consultationType'] == ConsultationType.video,
          enableAudio: true,
        );

        // Set local stream to renderer
        if (_webrtcService.localStream != null) {
          _localRenderer!.srcObject = _webrtcService.localStream;
        }

        setState(() {
          _isWebRTCInitialized = true;
        });
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to start call: ${e.toString()}'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } else {
      // Fallback: just start timer (for testing)
      setState(() {
        _isCallActive = true;
        _callStartTime = DateTime.now();
      });
      _startCallTimer();
    }
  }

  void _startCallTimer() {
    _callTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted && _callStartTime != null) {
        setState(() {
          _callDuration = DateTime.now().difference(_callStartTime!);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final arguments =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final doctor = arguments?['doctor'] as DoctorModel?;
    final consultationType =
        arguments?['consultationType'] as ConsultationType? ??
            ConsultationType.video;

    return RoleGuard(
      allowedRoles: const ['patient'],
      builder: (guardContext, _) {
        if (doctor == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Error')),
            body: const Center(child: Text('Doctor information not found')),
          );
        }

        return Scaffold(
          backgroundColor: Colors.black,
          body: SafeArea(
            child: Stack(
              children: [
                _buildVideoView(guardContext, doctor, consultationType),
                _buildControlsOverlay(guardContext, doctor, consultationType),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildVideoView(
    BuildContext context,
    DoctorModel doctor,
    ConsultationType type,
  ) {
    // Show WebRTC video if available
    if (_isWebRTCInitialized && type == ConsultationType.video) {
      return Stack(
        children: [
          // Remote video (doctor)
          Positioned.fill(
            child: _remoteRenderer != null &&
                    _webrtcService.remoteStream != null
                ? RTCVideoView(
                    _remoteRenderer!,
                    mirror: false,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  )
                : _buildPlaceholder(doctor),
          ),
          // Local video (patient) - small overlay
          if (_localRenderer != null && _webrtcService.localStream != null)
            Positioned(
              top: 16,
              right: 16,
              child: Container(
                width: 120,
                height: 160,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: RTCVideoView(
                    _localRenderer!,
                    mirror: true,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  ),
                ),
              ),
            ),
          // Call duration overlay
          Positioned(
            top: 16,
            left: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(20),
              ),
              child: _isCallActive
                  ? Text(
                      _formatDuration(_callDuration),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    )
                  : const Text(
                      'Connecting...',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
            ),
          ),
        ],
      );
    }

    // Fallback UI for voice calls or when WebRTC not ready
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryLight,
            ),
            child: doctor.imageUrl != null
                ? ClipOval(
                    child: Image.network(
                      doctor.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Icon(
                        Icons.person_rounded,
                        size: 100,
                        color: AppColors.primary,
                      ),
                    ),
                  )
                : Icon(
                    Icons.person_rounded,
                    size: 100,
                    color: AppColors.primary,
                  ),
          ),
          const SizedBox(height: 24),
          Text(
            doctor.name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            doctor.specialty,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          if (_isCallActive)
            Text(
              _formatDuration(_callDuration),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            )
          else
            const Text(
              'Connecting...',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 16,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder(DoctorModel doctor) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryLight,
            ),
            child: doctor.imageUrl != null
                ? ClipOval(
                    child: Image.network(
                      doctor.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Icon(
                        Icons.person_rounded,
                        size: 100,
                        color: AppColors.primary,
                      ),
                    ),
                  )
                : Icon(
                    Icons.person_rounded,
                    size: 100,
                    color: AppColors.primary,
                  ),
          ),
          const SizedBox(height: 24),
          Text(
            doctor.name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlsOverlay(
    BuildContext context,
    DoctorModel doctor,
    ConsultationType type,
  ) {
    return Column(
      children: [
        // Top Bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.black.withValues(alpha: 0.7),
                Colors.transparent,
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded,
                    color: Colors.white),
                onPressed: () => _handleEndCall(context),
              ),
              Expanded(
                child: Text(
                  'consultation.call.title'.tr(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        const Spacer(),
        // Bottom Controls
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                Colors.black.withValues(alpha: 0.7),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Mute Button
              _buildControlButton(
                context,
                icon: _isMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                label: _isMuted
                    ? 'consultation.call.muted'.tr()
                    : 'consultation.call.mute'.tr(),
                onPressed: () {
                  setState(() => _isMuted = !_isMuted);
                  _webrtcService.toggleMute(_isMuted);
                },
                color: _isMuted ? AppColors.error : Colors.white,
              ),
              // Video Toggle (only for video calls)
              if (type == ConsultationType.video)
                _buildControlButton(
                  context,
                  icon: _isVideoEnabled
                      ? Icons.videocam_rounded
                      : Icons.videocam_off_rounded,
                  label: _isVideoEnabled
                      ? 'consultation.call.video_on'.tr()
                      : 'consultation.call.video_off'.tr(),
                  onPressed: () {
                    setState(() => _isVideoEnabled = !_isVideoEnabled);
                    _webrtcService.toggleVideo(_isVideoEnabled);
                  },
                  color: _isVideoEnabled ? Colors.white : AppColors.error,
                ),
              // End Call Button
              _buildControlButton(
                context,
                icon: Icons.call_end_rounded,
                label: 'consultation.call.end'.tr(),
                onPressed: () => _handleEndCall(context),
                color: AppColors.error,
                isLarge: true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildControlButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    required Color color,
    bool isLarge = false,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: isLarge ? 64 : 56,
          height: isLarge ? 64 : 56,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.3),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: IconButton(
            icon: Icon(icon, color: Colors.white, size: isLarge ? 28 : 24),
            onPressed: onPressed,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Future<void> _handleEndCall(BuildContext context) async {
    final shouldEnd = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('consultation.call.end.title'.tr()),
        content: Text('consultation.call.end.message'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('consultation.call.end.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              'consultation.call.end.confirm'.tr(),
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (shouldEnd == true) {
      _callTimer?.cancel();
      await _webrtcService.endCall();

      if (_consultationId != null) {
        try {
          await _consultationRepository.endCall(
            _consultationId!,
            durationSeconds: _callDuration.inSeconds,
          );

          // Get call summary (with transcript if available)
          // Note: In a real implementation, you would capture the call transcript
          // from the WebRTC service or speech-to-text during the call
          final summary = await _consultationRepository.getCallSummary(
            _consultationId!,
            transcript:
                null, // TODO: Pass actual transcript from call recording
          );

          if (mounted) {
            final callArguments = ModalRoute.of(context)?.settings.arguments
                as Map<String, dynamic>?;
            Navigator.of(context).pop();
            Navigator.of(context).pushNamed(
              '/consultation/summary',
              arguments: {
                'summary': {
                  ...summary,
                  'id': _consultationId,
                  'consultationId': _consultationId,
                },
                'doctor': callArguments?['doctor'],
              },
            );
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Error ending call: ${e.toString()}'),
                backgroundColor: AppColors.error,
              ),
            );
            Navigator.of(context).pop();
          }
        }
      } else {
        if (mounted) {
          Navigator.of(context).pop();
        }
      }
    }
  }
}
