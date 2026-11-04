"""
Course Analytics Module
Calculates course enrolments, eligible enrolments, and completion rates.
Follows strictly documented formulas and denominators.
"""

from typing import List, Dict, Any, Optional

ELIGIBLE_STATUSES = ('enrolled', 'completed')


def calculate_completion_rates(
    courses: List[Dict[str, Any]],
    enrollments: List[Dict[str, Any]],
    eligibility_policy: str = "enrolled_and_completed"
) -> List[Dict[str, Any]]:
    """
    Computes course completion rates with documented numerators and denominators.
    
    Eligibility Policy:
      - 'enrolled_and_completed': Only 'enrolled' and 'completed' statuses form the denominator.
        'withdrawn' and 'cancelled' records are excluded from eligible enrolments.
    
    Formula:
      Course Completion Rate = (Completed Eligible Enrolments / Total Eligible Enrolments) * 100
    """
    results = []

    for course in courses:
        c_id = course["course_id"]
        c_name = course["course_name"]
        category = course.get("category", "General")
        is_active = bool(course.get("is_active", True))

        # Filter enrollments for this course
        c_enrs = [e for e in enrollments if e["course_id"] == c_id]
        total_enrolments = len(c_enrs)
        
        # Eligible enrolments (excludes withdrawn and cancelled)
        eligible_enrs = [e for e in c_enrs if e["status"] in ELIGIBLE_STATUSES]
        total_eligible = len(eligible_enrs)
        
        completed_enrs = [e for e in eligible_enrs if e["status"] == "completed"]
        completed_count = len(completed_enrs)
        
        withdrawn_count = len([e for e in c_enrs if e["status"] == "withdrawn"])
        cancelled_count = len([e for e in c_enrs if e["status"] == "cancelled"])

        # Completion rate calculation with division by zero safety
        if total_eligible > 0:
            completion_rate = round((completed_count / total_eligible) * 100.0, 1)
        else:
            completion_rate = 0.0

        results.append({
            "course_id": c_id,
            "course_name": c_name,
            "category": category,
            "is_active": is_active,
            "total_enrolments": total_enrolments,
            "eligible_enrolments": total_eligible,
            "completed_enrolments": completed_count,
            "withdrawn_enrolments": withdrawn_count,
            "cancelled_enrolments": cancelled_count,
            "completion_rate_percent": completion_rate,
            "formula": "completed_enrolments / eligible_enrolments * 100",
            "eligibility_policy": eligibility_policy,
            "denominator_definition": "Count of distinct enrolments with status in ('enrolled', 'completed')"
        })

    return results


def get_course_enrolment_summary(
    courses: List[Dict[str, Any]],
    enrollments: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculates system-wide aggregate enrollment and completion totals.
    """
    course_rates = calculate_completion_rates(courses, enrollments)
    
    total_courses = len(courses)
    active_courses = len([c for c in courses if c.get("is_active", True)])
    total_enrolments = sum(c["total_enrolments"] for c in course_rates)
    total_eligible = sum(c["eligible_enrolments"] for c in course_rates)
    total_completed = sum(c["completed_enrolments"] for c in course_rates)
    
    overall_rate = round((total_completed / total_eligible) * 100.0, 1) if total_eligible > 0 else 0.0
    
    return {
        "total_courses": total_courses,
        "active_courses": active_courses,
        "total_enrolments": total_enrolments,
        "eligible_enrolments": total_eligible,
        "completed_enrolments": total_completed,
        "overall_completion_rate": overall_rate,
        "course_performance": course_rates
    }
