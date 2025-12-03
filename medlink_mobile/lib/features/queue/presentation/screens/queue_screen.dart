import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/providers/session_provider.dart';
import '../../../../shared/widgets/role_guard.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../consultation/data/models/consultation_model.dart';
import '../../../doctor/data/models/doctor_model.dart';
import '../../../consultation/presentation/screens/consultation_call_screen.dart';
import '../../data/models/queue_model.dart';
import '../../data/repositories/queue_repository.dart';

/// Queue Screen
///
/// Shows patient's position in queue and estimated wait time
/// Updates in real-time as queue moves
class QueueScreen extends ConsumerStatefulWidget {
  static const routeName = '/queue';

  const QueueScreen({super.key});

  @override
  ConsumerState<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends ConsumerState<QueueScreen> {
  Timer? _updateTimer;
  int _queuePosition = 0;
  int _estimatedWaitTime = 0; // minutes
  bool _isReady = false;
  QueueModel? _queueEntry;
  DoctorModel? _doctorArg;
  ConsultationType? _consultationTypeArg;
  String? _consultationId;
  bool _didLoadRouteArgs = false;
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _doctorQueueData;
  final QueueRepository _queueRepository = QueueRepository();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(sessionProvider);
      if (user?.isDoctor ?? false) {
        // Doctor queue view - load from API
        _loadDoctorQueue();
      } else if (_queueEntry != null) {
        // Patient queue view - start polling
        _consultationId = _queueEntry!.consultationId;
        _startQueueUpdates();
      } else if (_consultationId != null) {
        _loadQueueStatus();
        _startQueueUpdates();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didLoadRouteArgs) return;
    final arguments =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (arguments != null) {
      _doctorArg = arguments['doctor'] as DoctorModel?;
      _consultationTypeArg =
          arguments['consultationType'] as ConsultationType? ??
              ConsultationType.video;
      final entry = arguments['queueEntry'] as QueueModel?;
      if (entry != null) {
        _applyQueueEntry(entry);
        _consultationId = entry.consultationId;
      }
      // Also check for consultationId directly
      _consultationId ??= arguments['consultationId'] as String?;
    }
    _didLoadRouteArgs = true;
  }

