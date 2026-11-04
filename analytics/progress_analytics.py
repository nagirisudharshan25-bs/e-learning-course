"""
Progress Analytics Module
Calculates individual enrolment progress based on distinct required lessons.
Excludes non-required lessons from the denominator and protects against division by zero.
"""

from typing import List, Dict, Any, Set


def calculate_enrolment_progress(
    enrollment: Dict[str, Any],
    lessons: List[Dict[str, Any]],
    activities: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Progress percentage = (Number of distinct required lessons completed / Total required lessons) * 100.
    
    Rules:
      1. A completed lesson must have a valid completion record linked to the enrolment and lesson.
      2. Duplicate completion records for the same lesson must NOT inflate the count.
      3. Non-required lessons are excluded from the progress denominator.
      4. If total required lessons == 0, progress is 0.0% (not automatically completed).
    """
    enr_id = enrollment["enrollment_id"]
    course_id = enrollment["course_id"]
    
    # Filter lessons for this course
    course_lessons = [l for l in lessons if l["course_id"] == course_id]
    required_lessons = [l for l in course_lessons if bool(l.get("is_required", True))]
    optional_lessons = [l for l in course_lessons if not bool(l.get("is_required", True))]
    
    required_lesson_ids = {l["lesson_id"] for l in required_lessons}
    total_required = len(required_lessons)
    
    # Find all activities for this enrolment with completion = True and activity_type = 'lesson_completed'
    enr_activities = [a for a in activities if a["enrollment_id"] == enr_id]
    
    # Set of distinct completed lesson IDs
    completed_lesson_ids: Set[str] = set()
    for act in enr_activities:
        if act.get("completed") and act.get("lesson_id"):
            completed_lesson_ids.add(act["lesson_id"])
            
    # Distinct required lessons completed
    distinct_required_completed = len(completed_lesson_ids.intersection(required_lesson_ids))
    distinct_optional_completed = len(completed_lesson_ids.difference(required_lesson_ids))
    
    if total_required > 0:
        progress_pct = round((distinct_required_completed / total_required) * 100.0, 1)
        # Cap at 100%
        progress_pct = min(100.0, progress_pct)
    else:
        # Course has zero required lessons
        progress_pct = 0.0

    # Determine if enrolment meets completion criteria
    is_fully_completed = (total_required > 0 and distinct_required_completed == total_required)
    
    # Assign progress band
    if progress_pct == 100.0:
        band = "100%"
    elif progress_pct >= 75.0:
        band = "75-99%"
    elif progress_pct >= 50.0:
        band = "50-74%"
    elif progress_pct >= 25.0:
        band = "25-49%"
    else:
        band = "0-24%"

    return {
        "enrollment_id": enr_id,
        "learner_id": enrollment["learner_id"],
        "course_id": course_id,
        "status": enrollment["status"],
        "total_course_lessons": len(course_lessons),
        "total_required_lessons": total_required,
        "total_optional_lessons": len(optional_lessons),
        "distinct_required_completed": distinct_required_completed,
        "distinct_optional_completed": distinct_optional_completed,
        "progress_percentage": progress_pct,
        "progress_band": band,
        "is_fully_completed": is_fully_completed,
        "denominator_note": "Total required lessons in course (optional lessons excluded)"
    }


def get_progress_distribution(
    enrollments: List[Dict[str, Any]],
    lessons: List[Dict[str, Any]],
    activities: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Aggregates enrolment progress into standard progress bands for distribution charts.
    """
    bands = {
        "0-24%": 0,
        "25-49%": 0,
        "50-74%": 0,
        "75-99%": 0,
        "100%": 0
    }
    
    detailed = []
    # Filter only eligible enrolments ('enrolled' or 'completed')
    eligible_enrs = [e for e in enrollments if e["status"] in ('enrolled', 'completed')]
    
    for enr in eligible_enrs:
        prog = calculate_enrolment_progress(enr, lessons, activities)
        detailed.append(prog)
        band = prog["progress_band"]
        bands[band] = bands.get(band, 0) + 1
        
    return {
        "total_analyzed": len(eligible_enrs),
        "bands": [
            {"band": "0-24%", "count": bands["0-24%"], "label": "Early Stage (0-24%)"},
            {"band": "25-49%", "count": bands["25-49%"], "label": "Developing (25-49%)"},
            {"band": "50-74%", "count": bands["50-74%"], "label": "Mid-Way (50-74%)"},
            {"band": "75-99%", "count": bands["75-99%"], "label": "Near Completion (75-99%)"},
            {"band": "100%", "count": bands["100%"], "label": "Completed (100%)"},
        ],
        "records": detailed
    }
