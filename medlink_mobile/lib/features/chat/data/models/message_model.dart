enum MessageType {
  text,
  image,
  file,
  system,
}

class MessageModel {
  final String id;
  final String content;
  final MessageType type;
  final String senderId;
  final String senderName;
  final String senderType; // 'user' or 'doctor'
  final String? recipientId;
  final DateTime createdAt;
  final bool isRead;
  final DateTime? readAt;

  const MessageModel({
    required this.id,
    required this.content,
    required this.type,
    required this.senderId,
    required this.senderName,
    required this.senderType,
    this.recipientId,
    required this.createdAt,
    required this.isRead,
    this.readAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] as String,
      content: json['content'] as String,
      type: MessageType.values.firstWhere(
        (e) => e.toString().split('.').last == json['type'],
        orElse: () => MessageType.text,
      ),
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String,
      senderType: json['senderType'] as String,
      recipientId: json['recipientId'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isRead: json['isRead'] as bool? ?? false,
      readAt: json['readAt'] != null
          ? DateTime.parse(json['readAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'type': type.toString().split('.').last,
        'senderId': senderId,
        'senderName': senderName,
        'senderType': senderType,
        'recipientId': recipientId,
        'createdAt': createdAt.toIso8601String(),
        'isRead': isRead,
        'readAt': readAt?.toIso8601String(),
      };
}
