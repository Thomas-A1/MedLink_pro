import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_colors.dart';
import '../../data/models/hospital_model.dart';

/// Hospital Detail Screen
class HospitalDetailScreen extends StatelessWidget {
  static const routeName = '/hospital/detail';

  const HospitalDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final hospital =
        ModalRoute.of(context)?.settings.arguments as HospitalModel?;

    if (hospital == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: const Center(child: Text('Hospital information not found')),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          _buildAppBar(context, hospital),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoSection(context, hospital),
                  const SizedBox(height: 24),
                  _buildContactSection(context, hospital),
                  const SizedBox(height: 24),
                  _buildServicesSection(context, hospital),
                  const SizedBox(height: 24),
                  _buildActionButtons(context, hospital),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, HospitalModel hospital) {
    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      backgroundColor: AppColors.error,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
        onPressed: () => Navigator.of(context).pop(),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.error, AppColors.errorDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 40),
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.2),
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: hospital.imageUrl != null &&
                          hospital.imageUrl!.isNotEmpty
                      ? ClipOval(
                          child: CachedNetworkImage(
                            imageUrl: hospital.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => const Center(
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            ),
                            errorWidget: (context, url, error) => const Icon(
                              Icons.local_hospital_rounded,
                              size: 50,
                              color: Colors.white,
                            ),
                          ),
                        )
                      : const Icon(
                          Icons.local_hospital_rounded,
                          size: 50,
                          color: Colors.white,
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoSection(BuildContext context, HospitalModel hospital) {
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
              Expanded(
                child: Text(
                  hospital.name,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              if (hospital.hasEmergency)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.error,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    '24/7',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.location_on_rounded,
                  size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  hospital.address,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ),
            ],
          ),
          if (hospital.distanceKm != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.navigation_rounded,
                    size: 16, color: AppColors.error),
                const SizedBox(width: 4),
                Text(
                  hospital.distanceText,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.error,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ],
          if (hospital.metadata != null) ...[
            if (hospital.metadata!['region'] != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.map_rounded,
                      size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    'Region: ${hospital.metadata!['region']}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ],
            if (hospital.metadata!['district'] != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.location_city_rounded,
                      size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    'District: ${hospital.metadata!['district']}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ],
            if (hospital.metadata!['email'] != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.email_rounded,
                      size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      hospital.metadata!['email'],
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    ),
                  ),
                ],
              ),
            ],
          ],
          if (hospital.hospitalType != null) ...[
            const SizedBox(height: 8),
            Chip(
              label: Text(hospital.hospitalType!),
              backgroundColor: AppColors.errorLight,
              labelStyle: const TextStyle(color: AppColors.error),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContactSection(BuildContext context, HospitalModel hospital) {
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
            'hospital.contact'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          if (hospital.phone != null)
            ListTile(
              leading: Icon(Icons.phone_rounded, color: AppColors.error),
              title: Text(hospital.phone!),
              trailing: IconButton(
                icon: const Icon(Icons.call_rounded),
                onPressed: () => _makeCall(hospital.phone!),
              ),
            ),
          if (hospital.openingHours != null)
            ListTile(
              leading: Icon(Icons.access_time_rounded, color: AppColors.error),
              title: Text('hospital.hours'.tr()),
              subtitle: Text(hospital.openingHours!),
            ),
        ],
      ),
    );
  }

  Widget _buildServicesSection(BuildContext context, HospitalModel hospital) {
    if (hospital.services == null || hospital.services!.isEmpty) {
      return const SizedBox.shrink();
    }

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
            'hospital.services'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: hospital.services!.map((service) {
              return Chip(
                label: Text(service),
                backgroundColor: AppColors.errorLight,
                labelStyle: const TextStyle(color: AppColors.error),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, HospitalModel hospital) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => _navigateToHospital(context, hospital),
            icon: const Icon(Icons.navigation_rounded),
            label: Text('hospital.navigate'.tr()),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
          ),
        ),
        if (hospital.hasEmergency) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _makeEmergencyCall(),
              icon: const Icon(Icons.emergency_rounded),
              label: Text('hospital.emergency'.tr()),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: AppColors.error, width: 2),
              ),
            ),
          ),
        ],
      ],
    );
  }

  void _makeCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _makeEmergencyCall() async {
    final uri = Uri.parse('tel:193');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _navigateToHospital(BuildContext context, HospitalModel hospital) {
    // Navigate back to map screen with hospital selected for in-app navigation
    Navigator.of(context)
        .pop(hospital); // Close detail screen and pass hospital
  }
}
