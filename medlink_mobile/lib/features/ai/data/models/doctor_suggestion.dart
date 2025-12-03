/// Doctor Suggestion Model
///
/// Represents a doctor recommendation from AI analysis
class DoctorSuggestion {
  final String name;
  final String specialty;
  final String facility;
  final double rating;
  final String waitTime;
  final List<String> languages;

  const DoctorSuggestion({
    required this.name,
    required this.specialty,
    required this.facility,
    required this.rating,
    required this.waitTime,
    this.languages = const [],
  });
}