  @override
  void dispose() {
    _updateTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadQueueStatus() async {
    if (_consultationId == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final queueStatus =
          await _queueRepository.getQueueStatus(_consultationId!);
      _applyQueueEntry(queueStatus);
    } catch (e) {
      setState(() {
        _error = 'Failed to load queue status';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadDoctorQueue() async {
    final user = ref.read(sessionProvider);
    if (user?.id == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final queueData = await _queueRepository.getDoctorQueue(user!.id);
      // Store queue data for doctor view
      setState(() {
        _isLoading = false;
        _doctorQueueData = queueData;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load doctor queue: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  void _startQueueUpdates() {
    if (_consultationId == null) return;

    // Load initial status
    _loadQueueStatus();

    // Poll for updates every 5 seconds
    _updateTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted && _consultationId != null) {
        _loadQueueStatus();
      }
    });
  }

  void _applyQueueEntry(QueueModel entry) {
    _queueEntry = entry;
    setState(() {
      _queuePosition = entry.position;
      _estimatedWaitTime = entry.estimatedWaitTime;
      _isReady = entry.status == QueueStatus.ready || entry.position <= 1;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider);
    final isDoctor = user?.isDoctor ?? false;
    DoctorModel? doctor = _doctorArg;
    final arguments =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    doctor ??= arguments?['doctor'] as DoctorModel?;
    final consultationType = _consultationTypeArg ??
        (arguments?['consultationType'] as ConsultationType?) ??
        ConsultationType.video;

    return RoleGuard(
      allowedRoles: const ['patient', 'doctor'],
      builder: (guardContext, _) {
        if (isDoctor && user != null) {
          return _buildDoctorScaffold(guardContext, user);
        }

        if (doctor == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Error')),
            body: const Center(child: Text('Doctor information not found')),
          );
        }

        if (_isLoading) {
          return Scaffold(
            appBar: AppBar(title: Text('queue.title'.tr())),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (_error != null) {
          return Scaffold(
            appBar: AppBar(title: Text('queue.title'.tr())),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_error!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadQueueStatus,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        return _buildPatientScaffold(
          guardContext,
          doctor,
          consultationType,
        );
      },
    );
  }

  Widget _buildPatientScaffold(
    BuildContext context,
    DoctorModel doctor,
    ConsultationType consultationType,
  ) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    const SizedBox(height: 32),
                    _buildQueuePosition(context),
                    const SizedBox(height: 32),
                    _buildDoctorInfo(context, doctor),
                    const SizedBox(height: 32),
                    _buildWaitTime(context),
                    const SizedBox(height: 32),
                    _buildQueueVisualization(context),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
            _buildBottomAction(context, doctor, consultationType),
          ],
        ),
      ),
    );
  }

  Widget _buildDoctorScaffold(BuildContext context, UserModel user) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadDoctorQueue,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final queued = _doctorQueueData?['queued'] as List<dynamic>? ?? [];
    final active = _doctorQueueData?['active'] as List<dynamic>? ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildDoctorHeader(context, user),
            if (active.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Active Consultations',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              Expanded(
                flex: active.length,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemBuilder: (context, index) {
                    final consultation = active[index];
                    return _DoctorQueueCard(
                      name: consultation['patientName'] as String? ?? 'Unknown',
                      complaint: 'In consultation',
                      wait: 'Active',
                      urgency: 'urgent',
                      isActive: true,
                    );
                  },
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemCount: active.length,
                ),
              ),
            ],
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Queue (${queued.length})',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
            Expanded(
              flex: queued.length,
              child: queued.isEmpty
                  ? Center(
                      child: Text(
                        'No patients in queue',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemBuilder: (context, index) {
                        final consultation = queued[index];
                        final waitTime =
                            consultation['estimatedWaitTime'] as int? ?? 0;
                        return _DoctorQueueCard(
                          name: consultation['patientName'] as String? ??
                              'Unknown',
                          complaint:
                              consultation['chiefComplaint'] as String? ??
                                  'No complaint',
                          wait: '≈ ${waitTime} min',
                          urgency: (consultation['urgencyLevel'] as String? ??
                                  'routine')
                              .toLowerCase(),
                        );
                      },
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemCount: queued.length,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: Text(
              'queue.title'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDoctorHeader(BuildContext context, UserModel user) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'queue.doctor_title'.tr(),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                user.fullName,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white70,
                    ),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              DateFormat('EEE, MMM d').format(DateTime.now()),
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQueuePosition(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: _isReady
              ? [AppColors.success, AppColors.successLight]
              : [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: (_isReady ? AppColors.success : AppColors.primary)
                .withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          if (_isReady) ...[
            const Icon(
              Icons.check_circle_rounded,
              size: 64,
              color: Colors.white,
            ),
            const SizedBox(height: 16),
            Text(
              'queue.ready'.tr(),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ] else ...[
            Text(
              '$_queuePosition',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 72,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              _queuePosition == 1 ? 'queue.next'.tr() : 'queue.position'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDoctorInfo(BuildContext context, DoctorModel doctor) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
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
      child: Row(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: AppColors.primaryLight,
            child: Text(
              doctor.name.split(' ').map((n) => n[0]).take(2).join(),
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doctor.name,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  doctor.specialty,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaitTime(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.access_time_rounded,
            color: AppColors.primary,
            size: 24,
          ),
          const SizedBox(width: 12),
          Text(
            _isReady
                ? 'queue.ready_message'.tr()
                : 'queue.wait_time'.tr(args: ['$_estimatedWaitTime']),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildQueueVisualization(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
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
        children: [
          Text(
            'queue.visualization.title'.tr(),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              final isActive = index < _queuePosition;
              final isCurrent = index == _queuePosition - 1;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: isCurrent ? 16 : 12,
                height: isCurrent ? 16 : 12,
                decoration: BoxDecoration(
                  color: isCurrent
                      ? AppColors.primary
                      : isActive
                          ? AppColors.primaryLight
                          : AppColors.border,
                  shape: BoxShape.circle,
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction(
    BuildContext context,
    DoctorModel doctor,
    ConsultationType consultationType,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_isReady)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () =>
                    _handleJoinCall(context, doctor, consultationType),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 4,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.videocam_rounded, size: 24),
                    const SizedBox(width: 8),
                    Text(
                      'queue.join_call'.tr(),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                    ),
                  ],
                ),
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => _handleLeaveQueue(context),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  side: const BorderSide(color: AppColors.error, width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  'queue.leave.label'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.error,
                      ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _handleJoinCall(
    BuildContext context,
    DoctorModel doctor,
    ConsultationType consultationType,
  ) {
    Navigator.of(context).pushReplacementNamed(
      ConsultationCallScreen.routeName,
      arguments: {
        'doctor': doctor,
        'consultationType': consultationType,
        'consultationId': _consultationId,
      },
    );
  }

  void _handleLeaveQueue(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('queue.leave.title'.tr()),
        content: Text('queue.leave.message'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('queue.leave.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: Text(
              'queue.leave.confirm'.tr(),
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}

class _DoctorQueueCard extends StatelessWidget {
  const _DoctorQueueCard({
    required this.name,
    required this.complaint,
    required this.wait,
    required this.urgency,
    this.isActive = false,
  });

  final String name;
  final String complaint;
  final String wait;
  final String urgency;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final isUrgent = urgency.toLowerCase() == 'urgent';
    final badgeColor = isUrgent ? AppColors.error : AppColors.primary;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: badgeColor.withOpacity(0.15),
            child: Text(
              name.split(' ').map((e) => e[0]).take(2).join(),
              style: TextStyle(
                color: badgeColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  complaint,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: badgeColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        urgency.toUpperCase(),
                        style: TextStyle(
                          color: badgeColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.timer, size: 14, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      wait,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.play_arrow_rounded),
            color: badgeColor,
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('queue.doctor_action'.tr(args: [name])),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
