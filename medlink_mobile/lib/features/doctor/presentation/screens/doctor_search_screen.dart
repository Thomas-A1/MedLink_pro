import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../widgets/doctor_card.dart';
import 'doctor_detail_screen.dart';
import '../../../ai/data/models/body_part.dart';
import '../../data/models/doctor_model.dart';
import '../../data/repositories/doctor_repository.dart';

/// Doctor Search & Browse Screen
///
/// Allows users to:
/// - Search doctors by name, specialty
/// - Filter by availability, price, rating, distance
/// - Sort by recommended, price, rating, wait time
/// - View doctor profiles and book appointments
class DoctorSearchScreen extends StatefulWidget {
  static const routeName = '/doctors/search';

  const DoctorSearchScreen({super.key});

  @override
  State<DoctorSearchScreen> createState() => _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends State<DoctorSearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedSpecialty = 'all';
  String _selectedAvailability = 'all';
  String _sortBy = 'recommended';
  List<DoctorModel> _doctors = [];
  List<DoctorModel> _filteredDoctors = [];

  SymptomComplaint? _complaint;
  final DoctorRepository _doctorRepository = DoctorRepository();
  bool _isLoading = false;
  String? _error;
  bool _didLoadArgs = false;

  @override
  void initState() {
    super.initState();
    _loadDoctors();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didLoadArgs) {
      final arguments = ModalRoute.of(context)?.settings.arguments;
      if (arguments is Map<String, dynamic>) {
        _complaint = arguments['complaint'] as SymptomComplaint?;
      }
      _didLoadArgs = true;
    }
  }

  Future<void> _loadDoctors() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final doctors = await _doctorRepository.fetchDoctors(
        search: _searchController.text,
        specialty: _selectedSpecialty == 'all' ? null : _selectedSpecialty,
        isOnline: _selectedAvailability == 'all'
            ? null
            : _selectedAvailability == 'online',
      );
      setState(() {
        _doctors = doctors;
        _filteredDoctors = doctors;
      });
      _applyFilters(applySortingOnly: true);
    } catch (error) {
      setState(() {
        _error = 'doctor.load_error'.tr();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _applyFilters({bool applySortingOnly = false}) {
    setState(() {
      if (!applySortingOnly) {
        _filteredDoctors = _doctors.where((doctor) {
          final matchesSearch = _searchController.text.isEmpty ||
              doctor.name
                  .toLowerCase()
                  .contains(_searchController.text.toLowerCase()) ||
              doctor.specialty
                  .toLowerCase()
                  .contains(_searchController.text.toLowerCase());

          final matchesSpecialty = _selectedSpecialty == 'all' ||
              doctor.specialty.toLowerCase() ==
                  _selectedSpecialty.toLowerCase();

          final matchesAvailability = _selectedAvailability == 'all' ||
              (_selectedAvailability == 'online' && doctor.isOnline) ||
              (_selectedAvailability == 'today' && !doctor.isOnline);

          return matchesSearch && matchesSpecialty && matchesAvailability;
        }).toList();
      }

      switch (_sortBy) {
        case 'price_low':
          _filteredDoctors
              .sort((a, b) => a.consultationFee.compareTo(b.consultationFee));
          break;
        case 'price_high':
          _filteredDoctors
              .sort((a, b) => b.consultationFee.compareTo(a.consultationFee));
          break;
        case 'rating':
          _filteredDoctors.sort((a, b) => b.rating.compareTo(a.rating));
          break;
        case 'wait_time':
          _filteredDoctors.sort(
            (a, b) => a.waitTimeMinutes.compareTo(b.waitTimeMinutes),
          );
          break;
        default:
          break;
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppColors.background,
      appBar: AppBar(
        title: Text('home.search_doctors_title'.tr()),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: isDark ? Colors.white : AppColors.textPrimary,
      ),
      body: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F172A) : AppColors.background,
        ),
        child: Column(
          children: [
            _buildSearchBar(),
            _buildFilters(),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? _buildErrorState()
                      : _filteredDoctors.isEmpty
                          ? _buildEmptyState()
                          : RefreshIndicator(
                              onRefresh: _loadDoctors,
                              child: ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _filteredDoctors.length,
                                itemBuilder: (context, index) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 16),
                                    child: DoctorCard(
                                      doctor: _filteredDoctors[index],
                                      onTap: () {
                                        Navigator.of(context).pushNamed(
                                          DoctorDetailScreen.routeName,
                                          arguments: {
                                            'doctor': _filteredDoctors[index],
                                            'complaint': _complaint,
                                          },
                                        );
                                      },
                                    ),
                                  );
                                },
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: TextField(
        controller: _searchController,
        style: TextStyle(color: isDark ? Colors.white : AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: 'doctor.search_hint'.tr(),
          hintStyle: TextStyle(
              color: isDark ? Colors.white60 : AppColors.textTertiary),
          prefixIcon: Icon(Icons.search_rounded,
              color: isDark ? Colors.white70 : AppColors.textSecondary),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_searchController.text.isNotEmpty)
                IconButton(
                  icon: Icon(Icons.clear_rounded,
                      color: isDark ? Colors.white70 : AppColors.textSecondary),
                  onPressed: () {
                    _searchController.clear();
                    _applyFilters();
                  },
                ),
              IconButton(
                icon: Icon(Icons.search,
                    color: isDark ? Colors.white70 : AppColors.textSecondary),
                onPressed: _loadDoctors,
              ),
            ],
          ),
          filled: true,
          fillColor:
              isDark ? const Color(0xFF334155) : AppColors.inputBackground,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
        onChanged: (_) => _applyFilters(),
        onSubmitted: (_) => _loadDoctors(),
      ),
    );
  }

  Widget _buildFilters() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: Row(
        children: [
          Expanded(
            child: _FilterChip(
              label: 'doctor.filter'.tr(),
              icon: Icons.tune_rounded,
              onTap: () => _showFilterBottomSheet(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _FilterChip(
              label: 'doctor.sort'.tr(),
              icon: Icons.sort_rounded,
              onTap: () => _showSortBottomSheet(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hasAnyDoctors = _doctors.isNotEmpty;

    final title = hasAnyDoctors
        ? 'doctor.no_results'.tr()
        : 'doctor.no_doctors_title'.tr();
    final subtitle = hasAnyDoctors
        ? 'doctor.try_different_search'.tr()
        : 'doctor.no_doctors_subtitle'.tr();

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: (isDark ? Colors.white12 : AppColors.primaryLight)
                      .withOpacity(0.4),
                ),
                child: Icon(
                  Icons.medical_information_rounded,
                  size: 36,
                  color: isDark ? Colors.white : AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isDark ? Colors.white70 : AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _loadDoctors,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: Text('common.retry'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      isDark ? AppColors.primaryLight : AppColors.primary,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 80,
            color: AppColors.error,
          ),
          const SizedBox(height: 16),
          Text(
            _error ?? 'doctor.load_error'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _loadDoctors,
            child: Text('common.retry'.tr()),
          ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _FilterBottomSheet(
        specialty: _selectedSpecialty,
        availability: _selectedAvailability,
        onApply: (specialty, availability) {
          setState(() {
            _selectedSpecialty = specialty;
            _selectedAvailability = availability;
          });
          _applyFilters();
        },
      ),
    );
  }

  void _showSortBottomSheet() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _SortBottomSheet(
        currentSort: _sortBy,
        onSelect: (sort) {
          setState(() => _sortBy = sort);
          _applyFilters();
        },
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.inputBackground,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterBottomSheet extends StatefulWidget {
  final String specialty;
  final String availability;
  final Function(String, String) onApply;

  const _FilterBottomSheet({
    required this.specialty,
    required this.availability,
    required this.onApply,
  });

  @override
  State<_FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<_FilterBottomSheet> {
  late String _selectedSpecialty;
  late String _selectedAvailability;

  @override
  void initState() {
    super.initState();
    _selectedSpecialty = widget.specialty;
    _selectedAvailability = widget.availability;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(24),
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Filter',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 24),
          Text(
            'Specialty',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: [
              'all',
              'general',
              'cardiology',
              'pediatrics',
              'dermatology'
            ]
                .map((spec) => _FilterOption(
                      label: spec == 'all' ? 'doctor.all'.tr() : spec,
                      isSelected: _selectedSpecialty == spec,
                      onTap: () => setState(() => _selectedSpecialty = spec),
                    ))
                .toList(),
          ),
          const SizedBox(height: 24),
          Text(
            'Availability',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: ['all', 'online', 'today']
                .map((avail) => _FilterOption(
                      label: avail == 'all'
                          ? 'doctor.all'.tr()
                          : avail == 'online'
                              ? 'doctor.online_now'.tr()
                              : 'doctor.available_today'.tr(),
                      isSelected: _selectedAvailability == avail,
                      onTap: () =>
                          setState(() => _selectedAvailability = avail),
                    ))
                .toList(),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                widget.onApply(_selectedSpecialty, _selectedAvailability);
                Navigator.of(context).pop();
              },
              child: Text('doctor.apply_filters'.tr()),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.inputBackground,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: isSelected
                    ? Colors.white
                    : (Theme.of(context).brightness == Brightness.dark
                        ? Colors.white70
                        : AppColors.textPrimary),
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              ),
        ),
      ),
    );
  }
}

class _SortBottomSheet extends StatelessWidget {
  final String currentSort;
  final Function(String) onSelect;

  const _SortBottomSheet({
    required this.currentSort,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final options = [
      {'value': 'recommended', 'label': 'Recommended'},
      {'value': 'price_low', 'label': 'Price: Low to High'},
      {'value': 'price_high', 'label': 'Price: High to Low'},
      {'value': 'rating', 'label': 'Highest Rated'},
      {'value': 'wait_time', 'label': 'Shortest Wait Time'},
    ];

    return Container(
      padding: const EdgeInsets.all(24),
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sort',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 24),
          ...options.map((option) => _SortOption(
                label: option['label']!,
                isSelected: currentSort == option['value'],
                onTap: () {
                  onSelect(option['value']!);
                  Navigator.of(context).pop();
                },
              )),
        ],
      ),
    );
  }
}

class _SortOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _SortOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return ListTile(
      title: Text(
        label,
        style: TextStyle(
          color: isDark ? Colors.white : AppColors.textPrimary,
        ),
      ),
      trailing: isSelected
          ? Icon(Icons.check_circle_rounded, color: AppColors.primary)
          : null,
      onTap: onTap,
    );
  }
}

// Doctor Model (temporary - should be in data/models)
