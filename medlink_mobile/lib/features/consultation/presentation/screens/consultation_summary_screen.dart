import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../doctor/data/models/doctor_model.dart';

/// Consultation Summary Screen
///
/// Shows call summary after consultation ends
class ConsultationSummaryScreen extends StatelessWidget {
  static const routeName = '/consultation/summary';

  const ConsultationSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final arguments =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final summary = arguments?['summary'] as Map<String, dynamic>?;
    final doctor = arguments?['doctor'] as DoctorModel?;

    if (summary == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: const Center(child: Text('Summary not found')),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Consultation Summary'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderCard(context, summary, doctor),
            const SizedBox(height: 16),
            if (summary['chiefComplaint'] != null)
              _buildSection(
                context,
                'Chief Complaint',
                summary['chiefComplaint'] as String,
              ),
            if (summary['diagnosis'] != null) ...[
              const SizedBox(height: 16),
              _buildSection(
                context,
                'Diagnosis',
                summary['diagnosis'] as String,
              ),
            ],
            if (summary['treatmentPlan'] != null) ...[
              const SizedBox(height: 16),
              _buildSection(
                context,
                'Treatment Plan',
                summary['treatmentPlan'] as String,
              ),
            ],
            if (summary['doctorNotes'] != null) ...[
              const SizedBox(height: 16),
              _buildSection(
                context,
                'Doctor Notes',
                summary['doctorNotes'] as String,
              ),
            ],
            const SizedBox(height: 16),
            _buildCallInfoCard(context, summary),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // Navigate to review submission
                  final consultationId =
                      summary['id'] ?? summary['consultationId'];
                  if (consultationId != null && doctor != null) {
                    Navigator.of(context).pushReplacementNamed(
                      '/review/submit',
                      arguments: {
                        'doctor': doctor,
                        'consultationId': consultationId,
                      },
                    );
                  } else {
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  }
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Rate Your Experience'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                child: const Text('Skip for now'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard(
    BuildContext context,
    Map<String, dynamic> summary,
    DoctorModel? doctor,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.primary,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Consultation Completed',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      doctor?.name ?? summary['doctor']?['name'] ?? 'Doctor',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection(
    BuildContext context,
    String title,
    String content,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  Widget _buildCallInfoCard(
    BuildContext context,
    Map<String, dynamic> summary,
  ) {
    final duration = summary['callDuration'] as int? ?? 0;
    final minutes = duration ~/ 60;
    final seconds = duration % 60;
    final durationText =
        '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Call Information',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          _buildInfoRow(context, 'Duration', durationText),
          if (summary['callStartedAt'] != null)
            _buildInfoRow(
              context,
              'Started',
              DateFormat('MMM d, y • h:mm a').format(
                DateTime.parse(summary['callStartedAt'] as String),
              ),
            ),
          if (summary['callEndedAt'] != null)
            _buildInfoRow(
              context,
              'Ended',
              DateFormat('MMM d, y • h:mm a').format(
                DateTime.parse(summary['callEndedAt'] as String),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}
