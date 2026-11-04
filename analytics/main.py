"""
Python Analytics Package Entrypoint
Can be executed as a standalone CLI tool or imported by services.
"""

import sys
import json
from .database import execute_query
from .course_analytics import calculate_completion_rates, get_course_enrolment_summary
from .progress_analytics import calculate_enrolment_progress, get_progress_distribution
from .activity_analytics import get_weekly_activity_summary
from .inactivity_analytics import get_inactive_enrolments


def run_full_analytics():
    """
    Fetches raw tables from database and computes all analytical reports.
    """
    try:
        courses = execute_query("SELECT * FROM courses")
        learners = execute_query("SELECT * FROM learners")
        enrollments = execute_query("SELECT * FROM enrollments")
        lessons = execute_query("SELECT * FROM lessons")
        activities = execute_query("SELECT * FROM activities")

        courses_map = {c["course_id"]: c for c in courses}
        learners_map = {l["learner_id"]: l for l in learners}
        enrollments_map = {e["enrollment_id"]: e for e in enrollments}

        course_summary = get_course_enrolment_summary(courses, enrollments)
        progress_data = get_progress_distribution(enrollments, lessons, activities)
        weekly_activity = get_weekly_activity_summary(activities, enrollments_map)
        inactivity_report = get_inactive_enrolments(
            enrollments=enrollments,
            activities=activities,
            courses_map=courses_map,
            learners_map=learners_map,
            inactivity_threshold_days=14
        )

        output = {
            "status": "success",
            "course_summary": course_summary,
            "progress_distribution": progress_data,
            "weekly_activity": weekly_activity,
            "inactivity_report": inactivity_report
        }
        print(json.dumps(output, indent=2))
        return output
    except Exception as e:
        error_res = {"status": "error", "message": str(e)}
        print(json.dumps(error_res), file=sys.stderr)
        return error_res


if __name__ == "__main__":
    run_full_analytics()
