import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/message_model.dart';
import '../../../../core/storage/secure_storage.dart';

class ChatService {
  IO.Socket? _socket;
  final SecureStorage _secureStorage = SecureStorage();
  bool _isConnected = false;

  // Stream controllers
  final _messageController = StreamController<MessageModel>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  Stream<MessageModel> get messageStream => _messageController.stream;
  Stream<Map<String, dynamic>> get typingStream => _typingController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;

  bool get isConnected => _isConnected;

  Future<void> connect(String baseUrl) async {
    if (_socket != null && _socket!.connected) {
      return;
    }

    try {
      final token = await _secureStorage.getAccessToken();
      if (token == null) {
        throw Exception('No access token found');
      }

      // User ID will be set when needed from the context

      _socket = IO.io(
        '$baseUrl/messages',
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .setAuth({'token': token})
            .setExtraHeaders({'Authorization': 'Bearer $token'})
            .enableAutoConnect()
            .build(),
      );

      _socket!.onConnect((_) {
        _isConnected = true;
        _connectionController.add(true);
      });

      _socket!.onDisconnect((_) {
        _isConnected = false;
        _connectionController.add(false);
      });

      _socket!.on('new_message', (data) {
        try {
          final message = MessageModel.fromJson(data as Map<String, dynamic>);
          _messageController.add(message);
        } catch (e) {
          // Handle error
        }
      });

      _socket!.on('user_typing', (data) {
        _typingController.add(data as Map<String, dynamic>);
      });

      _socket!.onError((error) {
        // Handle error
      });
    } catch (e) {
      // Handle connection error
    }
  }

  Future<void> sendMessage({
    required String content,
    String? recipientId,
    String? consultationId,
  }) async {
    if (_socket == null || !_isConnected) {
      throw Exception('Not connected to chat server');
    }

    _socket!.emit('send_message', {
      'content': content,
      if (recipientId != null) 'recipientId': recipientId,
      if (consultationId != null) 'consultationId': consultationId,
    });
  }

  void sendTyping(String recipientId, bool isTyping) {
    if (_socket == null || !_isConnected) return;

    _socket!.emit('typing', {
      'recipientId': recipientId,
      'isTyping': isTyping,
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _typingController.close();
    _connectionController.close();
  }
}
