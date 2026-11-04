"""
Activity Analytics Module
Aggregates activity events by calendar week, breakdown by activity type,
and tracks distinct active enrolments and learners over time.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import defaultdict


def parse_datetime(dt_str: Any) -> Optional[datetime]:
    if not dt_str:
        return None
    if isinstance(dt_str, datetime):
        return dt_str
    try:
        # Standard ISO or SQL format
        clean_str = str(dt_str).replace('T', ' ').split('.')[0]
        return datetime.strptime(clean_str, "%Y-%m-%d %H:%M:%S")
    except Exception:
        try:
            return datetime.strptime(str(dt_str)[:10], "%Y-%m-%d")
        except Exception:
            return None


def get_weekly_activity_summary(
    activities: List[Dict[str, Any]],
    enrollments_map: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Groups activities by calendar week (Monday as start of week).
    Calculates:
      - total_events
      - completed_events
      - distinct_active_enrollments
      - distinct_active_learners (if enrollment map provided)
      - breakdown by activity type
    """
    weeks_dict = defaultdict(lambda: {
        "week_label": "",
        "total_events": 0,
        "completed_events": 0,
        "active_enrollments": set(),
        "active_learners": set(),
        "by_type": defaultdict(int)
    })

    type_totals = defaultdict(int)

    for act in activities:
        dt = parse_datetime(act.get("activity_date"))
        if not dt:
            continue

        # Week key based on year and ISO week
        year, week_num, _ = dt.isocalendar()
        week_key = f"{year}-W{week_num:02d}"
        
        entry = weeks_dict[week_key]
        entry["week_label"] = f"W{week_num} ({year})"
        entry["total_events"] += 1
        
        if act.get("completed"):
            entry["completed_events"] += 1
            
        enr_id = act.get("enrollment_id")
        if enr_id:
            entry["active_enrollments"].add(enr_id)
            if enrollments_map and enr_id in enrollments_map:
                learner_id = enrollments_map[enr_id].get("learner_id")
                if learner_id:
                    entry["active_learners"].add(learner_id)

        act_type = act.get("activity_type", "unknown")
        entry["by_type"][act_type] += 1
        type_totals[act_type] += 1

    # Format sorted weeks
    sorted_week_keys = sorted(weeks_dict.keys())
    weekly_series = []
    
    for key in sorted_week_keys:
        item = weeks_dict[key]
        weekly_series.append({
            "week_key": key,
            "week_label": item["week_label"],
            "total_events": item["total_events"],
            "completed_events": item["completed_events"],
            "distinct_active_enrollments": len(item["active_enrollments"]),
            "distinct_active_learners": len(item["active_learners"]),
            "breakdown": dict(item["by_type"])
        })

    return {
        "total_recorded_events": len(activities),
        "weekly_series": weekly_series,
        "type_breakdown": [
            {"type": k, "count": v, "label": k.replace("_", " ").title()}
            for k, v in type_totals.items()
        ]
    }
