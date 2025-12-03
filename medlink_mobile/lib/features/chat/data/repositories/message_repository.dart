import '../../../../core/network/api_client.dart';
import '../models/message_model.dart';

class MessageRepository {
  final ApiClient _apiClient;

  MessageRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  /// Send a message
  Future<MessageModel> sendMessage({
    required String content,
    String? recipientId,
    String? consultationId,
  }) async {
    final response = await _apiClient.post(
      '/messages',
      data: {
        'content': content,
        if (recipientId != null) 'recipientId': recipientId,
        if (consultationId != null) 'consultationId': consultationId,
      },
    );

    final data = response.data['data'] as Map<String, dynamic>;
    // Note: The create endpoint doesn't return full message, so we'll need to fetch it
    // For now, return a minimal model
    return MessageModel(
      id: data['id'] as String,
      content: data['content'] as String,
      type: MessageType.text,
      senderId: '', // Will be set from current user
      senderName: '',
      senderType: 'user',
      createdAt: DateTime.parse(data['createdAt'] as String),
      isRead: false,
    );
  }

  /// Get conversation messages
  Future<Map<String, dynamic>> getConversation(
    String otherId, {
    String? consultationId,
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await _apiClient.get(
      '/messages/conversations/$otherId',
      queryParameters: {
        if (consultationId != null) 'consultationId': consultationId,
        'limit': limit,
        'offset': offset,
      },
    );

    final data = response.data['data'] as Map<String, dynamic>;
    return {
      'messages': (data['messages'] as List<dynamic>)
          .map((m) => MessageModel.fromJson(m as Map<String, dynamic>))
          .toList(),
      'total': data['total'] as int,
      'limit': data['limit'] as int,
      'offset': data['offset'] as int,
    };
  }

  /// Get all conversations
  Future<List<Map<String, dynamic>>> getConversations() async {
    final response = await _apiClient.get('/messages/conversations');
    final data = response.data['data'] as List<dynamic>;
    return data.map((c) => c as Map<String, dynamic>).toList();
  }

  /// Mark message as read
  Future<void> markAsRead(String messageId) async {
    await _apiClient.patch('/messages/$messageId/read');
  }
}
