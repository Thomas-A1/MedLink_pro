import 'dart:async';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

/// WebRTC Service for real video/voice calls
class WebRTCService {
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  IO.Socket? _socket;
  String? _consultationId;
  String? _userId;
  String? _otherUserId;
  bool _isInitialized = false;

  // Callbacks
  Function(MediaStream)? onRemoteStream;
  Function(String)? onCallStateChanged;
  Function(String)? onError;

  /// Initialize WebRTC connection
  Future<void> initialize({
    required String consultationId,
    required String userId,
    required String otherUserId,
    required String signalingServerUrl,
    String? authToken,
  }) async {
    _consultationId = consultationId;
    _userId = userId;
    _otherUserId = otherUserId;

    try {
      // Initialize Socket.IO for signaling
      _socket = IO.io(
        signalingServerUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .setAuth({
              'token': authToken,
            })
            .setExtraHeaders({
              if (authToken != null) 'Authorization': 'Bearer $authToken',
            })
            .build(),
      );

      _socket!.onConnect((_) {
        _socket!.emit('join-room', {
          'consultationId': consultationId,
          'userId': userId,
        });
      });

      _socket!.on('offer', (data) async {
        await _handleOffer(data);
      });

      _socket!.on('answer', (data) async {
        await _handleAnswer(data);
      });

      _socket!.on('ice-candidate', (data) async {
        await _handleIceCandidate(data);
      });

      _socket!.on('call-ended', (_) {
        onCallStateChanged?.call('ended');
      });

      // Create peer connection
      final configuration = {
        'iceServers': [
          {
            'urls': [
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302',
            ]
          },
        ],
      };
      _peerConnection = await createPeerConnection(configuration);

      _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
        _socket!.emit('ice-candidate', {
          'consultationId': consultationId,
          'candidate': candidate.toMap(),
        });
      };

      _peerConnection!.onAddStream = (MediaStream stream) {
        _remoteStream = stream;
        onRemoteStream?.call(stream);
      };

      _isInitialized = true;
    } catch (e) {
      onError?.call('Failed to initialize WebRTC: ${e.toString()}');
    }
  }

  /// Start call with video/audio
  Future<void> startCall({
    required bool enableVideo,
    required bool enableAudio,
  }) async {
    if (!_isInitialized || _peerConnection == null) {
      throw Exception('WebRTC not initialized');
    }

    try {
      // Get user media
      final Map<String, dynamic> constraints = {
        'audio': enableAudio,
      };
      if (enableVideo) {
        constraints['video'] = {
          'facingMode': 'user',
          'width': {'ideal': 1280},
          'height': {'ideal': 720},
        };
      }
      _localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Add local stream to peer connection
      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      // Create and send offer
      final offer = await _peerConnection!.createOffer();
      await _peerConnection!.setLocalDescription(offer);

      _socket!.emit('offer', {
        'consultationId': _consultationId,
        'offer': offer.toMap(),
        'from': _userId,
        'to': _otherUserId,
      });

      onCallStateChanged?.call('connecting');
    } catch (e) {
      onError?.call('Failed to start call: ${e.toString()}');
      rethrow;
    }
  }

  /// Answer incoming call
  Future<void> answerCall() async {
    if (!_isInitialized || _peerConnection == null) {
      throw Exception('WebRTC not initialized');
    }

    try {
      // Get user media
      _localStream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': {
          'facingMode': 'user',
          'width': {'ideal': 1280},
          'height': {'ideal': 720},
        },
      });

      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      onCallStateChanged?.call('connected');
    } catch (e) {
      onError?.call('Failed to answer call: ${e.toString()}');
      rethrow;
    }
  }

  /// Toggle mute
  Future<void> toggleMute(bool mute) async {
    _localStream?.getAudioTracks().forEach((track) {
      track.enabled = !mute;
    });
  }

  /// Toggle video
  Future<void> toggleVideo(bool enable) async {
    _localStream?.getVideoTracks().forEach((track) {
      track.enabled = enable;
    });
  }

  /// End call
  Future<void> endCall() async {
    _localStream?.getTracks().forEach((track) {
      track.stop();
    });
    await _peerConnection?.close();
    _socket?.emit('end-call', {
      'consultationId': _consultationId,
      'userId': _userId,
    });
    _socket?.disconnect();
    _isInitialized = false;
  }

  Future<void> _handleOffer(dynamic data) async {
    try {
      final offerData = data['offer'] as Map<String, dynamic>;
      final offer = RTCSessionDescription(
        offerData['sdp'] as String,
        offerData['type'] as String,
      );
      await _peerConnection!.setRemoteDescription(offer);

      // Create answer
      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);

      _socket!.emit('answer', {
        'consultationId': _consultationId,
        'answer': answer.toMap(),
        'from': _userId,
        'to': _otherUserId,
      });
    } catch (e) {
      onError?.call('Failed to handle offer: ${e.toString()}');
    }
  }

  Future<void> _handleAnswer(dynamic data) async {
    try {
      final answerData = data['answer'] as Map<String, dynamic>;
      final answer = RTCSessionDescription(
        answerData['sdp'] as String,
        answerData['type'] as String,
      );
      await _peerConnection!.setRemoteDescription(answer);
      onCallStateChanged?.call('connected');
    } catch (e) {
      onError?.call('Failed to handle answer: ${e.toString()}');
    }
  }

  Future<void> _handleIceCandidate(dynamic data) async {
    try {
      final candidateData = data['candidate'] as Map<String, dynamic>;
      final candidate = RTCIceCandidate(
        candidateData['candidate'] as String,
        candidateData['sdpMid'] as String?,
        candidateData['sdpMLineIndex'] as int?,
      );
      await _peerConnection!.addCandidate(candidate);
    } catch (e) {
      onError?.call('Failed to handle ICE candidate: ${e.toString()}');
    }
  }

  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  bool get isInitialized => _isInitialized;
}
