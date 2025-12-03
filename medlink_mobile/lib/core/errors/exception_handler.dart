import 'package:dio/dio.dart';
import 'failures.dart';

Failure handleException(dynamic exception) {
  if (exception is DioException) {
    return _handleDioException(exception);
  } else if (exception is FormatException) {
    return ValidationFailure('Invalid data format: ${exception.message}');
  } else {
    return UnknownFailure(
      exception.toString(),
      code: 'UNKNOWN_ERROR',
    );
  }
}

Failure _handleDioException(DioException exception) {
  switch (exception.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return NetworkFailure(
        'Connection timeout. Please check your internet connection.',
        code: 'TIMEOUT',
      );

    case DioExceptionType.badResponse:
      final statusCode = exception.response?.statusCode;
      final message = exception.response?.data?['message'] ??
          exception.response?.data?['error'] ??
          'An error occurred';

      if (statusCode == 401) {
        return AuthenticationFailure(
          message.toString(),
          code: 'UNAUTHORIZED',
        );
      } else if (statusCode == 403) {
        return AuthenticationFailure(
          'Access forbidden',
          code: 'FORBIDDEN',
        );
      } else if (statusCode == 404) {
        return ServerFailure(
          'Resource not found',
          code: 'NOT_FOUND',
        );
      } else if (statusCode != null && statusCode >= 500) {
        return ServerFailure(
          'Server error. Please try again later.',
          code: 'SERVER_ERROR',
        );
      } else {
        return ServerFailure(
          message.toString(),
          code: statusCode?.toString(),
        );
      }

    case DioExceptionType.cancel:
      return NetworkFailure(
        'Request cancelled',
        code: 'CANCELLED',
      );

    case DioExceptionType.connectionError:
      // Provide more helpful error message
      final requestUrl = exception.requestOptions.uri.toString();
      return NetworkFailure(
        'Cannot connect to server. Please ensure:\n'
        '1. Backend server is running on port 4100\n'
        '2. Your device and Mac are on the same network\n'
        '3. Firewall allows connections\n'
        'Server URL: $requestUrl',
        code: 'NO_CONNECTION',
      );

    default:
      return NetworkFailure(
        'Network error occurred',
        code: 'NETWORK_ERROR',
      );
  }
}
