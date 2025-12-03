import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/phone_validator.dart';
import '../../../../shared/widgets/role_guard.dart';
import '../../../consultation/data/models/consultation_model.dart';
import '../../../doctor/data/models/doctor_model.dart';
import '../../../queue/presentation/screens/queue_screen.dart';
import '../../data/models/payment_model.dart';
import '../../data/repositories/payment_repository.dart';

/// Payment Screen
///
/// Allows user to select payment method and complete payment
class PaymentScreen extends StatefulWidget {
  static const routeName = '/payment';

  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  PaymentMethod? _selectedMethod;
  final TextEditingController _phoneController = TextEditingController();
  bool _isProcessing = false;
  String? _errorMessage;
  final PaymentRepository _paymentRepository = PaymentRepository();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  bool _isValidGhanaPhoneNumber(String phone) {
    if (phone.trim().isEmpty) return false;
    // Use the centralized phone validator utility
    // This automatically handles +233 and 0 prefix conversion
    return PhoneValidator.isValidGhanaPhoneNumber(phone);
  }

  @override
  Widget build(BuildContext context) {
    final arguments =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final doctor = arguments?['doctor'] as DoctorModel?;
    final consultationType =
        arguments?['consultationType'] as ConsultationType? ??
            ConsultationType.video;
    final amount = arguments?['amount'] as double? ?? 0.0;
    final consultationFee = arguments?['consultationFee'] as double? ?? 0.0;
    final platformFee = arguments?['platformFee'] as double? ?? 0.0;
    final consultationId = arguments?['consultationId'] as String?;

    return RoleGuard(
      allowedRoles: const ['patient'],
      builder: (guardContext, _) {
        if (doctor == null || consultationId == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Error')),
            body: const Center(
              child: Text('Missing consultation information'),
            ),
          );
        }

        final theme = Theme.of(context);
        final isDark = theme.brightness == Brightness.dark;

        return Scaffold(
          backgroundColor:
              isDark ? const Color(0xFF0F172A) : AppColors.background,
          appBar: AppBar(
            title: const Text('Payment'),
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          body: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildPaymentSummary(
                    guardContext, amount, consultationFee, platformFee),
                const SizedBox(height: 16),
                _buildPaymentMethodSection(guardContext),
                const SizedBox(height: 16),
                if (_selectedMethod == PaymentMethod.mobileMoney)
                  _buildMobileMoneyInput(guardContext),
                const SizedBox(height: 24),
                _buildPayButton(
                  guardContext,
                  doctor,
                  consultationType,
                  amount,
                  consultationId,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPaymentSummary(
    BuildContext context,
    double total,
    double consultationFee,
    double platformFee,
  ) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Summary',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 16),
          _buildSummaryRow(
            context,
            'Consultation Fee',
            'GHS ${consultationFee.toStringAsFixed(2)}',
            isDark: isDark,
          ),
          _buildSummaryRow(
            context,
            'Platform Fee',
            'GHS ${platformFee.toStringAsFixed(2)}',
            isDark: isDark,
          ),
          const Divider(height: 24),
          _buildSummaryRow(
            context,
            'Total',
            'GHS ${total.toStringAsFixed(2)}',
            isTotal: true,
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(
    BuildContext context,
    String label,
    String amount, {
    bool isTotal = false,
    bool isDark = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                  fontSize: isTotal ? 16 : 14,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          Text(
            amount,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: isTotal ? 18 : 14,
                  color: isTotal
                      ? AppColors.primary
                      : (isDark ? Colors.white : AppColors.textPrimary),
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodSection(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Method',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 16),
          _buildMethodOption(
            context,
            PaymentMethod.mobileMoney,
            Icons.phone_android_rounded,
            'Mobile Money',
            'Pay with MTN, Vodafone, or AirtelTigo',
          ),
          const SizedBox(height: 12),
          _buildMethodOption(
            context,
            PaymentMethod.card,
            Icons.credit_card_rounded,
            'Credit/Debit Card',
            'Pay with Visa or Mastercard',
          ),
        ],
      ),
    );
  }

  Widget _buildMethodOption(
    BuildContext context,
    PaymentMethod method,
    IconData icon,
    String title,
    String description,
  ) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isSelected = _selectedMethod == method;

    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = method),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryLight.withValues(alpha: 0.1)
              : (isDark ? const Color(0xFF334155) : AppColors.inputBackground),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primaryLight
                    : (isDark
                        ? const Color(0xFF475569)
                        : AppColors.inputBackground),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: isSelected
                    ? AppColors.primary
                    : (isDark ? Colors.white70 : AppColors.textSecondary),
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? AppColors.primary
                              : (isDark ? Colors.white : AppColors.textPrimary),
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color:
                              isDark ? Colors.white60 : AppColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle_rounded,
                color: AppColors.primary,
                size: 24,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileMoneyInput(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Phone Number',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            maxLength: 16, // Allow +233 format (+233XX XXX XXXX)
            style:
                TextStyle(color: isDark ? Colors.white : AppColors.textPrimary),
            onChanged: (value) {
              setState(() {}); // Update button state when phone number changes
            },
            decoration: InputDecoration(
              hintText: '0XX XXX XXXX or +233XX XXX XXXX',
              hintStyle: TextStyle(
                  color: isDark ? Colors.white60 : AppColors.textTertiary),
              prefixIcon: Icon(Icons.phone_rounded,
                  color: isDark ? Colors.white70 : AppColors.textSecondary),
              filled: true,
              fillColor: isDark ? const Color(0xFF334155) : Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.primary, width: 2),
              ),
              counterText: '', // Hide character counter
            ),
          ),
          if (_selectedMethod == PaymentMethod.mobileMoney &&
              _phoneController.text.trim().isNotEmpty &&
              !_isValidGhanaPhoneNumber(_phoneController.text.trim())) ...[
            const SizedBox(height: 8),
            Text(
              'Please enter a valid Ghana phone number (0XX XXX XXXX or +233XX XXX XXXX)',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.error,
                  ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPayButton(
    BuildContext context,
    DoctorModel doctor,
    ConsultationType consultationType,
    double amount,
    String consultationId,
  ) {
    final phoneNumber = _phoneController.text.trim();
    final isValidPhone = _selectedMethod != PaymentMethod.mobileMoney ||
        (phoneNumber.isNotEmpty && _isValidGhanaPhoneNumber(phoneNumber));
    final canPay = _selectedMethod != null && isValidPhone;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ElevatedButton(
            onPressed: canPay && !_isProcessing
                ? () => _handlePayment(
                      context,
                      doctor,
                      consultationType,
                      amount,
                      consultationId,
                    )
                : null,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 18),
              backgroundColor: canPay ? AppColors.primary : AppColors.border,
              foregroundColor: canPay ? Colors.white : AppColors.textTertiary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: canPay ? 4 : 0,
            ),
            child: _isProcessing
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'payment.pay'.tr(),
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: canPay
                                      ? Colors.white
                                      : AppColors.textTertiary,
                                ),
                      ),
                      if (canPay) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.lock_rounded, size: 20),
                      ],
                    ],
                  ),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              _errorMessage!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.error,
                    fontWeight: FontWeight.w600,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  String _normalizePhoneNumber(String phone) {
    // First normalize to 0-prefix format (handles +233 conversion)
    final normalized = PhoneValidator.normalizePhoneNumber(phone);
    final digitsOnly = normalized.replaceAll(RegExp(r'[^\d]'), '');

    // Convert to format: 233XXXXXXXXX (with country code for Paystack)
    if (digitsOnly.length == 10 && digitsOnly.startsWith('0')) {
      // Format: 0XX XXX XXXX -> 233XX XXX XXXX
      return '233${digitsOnly.substring(1)}';
    } else if (digitsOnly.length == 9) {
      // Format: XX XXX XXXX -> 233XX XXX XXXX
      return '233$digitsOnly';
    } else if (digitsOnly.length == 12 && digitsOnly.startsWith('233')) {
      // Already in correct format (233XXXXXXXXX)
      return digitsOnly;
    }
    // Return as-is if format is unexpected (let backend handle validation)
    return digitsOnly;
  }

  Future<void> _handlePayment(
    BuildContext context,
    DoctorModel doctor,
    ConsultationType consultationType,
    double amount,
    String consultationId,
  ) async {
    // Validate phone number if mobile money
    if (_selectedMethod == PaymentMethod.mobileMoney) {
      final phoneNumber = _phoneController.text.trim();
      if (!_isValidGhanaPhoneNumber(phoneNumber)) {
        setState(() {
          _errorMessage = 'Please enter a valid 10-digit Ghana phone number';
        });
        return;
      }
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      // Normalize phone number for Paystack
      final normalizedPhone = _selectedMethod == PaymentMethod.mobileMoney
          ? _normalizePhoneNumber(_phoneController.text.trim())
          : null;

      // Initialize payment and get authorization URL
      final paymentData = await _paymentRepository.initializePayment(
        consultationId: consultationId,
        amount: amount,
        method: _selectedMethod!,
        mobileMoneyNumber: normalizedPhone,
      );

      final authorizationUrl = paymentData['authorizationUrl'] as String;
      final reference = paymentData['reference'] as String;

      // Open Paystack checkout
      final opened = await _paymentRepository.openPaymentUrl(authorizationUrl);
      if (!opened) {
        throw Exception('Failed to open payment page');
      }

      // Show loading message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Please complete payment in the browser...'),
            duration: const Duration(seconds: 3),
          ),
        );
      }

      // Poll for payment verification
      final queueEntry = await _paymentRepository.pollForPaymentVerification(
        reference,
        maxAttempts: 60, // 2 minutes max
        interval: const Duration(seconds: 2),
      );

      if (!mounted) return;
      setState(() => _isProcessing = false);

      Navigator.of(context).pushReplacementNamed(
        QueueScreen.routeName,
        arguments: {
          'doctor': doctor,
          'consultationType': consultationType,
          'queueEntry': queueEntry,
          'consultationId': consultationId,
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _errorMessage = e.toString().contains('timeout')
              ? 'Payment verification timeout. Please check your payment status.'
              : 'payment.error'.tr();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_errorMessage ?? 'payment.error'.tr()),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }
}
