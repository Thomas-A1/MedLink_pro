import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_colors.dart';
import '../../data/models/consultation_model.dart';
import '../../data/repositories/consultation_repository.dart';

class ConsultationsListScreen extends ConsumerStatefulWidget {
  static const routeName = '/consultations/list';

  const ConsultationsListScreen({super.key});

  @override
  ConsumerState<ConsultationsListScreen> createState() =>
      _ConsultationsListScreenState();
}

class _ConsultationsListScreenState
    extends ConsumerState<ConsultationsListScreen> {
  final ConsultationRepository _repository = ConsultationRepository();
  List<ConsultationModel> _consultations = [];
  bool _isLoading = true;
  String _selectedFilter = 'all'; // all, pending, completed

  @override
  void initState() {
    super.initState();
    _loadConsultations();
  }

  Future<void> _loadConsultations() async {
    setState(() => _isLoading = true);
    try {
      final consultations = await _repository.fetchMyConsultations();
      if (mounted) {
        setState(() {
          _consultations = consultations;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load consultations: $e')),
        );
      }
    }
  }

  List<ConsultationModel> get _filteredConsultations {
    switch (_selectedFilter) {
      case 'pending':
        return _consultations
            .where((c) =>
                c.status == ConsultationStatus.requested ||
                c.status == ConsultationStatus.queued ||
                c.status == ConsultationStatus.inProgress)
            .toList();
      case 'completed':
        return _consultations
            .where((c) => c.status == ConsultationStatus.completed)
            .toList();
      default:
        return _consultations;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppColors.background,
      appBar: AppBar(
        title: const Text('My Consultations'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: isDark ? Colors.white : AppColors.textPrimary,
      ),
      body: _isLoading
          ? Center(
              child: CircularProgressIndicator(
                color: AppColors.primary,
              ),
            )
          : Column(
              children: [
                _buildFilterChips(isDark),
                Expanded(
                  child: _filteredConsultations.isEmpty
                      ? _buildEmptyState(isDark)
                      : RefreshIndicator(
                          onRefresh: _loadConsultations,
                          color: AppColors.primary,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filteredConsultations.length,
                            itemBuilder: (context, index) {
                              return _ConsultationCard(
                                consultation: _filteredConsultations[index],
                                isDark: isDark,
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterChips(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          _FilterChip(
            label: 'All',
            isSelected: _selectedFilter == 'all',
            isDark: isDark,
            onTap: () => setState(() => _selectedFilter = 'all'),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Pending',
            isSelected: _selectedFilter == 'pending',
            isDark: isDark,
            onTap: () => setState(() => _selectedFilter = 'pending'),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Completed',
            isSelected: _selectedFilter == 'completed',
            isDark: isDark,
            onTap: () => setState(() => _selectedFilter = 'completed'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.medical_information_outlined,
            size: 80,
            color: isDark ? Colors.white24 : AppColors.textTertiary,
          ),
          const SizedBox(height: 16),
          Text(
            'No consultations found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Your consultations will appear here',
            style: TextStyle(
              color: isDark ? Colors.white60 : AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : (isDark ? const Color(0xFF1E293B) : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : (isDark ? Colors.white24 : AppColors.border),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? Colors.white
                : (isDark ? Colors.white : AppColors.textPrimary),
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

class _ConsultationCard extends StatelessWidget {
  final ConsultationModel consultation;
  final bool isDark;

  const _ConsultationCard({
    required this.consultation,
    required this.isDark,
  });

  String _getTimeRemaining() {
    if (consultation.status == ConsultationStatus.completed) {
      return 'Completed';
    }

    if (consultation.callStartedAt != null) {
      return 'In Progress';
    }

    if (consultation.queuePosition != null &&
        consultation.estimatedWaitTime != null) {
      final waitTime = consultation.estimatedWaitTime!;
      if (waitTime < 60) {
        return '~$waitTime min remaining';
      } else {
        final hours = waitTime ~/ 60;
        final mins = waitTime % 60;
        return '~$hours h $mins m remaining';
      }
    }

    // Calculate days until consultation
    final now = DateTime.now();
    final createdAt = consultation.createdAt;
    final daysSince = now.difference(createdAt).inDays;

    if (daysSince == 0) {
      return 'Today';
    } else if (daysSince == 1) {
      return '1 day ago';
    } else {
      return '$daysSince days ago';
    }
  }

  Color _getStatusColor() {
    switch (consultation.status) {
      case ConsultationStatus.completed:
        return AppColors.success;
      case ConsultationStatus.inProgress:
        return AppColors.info;
      case ConsultationStatus.queued:
      case ConsultationStatus.requested:
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _getStatusIcon() {
    switch (consultation.status) {
      case ConsultationStatus.completed:
        return Icons.check_circle_rounded;
      case ConsultationStatus.inProgress:
        return Icons.phone_in_talk_rounded;
      case ConsultationStatus.queued:
        return Icons.queue_rounded;
      default:
        return Icons.schedule_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final doctorName = consultation.doctorName ?? 'Dr. Unknown';
    final specialty = consultation.doctorSpecialty ?? 'General Practitioner';
    final facility = consultation.doctorFacility ?? 'MedLink';
    final dateFormat = DateFormat('MMM dd, yyyy');
    final statusColor = _getStatusColor();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            // TODO: Navigate to consultation details
          },
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary,
                            AppColors.primaryDark,
                          ],
                        ),
                      ),
                      child: Icon(
                        Icons.person_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            doctorName,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: isDark
                                      ? Colors.white
                                      : AppColors.textPrimary,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            specialty,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: isDark
                                      ? Colors.white70
                                      : AppColors.textSecondary,
                                ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            facility,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: isDark
                                          ? Colors.white60
                                          : AppColors.textTertiary,
                                    ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _getStatusIcon(),
                            size: 16,
                            color: statusColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            consultation.status.name.toUpperCase(),
                            style: TextStyle(
                              color: statusColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (consultation.chiefComplaint != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withOpacity(0.05)
                          : AppColors.primaryUltraLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.medical_information_rounded,
                          size: 18,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            consultation.chiefComplaint!,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: isDark
                                          ? Colors.white70
                                          : AppColors.textSecondary,
                                    ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Row(
                  children: [
                    Icon(
                      Icons.access_time_rounded,
                      size: 16,
                      color: isDark ? Colors.white60 : AppColors.textTertiary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      dateFormat.format(consultation.createdAt),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: isDark
                                ? Colors.white60
                                : AppColors.textTertiary,
                          ),
                    ),
                    const SizedBox(width: 16),
                    Icon(
                      Icons.schedule_rounded,
                      size: 16,
                      color: isDark ? Colors.white60 : AppColors.textTertiary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _getTimeRemaining(),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
