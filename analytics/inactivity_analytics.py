"""
Inactivity Analytics Module
Evaluates enrollment inactivity relative to an explicit report timestamp
and configurable inactivity threshold (e.g., 14 days).
Enforces distinct states and clear limitations (rule-based indicator, not judgment).
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from .activity_analytics import parse_datetime


def get_inactive_enrolments(
    enrollments: List[Dict[str, Any]],
    activities: List[Dict[str, Any]],
    courses_map: Dict[str, Dict[str, Any]],
    learners_map: Dict[str, Dict[str, Any]],
    inactivity_threshold_days: int = 14,
    reference_timestamp: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Evaluates inactivity status for all enrolments.
    
    States:
      - 'active_within_window': Has activity within the last N days.
      - 'no_activity_within_window': Has past activity, but none within the last N days.
      - 'no_activity_history': Zero recorded activity events in database.
      - 'excluded_by_status': Enrolment is withdrawn or cancelled (not eligible for active monitoring).
      - 'completed_enrolment': Enrolment is already completed.
    """
    if reference_timestamp is None:
        reference_timestamp = datetime(2026, 10, 17, 23, 30, 0)
    elif isinstance(reference_timestamp, str):
        ref_parsed = parse_datetime(reference_timestamp)
        if ref_parsed:
            reference_timestamp = ref_parsed

    # Group activities by enrollment_id
    enr_activities: Dict[str, List[Dict[str, Any]]] = {}
    for act in activities:
        enr_id = act.get("enrollment_id")
        if enr_id:
            enr_activities.setdefault(enr_id, []).append(act)

    monitored_records = []
    flagged_count = 0
    active_count = 0
    no_history_count = 0
    excluded_count = 0

    for enr in enrollments:
        enr_id = enr["enrollment_id"]
        status = enr.get("status", "enrolled")
        course_id = enr["course_id"]
        learner_id = enr["learner_id"]
        
        course_info = courses_map.get(course_id, {})
        learner_info = learners_map.get(learner_id, {})
        
        course_name = course_info.get("course_name", course_id)
        learner_name = learner_info.get("display_name", learner_id)
        roll_no = learner_info.get("roll_no", "")

        acts = enr_activities.get(enr_id, [])

        if status in ("withdrawn", "cancelled"):
            status_code = "excluded_by_status"
            flag_reason = f"Enrolment is {status}; excluded from inactivity monitoring."
            days_since = None
            last_date_str = None
            is_flagged = False
            excluded_count += 1
        elif status == "completed":
            status_code = "completed_enrolment"
            flag_reason = "Enrolment is marked as completed."
            days_since = None
            last_date_str = None
            is_flagged = False
        elif not acts:
            status_code = "no_activity_history"
            flag_reason = "No learning activity has ever been recorded for this enrolment."
            days_since = None
            last_date_str = None
            is_flagged = True
            flagged_count += 1
            no_history_count += 1
        else:
            # Find latest activity
            latest_dt = None
            for a in acts:
                dt = parse_datetime(a.get("activity_date"))
                if dt and (latest_dt is None or dt > latest_dt):
                    latest_dt = dt
            
            if latest_dt:
                days_diff = (reference_timestamp - latest_dt).total_seconds() / (24 * 3600)
                days_since = max(0, int(days_diff))
                last_date_str = latest_dt.strftime("%Y-%m-%d %H:%M:%S")

                if days_since > inactivity_threshold_days:
                    status_code = "no_activity_within_window"
                    flag_reason = f"No activity recorded in the past {days_since} days (threshold: {inactivity_threshold_days} days)."
                    is_flagged = True
                    flagged_count += 1
                else:
                    status_code = "active_within_window"
                    flag_reason = f"Active {days_since} days ago (within {inactivity_threshold_days}-day window)."
                    is_flagged = False
                    active_count += 1
            else:
                status_code = "no_activity_history"
                flag_reason = "Activity timestamp could not be verified."
                days_since = None
                last_date_str = None
                is_flagged = True
                flagged_count += 1

        monitored_records.append({
            "enrollment_id": enr_id,
            "learner_id": learner_id,
            "learner_name": learner_name,
            "roll_no": roll_no,
            "course_id": course_id,
            "course_name": course_name,
            "enrollment_status": status,
            "inactivity_status": status_code,
            "is_flagged": is_flagged,
            "last_recorded_activity": last_date_str,
            "days_since_last_activity": days_since,
            "configured_threshold_days": inactivity_threshold_days,
            "flag_reason": flag_reason
        })

    return {
        "reference_timestamp": reference_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "inactivity_threshold_days": inactivity_threshold_days,
        "total_enrolments_monitored": len(enrollments),
        "flagged_inactive_count": flagged_count,
        "active_in_window_count": active_count,
        "no_history_count": no_history_count,
        "excluded_count": excluded_count,
        "limitation_statement": "An inactivity flag indicates no events were recorded within the window; it is a rule-based signal and does not prove absence of offline study.",
        "records": monitored_records
    }
