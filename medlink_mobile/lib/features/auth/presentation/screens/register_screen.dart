import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/utils/phone_validator.dart';
import '../../../../shared/widgets/language_toggle.dart';
import '../../data/repositories/auth_repository.dart';
import 'verify_otp_screen.dart';

enum UserRole { patient, doctor }

class RegisterScreen extends ConsumerStatefulWidget {
  static const routeName = '/register';

  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _pageController = PageController();
  int _currentStep = 0;
  UserRole? _selectedRole;

  // Step 1: Role Selection
  final _roleFormKey = GlobalKey<FormState>();

  // Step 2: Basic Info
  final _basicInfoFormKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  // Step 3: Password
  final _passwordFormKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  // Step 4: Additional Info (for patients)
  final _additionalInfoFormKey = GlobalKey<FormState>();
  DateTime? _dateOfBirth;
  String? _gender;
  final _regionController = TextEditingController();
  final _districtController = TextEditingController();

  bool _isLoading = false;
  final _authRepository = AuthRepository();

  @override
  void dispose() {
    _pageController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _regionController.dispose();
    _districtController.dispose();
    super.dispose();
  }

  void _nextStep() {
    bool isValid = false;
    switch (_currentStep) {
      case 0:
        isValid = _roleFormKey.currentState?.validate() ?? false;
        break;
      case 1:
        isValid = _basicInfoFormKey.currentState?.validate() ?? false;
        break;
      case 2:
        isValid = _passwordFormKey.currentState?.validate() ?? false;
        break;
      case 3:
        if (_selectedRole == UserRole.patient) {
          isValid = _additionalInfoFormKey.currentState?.validate() ?? false;
        } else {
          isValid = true; // Skip for doctors
        }
        break;
    }

    if (isValid) {
      if (_currentStep < (_selectedRole == UserRole.patient ? 3 : 2)) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
        setState(() {
          _currentStep++;
        });
      } else {
        _handleRegister();
      }
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() {
        _currentStep--;
      });
    }
  }

  Future<void> _handleRegister() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final role = _selectedRole == UserRole.patient ? 'patient' : 'doctor';

      // Normalize phone number before sending
      final normalizedPhone = PhoneValidator.normalizePhoneNumber(
        _phoneController.text.trim(),
      );

      await _authRepository.register(
        role: role,
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phoneNumber: normalizedPhone,
        email: _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
        password: _passwordController.text,
        dateOfBirth: _dateOfBirth,
        gender: _gender,
        region: _regionController.text.trim().isEmpty
            ? null
            : _regionController.text.trim(),
        district: _districtController.text.trim().isEmpty
            ? null
            : _districtController.text.trim(),
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        // Navigate to OTP verification screen
        if (mounted) {
          Navigator.of(context).pushReplacementNamed(
            VerifyOtpScreen.routeName,
            arguments: VerifyOtpScreen(
              phoneNumber: _phoneController.text.trim(),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        String errorMessage = 'An error occurred. Please try again.';
        if (e is Failure) {
          errorMessage = e.message;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('register.title'.tr()),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: LanguageToggle(compact: true),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress Indicator
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: List.generate(
                  _selectedRole == UserRole.patient ? 4 : 3,
                  (index) => Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(
                        right:
                            index < (_selectedRole == UserRole.patient ? 3 : 2)
                                ? 8
                                : 0,
                      ),
                      decoration: BoxDecoration(
                        color: index <= _currentStep
                            ? AppColors.primary
                            : AppColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // Form Pages
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildRoleSelectionStep(),
                  _buildBasicInfoStep(),
                  _buildPasswordStep(),
                  if (_selectedRole == UserRole.patient)
                    _buildAdditionalInfoStep(),
                ],
              ),
            ),

            // Navigation Buttons
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  if (_currentStep > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _previousStep,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Text('register.button_previous'.tr()),
                      ),
                    ),
                  if (_currentStep > 0) const SizedBox(width: 16),
                  Expanded(
                    flex: _currentStep > 0 ? 1 : 2,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _nextStep,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              _currentStep ==
                                      (_selectedRole == UserRole.patient
                                          ? 3
                                          : 2)
                                  ? 'register.button_submit'.tr()
                                  : 'register.button_next'.tr(),
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleSelectionStep() {
    return Form(
      key: _roleFormKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 20),
            Text(
              'register.role_heading'.tr(),
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'register.role_subtitle'.tr(),
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),
            FormField<UserRole>(
              validator: (_) => _selectedRole == null
                  ? 'register.role_validation'.tr()
                  : null,
              builder: (field) {
                void selectRole(UserRole role) {
                  setState(() {
                    _selectedRole = role;
                  });
                  field.didChange(role);
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _RoleCard(
                      title: 'register.role_patient_title'.tr(),
                      description: 'register.role_patient_desc'.tr(),
                      icon: Icons.person,
                      color: AppColors.primary,
                      isSelected: _selectedRole == UserRole.patient,
                      onTap: () => selectRole(UserRole.patient),
                    ),
                    const SizedBox(height: 16),
                    _RoleCard(
                      title: 'register.role_doctor_title'.tr(),
                      description: 'register.role_doctor_desc'.tr(),
                      icon: Icons.medical_services,
                      color: AppColors.success,
                      isSelected: _selectedRole == UserRole.doctor,
                      onTap: () => selectRole(UserRole.doctor),
                    ),
                    if (field.hasError) ...[
                      const SizedBox(height: 24),
                      Text(
                        field.errorText!,
                        style: TextStyle(
                          color: AppColors.error,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBasicInfoStep() {
    return Form(
      key: _basicInfoFormKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'register.step_basic_title'.tr(),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'register.step_basic_subtitle'.tr(),
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 32),
            // First Name
            TextFormField(
              controller: _firstNameController,
              decoration: InputDecoration(
                labelText: 'register.first_name_label'.tr(),
                hintText: 'register.first_name_hint'.tr(),
                prefixIcon: const Icon(Icons.person_outline),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'register.first_name_error'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            // Last Name
            TextFormField(
              controller: _lastNameController,
              decoration: InputDecoration(
                labelText: 'register.last_name_label'.tr(),
                hintText: 'register.last_name_hint'.tr(),
                prefixIcon: const Icon(Icons.person_outline),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'register.last_name_error'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            // Phone Number
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'register.phone_label'.tr(),
                hintText: 'register.phone_hint'.tr(),
                prefixIcon: const Icon(Icons.phone_outlined),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'register.phone_error'.tr();
                }
                if (!PhoneValidator.isValidGhanaPhoneNumber(value)) {
                  return 'register.phone_error_invalid'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            // Email (Optional)
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'register.email_label'.tr(),
                hintText: 'register.email_hint'.tr(),
                prefixIcon: const Icon(Icons.email_outlined),
              ),
              validator: (value) {
                if (value != null && value.isNotEmpty) {
                  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                      .hasMatch(value)) {
                    return 'register.email_error'.tr();
                  }
                }
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordStep() {
    return Form(
      key: _passwordFormKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'register.step_password_title'.tr(),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'register.step_password_subtitle'.tr(),
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 32),
            // Password
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: 'register.password_label'.tr(),
                hintText: 'register.password_hint'.tr(),
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'register.password_error'.tr();
                }
                if (value.length < 8) {
                  return 'register.password_error_length'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            // Confirm Password
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: _obscureConfirmPassword,
              decoration: InputDecoration(
                labelText: 'register.confirm_password_label'.tr(),
                hintText: 'register.confirm_password_hint'.tr(),
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureConfirmPassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscureConfirmPassword = !_obscureConfirmPassword;
                    });
                  },
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'register.confirm_password_error'.tr();
                }
                if (value != _passwordController.text) {
                  return 'register.confirm_password_error'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            // Password Requirements
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'register.password_requirement_title'.tr(),
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _PasswordRequirement(
                    text: 'register.password_requirement_length'.tr(),
                    isValid: _passwordController.text.length >= 8,
                  ),
                  _PasswordRequirement(
                    text: 'register.password_requirement_mix'.tr(),
                    isValid: RegExp(r'^(?=.*[A-Za-z])(?=.*\d)')
                        .hasMatch(_passwordController.text),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdditionalInfoStep() {
    return Form(
      key: _additionalInfoFormKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'register.additional_info_title'.tr(),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'register.additional_info_subtitle'.tr(),
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 32),
            // Date of Birth
            GestureDetector(
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now().subtract(
                    const Duration(days: 365 * 25),
                  ),
                  firstDate: DateTime(1900),
                  lastDate: DateTime.now(),
                  builder: (context, child) {
                    final theme = Theme.of(context);
                    return Theme(
                      data: theme.copyWith(
                        colorScheme: theme.colorScheme.copyWith(
                          primary: AppColors.primary,
                        ),
                      ),
                      child: child ?? const SizedBox.shrink(),
                    );
                  },
                );
                if (date != null) {
                  setState(() => _dateOfBirth = date);
                }
              },
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: 'register.dob_label'.tr(),
                  prefixIcon: const Icon(Icons.calendar_month_outlined),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _dateOfBirth != null
                          ? '${_dateOfBirth!.day.toString().padLeft(2, '0')}/${_dateOfBirth!.month.toString().padLeft(2, '0')}/${_dateOfBirth!.year}'
                          : 'register.dob_hint'.tr(),
                      style: TextStyle(
                        color: _dateOfBirth != null
                            ? AppColors.textPrimary
                            : AppColors.textTertiary,
                      ),
                    ),
                    const Icon(Icons.expand_more,
                        color: AppColors.textSecondary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Gender
            DropdownButtonFormField<String>(
              value: _gender,
              decoration: InputDecoration(
                labelText: 'register.gender_label'.tr(),
                prefixIcon: const Icon(Icons.person_outline),
              ),
              items: [
                {'value': 'male', 'label': 'register.gender.male'.tr()},
                {'value': 'female', 'label': 'register.gender.female'.tr()},
                {'value': 'other', 'label': 'register.gender.other'.tr()},
                {'value': 'prefer', 'label': 'register.gender.prefer'.tr()},
              ]
                  .map(
                    (gender) => DropdownMenuItem(
                      value: gender['value'],
                      child: Text(gender['label']!),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  _gender = value;
                });
              },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'register.gender_error'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            // Region
            TextFormField(
              controller: _regionController,
              decoration: InputDecoration(
                labelText: 'register.region_label'.tr(),
                hintText: 'register.region_hint'.tr(),
                prefixIcon: const Icon(Icons.location_on_outlined),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'register.region_error'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            // District
            TextFormField(
              controller: _districtController,
              decoration: InputDecoration(
                labelText: 'register.district_label'.tr(),
                hintText: 'register.district_hint'.tr(),
                prefixIcon: const Icon(Icons.location_city_outlined),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'register.district_error'.tr();
                }
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: color.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isSelected ? color : AppColors.textPrimary,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ),
            if (isSelected) Icon(Icons.check_circle, color: color, size: 28),
          ],
        ),
      ),
    );
  }
}

class _PasswordRequirement extends StatelessWidget {
  final String text;
  final bool isValid;

  const _PasswordRequirement({
    required this.text,
    required this.isValid,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(
            isValid ? Icons.check_circle : Icons.circle_outlined,
            size: 16,
            color: isValid ? AppColors.success : AppColors.textTertiary,
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: isValid ? AppColors.success : AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}
